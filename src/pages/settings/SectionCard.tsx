/** 设置中心各区块共用的卡片容器 */

export default function SectionCard({
  title, desc, children,
}: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="card-xuan p-5">
      <h2 className="mb-1 text-base font-bold text-gold-300">{title}</h2>
      {desc && <p className="mb-4 text-xs leading-relaxed text-paper-400">{desc}</p>}
      {!desc && <div className="mb-4" />}
      {children}
    </section>
  );
}
