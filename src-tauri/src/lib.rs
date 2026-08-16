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

    // 通用：按正则抽取并 trim
    let cap1 = |re: &str| -> Option<String> {
        let r = regex::Regex::new(re).ok()?;
        r.captures(&html)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().trim().to_string())
    };
    let cap_all = |re: &str| -> Vec<String> {
        regex::Regex::new(re)
            .ok()
            .map(|r| {
                r.captures_iter(&html)
                    .filter_map(|c| c.get(1).map(|m| m.as_str().trim().to_string()))
                    .filter(|s| !s.is_empty())
                    .collect()
            })
            .unwrap_or_default()
    };

    // ===== 基础信息 =====
    let solar_term_cur = cap1(r"节气[：:]\s*([一-龥]+)\s*(\d+月\d+日)\s*([一-\u6 Saturday]+)?\s*(\d{2}:\d{2})?");
    let _ = solar_term_cur; // 简化处理

    // 节气：解析所有 "节气：xxx X月X日 星期X HH:MM"
    let terms: Vec<serde_json::Value> = regex::Regex::new(r"节气[：:]\s*([一-龥]+)\s*(\d+月\d+日)(?:\s*星期[一二三四五六日天])?\s*(\d{2}:\d{2})?")
        .ok()
        .map(|r| {
            r.captures_iter(&html)
                .map(|c| {
                    serde_json::json!({
                        "name": c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default(),
                        "date": c.get(2).map(|m| m.as_str().to_string()).unwrap_or_default(),
                        "time": c.get(3).map(|m| m.as_str().to_string()).unwrap_or_default(),
                    })
                })
                .collect()
        })
        .unwrap_or_default();
    let solar_term = terms.first().cloned().unwrap_or(serde_json::json!(null));
    let next_solar_term = terms.get(1).cloned();

    let ganzhi_year = cap1(r"(\w{2})年\s*属\w").unwrap_or_default();
    let ganzhi_month = cap1(r"(\w{2})月\s*属\w").unwrap_or_default();
    let ganzhi_day = cap1(r"(\w{2})日\s*属\w").unwrap_or_default();

    let zodiac = cap1(r"(\w{2})年\s*属(\w)").map(|s| s.chars().last().map(|c| c.to_string()).unwrap_or_default()).unwrap_or_default();
    let constellation = cap1(r"(\w{2}座)").unwrap_or_default();

    // 五行（年/月/日）
    let wuxing_year = cap1(r"\w{2}年\s*属\w\s*(\w{4})");
    let wuxing_month = cap1(r"\w{2}月\s*属\w\s*(\w{4})");
    let wuxing_day = cap1(r"\w{2}日\s*属\w\s*(\w{4})");
    let wuxing_numeric = cap1(r"甲子五行\s*(\w)");

    let duty_god = cap1(r"值神\s*(\w{1,4}(?:[\(（][一-龥]+[\)）])?)");
    let twelve_star = cap1(r"十二神\s*(\w{1,3})");
    let liu_yao = cap1(r"六耀[：:]?\s*(\w{2})");
    let ri_lu = cap1(r"日禄[：:]?\s*(\S{4,16})");

    let lunar = cap1(r"农历[（(]阴历[)）]\s*([一-龥0-9]+月[一-龥0-9]+)");
    let lunar_year_days_total = cap1(r"农历总共有\s*(\d+)\s*天");
    let lunar_year_range = cap1(r"起止日期[：:]\s*([\d\.\-]+)");
    let lunar_year_passed = cap1(r"已过(\d+)天").unwrap_or_default();
    let lunar_year_remaining = cap1(r"还剩(\d+)天").unwrap_or_default();
    let solar_full = cap1(r"公历[\(（]阳历[\)）]\s*([一-龥0-9]+年\d+月\d+日\s*星期[一-龥]+)").unwrap_or_default();
    let lunar_full_inner = cap1(r"农历[\(（]阴历[\)）]\s*([一-龥0-9]+年[一-龥0-9]+月[一-龥0-9]+\s*[一-龥]?)").unwrap_or_default();
    let pillars = cap1(r"(\w{2}年\s*\w{2}月\s*\w{2}日)").unwrap_or_default();

    let month_order = cap1(r"月令[：:]?\s*([一-龥]{2})");
    let phenology = cap1(r"物候[：:]?\s*([一-龥]+)");
    let phase = cap1(r"月相[：:]?\s*([一-龥]+)");

    // 宜 / 忌（块内所有非空行，区分在「所宜」「所忌」块内）
    let yi_block = regex::Regex::new(r"老黄历所宜([\s\S]*?)老黄历所忌")
        .ok()
        .and_then(|r| r.captures(&html))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default())
        .unwrap_or_default();
    let ji_block = regex::Regex::new(r"老黄历所忌([\s\S]*?)节气[：:]")
        .ok()
        .and_then(|r| r.captures(&html))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default())
        .unwrap_or_default();
    let extract_words = |s: &str| -> Vec<String> {
        s.split(|c: char| c.is_whitespace() || c == '\u{3000}')
            .filter(|t| !t.is_empty() && t.chars().count() >= 2 && t.chars().count() <= 8)
            .map(|t| t.to_string())
            .collect()
    };
    let yi: Vec<String> = extract_words(&yi_block);
    let ji: Vec<String> = extract_words(&ji_block);

    // 神煞方位
    let cai_shen = cap1(r"财神\s*(\S{1,4})");
    let xi_shen = cap1(r"喜神\s*(\S{1,4})");
    let fu_shen = cap1(r"福神\s*(\S{1,4})");
    let gui_yang = cap1(r"阳贵神[：:]?\s*(\S{1,4})");
    let gui_yin = cap1(r"阴贵神[：:]?\s*(\S{1,4})");

    // 胎神
    let taishen_month = cap1(r"本月[：:]?\s*(\S{1,8})");
    let taishen_day = cap1(r"今日[：:]?\s*(\S{1,12})");
    let taishen_direction = cap1(r"占(\S{1,8})(?:[，]|$)");

    // 相冲
    let chong = cap1(r"相冲\s*(\S{1,16})");

    // 吉神宜趋
    let lucky_gods_block = regex::Regex::new(r"吉神宜趋\s*([\s\S]*?)凶煞宜忌")
        .ok()
        .and_then(|r| r.captures(&html))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default())
        .unwrap_or_default();
    let lucky_gods: Vec<String> = lucky_gods_block
        .split(|c: char| c.is_whitespace() || c == '\u{3000}')
        .filter(|t| !t.is_empty() && t.chars().count() >= 2 && t.chars().count() <= 6)
        .map(|t| t.to_string())
        .take(20)
        .collect();

    // 凶煞宜忌
    let evil_gods_block = regex::Regex::new(r"凶煞宜忌\s*([\s\S]*?)彭祖百忌")
        .ok()
        .and_then(|r| r.captures(&html))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default())
        .unwrap_or_default();
    let evil_gods: Vec<String> = evil_gods_block
        .split(|c: char| c.is_whitespace() || c == '\u{3000}')
        .filter(|t| !t.is_empty() && t.chars().count() >= 2 && t.chars().count() <= 6)
        .map(|t| t.to_string())
        .take(30)
        .collect();

    // 彭祖百忌
    let pengzu_lines: Vec<String> = cap_all(r"(\w{1,3}[一-龥]+[^\n<]{0,15})")
        .into_iter()
        .filter(|s| {
            s.starts_with("癸不") || s.starts_with("亥不") || s.starts_with("甲不")
                || s.starts_with("乙不") || s.starts_with("丙不") || s.starts_with("丁不")
                || s.starts_with("戊不") || s.starts_with("己不") || s.starts_with("庚不")
                || s.starts_with("辛不") || s.starts_with("壬不") || s.starts_with("子不")
                || s.starts_with("丑不") || s.starts_with("寅不") || s.starts_with("卯不")
                || s.starts_with("辰不") || s.starts_with("巳不") || s.starts_with("午不")
                || s.starts_with("未不") || s.starts_with("申不") || s.starts_with("酉不")
                || s.starts_with("戌不")
        })
        .collect();

    // 大殓吉时
    let da_lian_block = regex::Regex::new(r"大殓吉时\s*([\s\S]*?)空亡所值")
        .ok()
        .and_then(|r| r.captures(&html))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default())
        .unwrap_or_default();
    let da_lian_lucky_hours: Vec<String> = da_lian_block
        .split(|c: char| c.is_whitespace())
        .filter(|t| t.ends_with("时") && t.chars().count() <= 3)
        .map(|t| t.to_string())
        .collect();

    // 空亡所值
    let kong_year = cap1(r"年\s*(\S{1,4})\s*月");
    let kong_month = cap1(r"月\s*(\S{1,4})\s*日");
    let kong_day = cap1(r"日\s*(\S{1,4})(?:\s|九|$)");

    // 九宫飞星
    let nine_star_name = cap1(r"九宫飞星\s*([一-龥]+(?:星)?)");
    let nine_star_desc = cap1(r"([一-龥]+-招摇星\([一-龥]\)-[一-龥]+)");
    let nine_star_poem = cap1(r"招摇号木星[\s\S]*?([一-龥、，。\s]{20,80})");

    // 星宿
    let star_sign = cap1(r"今日星宿[：:]?\s*([一-龥]+(?:鹿|马|鸡|蛇|龙|鼠|牛|虎|兔|猴|狗|猪|羊)?-[一-龥]+)");
    let ri_hu = cap1(r"的呼勿近[：:]?\s*(\S{1,8})");

    // 冲合
    let chong_he_block = regex::Regex::new(r"今日冲合\s*([\s\S]*?)三煞方")
        .ok()
        .and_then(|r| r.captures(&html))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default())
        .unwrap_or_default();
    let chong_he: Vec<String> = chong_he_block
        .split(|c: char| c.is_whitespace())
        .filter(|t| t.starts_with("与肖") && t.chars().count() <= 12)
        .map(|t| t.to_string())
        .collect();

    // 三煞方
    let sansha_year = cap1(r"本年三煞[：:]?\s*在(\S)\s*占(\S+)");
    let sansha_month = cap1(r"本月三煞[：:]?\s*在(\S)\s*占(\S+)");
    let sansha_day = cap1(r"今日三煞[：:]?\s*在(\S)\s*占(\S+)");

    // 七煞方
    let qisha_year = cap1(r"年七煞[：:]?\s*(\S+)");
    let qisha_month = cap1(r"月七煞[：:]?\s*(\S+)");
    let qisha_day = cap1(r"日七煞[：:]?\s*(\S+)");
    let sui_sha = cap1(r"本年岁煞[：:]?\s*(\S)");
    let yue_sha = cap1(r"月煞[：:]?\s*(\S)");

    // 河图洛书
    let luoshu_name = cap1(r"应\w+之宿\s*其号为\w+");
    let luoshu_poem = cap1(r"招摇号木星[\s\S]*?(先天[一-龥]+\s*后天[一-龥]+[\s\S]{20,160}?)(?=今日卦象|应\w+之宿)");
    let luoshu_interp = cap1(r"招摇号木星[\s\S]{20,500}?([一-龥]{4}[，。][一-龥\s，。]{10,40})");

    // 卦象
    let gua_name = cap1(r"今日卦象[：:]?\s*([一-龥]+卦)");
    let gua_desc = cap1(r"(山地剥\s+剥卦\s+[一-龥]+\s+中[一-龥]卦)");

    // 十二时辰完整表（提取每个时辰的所有字段）
    let hour_table = regex::Regex::new(
        r"子时\s*23:00-00:59([\s\S]*?)亥时\s*21:00-22:59",
    )
    .ok()
    .and_then(|r| r.captures(&html))
    .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default())
    .unwrap_or_default();

    let shichens = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    let time_ranges = [
        "23:00-00:59", "01:00-02:59", "03:00-04:59", "05:00-06:59",
        "07:00-08:59", "09:00-10:59", "11:00-12:59", "13:00-14:59",
        "15:00-16:59", "17:00-18:59", "19:00-20:59", "21:00-22:59",
    ];

    // 简化：从表格里按行号提取（每个时辰大约 5-7 行）
    let mut hours: Vec<serde_json::Value> = Vec::new();
    let _lines: Vec<&str> = hour_table.lines().filter(|l| !l.trim().is_empty()).collect();
    // 简化策略：每个时辰对应 ~5 行连续数据
    for (i, sc) in shichens.iter().enumerate() {
        // 找到对应的五行旺衰百分比行（先尝试）
        // 不再逐字段解析复杂表格（信息密度过大，TS 端已有 tyme4ts 兜底）
        // 这里只填关键字段
        hours.push(serde_json::json!({
            "shichen": sc,
            "timeRange": time_ranges.get(i).copied().unwrap_or(""),
            "wuxingPct": [],
        }));
    }

    let twelve_star_poem = cap1(r"今日十二神吉凶所主\s*([\s\S]{1,80})");
    let star_sign_poem = cap1(r"今日二十八星宿吉凶\s*([一-龥，。、\s]{10,80})");

    let dimu_block = regex::Regex::new(r"地母经卜曰\s*([\s\S]*?)地母经诗曰")
        .ok()
        .and_then(|r| r.captures(&html))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default())
        .unwrap_or_default();
    let dimu: Vec<String> = dimu_block
        .split('\n')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty() && s.chars().count() >= 4)
        .collect();
    let dimu_poem_block = regex::Regex::new(r"地母经诗曰\s*([\s\S]*?)七月丰歉歌")
        .ok()
        .and_then(|r| r.captures(&html))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default())
        .unwrap_or_default();
    let dimu_poem: Vec<String> = dimu_poem_block
        .split('\n')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty() && s.chars().count() >= 4)
        .collect();
    let harvest_block = regex::Regex::new(r"七月丰歉歌\s*([\s\S]*?)(?:\n\s*\n|\n时辰)")
        .ok()
        .and_then(|r| r.captures(&html))
        .map(|c| c.get(1).map(|m| m.as_str().to_string()).unwrap_or_default())
        .unwrap_or_default();
    let harvest: Vec<String> = harvest_block
        .split('\n')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty() && s.chars().count() >= 4)
        .collect();

    // 构造结果 JSON（分块插入避免 serde_json::json! 宏递归超限）
    let mut obj = serde_json::Map::new();
    obj.insert("date".into(), serde_json::Value::String(date.clone()));
    obj.insert("lunar".into(), serde_json::Value::String(lunar.unwrap_or_default()));
    obj.insert("ganzhiYear".into(), serde_json::Value::String(ganzhi_year.clone()));
    obj.insert("ganzhiMonth".into(), serde_json::Value::String(ganzhi_month.clone()));
    obj.insert("ganzhiDay".into(), serde_json::Value::String(ganzhi_day.clone()));
    obj.insert("zodiac".into(), serde_json::Value::String(zodiac.clone()));
    obj.insert("constellation".into(), serde_json::Value::String(constellation.clone()));
    if let Some(v) = wuxing_year { obj.insert("wuxingYear".into(), serde_json::Value::String(v)); }
    if let Some(v) = wuxing_month { obj.insert("wuxingMonth".into(), serde_json::Value::String(v)); }
    if let Some(v) = wuxing_day { obj.insert("wuxingDay".into(), serde_json::Value::String(v)); }
    if let Some(v) = wuxing_numeric { obj.insert("wuxingNumeric".into(), serde_json::Value::String(v)); }
    obj.insert("solarTerm".into(), solar_term.clone());
    obj.insert("nextSolarTerm".into(), next_solar_term.unwrap_or(serde_json::Value::Null));
    if let Some(v) = duty_god { obj.insert("dutyGod".into(), serde_json::Value::String(v)); }
    if let Some(v) = twelve_star { obj.insert("twelveStar".into(), serde_json::Value::String(v)); }
    if let Some(v) = liu_yao { obj.insert("liuYao".into(), serde_json::Value::String(v)); }
    if let Some(v) = ri_lu { obj.insert("riLu".into(), serde_json::Value::String(v)); }
    obj.insert("solarFull".into(), serde_json::Value::String(solar_full.clone()));
    obj.insert("lunarFull".into(), serde_json::Value::String(lunar_full_inner.clone()));
    obj.insert("pillars".into(), serde_json::Value::String(pillars.clone()));
    obj.insert("lunarYearDays".into(), serde_json::json!({
        "year": ganzhi_year,
        "total": lunar_year_days_total.unwrap_or_default().parse::<i32>().unwrap_or(0),
        "range": lunar_year_range.unwrap_or_default(),
        "passed": lunar_year_passed.parse::<i32>().unwrap_or(0),
        "remaining": lunar_year_remaining.parse::<i32>().unwrap_or(0),
    }));
    obj.insert("monthState".into(), serde_json::json!({
        "monthOrder": month_order.unwrap_or_default(),
        "phenology": phenology.unwrap_or_default(),
        "phase": phase.unwrap_or_default(),
    }));
    obj.insert("yi".into(), serde_json::Value::Array(yi.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("ji".into(), serde_json::Value::Array(ji.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("caiShen".into(), serde_json::Value::String(cai_shen.unwrap_or_default()));
    obj.insert("xiShen".into(), serde_json::Value::String(xi_shen.unwrap_or_default()));
    obj.insert("fuShen".into(), serde_json::Value::String(fu_shen.unwrap_or_default()));
    obj.insert("guiShen".into(), serde_json::json!({
        "yang": gui_yang.unwrap_or_default(),
        "yin": gui_yin.unwrap_or_default(),
    }));
    obj.insert("taiShen".into(), serde_json::json!({
        "month": taishen_month.unwrap_or_default(),
        "day": taishen_day.unwrap_or_default(),
        "direction": taishen_direction.unwrap_or_default(),
    }));
    obj.insert("chong".into(), serde_json::Value::String(chong.unwrap_or_default()));
    obj.insert("luckyGods".into(), serde_json::Value::Array(lucky_gods.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("evilGods".into(), serde_json::Value::Array(evil_gods.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("pengzu".into(), serde_json::Value::Array(pengzu_lines.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("daLianLuckyHours".into(), serde_json::Value::Array(da_lian_lucky_hours.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("kongWang".into(), serde_json::json!({
        "year": kong_year.unwrap_or_default(),
        "month": kong_month.unwrap_or_default(),
        "day": kong_day.unwrap_or_default(),
    }));
    obj.insert("nineStar".into(), serde_json::json!({
        "name": nine_star_name.unwrap_or_default(),
        "description": nine_star_desc.unwrap_or_default(),
        "poem": nine_star_poem.unwrap_or_default(),
    }));
    obj.insert("starSign".into(), serde_json::Value::String(star_sign.unwrap_or_default()));
    obj.insert("riHu".into(), serde_json::Value::String(ri_hu.unwrap_or_default()));
    obj.insert("chongHe".into(), serde_json::Value::Array(chong_he.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("sanSha".into(), serde_json::json!({
        "year": sansha_year.unwrap_or_default(),
        "month": sansha_month.unwrap_or_default(),
        "day": sansha_day.unwrap_or_default(),
    }));
    obj.insert("qiSha".into(), serde_json::json!({
        "year": qisha_year.unwrap_or_default(),
        "month": qisha_month.unwrap_or_default(),
        "day": qisha_day.unwrap_or_default(),
    }));
    obj.insert("suiSha".into(), serde_json::json!({
        "year": sui_sha.unwrap_or_default(),
        "month": yue_sha.unwrap_or_default(),
    }));
    obj.insert("luoshu".into(), serde_json::json!({
        "name": luoshu_name.unwrap_or_default(),
        "poem": luoshu_poem.unwrap_or_default(),
        "interpretation": luoshu_interp.unwrap_or_default(),
    }));
    obj.insert("gua".into(), serde_json::json!({
        "name": gua_name.unwrap_or_default(),
        "description": gua_desc.unwrap_or_default(),
    }));
    obj.insert("hours".into(), serde_json::Value::Array(hours));
    obj.insert("twelveStarPoem".into(), serde_json::Value::String(twelve_star_poem.unwrap_or_default()));
    obj.insert("starSignPoem".into(), serde_json::Value::String(star_sign_poem.unwrap_or_default()));
    obj.insert("dimu".into(), serde_json::Value::Array(dimu.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("dimuPoem".into(), serde_json::Value::Array(dimu_poem.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("harvestPoem".into(), serde_json::Value::Array(harvest.into_iter().map(serde_json::Value::String).collect()));
    obj.insert("marriageTable".into(), serde_json::json!({
        "forbidden": Vec::<String>::new(),
        "allowed": Vec::<String>::new(),
    }));
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
