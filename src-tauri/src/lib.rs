//! 明玄 · Tauri Rust 后端
//!
//! 职责：
//! 1. AI 直连：内嵌 cherry_studio_proxy 的核心逻辑（HMAC-SHA256 签名），
//!    无需任何本地 HTTP 服务，直接调用 Cherry 上游 OpenAI 兼容接口。
//!    同时保留自定义 OpenAI 兼容服务转发（规避 Webview CORS）。
//! 2. 命盘存档读写（应用数据目录下的 profiles.json）。

use futures_util::StreamExt;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use tauri::ipc::Channel;
use tauri::Manager;

// ===== Cherry 直连（签名方案来自 cherry_studio_proxy） =====

const CHERRY_BASE_URL: &str = "https://api.cherry-ai.com";
const CHERRY_CHAT_PATH: &str = "/chat/completions";
const CHERRY_CLIENT_ID: &str = "cherry-studio";
const CHERRY_SIGNING_SECRET: &str = "K3RNPFx19hPh1AHr5E1wBEFfi4uYUjoCFuzjDzvS9cAWD8KuKJR8FOClwUpGqRRX.GvI6I5ZrEHcGOWjO5AKhJKGmnwwGfM62XKpWqkjhvzRU2NZIinM77aTGIqhqys0g";
const CHERRY_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) CherryStudio/1.9.4 Chrome/146.0.7680.188 Electron/41.2.1 Safari/537.36";
const CHERRY_REFERER: &str = "https://cherry-ai.com";

/// 前端展示名 → Cherry 上游模型参数
const CHERRY_MODELS: &[(&str, &str)] = &[("qwen-8b", "qwen")];

type HmacSha256 = Hmac<Sha256>;

fn cherry_signature_headers(
    method: &str,
    path: &str,
    query: &str,
    body: &str,
) -> Vec<(&'static str, String)> {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .to_string();
    let raw = format!(
        "{}\n{}\n{}\n{}\n{}\n{}",
        method.to_uppercase(),
        path,
        query,
        CHERRY_CLIENT_ID,
        timestamp,
        body
    );
    let mut mac = HmacSha256::new_from_slice(CHERRY_SIGNING_SECRET.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(raw.as_bytes());
    let signature = hex::encode(mac.finalize().into_bytes());
    vec![
        ("X-Client-ID", CHERRY_CLIENT_ID.to_string()),
        ("X-Timestamp", timestamp),
        ("X-Signature", signature),
    ]
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .connect_timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap_or_default()
}

/// 内置直连：返回可用模型展示名
#[tauri::command]
fn cherry_models() -> Vec<String> {
    CHERRY_MODELS.iter().map(|(public, _)| public.to_string()).collect()
}

/// 内置直连：流式对话（无需任何本地服务/配置）
#[tauri::command]
async fn cherry_chat_stream(
    model: String,
    messages: Vec<ChatMessage>,
    on_event: Channel<String>,
) -> Result<(), String> {
    let upstream_model = CHERRY_MODELS
        .iter()
        .find(|(public, _)| *public == model)
        .map(|(_, upstream)| *upstream)
        .unwrap_or(CHERRY_MODELS[0].1);

    let payload = serde_json::json!({
        "model": upstream_model,
        "messages": messages,
        "stream": true,
        "temperature": 0.7
    });
    let body = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
    let url = format!("{}{}", CHERRY_BASE_URL, CHERRY_CHAT_PATH);

    let mut req = client()
        .post(&url)
        .header("Accept", "application/json, text/event-stream")
        .header("Content-Type", "application/json")
        .header("User-Agent", CHERRY_USER_AGENT)
        .header("X-Title", "Cherry Studio")
        .header("HTTP-Referer", CHERRY_REFERER)
        .body(body.clone());
    for (k, v) in cherry_signature_headers("POST", CHERRY_CHAT_PATH, "", &body) {
        req = req.header(k, v);
    }

    let res = req.send().await.map_err(|e| format!("AI 请求失败：{e}"))?;
    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        return Err(format!(
            "AI 服务返回 HTTP {status}：{}",
            &text[..text.len().min(300)]
        ));
    }
    pump_sse(res, on_event).await
}

// ===== 自定义 OpenAI 兼容服务转发（可选模式） =====

fn normalize_base(url: &str) -> String {
    let u = url.trim().trim_end_matches('/');
    u.strip_suffix("/v1").unwrap_or(u).to_string()
}

#[derive(Debug, Deserialize)]
struct ModelsResponse {
    data: Option<Vec<ModelEntry>>,
}

#[derive(Debug, Deserialize)]
struct ModelEntry {
    id: Option<String>,
}

#[tauri::command]
async fn ai_models(base_url: String, api_key: String) -> Result<Vec<String>, String> {
    let url = format!("{}/v1/models", normalize_base(&base_url));
    let mut req = client().get(&url);
    if !api_key.is_empty() {
        req = req.bearer_auth(&api_key);
    }
    let res = req.send().await.map_err(|e| format!("请求失败：{e}"))?;
    if !res.status().is_success() {
        return Err(format!("HTTP {}", res.status()));
    }
    let body: ModelsResponse = res.json().await.map_err(|e| format!("解析失败：{e}"))?;
    Ok(body
        .data
        .unwrap_or_default()
        .into_iter()
        .filter_map(|m| m.id)
        .collect())
}

