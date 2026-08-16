# 明玄 · 中华玄学综合排盘

基于 **Tauri 2 + Vite + React 19 + TypeScript** 的桌面命理应用（由 Next.js 版 `mingxuan_web` 移植）。

## 功能

- **排盘**：八字（子平四柱）、紫微斗数、西洋星盘、七政四余、住宅风水
- **合盘**：八字合婚、星盘合盘
- **占卜**：六爻纳甲、梅花易数、奇门遁甲、大六壬、太乙神数、皇极经世、五运六气、塔罗牌、三山国王灵签
- **择日**：黄历宜忌、吉日遴选
- **人生 K 线**：百年运势 K 线图（独创）

核心算法来自 [`mingyu-core`](https://www.npmjs.com/package/mingyu-core)，紫微斗数基于 `iztro`，图表基于 `echarts`。

## 开发

```bash
pnpm install

# 纯前端开发（浏览器，http://localhost:1420）
pnpm dev

# 桌面应用开发（Tauri，热更新）
pnpm tauri dev

# 前端产物构建（tsc + vite build → dist/）
pnpm build

# 桌面应用打包
pnpm tauri build
```

## 配置

环境变量见 `.env.example`（复制为 `.env` 后按需修改）。Vite 仅暴露 `VITE_` 前缀变量，可配置功能模块开关、K 线配色 / 跨度、AI 解读接口（OpenAI 兼容，留空则隐藏）与排盘默认项。

## 目录结构

- `src/pages/` — 页面（每路由一个文件，对应原 App Router 路由）
- `src/components/` — UI 组件
- `src/lib/` — 全局配置（`config.ts`）、五行与 K 线算法
- `src/App.tsx` — HashRouter 路由表（Tauri 打包后无服务端，必须用 hash 路由）
- `src-tauri/` — Tauri 原生侧配置
