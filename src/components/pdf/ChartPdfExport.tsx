/**
 * 通用「导出 PDF」按钮 + 弹出打印窗口。
 *
 * 各排盘/占卜页只需把结构化数据 + AI 解读 markdown 传入即可生成精美排版的 PDF。
 */

import { Download } from "lucide-react";
import { openPrintWindow, markdownToHtmlForPdf } from "@/lib/pdf";

export interface ChartSection {
  /** 板块标题（如「四柱排盘」「十神配置」） */
  heading: string;
  /** HTML 字符串；若是 markdown 文本可用 markdownToHtmlForPdf 转换 */
  body: string;
}

export interface ChartPdfExportProps {
  /** PDF 主标题（如「八字命盘」） */
  title: string;
  /** PDF 副标题（如出生信息 / 日期 / 关系） */
  subtitle?: string;
  /** 板块列表（标题 + HTML） */
  sections: ChartSection[];
  /** 是否自动打印（默认 true） */
  autoPrint?: boolean;
  /** 按钮额外 className */
  className?: string;
}

export function ChartPdfExportButton({
  title,
  subtitle,
  sections,
  autoPrint = true,
  className = "btn-ghost !px-3 !py-1.5 text-sm",
}: ChartPdfExportProps) {
  function exportPdf() {
    const html = sections
      .map((s) => `<section class="mx-print-section"><h2>${escape(s.heading)}</h2><div>${s.body}</div></section>`)
      .join("");
    openPrintWindow(html, { title, subtitle, autoPrint });
  }
  return (
    <button type="button" onClick={exportPdf} className={className}>
      <Download className="h-4 w-4" />
      导出 PDF
    </button>
  );
}

/** 把 markdown 文本转为适合 PDF 打印的 HTML（共享给所有排盘页） */
export function pdfMarkdown(md: string): string {
  return markdownToHtmlForPdf(md);
}

function escape(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]!));
}