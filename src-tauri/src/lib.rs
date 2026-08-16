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

use serde::Deserialize;

#[derive(Deserialize)]
struct LocationSearchArgs {
    provider: String,
    api_key: String,
    q: String,
}

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
    let extract = |re: &str| -> Option<String> {
        let re = regex::Regex::new(re).ok()?;
        re.captures(&html)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().trim().to_string())
    };
    let lucky_hours: Vec<String> = regex::Regex::new(
        r"吉时[：:]?\s*([子丑寅卯辰巳午未申酉戌亥]时\s*[\d]{2}:[\d]{2}-[\d]{2}:[\d]{2})",
    )
    .ok()
    .map(|re| {
        re.captures_iter(&html)
            .filter_map(|c| c.get(1).map(|m| m.as_str().to_string()))
            .collect()
    })
    .unwrap_or_default();
    Ok(serde_json::json!({
        "chongsha": extract(r"冲[煞]?[：:]\s*([^\s<]+(?:煞[东南西北]+)?)"),
        "taishen": extract(r"胎神[方在占位]+[：:]?\s*([^\s<]+)"),
        "pengzu": extract(r"彭祖百忌[：:]\s*([^\n<]+)"),
        "luckyHours": lucky_hours,
        "source": "huangli123.net",
    }))
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
