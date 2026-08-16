import { useEffect, type ReactNode } from "react";
import { siteConfig } from "@/lib/config";

/**
 * 设置 document.title（替代 Next.js 的 metadata）。
 * 标题规则与源工程一致：`{title} · 明玄`，不传 title 时用默认站点标题。
 */
export default function Title({ title, children }: { title?: string; children?: ReactNode }) {
  useEffect(() => {
    if (!title) {
      document.title = `${siteConfig.name} · 中华玄学综合排盘`;
    } else if (title.includes(siteConfig.name)) {
      document.title = title;
    } else {
      document.title = `${title} · ${siteConfig.name}`;
    }
  }, [title]);
  return <>{children}</>;
}
