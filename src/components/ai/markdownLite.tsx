/**
 * 增强版 Markdown 渲染器
 *
 * 支持元素：#-#### 标题 / **加粗** / *斜体* / `行内代码` / ```代码块```
 * - 无序列表、有序列表（1./1、/1)）
 * - 引用（>）、分割线（---）、表格（| col | col |）、链接 [text](url)
 *
 * 设计目标：
 * - 不引入第三方依赖（避免体积膨胀），但实现常见 Markdown 子集；
 * - 与 .md 容器样式配合，自动获得 h1/h2 描边、blockquote 朱线、表格金边等视觉；
 * - 支持流式输出（按行缓存，不依赖一次性完整文本）。
 */

interface Block {
  type: "h1" | "h2" | "h3" | "h4" | "p" | "ul" | "ol" | "code" | "blockquote" | "hr" | "table";
  /** 主内容：段落/标题/列表/引用/代码为字符串；表格为行数组 */
  content: string | string[] | string[][];
  /** 表格表头（首行） */
  meta?: string[];
}

export function parseMarkdown(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      i++;
      continue;
    }

    // 代码块 ```
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // 跳过结尾 ```
      blocks.push({ type: "code", content: buf.join("\n") });
      continue;
    }

    // 表格
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?[\s\-:|]+\|?/.test(lines[i + 1])) {
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      const header = rows.shift();
      rows.shift(); // 分隔行
      blocks.push({ type: "table", content: rows, meta: header });
      continue;
    }

    // 标题
    const hMatch = /^(#{1,4})\s+(.+)$/.exec(line);
    if (hMatch) {
      const level = hMatch[1].length as 1 | 2 | 3 | 4;
      blocks.push({ type: (`h${level}` as Block["type"]), content: hMatch[2].trim() });
      i++;
      continue;
    }

    // 分割线
    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: "hr", content: "" });
      i++;
      continue;
    }

    // 引用
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", content: buf.join("\n") });
      continue;
    }

    // 无序列表
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", content: items });
      continue;
    }

    // 有序列表
    if (/^\s*\d+[.、)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.、)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.、)]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", content: items });
      continue;
    }

    // 普通段落（合并连续非空行）
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s|>\s?|[-*•]\s|\d+[.、)]\s+|```|---\s*$|\s*\|)/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    if (buf.length) blocks.push({ type: "p", content: buf.join("\n") });
  }

  return blocks;
}

function parseRow(line: string): string[] {
  const trimmed = line.replace(/^\s*\|/, "").replace(/\|\s*$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

/** 内联格式：加粗/斜体/行内代码/链接/简易 emoji 转义 */
export function renderInline(text: string): React.ReactNode[] {
  // 先按代码切片，避免内部被解析
  const tokens: { type: "text" | "code" | "rest"; value: string }[] = [];
  const codeRe = /`([^`\n]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(text))) {
    if (m.index > last) tokens.push({ type: "rest", value: text.slice(last, m.index) });
    tokens.push({ type: "code", value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ type: "rest", value: text.slice(last) });

  return tokens.flatMap((t, ti) => {
    if (t.type === "code") {
      return [
        <code key={`c-${ti}`}>{t.value}</code>,
      ];
    }
    // 链接 [text](url) / **bold** / *italic*
    const parts: React.ReactNode[] = [];
    const re = /(\[[^\]]+\]\([^)\s]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
    let pLast = 0;
    let pm: RegExpExecArray | null;
    let pk = 0;
    while ((pm = re.exec(t.value))) {
      if (pm.index > pLast) parts.push(<span key={`t-${ti}-${pk++}`}>{t.value.slice(pLast, pm.index)}</span>);
      const seg = pm[0];
      if (seg.startsWith("**")) {
        parts.push(<strong key={`b-${ti}-${pk++}`}>{seg.slice(2, -2)}</strong>);
      } else if (seg.startsWith("[")) {
        const lm = /\[([^\]]+)\]\(([^)]+)\)/.exec(seg)!;
        parts.push(
          <a key={`a-${ti}-${pk++}`} href={lm[2]} target="_blank" rel="noreferrer">
            {lm[1]}
          </a>,
        );
      } else if (seg.startsWith("*")) {
        parts.push(<em key={`i-${ti}-${pk++}`}>{seg.slice(1, -1)}</em>);
      }
      pLast = pm.index + seg.length;
    }
    if (pLast < t.value.length) parts.push(<span key={`t-${ti}-${pk++}`}>{t.value.slice(pLast)}</span>);
    return parts;
  });
}

interface MarkdownLiteProps {
  text: string;
  className?: string;
}

import React from "react";

export function MarkdownLite({ text, className = "" }: MarkdownLiteProps) {
  const blocks = React.useMemo(() => parseMarkdown(text), [text]);
  return (
    <div className={`md ${className}`}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h1":
            return <h1 key={i}>{renderInline(b.content as string)}</h1>;
          case "h2":
            return <h2 key={i}>{renderInline(b.content as string)}</h2>;
          case "h3":
            return <h3 key={i}>{renderInline(b.content as string)}</h3>;
          case "h4":
            return <h4 key={i}>{renderInline(b.content as string)}</h4>;
          case "code":
            return (
              <pre key={i}>
                <code>{b.content as string}</code>
              </pre>
            );
          case "blockquote": {
            const inner = parseMarkdown(b.content as string);
            return (
              <blockquote key={i}>
                {inner.map((ib, j) => {
                  if (ib.type === "p") return <p key={j}>{renderInline(ib.content as string)}</p>;
                  if (ib.type === "h3" || ib.type === "h4") return <strong key={j}>{renderInline(ib.content as string)}</strong>;
                  return null;
                })}
              </blockquote>
            );
          }
          case "ul":
            return (
              <ul key={i}>
                {(b.content as string[]).map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i}>
                {(b.content as string[]).map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ol>
            );
          case "hr":
            return <hr key={i} />;
          case "table": {
            const head = b.meta ?? [];
            const rows = b.content as string[][];
            return (
              <table key={i}>
                {head.length > 0 && (
                  <thead>
                    <tr>
                      {head.map((c, j) => (
                        <th key={j}>{renderInline(c)}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {rows.map((r, ri) => (
                    <tr key={ri}>
                      {r.map((c, ci) => (
                        <td key={ci}>{renderInline(c)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }
          default:
            return <p key={i}>{renderInline(b.content as string)}</p>;
        }
      })}
    </div>
  );
}