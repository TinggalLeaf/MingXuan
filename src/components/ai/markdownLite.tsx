/** 轻量 markdown 渲染（标题、加粗、列表、段落），AiInterpret 与 AiChatDock 共用 */

export function renderMarkdownLite(text: string) {
  return text.split(/\n{2,}/).map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    if (/^#{1,4}\s/.test(trimmed)) {
      return (
        <h4 key={i} className="mt-4 mb-2 text-sm font-bold text-gold-300">
          {trimmed.replace(/^#{1,4}\s*/, "")}
        </h4>
      );
    }
    const lines = trimmed.split("\n");
    if (lines.every((l) => /^\s*[-*•\d]+[.、\)]?\s/.test(l) || l.trim() === "")) {
      return (
        <ul key={i} className="my-2 list-disc space-y-1 pl-5">
          {lines.filter((l) => l.trim()).map((l, j) => (
            <li key={j}>{renderInline(l.replace(/^\s*[-*•\d]+[.、\)]?\s*/, ""))}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i} className="my-2 leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  });
}

function renderInline(text: string) {
  // **加粗**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="text-gold-300">{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}
