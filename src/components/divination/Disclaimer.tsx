interface DisclaimerProps {
  text?: string;
}

export default function Disclaimer({ text }: DisclaimerProps) {
  return (
    <p className="console-label mt-8 text-center text-paper-500">
      {text ?? "占卜结果仅供传统文化研究与娱乐参考 · 重大决策请理性判断"}
    </p>
  );
}