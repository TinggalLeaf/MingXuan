import type { ReactNode } from "react";
import CharsRise from "@/components/motion/CharsRise";

/**
 * 术数模块统一页面头：标题 + 简介 + 元信息 chip。
 * 全部页面共享，避免各模块重复实现 hero 区。
 */
export interface OracleHeaderProps {
  title: string;
  subtitle: string;
  source?: string;
  tags?: string[];
  /** 页面英文模块名（用于 console-label 前缀），如 LIUYAO / MEIHUA / QIMEN */
  moduleName?: string;
  children?: ReactNode;
}

export default function OracleHeader({
  title,
  subtitle,
  source,
  tags,
  moduleName,
  children,
}: OracleHeaderProps) {
  return (
    <header className="mx-auto max-w-5xl px-4 pt-12 pb-6 text-center sm:px-6">
      {moduleName && (
        <div className="anim-fade-down console-label mb-3 flex items-center justify-center gap-2">
          <span className="hud-dot" />
          MINGXUAN // {moduleName}
        </div>
      )}
      <h1 className="title-ornament mb-3 justify-center text-3xl font-black text-paper-50 sm:text-4xl">
        <CharsRise text={title} step={110} className="text-shimmer-gold" />
      </h1>
      <p className="anim-fade-up mx-auto max-w-2xl text-sm leading-relaxed text-paper-300 sm:text-base" style={{ animationDelay: "240ms" }}>
        {subtitle}
      </p>
      {tags && tags.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {tags.map((tag, i) => (
            <span
              key={tag}
              className="anim-pop console-value rounded border border-gold-700/40 px-3 py-0.5 text-[11px]"
              style={{ animationDelay: `${Math.min(320 + i * 60, 620)}ms` }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {source && (
        <p className="anim-fade-in console-label mt-3 text-paper-500" style={{ animationDelay: "420ms" }}>
          REF · {source}
        </p>
      )}
      {children}
    </header>
  );
}

/** 页底声明：所有术数模块共享。 */
export function OracleDisclaimer() {
  return (
    <p className="console-label mx-auto max-w-5xl px-4 pb-12 pt-8 text-center text-paper-500 sm:px-6">
      结果仅供传统文化研究与娱乐参考
    </p>
  );
}