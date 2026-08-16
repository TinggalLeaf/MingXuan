import type { ReactNode } from "react";

interface ResultCardProps {
  title: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  seq?: string;
  children: ReactNode;
}

export default function ResultCard({ title, subtitle, badge, seq = "00", children }: ResultCardProps) {
  return (
    <section className="panel-console hud-frame anim-unroll p-4 sm:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gold-500/15 pb-3">
        <div>
          <h2 className="console-title text-lg sm:text-xl">
            <span className="seq">{seq}</span>
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-[11px] text-paper-500">{subtitle}</p>}
        </div>
        {badge && <div className="flex flex-wrap items-center gap-2">{badge}</div>}
      </header>
      {children}
    </section>
  );
}