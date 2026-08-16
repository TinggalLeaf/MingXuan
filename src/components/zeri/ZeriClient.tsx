import { useMemo, useState } from "react";
import { generateAlmanacSelection } from "mingyu-core/divination/almanac";
import { ALMANAC_TOPIC_OPTIONS } from "mingyu-core/divination/config";
import type {
  AlmanacData,
  AlmanacDayCandidate,
  AlmanacTopic,
} from "mingyu-core";
import type { ParticipantInput } from "@/components/zeri/ParticipantFields";
import ParticipantFields from "@/components/zeri/ParticipantFields";
import DayCard, { type DayStatus } from "@/components/zeri/DayCard";
import TodayAlmanac from "@/components/zeri/TodayAlmanac";
import CharsRise from "@/components/motion/CharsRise";
import Reveal from "@/components/motion/Reveal";
import Stagger from "@/components/motion/Stagger";
import AiInterpret from "@/components/ai/AiInterpret";

type Tab = "selection" | "today";

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function emptyParticipant(): ParticipantInput {
  return {
    id: crypto.randomUUID(),
    name: "",
    gender: "男",
    year: "",
    month: "",
    day: "",
    timeIndex: "",
    dateType: "solar",
    isLeapMonth: false,
  };
}

function validateParticipant(p: ParticipantInput): string | null {
  if (!p.name) return "姓名必填";
  if (!p.year || !p.month || !p.day) return "年月日必填";
  if (!p.timeIndex) return "时辰必填";
  return null;
}

function toAlmanacInput(p: ParticipantInput) {
  return {
    id: p.id,
    name: p.name,
    gender: p.gender || ("男" as const),
    year: p.year,
    month: p.month,
    day: p.day,
    timeIndex: p.timeIndex,
    dateType: p.dateType,
    isLeapMonth: p.dateType === "lunar" ? p.isLeapMonth : undefined,
  };
}

