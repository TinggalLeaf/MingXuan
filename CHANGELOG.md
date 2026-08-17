# Changelog

## [1.1.0](https://github.com/TinggalLeaf/MingXuan/compare/v1.0.0...v1.1.0) (2026-08-17)


### Features

* **ai:** 集成 kilo_auto 与 kimi_ai_chat2api 渠道，优化 AI 设置 UI ([71976d3](https://github.com/TinggalLeaf/MingXuan/commit/71976d3a6a44e3f98d031dcd24cbfdb7abe3035e))
* Kilo+Kimi 由 Rust 后端直连（免启本地服务）+ 系统字体下拉 ([da44fee](https://github.com/TinggalLeaf/MingXuan/commit/da44fee7b2fd1c14677730b1d685e28098786f63))
* **naming:** 全量古诗文本地索引（PiPiName SQLite 252 MB） ([33bbbe9](https://github.com/TinggalLeaf/MingXuan/commit/33bbbe9374d6a7a908beade8e903e73ab56adb16))
* **naming:** 切分 SQLite 为 12 分片（GitHub 100MB 限制合规） ([a4a959e](https://github.com/TinggalLeaf/MingXuan/commit/a4a959ecdfbb83c4d016e1ac229e637807b7d93d))
* 明玄 · 中华玄学综合排盘 Tauri 桌面应用 ([1cde8aa](https://github.com/TinggalLeaf/MingXuan/commit/1cde8aa8d980e7f1ab868a63f1612488c904c03a))
* 自动更新、AI 置信度、黄历、地点服务、PDF 导出 ([abcbe78](https://github.com/TinggalLeaf/MingXuan/commit/abcbe78eb387cc73d7389cafe1c2d865d62d703d))
* 设置中心、周公解梦、增强 Markdown 渲染 ([952478c](https://github.com/TinggalLeaf/MingXuan/commit/952478c9a1f1340a6d227499996072de929b77d4))
* 集成 PiPiName 起名功能（全部本地数据） ([52f6082](https://github.com/TinggalLeaf/MingXuan/commit/52f6082ae386b87d114a68e75d96c069a10a4018))


### Bug Fixes

* **ci:** Linux 仅打 deb 包 ([45b1d10](https://github.com/TinggalLeaf/MingXuan/commit/45b1d10982b92f1b8ac13dbff130e0f44d520194))
* **ci:** macOS bundles 增加 app 以产出 .app.tar.gz ([c8f1b3a](https://github.com/TinggalLeaf/MingXuan/commit/c8f1b3a34e29706741423f6d0939857f08de66b6))
* **ci:** macOS 仅上传 dmg（本工程不产出 .app.tar.gz） ([fe6fad1](https://github.com/TinggalLeaf/MingXuan/commit/fe6fad1df077f57c33dc4ba0c433ea12d42d2b3a))
* **ci:** macOS 便携包动态查找 .app bundle ([17843ef](https://github.com/TinggalLeaf/MingXuan/commit/17843ef0545d135057636a770cf2567a31be696c))
* **ci:** macOS 便携包改用 .app.tar.gz（dmg 打包后裸 .app 已被清理） ([49205ef](https://github.com/TinggalLeaf/MingXuan/commit/49205ef6d2b768808abc631eb3fd9bbd33d27300))
* **ci:** macOS 资产以 dmg 为准，便携包改为可选 ([3aa5f80](https://github.com/TinggalLeaf/MingXuan/commit/3aa5f80043af0c26d6bee84445de3c6039ab171a))
* **ci:** Node 20→22（pnpm 11 要求 &gt;=22.13） ([2826b9b](https://github.com/TinggalLeaf/MingXuan/commit/2826b9b6608983864732b8a117039e6f12a0a0d6))
* **ci:** release-please 派发步骤补 -R 仓库参数 ([1003169](https://github.com/TinggalLeaf/MingXuan/commit/10031691bd8f3763185d73b2679d9bb5b180a3be))
* **ci:** 上传前将产物改为 ASCII 文件名 ([b808a74](https://github.com/TinggalLeaf/MingXuan/commit/b808a741676c3d733412f96035f0bafe82084298))
* **huangli:** 丰歉歌块提取改用单换行 + 时辰 ([832c469](https://github.com/TinggalLeaf/MingXuan/commit/832c46935c221eee41a8c751419de939b2742c39))
* **huangli:** 完全重写 Rust 解析，去掉 HTML 标签污染 ([7ee9615](https://github.com/TinggalLeaf/MingXuan/commit/7ee9615f6d43e1ea1526905b6f96b68c08fae078))
* **huangli:** 第三次重写 Rust 解析 ([1f0aa5f](https://github.com/TinggalLeaf/MingXuan/commit/1f0aa5fa2c751590df3121169092604a40d4b24f))
* **liuyao:** 修复"六爻模拟投掷不能同时提供手工爻值"报错 ([7add774](https://github.com/TinggalLeaf/MingXuan/commit/7add774491071fe8ff278926972aa618d19982a4))
* **naming:** open_with_shards 使用 env 变量找分片目录 ([5140567](https://github.com/TinggalLeaf/MingXuan/commit/5140567080ff0ed3fb4a5fef2c16167d3b19234a))
* **naming:** 修复 Tauri 打包后分片路径（启动时复制到 app_data_dir） ([637167f](https://github.com/TinggalLeaf/MingXuan/commit/637167fd0bd7eb7527c587f567245bb86a0d36bc))
* **rust:** 删除 lib.rs 重复 use serde::Deserialize 与无用 LocationSearchArgs ([3cc6d2e](https://github.com/TinggalLeaf/MingXuan/commit/3cc6d2e7605efc676a50fad778e92323ac2dccd1))
* **rust:** 清理 unused 警告 ([dcec76f](https://github.com/TinggalLeaf/MingXuan/commit/dcec76fdf3456116c62286cb5344f516f955b3ff))
* **Zeri:** 第⑦板块丰歉歌文本只占左半边 ([466bec0](https://github.com/TinggalLeaf/MingXuan/commit/466bec00124c71585a9c0ac52c4b1fa60458c3c0))
* 置信度徽章移到 AI 解读开始后 + 黄历全字段采集展示 ([a8a9ff2](https://github.com/TinggalLeaf/MingXuan/commit/a8a9ff20d366f6a70d95c36d5e4ec56ec66fe85d))

## 1.0.0 (2026-08-17)


### Features

* **ai:** 集成 kilo_auto 与 kimi_ai_chat2api 渠道，优化 AI 设置 UI ([71976d3](https://github.com/TinggalLeaf/MingXuan/commit/71976d3a6a44e3f98d031dcd24cbfdb7abe3035e))
* Kilo+Kimi 由 Rust 后端直连（免启本地服务）+ 系统字体下拉 ([da44fee](https://github.com/TinggalLeaf/MingXuan/commit/da44fee7b2fd1c14677730b1d685e28098786f63))
* **naming:** 全量古诗文本地索引（PiPiName SQLite 252 MB） ([33bbbe9](https://github.com/TinggalLeaf/MingXuan/commit/33bbbe9374d6a7a908beade8e903e73ab56adb16))
* **naming:** 切分 SQLite 为 12 分片（GitHub 100MB 限制合规） ([a4a959e](https://github.com/TinggalLeaf/MingXuan/commit/a4a959ecdfbb83c4d016e1ac229e637807b7d93d))
* 明玄 · 中华玄学综合排盘 Tauri 桌面应用 ([1cde8aa](https://github.com/TinggalLeaf/MingXuan/commit/1cde8aa8d980e7f1ab868a63f1612488c904c03a))
* 自动更新、AI 置信度、黄历、地点服务、PDF 导出 ([abcbe78](https://github.com/TinggalLeaf/MingXuan/commit/abcbe78eb387cc73d7389cafe1c2d865d62d703d))
* 设置中心、周公解梦、增强 Markdown 渲染 ([952478c](https://github.com/TinggalLeaf/MingXuan/commit/952478c9a1f1340a6d227499996072de929b77d4))
* 集成 PiPiName 起名功能（全部本地数据） ([52f6082](https://github.com/TinggalLeaf/MingXuan/commit/52f6082ae386b87d114a68e75d96c069a10a4018))


### Bug Fixes

* **ci:** Linux 仅打 deb 包 ([45b1d10](https://github.com/TinggalLeaf/MingXuan/commit/45b1d10982b92f1b8ac13dbff130e0f44d520194))
* **ci:** macOS bundles 增加 app 以产出 .app.tar.gz ([c8f1b3a](https://github.com/TinggalLeaf/MingXuan/commit/c8f1b3a34e29706741423f6d0939857f08de66b6))
* **ci:** macOS 仅上传 dmg（本工程不产出 .app.tar.gz） ([fe6fad1](https://github.com/TinggalLeaf/MingXuan/commit/fe6fad1df077f57c33dc4ba0c433ea12d42d2b3a))
* **ci:** macOS 便携包动态查找 .app bundle ([17843ef](https://github.com/TinggalLeaf/MingXuan/commit/17843ef0545d135057636a770cf2567a31be696c))
* **ci:** macOS 便携包改用 .app.tar.gz（dmg 打包后裸 .app 已被清理） ([49205ef](https://github.com/TinggalLeaf/MingXuan/commit/49205ef6d2b768808abc631eb3fd9bbd33d27300))
* **ci:** macOS 资产以 dmg 为准，便携包改为可选 ([3aa5f80](https://github.com/TinggalLeaf/MingXuan/commit/3aa5f80043af0c26d6bee84445de3c6039ab171a))
* **ci:** Node 20→22（pnpm 11 要求 &gt;=22.13） ([2826b9b](https://github.com/TinggalLeaf/MingXuan/commit/2826b9b6608983864732b8a117039e6f12a0a0d6))
* **ci:** release-please 派发步骤补 -R 仓库参数 ([1003169](https://github.com/TinggalLeaf/MingXuan/commit/10031691bd8f3763185d73b2679d9bb5b180a3be))
* **ci:** 上传前将产物改为 ASCII 文件名 ([b808a74](https://github.com/TinggalLeaf/MingXuan/commit/b808a741676c3d733412f96035f0bafe82084298))
* **huangli:** 丰歉歌块提取改用单换行 + 时辰 ([832c469](https://github.com/TinggalLeaf/MingXuan/commit/832c46935c221eee41a8c751419de939b2742c39))
* **huangli:** 完全重写 Rust 解析，去掉 HTML 标签污染 ([7ee9615](https://github.com/TinggalLeaf/MingXuan/commit/7ee9615f6d43e1ea1526905b6f96b68c08fae078))
* **huangli:** 第三次重写 Rust 解析 ([1f0aa5f](https://github.com/TinggalLeaf/MingXuan/commit/1f0aa5fa2c751590df3121169092604a40d4b24f))
* **liuyao:** 修复"六爻模拟投掷不能同时提供手工爻值"报错 ([7add774](https://github.com/TinggalLeaf/MingXuan/commit/7add774491071fe8ff278926972aa618d19982a4))
* **naming:** open_with_shards 使用 env 变量找分片目录 ([5140567](https://github.com/TinggalLeaf/MingXuan/commit/5140567080ff0ed3fb4a5fef2c16167d3b19234a))
* **naming:** 修复 Tauri 打包后分片路径（启动时复制到 app_data_dir） ([637167f](https://github.com/TinggalLeaf/MingXuan/commit/637167fd0bd7eb7527c587f567245bb86a0d36bc))
* **rust:** 删除 lib.rs 重复 use serde::Deserialize 与无用 LocationSearchArgs ([3cc6d2e](https://github.com/TinggalLeaf/MingXuan/commit/3cc6d2e7605efc676a50fad778e92323ac2dccd1))
* **rust:** 清理 unused 警告 ([dcec76f](https://github.com/TinggalLeaf/MingXuan/commit/dcec76fdf3456116c62286cb5344f516f955b3ff))
* **Zeri:** 第⑦板块丰歉歌文本只占左半边 ([466bec0](https://github.com/TinggalLeaf/MingXuan/commit/466bec00124c71585a9c0ac52c4b1fa60458c3c0))
* 置信度徽章移到 AI 解读开始后 + 黄历全字段采集展示 ([a8a9ff2](https://github.com/TinggalLeaf/MingXuan/commit/a8a9ff20d366f6a70d95c36d5e4ec56ec66fe85d))

## [1.1.0](https://github.com/TinggalLeaf/MingXuan/compare/v1.0.0...v1.1.0) (2026-08-16)


### Features

* 自动更新、AI 置信度、黄历、地点服务、PDF 导出 ([b180798](https://github.com/TinggalLeaf/MingXuan/commit/b1807984d72b81a3b5e114dc0f79150784ac1e96))
* 设置中心、周公解梦、增强 Markdown 渲染 ([b32bfb4](https://github.com/TinggalLeaf/MingXuan/commit/b32bfb40b6904ee28e4bba88d9adce899baad252))


### Bug Fixes

* **huangli:** 丰歉歌块提取改用单换行 + 时辰 ([bbf75b9](https://github.com/TinggalLeaf/MingXuan/commit/bbf75b93888cd167f0d2f25f722fb56589488025))
* **huangli:** 完全重写 Rust 解析，去掉 HTML 标签污染 ([6db6fca](https://github.com/TinggalLeaf/MingXuan/commit/6db6fcad62db52714e603513ae99b1decb235a56))
* **huangli:** 第三次重写 Rust 解析 ([4b65a51](https://github.com/TinggalLeaf/MingXuan/commit/4b65a5147ebbf94ae4273b2ca0926a53f677cee6))
* **rust:** 删除 lib.rs 重复 use serde::Deserialize 与无用 LocationSearchArgs ([e8578e8](https://github.com/TinggalLeaf/MingXuan/commit/e8578e86b3c6e62ef5ba44cebd28335f757c7654))
* **Zeri:** 第⑦板块丰歉歌文本只占左半边 ([9d3345d](https://github.com/TinggalLeaf/MingXuan/commit/9d3345dc9cfe03ee598e686831ed2ed16b3b112a))
* 置信度徽章移到 AI 解读开始后 + 黄历全字段采集展示 ([ec982d3](https://github.com/TinggalLeaf/MingXuan/commit/ec982d32e8fdd2802313ac3c5c02c0b3e62677bc))

## 1.0.0 (2026-08-16)


### Features

* 明玄 · 中华玄学综合排盘 Tauri 桌面应用 ([1cde8aa](https://github.com/TinggalLeaf/MingXuan/commit/1cde8aa8d980e7f1ab868a63f1612488c904c03a))
