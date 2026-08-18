import { useEffect, useMemo, useState } from "react";
import { COMMON_FONT_NAMES } from "@/lib/settings";
import SectionCard from "./SectionCard";
import type { SectionProps } from "./index";

export default function FontSection({ settings, update }: SectionProps) {
  const [customDraft, setCustomDraft] = useState(settings.customFontName);
  useEffect(() => setCustomDraft(settings.customFontName), [settings.customFontName]);

  // 启动时枚举系统全部已安装字体
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [enumerating, setEnumerating] = useState(false);
  useEffect(() => {
    setEnumerating(true);
    import("@/lib/settings").then(({ listAvailableFonts }) => {
      try {
        setSystemFonts(listAvailableFonts());
      } catch (e) {
        console.warn("枚举系统字体失败：", e);
      } finally {
        setEnumerating(false);
      }
    });
  }, []);

  const allFonts = useMemo(() => {
    const set = new Set<string>(COMMON_FONT_NAMES);
    systemFonts.forEach((f) => set.add(f));
    return Array.from(set);
  }, [systemFonts]);

  return (
    <SectionCard
      title="字体设置"
      desc="启动时自动枚举系统已安装的全部字体（Canvas 测宽法），下拉直接选；亦可手动输入任意字体名。已开启字体平滑与抗锯齿。"
    >
      <div className="space-y-4">
        <div>
          <div className="console-label mb-2 flex items-center justify-between">
            <span>FONT · 字体族（{allFonts.length} 个可用）</span>
            {enumerating && <span className="text-[10px] text-paper-500">枚举中…</span>}
          </div>
          <select
            className="input-xuan w-full"
            value={settings.fontFamily === "custom" ? "__custom__" : (settings.fontFamily || "")}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__custom__") update({ fontFamily: "custom" });
              else update({ fontFamily: v });
            }}
          >
            <option value="">（跟随系统默认）</option>
            {allFonts.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </option>
            ))}
            <option value="__custom__">— 自定义… —</option>
          </select>
        </div>

        {settings.fontFamily === "custom" ? (
          <div className="rounded-lg border border-gold-500/20 bg-ink-900/40 p-3">
            <div className="console-label mb-2">CUSTOM · 自定义字体名</div>
            <div className="flex gap-2">
              <input
                list="mx-common-fonts"
                className="input-xuan w-full"
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                placeholder="例：Microsoft YaHei / 思源黑体 / Verdana"
              />
              <button
                type="button"
                className="btn-gold !px-3 text-sm shrink-0"
                onClick={() => update({ customFontName: customDraft.trim() })}
              >
                应用
              </button>
            </div>
            <datalist id="mx-common-fonts">
              {allFonts.map((f) => <option key={f} value={f} />)}
            </datalist>
            <p className="mt-2 text-[11px] leading-relaxed text-paper-500">
              输入系统已安装的任意字体名（如 Windows 的 <b>Microsoft YaHei</b>、
              Mac 的 <b>PingFang SC</b>、Linux 的 <b>WenQuanYi Zen Hei</b>）。
              应用后下方预览立即生效。
            </p>
          </div>
        ) : null}

        <div>
          <div className="console-label mb-2">WEIGHT · 字重</div>
          <div className="grid grid-cols-3 gap-2">
            {(["normal", "medium", "bold"] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => update({ fontWeight: w })}
                className={`tab-chip text-center ${settings.fontWeight === w ? "is-active" : ""}`}
              >
                {w === "normal" ? "标准 400" : w === "medium" ? "中等 550" : "粗体 700"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="console-label mb-2">SIZE · 字号缩放（{settings.fontScale.toFixed(2)}×）</div>
          <input
            type="range"
            min={0.9}
            max={1.25}
            step={0.05}
            value={settings.fontScale}
            onChange={(e) => update({ fontScale: Number(e.target.value) })}
            className="w-full accent-gold-500"
          />
          <div className="mt-1 flex justify-between text-[10px] text-paper-500">
            <span>0.90</span><span>1.00</span><span>1.25</span>
          </div>
        </div>

        <div className="rounded-lg border border-gold-500/15 bg-ink-900/40 p-4">
          <p
            className="leading-relaxed text-paper-200"
            style={{
              fontWeight: settings.fontWeight === "bold" ? 700 : settings.fontWeight === "medium" ? 550 : 400,
              fontSize: "1.05em",
            }}
          >
            天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。寒来暑往，秋收冬藏。
            <br />
            <span className="text-gold-300">The quick brown fox jumps over the lazy dog.</span>
            <br />
            <span className="text-cyber-300 font-mono">0123456789 · 子丑寅卯辰巳午未申酉戌亥</span>
          </p>
          <p className="mt-2 text-xs text-paper-500">
            预览：中英文 / 干支 / 数字 / 标点。修改任一项后，渲染立即更新。
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
