// 在八字页填入 2000-08-12 00:00 女命并提交
(() => {
  const setVal = (el, v) => {
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const selects = [...document.querySelectorAll("select")];
  // 表单顺序: 性别, 历法, 年, 月, 日, 时间方式, 时辰
  const labels = [...document.querySelectorAll("label")];
  const byText = (t) => labels.find((l) => l.textContent.includes(t));
  setVal(byText("性别").querySelector("select"), "female");
  setVal(byText("年").querySelector("select"), "2000");
  setVal(byText("月").querySelector("select"), "8");
  setVal(byText("日").querySelector("select"), "12");
  setVal(byText("时辰").querySelector("select"), "0");
  const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("排盘"));
  btn.click();
  return "submitted";
})()