export default function ZeriClient() {
  const [tab, setTab] = useState<Tab>("selection");

  // 吉日遴选
  const [topic, setTopic] = useState<AlmanacTopic>("marriage");
  const [startDate, setStartDate] = useState<string>(todayISO());
  const [endDate, setEndDate] = useState<string>(addDaysISO(todayISO(), 30));
  const [participants, setParticipants] = useState<ParticipantInput[]>([emptyParticipant()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [almanacData, setAlmanacData] = useState<AlmanacData | null>(null);

  // 今日黄历
  const [todayDate, setTodayDate] = useState<string>(todayISO());

  function updateParticipant(idx: number, next: ParticipantInput) {
    setParticipants((prev) => prev.map((p, i) => (i === idx ? next : p)));
  }

  function removeParticipant(idx: number) {
    setParticipants((prev) => prev.filter((_, i) => i !== idx));
  }

  function addParticipant() {
    setParticipants((prev) => (prev.length >= 4 ? prev : [...prev, emptyParticipant()]));
  }

  function handleSearch() {
    setError("");
    if (!startDate || !endDate) {
      setError("请选择起止日期");
      return;
    }
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      setError("结束日期需晚于或等于开始日期");
      return;
    }
    if (diffDays > 30) {
      setError("日期范围最多 31 天（首尾均计）");
      return;
    }

    const validParticipants = participants.filter((p) => validateParticipant(p) === null);
    const invalid = participants.find((p) => validateParticipant(p) !== null);
    if (invalid) {
      setError(`参与人资料不完整：${validateParticipant(invalid)}`);
      return;
    }

    setSubmitting(true);
    try {
      const data = generateAlmanacSelection({
        topic,
        startDate,
        endDate,
        participants: validParticipants.map(toAlmanacInput),
      });
      setAlmanacData(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`黄历生成失败：${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  // 按分组归类各天
  const groupedDays = useMemo(() => {
    if (!almanacData) return { preferred: [], conditional: [], caution: [] };
    const evidence = almanacData.evidenceAnalysis;
    const preferredSet = new Set(evidence?.preferredDates ?? []);
    const conditionalSet = new Set(evidence?.conditionalDates ?? []);
    const cautionSet = new Set(evidence?.cautionDates ?? []);
    const preferred: { day: AlmanacDayCandidate; status: DayStatus }[] = [];
    const conditional: { day: AlmanacDayCandidate; status: DayStatus }[] = [];
    const caution: { day: AlmanacDayCandidate; status: DayStatus }[] = [];
    for (const day of almanacData.days) {
      let status: DayStatus = "条件候选";
      if (preferredSet.has(day.date)) status = "可用候选";
      else if (cautionSet.has(day.date)) status = "慎用候选";
      else if (conditionalSet.has(day.date)) status = "条件候选";
      const item = { day, status };
      if (status === "可用候选") preferred.push(item);
      else if (status === "条件候选") conditional.push(item);
      else caution.push(item);
    }
    return { preferred, conditional, caution };
  }, [almanacData]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 text-center sm:mb-10">
        <div className="anim-fade-down console-label mb-3 flex items-center justify-center gap-2">
          <span className="hud-dot" />
          MINGXUAN // ALMANAC
        </div>
        <h1 className="title-ornament justify-center text-3xl font-black text-paper-50 sm:text-4xl">
          <CharsRise text="黄历择日" step={140} className="text-shimmer-gold" />
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-paper-300 sm:text-base">
          吉日遴选 · 今日黄历 · 宜忌神煞 · 可用时辰
        </p>
      </header>

      <div className="mb-6 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className={`tab-chip ${tab === "selection" ? "is-active" : ""}`}
          onClick={() => setTab("selection")}
        >
          吉日遴选
        </button>
        <button
          type="button"
          className={`tab-chip ${tab === "today" ? "is-active" : ""}`}
          onClick={() => setTab("today")}
        >
          今日黄历
        </button>
      </div>

      {tab === "selection" && (
        <div className="grid gap-6 lg:grid-cols-5">
          <section className="space-y-4 lg:col-span-2">
            <div className="panel-console hud-frame space-y-4 p-5 sm:p-6">
              <h3 className="console-title text-base">
                <span className="seq">01</span>事项与日期
              </h3>

              <label className="block">
                <span className="console-label mb-1 block">TOPIC · 事项类型</span>
                <select
                  className="input-xuan w-full"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value as AlmanacTopic)}
                >
                  {ALMANAC_TOPIC_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="console-label mb-1 block">START · 开始日期</span>
                  <input
                    type="date"
                    className="input-xuan w-full"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      const diff =
                        Math.round(
                          (new Date(endDate).getTime() - new Date(e.target.value).getTime()) /
                            (1000 * 60 * 60 * 24),
                        ) + 1;
                      if (diff > 31) {
                        setEndDate(addDaysISO(e.target.value, 30));
                      }
                    }}
                  />
                </label>
                <label className="block">
                  <span className="console-label mb-1 block">END · 结束日期（≤31天）</span>
                  <input
                    type="date"
                    className="input-xuan w-full"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </label>
              </div>

              <button
                type="button"
                className="btn-gold w-full"
                onClick={handleSearch}
                disabled={submitting}
              >
                {submitting ? "遴选中…" : "遴选吉日"}
              </button>

              {error && (
                <p className="anim-shake rounded-lg border border-cinnabar-500/40 bg-cinnabar-500/10 px-3 py-2 text-sm text-cinnabar-400">
                  <span className="console-label mr-2 text-cinnabar-400">ERR</span>
                  {error}
                </p>
              )}
            </div>

            <div className="panel-console space-y-3 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="console-title text-base">
                  <span className="seq">02</span>参与人
                </h3>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={addParticipant}
                  disabled={participants.length >= 4}
                >
                  + 添加
                </button>
              </div>
              <p className="text-[11px] text-paper-500">
                用于刑冲破害校验（最多 4 人）。不填则仅按传统宜忌筛选。
              </p>
              <div className="space-y-2">
                {participants.map((p, idx) => (
                  <ParticipantFields
                    key={p.id}
                    index={idx}
                    participant={p}
                    onChange={(next) => updateParticipant(idx, next)}
                    onRemove={() => removeParticipant(idx)}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6 lg:col-span-3">
            {!almanacData && (
              <div className="panel-console p-5 sm:p-6">
                <p className="text-sm text-paper-400">
                  选择事项、日期范围，填写参与人档案，即可生成逐日宜忌候选。
                </p>
              </div>
            )}

            {almanacData && (
              <div
                key={`${almanacData.topicLabel}-${almanacData.startDate}-${almanacData.endDate}-${almanacData.days.length}`}
                className="space-y-6"
              >
                <header className="anim-fade-up rounded-lg border border-gold-500/20 bg-ink-900/60 p-3 text-xs text-paper-300">
                  <span className="console-label mr-2">TOPIC</span>
                  <span className="font-bold text-gold-300">{almanacData.topicLabel}</span>
                  <span className="console-label ml-2 mr-2">RANGE</span>
                  {almanacData.startDate} → {almanacData.endDate}
                  <span className="console-label ml-2 mr-2">DAYS</span>
                  <span className="console-value">{String(almanacData.days.length).padStart(2, "0")}</span>
                  {almanacData.participants.length > 0 && (
                    <>
                      <span className="console-label ml-2 mr-2">PARTICIPANTS</span>
                      {almanacData.participants.length} 位
                    </>
                  )}
                </header>

                <GroupSection
                  seq="01"
                  title="可用候选"
                  hint="传统宜忌与参与人无显著冲突"
                  tone="jade"
                  items={groupedDays.preferred}
                  delay={0}
                />
                <GroupSection
                  seq="02"
                  title="条件候选"
                  hint="可用但受传统吉凶或参与人刑冲限制"
                  tone="gold"
                  items={groupedDays.conditional}
                  delay={150}
                />
                <GroupSection
                  seq="03"
                  title="慎用候选"
                  hint="存在明确忌项或参与人冲突，建议另择"
                  tone="cinnabar"
                  items={groupedDays.caution}
                  delay={300}
                />

                {/* AI 白话解读：只传结果摘要，控制 data 体积 */}
                <Reveal variant="up" delay={380}>
                  <AiInterpret
                    topic="择日结果"
                    question={almanacData.topicLabel}
                    data={{
                      topic: almanacData.topicLabel,
                      range: `${almanacData.startDate} → ${almanacData.endDate}`,
                      participantCount: almanacData.participants.length,
                      preferredDates: almanacData.evidenceAnalysis?.preferredDates ?? [],
                      conditionalDates: almanacData.evidenceAnalysis?.conditionalDates ?? [],
                      cautionDates: almanacData.evidenceAnalysis?.cautionDates ?? [],
                    }}
                  />
                </Reveal>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "today" && (
        <div className="space-y-4">
          <div className="panel-console hud-frame flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <label className="block flex-1">
              <span className="console-label mb-1 block">DATE · 选择公历日期</span>
              <input
                type="date"
                className="input-xuan w-full sm:max-w-xs"
                value={todayDate}
                onChange={(e) => setTodayDate(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setTodayDate(todayISO())}
            >
              回到今日
            </button>
          </div>
          <TodayAlmanac date={todayDate} />
        </div>
      )}

      <p className="console-label mt-10 text-center text-paper-500">
        结果仅供传统文化研究与娱乐参考
      </p>
    </div>
  );
}

interface GroupSectionProps {
  title: string;
  hint: string;
  tone: "jade" | "gold" | "cinnabar";
  items: { day: AlmanacDayCandidate; status: DayStatus }[];
  /** 分组序号（如 01/02/03） */
  seq?: string;
  /** 分组入场级联延迟（ms） */
  delay?: number;
}

function GroupSection({ title, hint, tone, items, seq, delay = 0 }: GroupSectionProps) {
  const toneMap = {
    jade: "border-jade-400/40 text-jade-400",
    gold: "border-gold-500/40 text-gold-300",
    cinnabar: "border-cinnabar-500/40 text-cinnabar-400",
  } as const;
  return (
    <Reveal variant="up" delay={delay}>
      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <h3 className={`console-title text-base ${toneMap[tone]}`}>
            {seq && <span className="seq">{seq}</span>}
            <span>{title}</span>
            <span className="console-value ml-2 text-xs font-normal">({items.length})</span>
          </h3>
          <span className="console-label text-paper-500">{hint}</span>
        </header>
        {items.length === 0 ? (
          <p className="rounded-lg border border-ink-700 bg-ink-900/40 px-4 py-3 text-xs text-paper-500">
            本档无候选日。
          </p>
        ) : (
          <div className="space-y-3">
            <Stagger step={80} variant="up">
              {items.map(({ day, status }) => (
                <DayCard key={day.date} day={day} status={status} />
              ))}
            </Stagger>
          </div>
        )}
      </section>
    </Reveal>
  );
}