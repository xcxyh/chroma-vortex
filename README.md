# 0 卡解压小游戏合集 · Cozy Mini-Games

两款面向小红书小工具（Mini-Tool）打造的纯前端轻量解压小游戏，采用 **零依赖 HTML5 / CSS3 / Canvas 2D / WebAudio** 实现，两个子项目完全独立、互不耦合，均可单独本地运行、部署或打包上传。

## 项目列表

| 游戏 | 目录 | 玩法简介 | 独立特性 |
| :--- | :--- | :--- | :--- |
| **《全搅进去》** | [`games/quan-jiao-jin-qu/`](./games/quan-jiao-jin-qu/) | 搅奶油 & 甜品 DIY 解压游戏（72 关闯关 + 甜品自助吧 + 成就手账） | 真实奶油纹理拉丝、6 款实拍小料、原创 WebAudio 配乐《糖勺跳跳》、小红书一键晒评论/排行 |
| **《全挤上去》** | [`games/quan-ji-shang-qu/`](./games/quan-ji-shang-qu/) | 奶油胶手机壳 DIY（18 关接单闯关 + 自由挤壳 + 作品集） | 纯 Canvas 2D 立体裱花嘴（波浪/玫瑰/丝带 + 双色拼挤）、镜头避让裁剪、8 款 3D 树脂配件、540×675 出单小票与 DIY 材料清单 |

## 目录结构（严格独立）

```text
.
├── index.html                    # 双游戏合集导航页（可直接用于 GitHub Pages）
├── scripts/
│   └── build_zip.py              # 独立打包任一游戏为小红书小工具 ZIP
└── games/
    ├── quan-jiao-jin-qu/         # 《全搅进去》完整独立项目
    └── quan-ji-shang-qu/         # 《全挤上去》完整独立项目
```

> 每个子目录均只使用相对路径（`./...`），无跨目录引用，复制任一子目录即可独立运行或上传。

## 本地预览

在仓库根目录启动任意静态服务器：

```bash
python3 -m http.server 8765
```

浏览器打开：
- 合集入口：`http://127.0.0.1:8765/`
- 《全搅进去》：`http://127.0.0.1:8765/games/quan-jiao-jin-qu/?preview=1`
- 《全挤上去》：`http://127.0.0.1:8765/games/quan-ji-shang-qu/?preview=1`

> 加上 `?preview=1` 可在普通浏览器中体验「晒到评论区 / 分享 / 发笔记」等小红书小工具交互的预览反馈。

## 独立打包为小红书小工具 ZIP

```bash
# 打包全部两款游戏到 dist/
python3 scripts/build_zip.py

# 或单独打包指定游戏
python3 scripts/build_zip.py quan-jiao-jin-qu
python3 scripts/build_zip.py quan-ji-shang-qu
```
