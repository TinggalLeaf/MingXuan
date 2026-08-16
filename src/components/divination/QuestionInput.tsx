import { useState } from "react";
import { Sparkles, Clock } from "lucide-react";

interface QuestionInputProps {
  question: string;
  setQuestion: (v: string) => void;
  customDate: string;
  setCustomDate: (v: string) => void;
  placeholder?: string;
}

export default function QuestionInput({
  question,
  setQuestion,
  customDate,
  setCustomDate,
  placeholder = "一事一占，请简要写明所问之事（例：近期求职能否顺利？）",
}: QuestionInputProps) {
  const [showCustom, setShowCustom] = useState(false);

  return (
    <section className="panel-console p-4 sm:p-6">
      <div className="console-label flex items-center gap-2 text-paper-400">
        <Sparkles className="h-3.5 w-3.5 text-gold-300" />
        <span>心诚则灵 · 一事一占</span>
      </div>
      <textarea
        className="input-xuan mt-3 min-h-[96px] w-full resize-y text-sm leading-relaxed"
        placeholder={placeholder}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        maxLength={200}
      />
      <div className="mt-1 flex items-center justify-between text-[11px] text-paper-500">
        <span>建议 20 字内 · 专注一事</span>
        <span className="console-value">
          {String(question.length).padStart(3, "0")} / 200
        </span>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowCustom((s) => !s)}
          className="flex items-center gap-1 text-xs text-paper-300 hover:text-gold-300"
        >
          <Clock className="h-3.5 w-3.5" />
          {showCustom ? "收起起卦时间设置" : "自定义起卦时间（默认当前）"}
        </button>
        {showCustom && (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="datetime-local"
              className="input-xuan flex-1 text-sm"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
            {customDate && (
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => setCustomDate("")}
              >
                清除
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}