import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initProfilesStore } from "@/lib/profiles";

// Tauri 桌面端：启动时从磁盘载入命盘存档
initProfilesStore();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
