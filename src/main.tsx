import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initProfilesStore } from "@/lib/profiles";
import { initSettings } from "@/lib/settings";
import { initDreamDb } from "@/lib/dream";

// 应用启动：先加载本地设置（主题/字体等立即生效），再加载命盘存档与梦境资料库
initSettings();
initProfilesStore();
initDreamDb();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);