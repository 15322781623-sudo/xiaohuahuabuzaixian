"""
批量生成 APK + EXE 图标脚本
用法: python scripts/gen_icons.py <源图片路径>
"""
import sys
import os
import struct
import zlib
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else None
if not SRC or not os.path.exists(SRC):
    print("用法: python scripts/gen_icons.py <源图片路径>")
    sys.exit(1)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
img = Image.open(SRC).convert("RGBA")
print(f"源图片: {SRC}  尺寸: {img.size}")

def save_icon(img_src, path, size, circle=False):
    """保存指定尺寸的图标，circle=True 生成圆形裁剪版"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    resized = img_src.resize((size, size), Image.LANCZOS)
    if circle:
        # 圆形蒙版
        from PIL import ImageDraw
        mask = Image.new("L", (size, size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, size-1, size-1), fill=255)
        result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        result.paste(resized, mask=mask)
        resized = result
    resized.save(path, "PNG")
    print(f"  ✅ {os.path.relpath(path, ROOT)}  ({size}x{size})")

def save_foreground(img_src, path, size):
    """前景图标：108dp规范，图标居中，四周留白约1/8"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # 前景内容占画布约72%（避免自适应图标裁剪）
    inner = int(size * 0.72)
    resized = img_src.resize((inner, inner), Image.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(resized, (offset, offset), resized)
    canvas.save(path, "PNG")
    print(f"  ✅ {os.path.relpath(path, ROOT)}  foreground ({size}x{size})")

# ==================== Android APK 图标 ====================
print("\n🤖 生成 Android APK 图标...")

android_res = os.path.join(ROOT, "android", "app", "src", "main", "res")

android_sizes = {
    "mipmap-mdpi":    {"launcher": 48,  "foreground": 108, "round": 48},
    "mipmap-hdpi":    {"launcher": 72,  "foreground": 162, "round": 72},
    "mipmap-xhdpi":   {"launcher": 96,  "foreground": 216, "round": 96},
    "mipmap-xxhdpi":  {"launcher": 144, "foreground": 324, "round": 144},
    "mipmap-xxxhdpi": {"launcher": 192, "foreground": 432, "round": 192},
}

for folder, sizes in android_sizes.items():
    base = os.path.join(android_res, folder)
    save_icon(img, os.path.join(base, "ic_launcher.png"), sizes["launcher"])
    save_foreground(img, os.path.join(base, "ic_launcher_foreground.png"), sizes["foreground"])
    save_icon(img, os.path.join(base, "ic_launcher_round.png"), sizes["round"], circle=True)

# ==================== Tauri EXE 图标 ====================
print("\n🖥️  生成 Tauri EXE 图标...")

tauri_icons = os.path.join(ROOT, "src-tauri", "icons")

save_icon(img, os.path.join(tauri_icons, "32x32.png"), 32)
save_icon(img, os.path.join(tauri_icons, "128x128.png"), 128)
save_icon(img, os.path.join(tauri_icons, "128x128@2x.png"), 256)
save_icon(img, os.path.join(tauri_icons, "icon.png"), 512)

# Square logos for Windows
for size in [30, 44, 71, 89, 107, 142, 150, 284, 310]:
    save_icon(img, os.path.join(tauri_icons, f"Square{size}x{size}Logo.png"), size)
save_icon(img, os.path.join(tauri_icons, "StoreLogo.png"), 50)

# ==================== 生成 icon.ico ====================
print("\n🪟  生成 icon.ico (多尺寸)...")

ico_sizes = [16, 24, 32, 48, 64, 128, 256]
ico_images = []
for s in ico_sizes:
    ico_images.append(img.resize((s, s), Image.LANCZOS).convert("RGBA"))

ico_path = os.path.join(tauri_icons, "icon.ico")
ico_images[0].save(
    ico_path,
    format="ICO",
    sizes=[(s, s) for s in ico_sizes],
    append_images=ico_images[1:]
)
print(f"  ✅ src-tauri/icons/icon.ico  (多尺寸: {ico_sizes})")

# ==================== 生成 icon.icns (macOS) ====================
print("\n🍎  生成 icon.icns (macOS)...")

icns_path = os.path.join(tauri_icons, "icon.icns")

# ICNS 格式手动生成（Python 原生不支持，用最小化写法）
ICNS_TYPES = [
    ("is32", 16), ("il32", 32), ("ih32", 48),
    ("icp4", 16), ("icp5", 32), ("icp6", 64),
    ("ic07", 128), ("ic08", 256), ("ic09", 512), ("ic10", 1024),
]

import io

def png_bytes(pil_img, size):
    buf = io.BytesIO()
    pil_img.resize((size, size), Image.LANCZOS).save(buf, "PNG")
    return buf.getvalue()

chunks = []
for type_code, size in ICNS_TYPES:
    data = png_bytes(img, size)
    type_bytes = type_code.encode("ascii")
    length = 8 + len(data)
    chunks.append(struct.pack(">4sI", type_bytes, length) + data)

total_len = 8 + sum(len(c) for c in chunks)
with open(icns_path, "wb") as f:
    f.write(b"icns")
    f.write(struct.pack(">I", total_len))
    for c in chunks:
        f.write(c)

print(f"  ✅ src-tauri/icons/icon.icns")

print("\n🎉 全部图标生成完成！")
print(f"   Android APK: {len(android_sizes) * 3} 个图标文件")
print(f"   Tauri EXE:   {len(ico_sizes) + 14} 个图标文件（含 ico/icns）")
