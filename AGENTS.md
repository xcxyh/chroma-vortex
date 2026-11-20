# Chroma Vortex 项目指南

这是一个无需构建的静态浏览器游戏。游戏界面使用简体中文，入口为 `index.html`。

## 代码地图

| 路径 | 职责 |
| --- | --- |
| `index.html`、`css/game.css` | 页面结构和响应式样式 |
| `js/game.js`、`js/levels.js` | 游戏交互、视图和关卡数据 |
| `js/pigment.js`、`js/paint.js`、`js/surface.js` | 颜料模型、搅拌模拟及 WebGL 表面渲染 |
| `js/collection.js`、`js/storage.js` | 色卡稀有度、收藏和游戏存档 |
| `js/drawing.js`、`js/oil.js` | 画室交互、草稿和油彩渲染 |
| `js/audio.js`、`assets/` | 游戏音效和图像素材 |
| `tests/` | 颜料模拟回归测试 |

## 修改约定

- 脚本经由 `index.html` 按顺序加载，并通过 `window.MixGame` 共享接口。调整脚本时验证直接打开页面和通过静态服务器访问的行为。
- 存档与画室草稿保存在 `localStorage`。调整结构时兼容已有存档，必要时提供迁移并验证旧数据。
- 修改颜料输运时检查质量守恒、盘边界、叠色及 Canvas 2D 回退。升级 vendored Three.js 时核对版本并保留上游许可证。
- 用户可见的变动记入 `CHANGELOG.md` 的 `Unreleased`，玩法或开发命令变更时同步更新 README。

## 验证

- 用 Node.js 24 运行 `node --test tests/*.cjs`。
- 用 `python3 -m http.server 8080` 启动网页。按修改范围验证自由搅拌、闯关、取色收藏、刷新后存档、画室撤销重做及 PNG 导出。
- 修改渲染或输入时检查桌面鼠标、移动端触摸、WebGL 和禁用 WebGL 时的 Canvas 2D。
