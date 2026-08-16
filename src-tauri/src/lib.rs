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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            cherry_models,
            cherry_chat_stream,
            ai_models,
            ai_chat_stream,
            read_profiles,
            write_profiles
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