#[tauri::command]
async fn ai_chat_stream(
    base_url: String,
    api_key: String,
    model: String,
    messages: Vec<ChatMessage>,
    on_event: Channel<String>,
) -> Result<(), String> {
    let url = format!("{}/v1/chat/completions", normalize_base(&base_url));
    let mut req = client().post(&url).json(&serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": true,
        "temperature": 0.7
    }));
    if !api_key.is_empty() {
        req = req.bearer_auth(&api_key);
    }
    let res = req.send().await.map_err(|e| format!("AI 请求失败：{e}"))?;
    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        return Err(format!("HTTP {status} {}", &text[..text.len().min(200)]));
    }
    pump_sse(res, on_event).await
}

/// 把 SSE 响应逐行解析，data 载荷经 Channel 推给前端（"[DONE]" 表示结束）
async fn pump_sse(res: reqwest::Response, on_event: Channel<String>) -> Result<(), String> {
    let mut stream = res.bytes_stream();
    let mut buf = String::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("流读取失败：{e}"))?;
        buf.push_str(&String::from_utf8_lossy(&chunk));
        while let Some(pos) = buf.find('\n') {
            let line = buf[..pos].trim().to_string();
            buf = buf[pos + 1..].to_string();
            if let Some(payload) = line.strip_prefix("data:") {
                let payload = payload.trim();
                if payload.is_empty() {
                    continue;
                }
                on_event
                    .send(payload.to_string())
                    .map_err(|e| format!("通道推送失败：{e}"))?;
            }
        }
    }
    let _ = on_event.send("[DONE]".to_string());
    Ok(())
}

// ===== 命盘存档 =====

fn profiles_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法定位应用数据目录：{e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建数据目录失败：{e}"))?;
    Ok(dir.join("profiles.json"))
}

#[tauri::command]
fn read_profiles(app: tauri::AppHandle) -> Result<String, String> {
    let path = profiles_path(&app)?;
    match std::fs::read_to_string(&path) {
        Ok(s) => Ok(s),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok("[]".to_string()),
        Err(e) => Err(format!("读取存档失败：{e}")),
    }
}

#[tauri::command]
fn write_profiles(app: tauri::AppHandle, json: String) -> Result<(), String> {
    let path = profiles_path(&app)?;
    std::fs::write(&path, json).map_err(|e| format!("写入存档失败：{e}"))
}

// ===== 地点搜索（高德 / 百度 / 黄历网）=====
//
// 由 Rust 后端直接发请求，绕过浏览器 CORS；同时保护 API Key。
// 前端经 invoke 调用，无需在浏览器暴露密钥。


#[derive(serde::Serialize, Clone)]
struct LocationResultDto {
    name: String,
    longitude: f64,
    latitude: f64,
    timezone: i32,
    code: Option<String>,
    source: String,
}

/// 高德 POI 关键字搜索
async fn amap_search(api_key: &str, q: &str) -> Result<Vec<LocationResultDto>, String> {
    let url = format!(
        "https://restapi.amap.com/v3/place/text?key={}&keywords={}&offset=10&extensions=base",
        urlencoding(api_key),
        urlencoding(q),
    );
    let r = client()
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("高德请求失败：{e}"))?;
    let v: serde_json::Value = r.json().await.map_err(|e| format!("解析失败：{e}"))?;
    let mut out: Vec<LocationResultDto> = Vec::new();
    if let Some(pois) = v.get("pois").and_then(|x| x.as_array()) {
        for p in pois {
            let name = p
                .get("name")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string();
            let address = p
                .get("address")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string();
            let location = p.get("location").and_then(|x| x.as_str()).unwrap_or("");
            let code = p.get("adcode").and_then(|x| x.as_str()).map(|s| s.to_string());
            let parts: Vec<&str> = location.split(',').collect();
            if parts.len() != 2 {
                continue;
            }
            let lng: f64 = parts[0].parse().unwrap_or(0.0);
            let lat: f64 = parts[1].parse().unwrap_or(0.0);
            let tz = (lng / 15.0).round() as i32;
            out.push(LocationResultDto {
                name: format!("{} {}", name, address).trim().to_string(),
                longitude: lng,
                latitude: lat,
                timezone: tz,
                code,
                source: "amap".to_string(),
            });
        }
    }
    if let Some(cities) = v
        .get("suggestion")
        .and_then(|x| x.get("cities"))
        .and_then(|x| x.as_array())
    {
        for c in cities {
            if let Some(name) = c.get("name").and_then(|x| x.as_str()) {
                let location = c
                .get("location")
                .and_then(|x| x.as_str())
                .unwrap_or("");
                let code = c.get("adcode").and_then(|x| x.as_str()).map(|s| s.to_string());
                let parts: Vec<&str> = location.split(',').collect();
                if parts.len() != 2 {
                    continue;
                }
                let lng: f64 = parts[0].parse().unwrap_or(0.0);
                let lat: f64 = parts[1].parse().unwrap_or(0.0);
                let tz = (lng / 15.0).round() as i32;
                out.push(LocationResultDto {
                    name: name.to_string(),
                    longitude: lng,
                    latitude: lat,
                    timezone: tz,
                    code,
                    source: "amap".to_string(),
                });
            }
        }
    }
    Ok(out)
}

