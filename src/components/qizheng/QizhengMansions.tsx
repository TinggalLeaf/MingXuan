
import { useMemo, useState } from "react";
import type { QizhengStar } from "mingyu-core/qizheng";
import { QIZHENG_MANSION_STARS } from "mingyu-core/qizheng";

export interface QizhengMansionsProps {
  stars: QizhengStar[];
}

const SEVEN_STAR_GROUPS: Record<string, string[]> = {
  东方青龙: ["角宿", "亢宿", "氐宿", "房宿", "心宿", "尾宿", "箕宿"],
  北方玄武: ["斗宿", "牛宿", "女宿", "虚宿", "危宿", "室宿", "壁宿"],
  西方白虎: ["奎宿", "娄宿", "胃宿", "昴宿", "毕宿", "觜宿", "参宿"],
  南方朱雀: ["井宿", "鬼宿", "柳宿", "星宿", "张宿", "翼宿", "轸宿"],
};

export default function QizhengMansions({ stars }: QizhengMansionsProps) {
  const [open, setOpen] = useState(false);

  // 落入各宿的星曜
  const xiuMap = useMemo(() => {
    const m = new Map<string, QizhengStar[]>();
    for (const s of stars) {
      if (!s.xiu) continue;
      const arr = m.get(s.xiu) ?? [];
      arr.push(s);
      m.set(s.xiu, arr);
    }
    return m;
  }, [stars]);

  return (
    <div className="panel-console p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="console-title text-base">
          <span className="seq">04</span>二十八宿界
        </h3>
        <button
          type="button"
          className="tab-chip text-xs"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "收起" : "展开宿距星"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(SEVEN_STAR_GROUPS).map(([group, xiuList], gIdx) => (
          <div
            key={group}
            className="anim-fade-up rounded-lg border border-gold-500/15 p-3"
            style={{ animationDelay: `${gIdx * 130}ms` }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-gold-300">{group}</span>
              <span className="console-value text-[10px]">{xiuList.length} 宿</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {xiuList.map((x) => {
                const occupants = xiuMap.get(x) ?? [];
                // 宿名后缀兼容：some sources may emit short form (e.g. "角" vs "角宿")
                const occupantsShort = occupants.length === 0 ? xiuMap.get(x.replace(/宿$/, "")) ?? [] : occupants;
                const list = occupants.length > 0 ? occupants : occupantsShort;
                return (
                  <div
                    key={x}
                    className="flex flex-col items-center rounded border border-gold-500/10 py-1.5 text-center"
                    title={list.map((s) => s.name).join("、") || "无主星落入"}
                  >
                    <span className="text-base font-bold text-paper-200">{x.replace(/宿$/, "")}</span>
                    <span className="text-[9px] text-paper-500">
                      {list.length > 0 ? `${list.length}星` : "空"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-paper-400">
              {xiuList.map((x) => {
                const occupants = xiuMap.get(x) ?? [];
                if (occupants.length === 0) return null;
                return (
                  <span key={x}>
                    {x}：{occupants.map((s) => s.name).join("、")}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="anim-unroll mt-3 max-h-64 overflow-y-auto rounded-lg border border-gold-500/15">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-ink-900">
              <tr className="border-b border-gold-500/30 text-paper-400">
                <th className="console-label py-1.5 px-2 text-left">宿</th>
                <th className="console-label py-1.5 px-2 text-left">距星</th>
                <th className="console-label py-1.5 px-2 text-left">赤经 (J2000)</th>
                <th className="console-label py-1.5 px-2 text-left">赤纬 (J2000)</th>
              </tr>
            </thead>
            <tbody>
              {QIZHENG_MANSION_STARS.map((m) => (
                <tr key={m.mansion} className="border-b border-gold-500/10 hover:bg-gold-500/5">
                  <td className="py-1 px-2 font-bold text-paper-200">{m.mansion}</td>
                  <td className="py-1 px-2 text-paper-300">{m.simbadId || "—"}</td>
                  <td className="py-1 px-2 console-value text-paper-300">
                    {typeof m.raJ2000Degrees === "number" ? `${m.raJ2000Degrees.toFixed(3)}°` : "—"}
                  </td>
                  <td className="py-1 px-2 console-value text-paper-300">
                    {typeof m.decJ2000Degrees === "number" ? `${m.decJ2000Degrees.toFixed(3)}°` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}