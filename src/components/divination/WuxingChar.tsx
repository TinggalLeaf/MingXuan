import { charWuxingClass } from "@/lib/wuxing";

interface WuxingCharProps {
  char: string;
  className?: string;
}

/** 给单字（干支）渲染五行着色（外部 .wx-* 颜色类） */
export default function WuxingChar({ char, className = "" }: WuxingCharProps) {
  return <span className={`${charWuxingClass(char)} ${className}`}>{char}</span>;
}