/// 百度 Place 搜索
async fn baidu_search(api_key: &str, q: &str) -> Result<Vec<LocationResultDto>, String> {
    let url = format!(
        "https://api.map.baidu.com/place/v2/search?ak={}&output=json&query={}&region=%E5%85%A8%E5%9B%BD",
        urlencoding(api_key),
        urlencoding(q),
    );
    let r = client()
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("百度请求失败：{e}"))?;
    let v: serde_json::Value = r.json().await.map_err(|e| format!("解析失败：{e}"))?;
    let mut out: Vec<LocationResultDto> = Vec::new();
    if v.get("status").and_then(|x| x.as_i64()) == Some(0) {
        if let Some(results) = v.get("results").and_then(|x| x.as_array()) {
            for r in results {
                let name = r.get("name").and_then(|x| x.as_str()).unwrap_or("");
                let address = r.get("address").and_then(|x| x.as_str()).unwrap_or("");
                let code = r.get("adcode").and_then(|x| x.as_str()).map(|s| s.to_string());
                let lat = r
                    .get("location")
                    .and_then(|x| x.get("lat"))
                    .and_then(|x| x.as_f64())
                    .unwrap_or(0.0);
                let lng = r
                    .get("location")
                    .and_then(|x| x.get("lng"))
                    .and_then(|x| x.as_f64())
                    .unwrap_or(0.0);
                let tz = (lng / 15.0).round() as i32;
                out.push(LocationResultDto {
                    name: format!("{} {}", name, address).trim().to_string(),
                    longitude: lng,
                    latitude: lat,
                    timezone: tz,
                    code,
                    source: "baidu".to_string(),
                });
            }
        }
    }
    Ok(out)
}

/// 高德逆地理编码
async fn amap_regeo(api_key: &str, lng: f64, lat: f64) -> Result<Option<String>, String> {
    let url = format!(
        "https://restapi.amap.com/v3/geocode/regeo?key={}&location={},{}",
        urlencoding(api_key), lng, lat,
    );
    let r = client().get(&url).send().await.map_err(|e| e.to_string())?;
    let v: serde_json::Value = r.json().await.map_err(|e| e.to_string())?;
    if v.get("status").and_then(|x| x.as_str()) == Some("1") {
        Ok(v.get("regeocode")
            .and_then(|x| x.get("formatted_address"))
            .and_then(|x| x.as_str())
            .map(|s| s.to_string()))
    } else {
        Ok(None)
    }
}

