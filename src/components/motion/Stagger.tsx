
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import Reveal, { type RevealVariant } from "./Reveal";

export interface StaggerProps {
  children: ReactNode;
  /** 每个子项递增延迟（ms） */
  step?: number;
  /** 起始延迟（ms） */
  base?: number;
  variant?: RevealVariant;
  className?: string;
}

/**
 * 逐个子项递增延迟的滚动显现。
 * 用法：<Stagger step={90}>{items.map(...)}</Stagger>
 */
export default function Stagger({
  children,
  step = 90,
  base = 0,
  variant = "up",
  className = "",
}: StaggerProps) {
  return (
    <>
      {Children.map(children, (child, i) => (
        <Reveal
          key={isValidElement(child) ? (child as ReactElement).key ?? i : i}
          variant={variant}
          delay={base + i * step}
          className={className}
        >
          {child}
        </Reveal>
      ))}
    </>
  );
}
