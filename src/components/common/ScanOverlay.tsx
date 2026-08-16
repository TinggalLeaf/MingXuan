/**
 * hud-scan 扫描线的覆盖层版本。
 *
 * 直接使用 .hud-scan 会给容器加 overflow:hidden，会裁剪容器内的
 * TermTip 气泡、ECharts tooltip 等悬浮元素；因此把扫描线单独放在
 * 一个 pointer-events-none 的绝对定位覆盖层里，视觉效果相同但不裁剪内容。
 *
 * 用法：父容器加 `relative`（可叠加 hud-frame），然后把 <ScanOverlay /> 放在首位。
 */
export default function ScanOverlay() {
  return (
    <div
      aria-hidden
      className="hud-scan pointer-events-none absolute inset-0 z-10"
      style={{ position: "absolute" }}
    />
  );
}
