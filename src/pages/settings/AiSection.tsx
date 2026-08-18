import AiConfigForm, { useAiConfigForm } from "@/components/ai/AiConfigForm";
import SectionCard from "./SectionCard";

export default function AiSection() {
  const form = useAiConfigForm();
  return (
    <SectionCard
      title="AI 大模型配置"
      desc="支持 4 个渠道：内置直连（Cherry HMAC 签名）、Kilo 免费模型、Kimi（Moonshot）、自定义 OpenAI 兼容服务。各渠道配置独立保存。"
    >
      <AiConfigForm form={form} />
    </SectionCard>
  );
}
