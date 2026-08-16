
import type { IztroAstrolabe } from "mingyu-core";
import TermTip from "@/components/common/TermTip";
import ScanOverlay from "@/components/common/ScanOverlay";
import { ZIWEI_STAR_EXPLAIN, explainOf } from "@/lib/explain";

/** 紫微 4×4 命盘：12 宫 + 中央信息格（中央信息格在右下布局，遵循传统命盘印刷惯例：左上为命宫逆数）。 */
export interface ZiweiChartProps {
  astrolabe: IztroAstrolabe;
}

/** 紫微斗数 14 主星（按庙旺利平陷配色） */
const MAJOR_STARS = new Set([
  "紫微", "天机", "太阳", "武曲", "天同", "廉贞",
  "天府", "太阴", "贪狼", "巨门", "天相", "天梁",
  "七杀", "破军",
]);

/** 四化配色 */
const MUTAGEN_STYLE: Record<string, string> = {
  禄: "bg-jade-500/80 text-paper-50",
  权: "bg-cinnabar-500/80 text-paper-50",
  科: "bg-gold-500/80 text-ink-950",
  忌: "bg-ink-700 text-cinnabar-400 border border-cinnabar-500/60",
};

const BRIGHTNESS_COLOR: Record<string, string> = {
  庙: "text-gold-300",
  旺: "text-gold-300",
  得: "text-gold-400",
  利: "text-paper-200",
  平: "text-paper-300",
  陷: "text-paper-500",
  空: "text-paper-500",
};

function brightnessColor(b?: string): string {
  if (!b) return "text-paper-200";
  return BRIGHTNESS_COLOR[b] ?? "text-paper-200";
}

function StarLine({
  name,
  type,
  brightness,
  mutagen,
}: {
  name: string;
  type: "major" | "minor" | "adjective";
  brightness?: string;
  mutagen?: string;
}) {
  const isMajor = type === "major" || MAJOR_STARS.has(name);
  const starTip = isMajor ? explainOf(ZIWEI_STAR_EXPLAIN, name) : undefined;
  return (
    <div className="flex items-baseline justify-between gap-1 text-[11px] leading-4">
      {starTip ? (
        <TermTip
          term={name}
          text={starTip}
          className={`${isMajor ? "font-bold text-[12.5px]" : ""} ${brightnessColor(brightness)}`}
        />
      ) : (
        <span className={`${isMajor ? "font-bold text-[12.5px]" : ""} ${brightnessColor(brightness)}`}>
          {name}
        </span>
      )}
      {mutagen && MUTAGEN_STYLE[mutagen] && (
        <span
          className={`anim-pop rounded px-1 py-[1px] text-[9px] font-bold leading-none ${MUTAGEN_STYLE[mutagen]}`}
          style={{ animationDelay: "900ms" }}
        >
          {mutagen}
        </span>
      )}
    </div>
  );
}

