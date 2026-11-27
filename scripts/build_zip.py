#!/usr/bin/env python3
"""独立打包 games/<name>/ 为小红书小工具离线 ZIP（零依赖）."""

from html.parser import HTMLParser
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import sys

ROOT = Path(__file__).resolve().parent.parent
GAMES_DIR = ROOT / "games"
DIST_DIR = ROOT / "dist"
ALLOWED_SUFFIXES = {".html", ".js", ".css", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".json"}

GAME_NAMES = {
    "quan-jiao-jin-qu": "全搅进去-小红书小工具.zip",
    "quan-ji-shang-qu": "全挤上去-小红书小工具.zip",
}


class EntryValidator(HTMLParser):
    def __init__(self, game_dir: Path):
        super().__init__()
        self.game_dir = game_dir

    def handle_starttag(self, tag, attrs):
        attr_map = dict(attrs)
        if tag in {"script", "link"}:
            ref = attr_map.get("src") or attr_map.get("href")
            if ref:
                if ref.startswith(("http://", "https://", "//", "/")):
                    raise AssertionError(f"禁止外链或绝对路径: {ref}")
                target = (self.game_dir / ref).resolve()
                if not target.is_file() or not str(target).startswith(str(self.game_dir.resolve())):
                    raise AssertionError(f"资源缺失或越界: {ref}")
        for key in attr_map:
            if key.lower().startswith("on"):
                raise AssertionError(f"禁止内联事件处理器: <{tag} {key}=...>")


def build_game(slug: str) -> Path:
    game_dir = GAMES_DIR / slug
    if not game_dir.is_dir():
        raise SystemExit(f"找不到游戏目录: {game_dir}")

    index_html = game_dir / "index.html"
    if not index_html.is_file():
        raise SystemExit(f"缺少入口文件: {index_html}")

    EntryValidator(game_dir).feed(index_html.read_text(encoding="utf-8"))

    files = sorted(
        p for p in game_dir.rglob("*")
        if p.is_file()
        and p.suffix.lower() in ALLOWED_SUFFIXES
        and not p.name.startswith(".")
    )

    DIST_DIR.mkdir(parents=True, exist_ok=True)
    out_name = GAME_NAMES.get(slug, f"{slug}.zip")
    zip_path = DIST_DIR / out_name

    with ZipFile(zip_path, "w", compression=ZIP_DEFLATED, compresslevel=9) as zf:
        for f in files:
            zf.write(f, f.relative_to(game_dir).as_posix())

    with ZipFile(zip_path, "r") as zf:
        if zf.testzip() is not None:
            raise AssertionError("ZIP 完整性校验失败")
        assert "index.html" in zf.namelist()
        assert len(zf.namelist()) == len(files)

    digest = hashlib.sha256(zip_path.read_bytes()).hexdigest()[:16]
    print(f"[OK] {slug} -> {zip_path.relative_to(ROOT)} ({zip_path.stat().st_size:,} bytes, {len(files)} files, sha256={digest})")
    return zip_path


def main(argv: list[str]) -> int:
    targets = argv[1:] or sorted(p.name for p in GAMES_DIR.iterdir() if p.is_dir())
    for slug in targets:
        build_game(slug)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