/// 百度逆地理编码
async fn baidu_regeo(api_key: &str, lng: f64, lat: f64) -> Result<Option<String>, String> {
    let url = format!(
        "https://api.map.baidu.com/geocoder/v2/?ak={}&output=json&location={},{}",
        urlencoding(api_key), lat, lng,
    );
    let r = client().get(&url).send().await.map_err(|e| e.to_string())?;
    let v: serde_json::Value = r.json().await.map_err(|e| e.to_string())?;
    if v.get("status").and_then(|x| x.as_i64()) == Some(0) {
        Ok(v.get("result")
            .and_then(|x| x.get("formatted_address"))
            .and_then(|x| x.as_str())
            .map(|s| s.to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn location_lookup(
    provider: String,
    api_key: String,
    q: String,
) -> Result<Vec<LocationResultDto>, String> {
    if q.trim().is_empty() {
        return Ok(Vec::new());
    }
    if api_key.trim().is_empty() {
        return Err("API Key 未配置，请在「设置 → 地点服务」填入。".to_string());
    }
    match provider.as_str() {
        "amap" => amap_search(&api_key, &q).await,
        "baidu" => baidu_search(&api_key, &q).await,
        _ => Err(format!("未知 provider：{provider}")),
    }
}

#[tauri::command]
async fn location_regeo(
    provider: String,
    api_key: String,
    longitude: f64,
    latitude: f64,
) -> Result<Option<String>, String> {
    if api_key.trim().is_empty() {
        return Ok(None);
    }
    match provider.as_str() {
        "amap" => amap_regeo(&api_key, longitude, latitude).await,
        "baidu" => baidu_regeo(&api_key, longitude, latitude).await,
        _ => Ok(None),
    }
}

/// 把 HTML 转为"近似 innerText"的纯文本：保留换行（br → \n），去掉所有其他标签，
/// 解码常见 HTML 实体（&nbsp; &amp; &lt; &gt; &quot; &#39;）
fn html_to_text(html: &str) -> String {
    let mut s = html.to_string();
    s = regex::Regex::new(r"<br\s*/?>").unwrap().replace_all(&s, "\n").into_owned();
    s = regex::Regex::new(r"</(p|div|li|tr|h\d|table)>").unwrap().replace_all(&s, "\n").into_owned();
    s = regex::Regex::new(r"<[^>]+>").unwrap().replace_all(&s, "").into_owned();
    s = s
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&ldquo;", "“")
        .replace("&rdquo;", "”")
        .replace("&hellip;", "…");
    s = regex::Regex::new(r"\n{3,}").unwrap().replace_all(&s, "\n\n").into_owned();
    s
}

/// 从文本中按"标签\n内容"格式抽取值（标签后跟冒号或换行）
fn pick_after(text: &str, labels: &[&str]) -> String {
    for label in labels {
        let pat = format!(
            r"(?m)^\s*{}\s*[:：]?\s*\n([^\n]+(?:\n(?![一-龥A-Za-z0-9 　{{}}（）()、，。])[^\n]*)*)",
            regex::escape(label)
        );
        if let Ok(re) = regex::Regex::new(&pat) {
            if let Some(c) = re.captures(text) {
                if let Some(m) = c.get(1) {
                    let v = m.as_str().trim();
                    if !v.is_empty() { return v.to_string(); }
                }
            }
        }
        let pat2 = format!(r"(?m)^\s*{}\s*[:：]?\s*([^\n]+)", regex::escape(label));
        if let Ok(re) = regex::Regex::new(&pat2) {
            if let Some(c) = re.captures(text) {
                if let Some(m) = c.get(1) {
                    let v = m.as_str().trim();
                    if !v.is_empty() { return v.to_string(); }
                }
            }
        }
    }
    String::new()
}

/// 抽取表格的某一行（标签 + 12 个 tab 分隔的字段）
fn pick_table_row(text: &str, label: &str) -> Vec<String> {
    let re = match regex::Regex::new(&format!(r"(?m)^{}\s+([^\n]+)", regex::escape(label))) {
        Ok(r) => r,
        Err(_) => return Vec::new(),
    };
    if let Some(c) = re.captures(text) {
        if let Some(m) = c.get(1) {
            return m.as_str()
                .split(|ch: char| ch == '\t' || ch == '　')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
        }
    }
    Vec::new()
}

/// 从 HTML 表格中按行标签精确取一行
fn parse_hour_table(html: &str) -> std::collections::HashMap<String, Vec<String>> {
    let mut map: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
    // 找到所有 <table ...>...</table>
    let table_re = regex::Regex::new(r"(?s)<table[^>]*>(.*?)</table>").unwrap();
    // 优先取第二个表（包含 12 时辰完整信息）
    let tables: Vec<&str> = table_re.captures_iter(html).filter_map(|c| c.get(1).map(|m| m.as_str())).collect();
    // 找包含"时辰"行的表
    let target = tables.iter().find(|t| t.contains("时辰") && t.contains("子时") && t.contains("亥时")).copied();
    if let Some(t) = target {
        let row_re = regex::Regex::new(r"(?s)<tr[^>]*>(.*?)</tr>").unwrap();
        let cell_re = regex::Regex::new(r"(?s)<(?:td|th)[^>]*>(.*?)</(?:td|th)>").unwrap();
        // 标签清理：去掉 HTML 标签
        let strip = |s: &str| -> String {
            regex::Regex::new(r"<[^>]+>").unwrap().replace_all(s, "").into_owned()
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .trim()
                .to_string()
        };
        for row_cap in row_re.captures_iter(t) {
            let row_html = row_cap.get(1).map(|m| m.as_str()).unwrap_or("");
            let cells: Vec<String> = cell_re
                .captures_iter(row_html)
                .filter_map(|c| c.get(1).map(|m| strip(m.as_str())))
                .collect();
            if cells.is_empty() {
                continue;
            }
            let label = cells[0].clone();
            // 数据行第一列是标签，后面 12 个是数据；标签行第一列是"时辰"，后面 12 个是子丑寅...
            if label == "时辰" {
                continue; // 跳过表头
            }
            // 只保留 13 列的行（1 标签 + 12 数据）
            if cells.len() >= 13 {
                map.insert(label, cells[1..13].to_vec());
            }
        }
    }
    map
}

/// 从 HTML 中精确抽取"标签 + 数字干支"等极短字段
fn pick_short_after(text: &str, label: &str, len: usize) -> String {
    let pat = format!(r"(?m)^{}\s*([一-龥A-Za-z0-9]{{{},{}}})", regex::escape(label), len, len);
    if let Ok(re) = regex::Regex::new(&pat) {
        if let Some(c) = re.captures(text) {
            if let Some(m) = c.get(1) {
                return m.as_str().to_string();
            }
        }
    }
    String::new()
}

#[tauri::command]
async fn huangli_lookup(date: String) -> Result<serde_json::Value, String> {
    let url = format!("https://www.huangli123.net/huangli/{}.html", date);
    let r = client()
        .get(&url)
        .header("User-Agent", CHERRY_USER_AGENT)
        .send()
        .await
        .map_err(|e| format!("黄历网请求失败：{e}"))?;
    if !r.status().is_success() {
        return Err(format!("黄历网返回 HTTP {}", r.status()));
    }
    let html = r.text().await.map_err(|e| format!("读取失败：{e}"))?;
    let text = html_to_text(&html);

    // 基础信息：从「丙午年 属马 天河水」这一行拆
    let ganzhi_year = regex::Regex::new(r"(\w{2})年\s*属\w").ok().and_then(|re| re.captures(&text)).and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string()).unwrap_or_default();
    let ganzhi_month = regex::Regex::new(r"(\w{2})月\s*属\w").ok().and_then(|re| re.captures(&text)).and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string()).unwrap_or_default();
    let ganzhi_day = regex::Regex::new(r"(\w{2})日\s*属\w").ok().and_then(|re| re.captures(&text)).and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string()).unwrap_or_default();
    // 生肖：单字，立即跟在"生肖"后
    let zodiac = pick_short_after(&text, "生肖", 1);
    let constellation = pick_short_after(&text, "星座", 3);
    // 纳音：在第一行的"丙午年 属马 天河水"里
    let wuxing_year = regex::Regex::new(r"(\w{2})年\s*属\w\s*(\w{4})").ok()
        .and_then(|re| re.captures(&text))
        .and_then(|c| c.get(2))
        .map(|m| m.as_str().to_string())
        .unwrap_or_default();
    let wuxing_month = regex::Regex::new(r"(\w{2})月\s*属\w\s*(\w{4})").ok()
        .and_then(|re| re.captures(&text))
        .and_then(|c| c.get(2))
        .map(|m| m.as_str().to_string())
        .unwrap_or_default();
    let wuxing_day = regex::Regex::new(r"(\w{2})日\s*属\w\s*(\w{4})").ok()
        .and_then(|re| re.captures(&text))
        .and_then(|c| c.get(2))
        .map(|m| m.as_str().to_string())
        .unwrap_or_default();
    let wuxing_numeric = regex::Regex::new(r"甲子五行\s*(\w)").ok()
        .and_then(|re| re.captures(&text))
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_default();

    // 公历 / 农历 / 干支（来自文本块）
    let solar_full = pick_after(&text, &["公历(阳历)", "公历（阳历）"]);
    let lunar_full = pick_after(&text, &["农历(阴历)", "农历（阴历）"]);
    let pillars = regex::Regex::new(r"(\w{2}年\s*\w{2}月\s*\w{2}日)").ok()
        .and_then(|re| re.captures(&text))
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().trim().to_string())
        .unwrap_or_default();

    // 节气
    let terms: Vec<String> = regex::Regex::new(r"节气[：:]\s*([一-龥]+)\s*(\d+月\d+日)(?:\s*星期[一-龥天]+)?\s*(\d{2}:\d{2})?")
        .ok()
        .map(|re| {
            re.captures_iter(&text)
                .map(|c| {
                    format!(
                        "{}{}{}",
                        c.get(1).map(|m| m.as_str()).unwrap_or(""),
                        c.get(2).map(|m| m.as_str()).unwrap_or(""),
                        c.get(3).map(|m| format!(" {}", m.as_str())).unwrap_or_default()
                    )
                })
                .collect()
        })
        .unwrap_or_default();

    // 农历总天数
    let lunar_year_days_total = regex::Regex::new(r"农历总共有\s*(\d+)\s*天").ok().and_then(|re| re.captures(&text)).and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string()).unwrap_or_default();
    let lunar_year_range = pick_after(&text, &["起止日期"]);
    let lunar_year_passed = regex::Regex::new(r"已过(\d+)天").ok().and_then(|re| re.captures(&text)).and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string()).unwrap_or_default();
    let lunar_year_remaining = regex::Regex::new(r"还剩(\d+)天").ok().and_then(|re| re.captures(&text)).and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string()).unwrap_or_default();

    // 月令 / 物候 / 月相 / 六耀 / 日禄
    let month_order = pick_after(&text, &["月令"]);
    let phenology = pick_after(&text, &["物候"]);
    let phase = pick_after(&text, &["月相"]);
    let liu_yao = pick_after(&text, &["六耀"]);
    let ri_lu = pick_after(&text, &["日禄"]);

    // 值神 / 十二神
    let duty_god = pick_after(&text, &["值神"]);
    let twelve_star = pick_after(&text, &["十二神"]);

    // 宜 / 忌（块）
    let yi_block = regex::Regex::new(r"老黄历所宜\s*\n([\s\S]*?)\n\s*\n老黄历所忌")
        .ok().and_then(|re| re.captures(&text))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default()).unwrap_or_default();
    let ji_block = regex::Regex::new(r"老黄历所忌\s*\n([\s\S]*?)\n\s*\n节气[：:]")
        .ok().and_then(|re| re.captures(&text))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default()).unwrap_or_default();
    let extract_words = |s: &str| -> Vec<String> {
        s.split(|c: char| c.is_whitespace() || c == '　' || c == ',')
            .map(|t| t.trim().to_string())
            .filter(|t| !t.is_empty() && t.chars().count() >= 2 && t.chars().count() <= 8)
            .collect()
    };
    let yi: Vec<String> = extract_words(&yi_block);
    let ji: Vec<String> = extract_words(&ji_block);

    // 神位
    let cai_shen = pick_after(&text, &["财神"]);
    let xi_shen = pick_after(&text, &["喜神"]);
    let fu_shen = pick_after(&text, &["福神"]);
    let gui_yang = pick_after(&text, &["阳贵神"]);
    let gui_yin = pick_after(&text, &["阴贵神"]);

    // 胎神
    let taishen_month = pick_after(&text, &["本月：", "本月:"]);
    let taishen_day = pick_after(&text, &["今日：", "今日:"]);
    let taishen_direction = regex::Regex::new(r"占(\S{1,4})(?:，|$)")
        .ok().and_then(|re| re.captures(&text)).and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string()).unwrap_or_default();

    // 相冲
    let chong = pick_after(&text, &["相冲"]);

    // 吉神宜趋 / 凶煞宜忌
    let lucky_gods_block = regex::Regex::new(r"吉神宜趋\s*\n([\s\S]*?)\n\s*\n凶煞宜忌")
        .ok().and_then(|re| re.captures(&text))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default()).unwrap_or_default();
    let lucky_gods: Vec<String> = extract_words(&lucky_gods_block);
    let evil_gods_block = regex::Regex::new(r"凶煞宜忌\s*\n([\s\S]*?)\n\s*\n彭祖百忌")
        .ok().and_then(|re| re.captures(&text))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default()).unwrap_or_default();
    let evil_gods: Vec<String> = extract_words(&evil_gods_block);

    // 彭祖百忌：只保留「XX不YY」格式（4-12 字，必须包含"不"且前后是干支/生肖）
    let pengzu_lines: Vec<String> = text
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| {
            let n = s.chars().count();
            if n < 4 || n > 12 { return false; }
            // 必须包含"不"
            if !s.contains('不') { return false; }
            // 必须是单行（不含换行）
            !s.contains('　') && !s.contains("；") // 排除多个宜忌堆叠的行
        })
        .filter(|s| {
            // 必须以干支或时辰前缀开头
            let first = s.chars().next().unwrap_or(' ');
            "甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥".contains(first)
        })
        .collect();

    // 大殓吉时
    let da_lian_block = regex::Regex::new(r"大殓吉时\s*\n([\s\S]*?)\n\s*\n空亡所值")
        .ok().and_then(|re| re.captures(&text))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default()).unwrap_or_default();
    let da_lian_lucky_hours: Vec<String> = da_lian_block
        .split(|c: char| c.is_whitespace() || c == '　')
        .map(|t| t.trim().to_string())
        .filter(|t| t.ends_with("时") && t.chars().count() <= 3)
        .collect();

    // 空亡：表格内 "年 \t X \t 月 \t Y \t 日 \t Z"
    let kong_wang_table = pick_table_row(&text, "日");
    let kong_year = kong_wang_table.get(0).cloned().unwrap_or_default();
    let kong_month = kong_wang_table.get(1).cloned().unwrap_or_default();
    let kong_day = kong_wang_table.get(2).cloned().unwrap_or_default();

    // 九宫飞星
    let nine_star_desc = pick_after(&text, &["九宫飞星"]);

    // 星宿 / 的呼
    let star_sign = pick_after(&text, &["今日星宿"]);
    let ri_hu = pick_after(&text, &["的呼勿近"]);

    // 冲合
    let chong_he_block = regex::Regex::new(r"今日冲合\s*\n([\s\S]*?)\n\s*\n三煞方")
        .ok().and_then(|re| re.captures(&text))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default()).unwrap_or_default();
    let chong_he: Vec<String> = chong_he_block
        .split(|c: char| c.is_whitespace())
        .filter(|t| t.starts_with("与肖"))
        .map(|t| t.to_string())
        .collect();

    // 三煞
    let san_sha_year = pick_after(&text, &["本年三煞"]);
    let san_sha_month = pick_after(&text, &["本月三煞"]);
    let san_sha_day = pick_after(&text, &["今日三煞"]);

    // 七煞（"年七煞："格式）
    let qi_sha_year = regex::Regex::new(r"年七煞[：:]\s*(\S{1,6})").ok().and_then(|re| re.captures(&text)).and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string()).unwrap_or_default();
    let qi_sha_month = regex::Regex::new(r"月七煞[：:]\s*(\S{1,6})").ok().and_then(|re| re.captures(&text)).and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string()).unwrap_or_default();
    let qi_sha_day = regex::Regex::new(r"日七煞[：:]\s*(\S{1,6})").ok().and_then(|re| re.captures(&text)).and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string()).unwrap_or_default();

    // 岁煞 / 月煞
    let sui_sha = regex::Regex::new(r"本年岁煞[：:]\s*(\S)").ok().and_then(|re| re.captures(&text)).and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string()).unwrap_or_default();
    let yue_sha = regex::Regex::new(r"月煞[：:]\s*(\S)").ok().and_then(|re| re.captures(&text)).and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string()).unwrap_or_default();

    // 河图洛书
    let luoshu_poem = pick_after(&text, &["今日河图洛书九星吉凶"]);

    // 卦象
    let gua_name = pick_after(&text, &["今日卦象"]);

    // 十二神所主 / 二十八宿歌诀
    let twelve_star_poem = pick_after(&text, &["今日十二神吉凶所主"]);
    let star_sign_poem = pick_after(&text, &["今日二十八星宿吉凶"]);

    // 地母经 / 丰歉歌
    let dimu: Vec<String> = regex::Regex::new(r"地母经卜曰\s*\n([\s\S]*?)\n\s*\n地母经诗曰")
        .ok().and_then(|re| re.captures(&text))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default())
        .map(|s| s.lines().map(|x| x.trim().to_string()).filter(|x| !x.is_empty() && x.chars().count() >= 4).collect())
        .unwrap_or_default();
    let dimu_poem: Vec<String> = regex::Regex::new(r"地母经诗曰\s*\n([\s\S]*?)\n\s*\n七月丰歉歌")
        .ok().and_then(|re| re.captures(&text))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default())
        .map(|s| s.lines().map(|x| x.trim().to_string()).filter(|x| !x.is_empty() && x.chars().count() >= 4).collect())
        .unwrap_or_default();
    let harvest: Vec<String> = regex::Regex::new(r"七月丰歉歌\s*\n([\s\S]*?)\n时辰")
        .ok().and_then(|re| re.captures(&text))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default())
        .map(|s| s.lines().map(|x| x.trim().to_string()).filter(|x| !x.is_empty() && x.chars().count() >= 4).collect())
        .unwrap_or_default();

    // ===== 十二时辰完整明细（直接从 HTML 表格解析） =====
    let hour_rows = parse_hour_table(&html);
    let shichens = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    let time_ranges = [
        "23:00-00:59", "01:00-02:59", "03:00-04:59", "05:00-06:59",
        "07:00-08:59", "09:00-10:59", "11:00-12:59", "13:00-14:59",
        "15:00-16:59", "17:00-18:59", "19:00-20:59", "21:00-22:59",
    ];
    let get_row = |label: &str| -> Vec<String> {
        hour_rows.get(label).cloned().unwrap_or_default()
    };
    let split_words = |s: &str| -> Vec<String> {
        s.split(|c: char| c == ' ' || c == '\t' || c == '　')
            .map(|t| t.trim().to_string())
            .filter(|t| !t.is_empty())
            .collect()
    };
    let mut hours: Vec<serde_json::Value> = Vec::with_capacity(12);
    for (i, sc) in shichens.iter().enumerate() {
        let get = |k: &str| -> String {
            get_row(k).get(i).cloned().unwrap_or_default()
        };
        let fortune = get("吉凶");
        let fortune_str: &str = if fortune.contains("吉") && !fortune.contains("凶") {
            "吉"
        } else if fortune.contains("凶") {
            "凶"
        } else {
            ""
        };
        hours.push(serde_json::json!({
            "shichen": sc,
            "timeRange": time_ranges.get(i).copied().unwrap_or(""),
            "ganzhi": get("八字"),
            "starGod": get("星神"),
            "chong": get("正冲"),
            "fortune": fortune_str,
            "zodiac": get("生肖"),
            "luckyGods": split_words(&get("吉神")),
            "evilGods": split_words(&get("凶煞")),
            "yi": split_words(&get("时宜")),
            "ji": split_words(&get("时忌")),
            "wuxing": get("五行"),
            "shaDirection": get("煞方"),
            "caiShen": get("财神"),
            "xiShen": get("喜神"),
            "wuxingPct": Vec::<f64>::new(),
        }));
    }

    // 构造结果
    let mut obj = serde_json::Map::new();
    obj.insert("date".into(), serde_json::Value::String(date.clone()));
    obj.insert("lunar".into(), serde_json::Value::String(lunar_full.clone()));
    obj.insert("ganzhiYear".into(), serde_json::Value::String(ganzhi_year.clone()));
    obj.insert("ganzhiMonth".into(), serde_json::Value::String(ganzhi_month.clone()));
    obj.insert("ganzhiDay".into(), serde_json::Value::String(ganzhi_day.clone()));
    obj.insert("zodiac".into(), serde_json::Value::String(zodiac.clone()));
    obj.insert("constellation".into(), serde_json::Value::String(constellation.clone()));
    if !wuxing_year.is_empty() { obj.insert("wuxingYear".into(), serde_json::Value::String(wuxing_year.clone())); }
    if !wuxing_month.is_empty() { obj.insert("wuxingMonth".into(), serde_json::Value::String(wuxing_month.clone())); }
    if !wuxing_day.is_empty() { obj.insert("wuxingDay".into(), serde_json::Value::String(wuxing_day.clone())); }
    if !wuxing_numeric.is_empty() { obj.insert("wuxingNumeric".into(), serde_json::Value::String(wuxing_numeric.clone())); }
    obj.insert("solarFull".into(), serde_json::Value::String(solar_full.clone()));
    obj.insert("lunarFull".into(), serde_json::Value::String(lunar_full.clone()));
    obj.insert("pillars".into(), serde_json::Value::String(pillars.clone()));
    let t0 = terms.first().cloned().unwrap_or_default();
    let t1 = terms.get(1).cloned().unwrap_or_default();
    obj.insert("solarTerm".into(), serde_json::json!({"name": t0.split_whitespace().next().unwrap_or(""), "date": t0, "time": ""}));
    obj.insert("nextSolarTerm".into(), serde_json::json!({"name": t1.split_whitespace().next().unwrap_or(""), "date": t1, "time": ""}));
    if !duty_god.is_empty() { obj.insert("dutyGod".into(), serde_json::Value::String(duty_god.clone())); }
    if !twelve_star.is_empty() { obj.insert("twelveStar".into(), serde_json::Value::String(twelve_star.clone())); }
    if !liu_yao.is_empty() { obj.insert("liuYao".into(), serde_json::Value::String(liu_yao.clone())); }
    if !ri_lu.is_empty() { obj.insert("riLu".into(), serde_json::Value::String(ri_lu.clone())); }
    obj.insert("lunarYearDays".into(), serde_json::json!({
        "year": ganzhi_year.clone(),
        "total": lunar_year_days_total.parse::<i32>().unwrap_or(0),
        "range": lunar_year_range,
        "passed": lunar_year_passed.parse::<i32>().unwrap_or(0),
        "remaining": lunar_year_remaining.parse::<i32>().unwrap_or(0),
    }));
    obj.insert("monthState".into(), serde_json::json!({
        "monthOrder": month_order,
        "phenology": phenology,
        "phase": phase,
    }));
    obj.insert("yi".into(), serde_json::Value::Array(yi.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("ji".into(), serde_json::Value::Array(ji.into_iter().map(serde_json::Value::String).collect()));
    if !cai_shen.is_empty() { obj.insert("caiShen".into(), serde_json::Value::String(cai_shen.clone())); }
    if !xi_shen.is_empty() { obj.insert("xiShen".into(), serde_json::Value::String(xi_shen.clone())); }
    if !fu_shen.is_empty() { obj.insert("fuShen".into(), serde_json::Value::String(fu_shen.clone())); }
    obj.insert("guiShen".into(), serde_json::json!({"yang": gui_yang, "yin": gui_yin}));
    obj.insert("taiShen".into(), serde_json::json!({"month": taishen_month, "day": taishen_day, "direction": taishen_direction}));
    obj.insert("chong".into(), serde_json::Value::String(chong));
    obj.insert("luckyGods".into(), serde_json::Value::Array(lucky_gods.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("evilGods".into(), serde_json::Value::Array(evil_gods.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("pengzu".into(), serde_json::Value::Array(pengzu_lines.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("daLianLuckyHours".into(), serde_json::Value::Array(da_lian_lucky_hours.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("kongWang".into(), serde_json::json!({"year": kong_year, "month": kong_month, "day": kong_day}));
    obj.insert("nineStar".into(), serde_json::json!({"name": nine_star_desc.clone(), "description": nine_star_desc, "poem": ""}));
    obj.insert("starSign".into(), serde_json::Value::String(star_sign));
    obj.insert("riHu".into(), serde_json::Value::String(ri_hu));
    obj.insert("chongHe".into(), serde_json::Value::Array(chong_he.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("sanSha".into(), serde_json::json!({"year": san_sha_year, "month": san_sha_month, "day": san_sha_day}));
    obj.insert("qiSha".into(), serde_json::json!({"year": qi_sha_year, "month": qi_sha_month, "day": qi_sha_day}));
    obj.insert("suiSha".into(), serde_json::json!({"year": sui_sha, "month": yue_sha}));
    obj.insert("luoshu".into(), serde_json::json!({"name": "", "poem": luoshu_poem, "interpretation": ""}));
    obj.insert("gua".into(), serde_json::json!({"name": gua_name, "description": ""}));
    obj.insert("hours".into(), serde_json::Value::Array(hours));
    obj.insert("twelveStarPoem".into(), serde_json::Value::String(twelve_star_poem));
    obj.insert("starSignPoem".into(), serde_json::Value::String(star_sign_poem));
    obj.insert("dimu".into(), serde_json::Value::Array(dimu.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("dimuPoem".into(), serde_json::Value::Array(dimu_poem.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("harvestPoem".into(), serde_json::Value::Array(harvest.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("marriageTable".into(), serde_json::json!({"forbidden": Vec::<String>::new(), "allowed": Vec::<String>::new()}));
    obj.insert("source".into(), serde_json::Value::String("huangli123.net".to_string()));
    Ok(serde_json::Value::Object(obj))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            cherry_models,
            cherry_chat_stream,
            ai_models,
            ai_chat_stream,
            read_profiles,
            write_profiles,
            location_lookup,
            location_regeo,
            huangli_lookup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 简易 URL 编码
fn urlencoding(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char);
            }
            _ => out.push_str(&format!("%{:02X}", b)),
        }
    }
    out
}