function PalaceCell({
  palace,
  isBody,
  delay = 0,
}: {
  palace: IztroAstrolabe["palaces"][number];
  isBody?: boolean;
  /** 入场级联延迟（ms） */
  delay?: number;
}) {
  const major = palace.majorStars ?? [];
  const minor = palace.minorStars ?? [];
  const adjective = palace.adjectiveStars ?? [];
  const isMing = palace.name === "命宫";

  return (
    <div
      className={`panel-console hud-frame anim-ink relative flex h-full min-h-[140px] flex-col p-2 ${
        isBody ? "ring-1 ring-cinnabar-500/50" : ""
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {isMing && (
        <div className="anim-glow pointer-events-none absolute inset-0 rounded-[inherit]" />
      )}
      <div className="flex items-center justify-between border-b border-gold-500/15 pb-1">
        <span className="text-[12px] font-bold text-gold-300">{palace.name}</span>
        <span className="gz-char text-[15px] leading-none text-paper-200">
          {palace.heavenlyStem}
          {palace.earthlyBranch}
        </span>
      </div>

      <div className="mt-1.5 space-y-1 overflow-hidden">
        {major.length === 0 && minor.length === 0 && adjective.length === 0 && (
          <div className="flex h-full items-center justify-center text-[11px] text-paper-500">
            空宫
          </div>
        )}

        {major.length > 0 && (
          <div>
            {major.map((s) => (
              <StarLine key={s.name} name={s.name} type="major" brightness={s.brightness} mutagen={s.mutagen} />
            ))}
          </div>
        )}

        {minor.length > 0 && (
          <div className="border-t border-gold-500/10 pt-0.5">
            {minor.map((s) => (
              <StarLine key={s.name} name={s.name} type="minor" brightness={s.brightness} mutagen={s.mutagen} />
            ))}
          </div>
        )}

        {adjective.length > 0 && (
          <div className="border-t border-gold-500/10 pt-0.5">
            {adjective.slice(0, 6).map((s) => (
              <StarLine key={s.name} name={s.name} type="adjective" brightness={s.brightness} mutagen={s.mutagen} />
            ))}
            {adjective.length > 6 && (
              <div className="text-[10px] text-paper-500">+{adjective.length - 6} 杂耀</div>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto flex justify-between pt-1 text-[9px] text-paper-500">
        <span>{palace.changsheng12}</span>
        <span>{palace.decadal.range[0]}–{palace.decadal.range[1]}岁</span>
      </div>
    </div>
  );
}

function CenterInfo({ astrolabe }: { astrolabe: IztroAstrolabe }) {
  return (
    <div className="panel-console anim-seal flex h-full min-h-[140px] flex-col p-2 text-[11px] leading-relaxed" style={{ animationDelay: "500ms" }}>
      <div className="console-title justify-center border-b border-gold-500/20 pb-1">
        <span className="seq">INFO</span>
        <span className="text-[13px] font-bold text-gold-300">命盘信息</span>
      </div>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
        <dt className="console-label">公历</dt>
        <dd className="text-paper-200">{astrolabe.solarDate}</dd>
        <dt className="console-label">农历</dt>
        <dd className="text-paper-200">{astrolabe.lunarDate}</dd>
        <dt className="console-label">干支</dt>
        <dd className="text-paper-200">{astrolabe.chineseDate}</dd>
        <dt className="console-label">时辰</dt>
        <dd className="text-paper-200">{astrolabe.time}（{astrolabe.timeRange}）</dd>
        <dt className="console-label">命宫地支</dt>
        <dd className="text-paper-200">{astrolabe.earthlyBranchOfSoulPalace}</dd>
        <dt className="console-label">身宫地支</dt>
        <dd className="text-paper-200">{astrolabe.earthlyBranchOfBodyPalace}</dd>
        <dt className="console-label">五行局</dt>
        <dd className="text-gold-300 font-bold console-value">{astrolabe.fiveElementsClass}</dd>
        <dt className="console-label">命主</dt>
        <dd className="text-paper-200">{astrolabe.soul}</dd>
        <dt className="console-label">身主</dt>
        <dd className="text-paper-200">{astrolabe.body}</dd>
        <dt className="console-label">生肖</dt>
        <dd className="text-paper-200">{astrolabe.zodiac}</dd>
      </dl>
    </div>
  );
}

const SLOT_ORDER = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];

export default function ZiweiChart({ astrolabe }: ZiweiChartProps) {
  const palaces = astrolabe.palaces;
  // 4x4 grid: row 0 [top-left big 宫, 8, 9, 10], row 1 [7, center 4×4 hidden by 中央 + 1-3 layout], etc.
  // Standard 紫微 layout uses 4×4 grid:
  //   row 0: [5, 6, 7, 8]
  //   row 1: [4, CENTER, CENTER, 9]
  //   row 2: [3, CENTER, CENTER, 10]
  //   row 3: [2, 1, 0, 11]
  // The center 2x2 holds info. We use a flex grid that places palaces by index mapping.
  // palaces are sorted by earthlyBranch; iztro palace index matches 0..11 in branch order.
  // For 紫微 traditional layout, we display palaces by index in a 4-row grid.
  return (
    <div className="space-y-3">
      <div className="hud-frame relative rounded-xl">
        <ScanOverlay />
        <div className="grid grid-cols-4 gap-2">
        {palaces[5] && <PalaceCell palace={palaces[5]} isBody={palaces[5].isBodyPalace} delay={0} />}
        {palaces[6] && <PalaceCell palace={palaces[6]} isBody={palaces[6].isBodyPalace} delay={70} />}
        {palaces[7] && <PalaceCell palace={palaces[7]} isBody={palaces[7].isBodyPalace} delay={140} />}
        {palaces[8] && <PalaceCell palace={palaces[8]} isBody={palaces[8].isBodyPalace} delay={210} />}

        {palaces[4] && <PalaceCell palace={palaces[4]} isBody={palaces[4].isBodyPalace} delay={280} />}
        <div className="col-span-2 row-span-2">
          <CenterInfo astrolabe={astrolabe} />
        </div>
        {palaces[9] && <PalaceCell palace={palaces[9]} isBody={palaces[9].isBodyPalace} delay={350} />}

        {palaces[3] && <PalaceCell palace={palaces[3]} isBody={palaces[3].isBodyPalace} delay={420} />}
        {palaces[10] && <PalaceCell palace={palaces[10]} isBody={palaces[10].isBodyPalace} delay={490} />}

        {palaces[2] && <PalaceCell palace={palaces[2]} isBody={palaces[2].isBodyPalace} delay={560} />}
        {palaces[1] && <PalaceCell palace={palaces[1]} isBody={palaces[1].isBodyPalace} delay={630} />}
        {palaces[0] && <PalaceCell palace={palaces[0]} isBody={palaces[0].isBodyPalace} delay={700} />}
        {palaces[11] && <PalaceCell palace={palaces[11]} isBody={palaces[11].isBodyPalace} delay={770} />}
        </div>
      </div>

      <p className="text-center text-[10px] text-paper-500">
        宫位顺序：命宫 → 兄弟 → 夫妻 → 子女 → 财帛 → 疾厄 → 迁移 → 交友 → 官禄 → 田宅 → 福德 → 父母
        <span className="mx-1">·</span>
        紫色边框 = 身宫
      </p>
      {/* SLOT_ORDER referenced for potential future layout variants */}
      <span hidden>{SLOT_ORDER.join(",")}</span>
    </div>
  );
}