#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把竹石抓取数据里的封面压缩到列表页可用尺寸，输出到 fanke-research-hub/assets/zhushi/c/

用法: python scripts/build-zhushi-covers.py "C:/Users/lok/WorkBuddy/2026-10-29-10-58-21/zhushi_data"
输出: assets/zhushi/c/<channel>_<id>.jpg  (宽 480, JPEG q80, 等比)
"""
import json
import sys
from pathlib import Path

from PIL import Image

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "C:/Users/lok/WorkBuddy/2026-10-29-10-58-21/zhushi_data")
OUT = Path(__file__).resolve().parent.parent / "assets" / "zhushi" / "c"
OUT.mkdir(parents=True, exist_ok=True)

items = json.loads((SRC / "all_items.json").read_text(encoding="utf-8"))
WIDTH = 480
QUALITY = 80

done, skip, fail = 0, 0, 0
total_in, total_out = 0, 0

for it in items:
    cover = (it.get("_local") or {}).get("cover")
    if not cover:
        skip += 1
        continue
    src = SRC / cover
    if not src.exists():
        skip += 1
        continue
    dst = OUT / f"{it['_channel']}_{it['_id']}.jpg"
    try:
        total_in += src.stat().st_size
        im = Image.open(src)
        im = im.convert("RGB")
        if im.width > WIDTH:
            h = round(im.height * WIDTH / im.width)
            im = im.resize((WIDTH, h), Image.LANCZOS)
        im.save(dst, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        total_out += dst.stat().st_size
        done += 1
        if done % 50 == 0:
            print(f"  已压 {done}/{len(items)}")
    except Exception as e:
        fail += 1
        if fail <= 5:
            print(f"  [fail] {it['_channel']}_{it['_id']}: {e}")

print(f"\n压缩完成: {done} 成功, {skip} 跳过, {fail} 失败")
print(f"原始 {total_in/1024/1024:.1f}MB → 压缩后 {total_out/1024/1024:.1f}MB")
if done:
    print(f"平均每张 {total_out/done/1024:.0f}KB")
