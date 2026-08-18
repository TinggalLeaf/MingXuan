/**
 * PDF 导出工具
 *
 * 流程：生成完整打印 HTML → 用系统浏览器打开 → 用户「另存为 PDF」。
 *   - Tauri 桌面端：经 Rust 命令 save_print_html 写入临时文件，
 *     再由 plugin-opener 用系统默认浏览器打开（WebView2 里 window.open 不可靠）。
 *   - 浏览器开发态：退化为 window.open 打印专用窗口。
 *
 * 适用场景：排盘（八字/紫微/星盘/合盘/...）、AI 解读报告、周公解梦详情、黄历查询。
 */

import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./ai";
import { alertInfo } from "./dialog";

export interface PrintOptions {
  title?: string;
  /** 文档副标题（如「八字命盘 · 2026-08-16」） */
  subtitle?: string;
  /** 是否自动弹出打印对话框 */
  autoPrint?: boolean;
  /** 自定义 CSS 注入（按需补充页面专属样式） */
  extraCss?: string;
}

/**
 * 把已渲染好的 HTML 片段包装成完整打印文档并打开。
 * Tauri 下异步落盘 + 系统浏览器打开；浏览器下新开打印窗口。
 */
export async function openPrintWindow(html: string, opts: PrintOptions = {}): Promise<void> {
  const doc = buildPrintDocument(html, opts);

  if (isTauri) {
    try {
      const path = await invoke<string>("save_print_html", { html: doc });
      const { openPath } = await import("@tauri-apps/plugin-opener");
      await openPath(path);
    } catch (e) {
      await alertInfo(`导出失败：${(e as Error).message}`, { title: "PDF 导出", kind: "error" });
    }
    return;
  }

  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) {
    await alertInfo("浏览器拦截了弹窗，请允许本站点弹窗后再试。", { title: "PDF 导出" });
    return;
  }
  w.document.open();
  w.document.write(doc);
  w.document.close();
}

/** 组装完整打印 HTML 文档（含全局样式、封面与页脚） */
function buildPrintDocument(html: string, opts: PrintOptions): string {
  const title = opts.title || "明玄 · 排盘报告";
  const subtitle = opts.subtitle || "";
  const extra = opts.extraCss || "";
  const auto = opts.autoPrint !== false;

  // 取一份父页面已加载的全局样式（颜色变量、字体、.md 等），保证打印效果一致
  const parentCss = collectParentCss();

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${escape(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700;900&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
${parentCss}
${extra}

    body {
      margin: 0;
      padding: 0;
      background: #faf6ec;
      color: #1f1b14;
      font-family: "Noto Serif SC", "Source Han Serif SC", serif;
      line-height: 1.85;
    }
    .mx-print-page {
      max-width: 760px;
      margin: 0 auto;
      padding: 36px 48px;
      background: #fff;
      min-height: 100vh;
    }
    .mx-print-cover {
      text-align: center;
      padding: 64px 0 48px;
      border-bottom: 2px solid #c9a45c;
      margin-bottom: 28px;
    }
    .mx-print-cover h1 {
      font-size: 28px;
      letter-spacing: 0.4em;
      margin: 0 0 8px;
      color: #1f1b14;
    }
    .mx-print-cover .subtitle {
      color: #97865e;
      letter-spacing: 0.2em;
      font-size: 14px;
    }
    .mx-print-cover .seal {
      display: inline-block;
      padding: 6px 14px;
      background: #c8402a;
      color: #fdf3e3;
      font-weight: 700;
      letter-spacing: 0.3em;
      margin-top: 24px;
      border-radius: 3px;
    }
    .mx-print-section {
      margin: 22px 0;
    }
    .mx-print-section h2 {
      color: #c9a45c;
      font-size: 17px;
      letter-spacing: 0.2em;
      border-left: 4px solid #c9a45c;
      padding-left: 10px;
      margin: 0 0 12px;
    }
    .mx-print-section p {
      margin: 6px 0;
      text-align: justify;
    }
    .mx-print-section strong { color: #c9a45c; }
    .mx-print-footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid rgba(201,164,92,.3);
      color: #97865e;
      font-size: 11px;
      letter-spacing: 0.1em;
      text-align: center;
    }
    @media print {
      body { background: #fff; }
      .mx-print-page { box-shadow: none; padding: 24px 36px; }
    }
  </style>
</head>
<body>
  <div class="mx-print-page">
    <div class="mx-print-cover">
      <div style="font-size:11px;letter-spacing:.3em;color:#97865e;">MINGXUAN · 中华玄学综合排盘</div>
      <h1>${escape(title)}</h1>
      ${subtitle ? `<div class="subtitle">${escape(subtitle)}</div>` : ""}
      <div class="seal">明玄</div>
    </div>
    ${html}
    <div class="mx-print-footer">
      本报告由明玄 MingXuan 生成 · 仅供传统文化研究与娱乐参考 · ${new Date().toLocaleString("zh-CN")}
    </div>
  </div>
  <script>
    ${auto ? `window.addEventListener('load', () => setTimeout(() => window.print(), 250));` : ""}
  </script>
</body>
</html>`;
}

/** 抓取父页面 <style> 内容（@theme 变量、字体、.md 等） */
function collectParentCss(): string {
  let out = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules ?? sheet.rules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        out += rule.cssText + "\n";
      }
    } catch {
      /* 跨域 stylesheet 不可访问 */
    }
  }
  return out;
}

function escape(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]!));
}

/** Markdown → 用于 PDF 的格式化 HTML（简化：保留段落分隔 + 加粗转 <strong>） */
export function markdownToHtmlForPdf(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((b) => {
      const t = b.trim();
      if (!t) return "";
      const inlined = t
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/^#{1,4}\s+(.+)$/, "<strong>$1</strong>");
      return `<p>${inlined.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");
}
