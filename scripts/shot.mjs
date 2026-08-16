// 用 Chrome headless + CDP 截图（支持注入 JS 交互）
// 用法: node scripts/shot.mjs <url> <out.png> [injectJsFile] [waitMs]
import { spawn } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import http from "node:http";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [, , url, out, injectFile, waitMsArg] = process.argv;
const waitMs = Number(waitMsArg || 4000);
const PORT = 9333;

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu",
  `--remote-debugging-port=${PORT}`,
  "--user-data-dir=C:/Users/19772/AppData/Local/Temp/mx-shot-profile",
  "--window-size=1440,2400",
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const body = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${PORT}/json/list`, (res) => {
          let d = "";
          res.on("data", (c) => (d += c));
          res.on("end", () => resolve(d));
        }).on("error", reject);
      });
      const targets = JSON.parse(body);
      const page = targets.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(500);
  }
  throw new Error("CDP not ready");
}

async function main() {
  const ws = new WebSocket(await getWsUrl());
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
    }
  };
  await new Promise((r) => (ws.onopen = r));

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url });
  await sleep(2500);

  if (injectFile && existsSync(injectFile)) {
    const js = readFileSync(injectFile, "utf8");
    await send("Runtime.evaluate", { expression: js, awaitPromise: true });
  }
  await sleep(waitMs);

  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(out, Buffer.from(shot.data, "base64"));
  console.log("saved:", out);
  ws.close();
  chrome.kill();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
