// 点击包含指定文字的按钮（用法：把 TEXT 替换后注入）
(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("起局"));
  if (btn) { btn.click(); return "clicked"; }
  return "not found";
})()
