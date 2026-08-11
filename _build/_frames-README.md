# 视频抽帧管线（参考素材不入仓）

`extract_frames.node.js` 是动作参考用的抽帧器：用浏览器 `<video>` seek + canvas 截帧，
把一段参考视频均匀抽成 PNG 序列，供逐帧比对招式姿态与节奏。

## 为什么仓库里没有素材和输出帧

| 路径 | 状态 | 原因 |
|---|---|---|
| `video.mp4` | **不入仓** | 第三方参考素材，版权原因禁止入仓（见根 `.gitignore` 第 2 行） |
| `_build/_frames/` | **不入仓** | 上述视频的抽帧衍生物，同属第三方版权内容 |
| `_build/frames_out*.txt` | 不入仓 | 运行日志，可再生 |
| `extract_frames.node.js` | ✅ 在仓库 | 管线本身是自有代码 |

参考素材仅用于本地逐帧观察动作节奏，**从不嵌入游戏、也不随仓库分发**。
成品中的美术资产自 M1.2 起全部自产（见 `artlib/README.md`）。

## 复现方法

脚本内的路径为硬编码常量，按本地环境改这三处：

```js
const puppeteer = require('<你的 puppeteer-core 路径>');
const SRC    = '<参考视频路径>';   // 任意 mp4
const OUTDIR = '<输出目录>';
const N = 16;                      // 抽帧数
```

还需一个 Chromium 内核浏览器（脚本默认 Edge）：

```js
executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
```

然后运行：

```bash
node _build/extract_frames.node.js
```

输出 `f00_<秒数>s.png` … `f15_<秒数>s.png`，时间点取每等分区间的中点
（`dur * (i + 0.5) / N`）。原次运行的输入为 30.1s / 960×720，抽 16 帧。

## 已知问题

- **file:// 宿主页**：`about:blank` 里加载 file:// 视频会被 URL safety check 拦，
  脚本会在视频同目录临时写一个 `_frame_host.html` 作同源宿主，结束后自动删除。
- **seek 卡死**：`onseeked` 5 秒不回调则兜底抓当前帧；`canplaythrough` 15 秒超时则
  继续用已读到的元数据。
- **protocolTimeout**：首次运行曾因 `Runtime.callFunctionOn` 超时失败
  （见当时日志），重跑即通过。视频较长或磁盘较慢时，可在 `puppeteer.launch()`
  加 `protocolTimeout: 180000`。

## 自制实测视频不受此限

`发布/血刃-M1.3-实测视频.mp4`（真实键鼠驱动录制）是自有内容，**已随仓库分发**，
与本文所述第三方参考素材无关。
