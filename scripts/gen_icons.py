"""
Tauri EXE 图标生成脚本
从高清源图生成全套 Tauri 所需图标尺寸，采用 LANCZOS 高质量缩放。

用法:
  python scripts/gen_icons.py [源图路径]

默认源图: scripts/source_icon.png
"""
import os
import sys
from PIL import Image

# 高清缩放算法
RESAMPLE = Image.LANCZOS

# Tauri 所需图标尺寸
TAURI_ICONS = {
    "icon.png": 512,
    "128x128.png": 128,
    "128x128@2x.png": 256,
    "32x32.png": 32,
    "Square30x30Logo.png": 30,
    "Square44x44Logo.png": 44,
    "Square71x71Logo.png": 71,
    "Square89x89Logo.png": 89,
    "Square107x107Logo.png": 107,
    "Square142x142Logo.png": 142,
    "Square150x150Logo.png": 150,
    "Square284x284Logo.png": 284,
    "Square310x310Logo.png": 310,
    "StoreLogo.png": 50,
}

# ICO 文件包含的尺寸（从小到大）
ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ICONS_DIR = os.path.join(PROJECT_ROOT, "src-tauri", "icons")


def resize_icon(source: Image.Image, size: int) -> Image.Image:
    """高质量缩放到指定尺寸（正方形）"""
    return source.resize((size, size), RESAMPLE)


def generate_icons(source_path: str):
    """从源图生成全套 Tauri 图标"""
    if not os.path.isfile(source_path):
        print(f"错误: 源图不存在: {source_path}")
        sys.exit(1)

    source = Image.open(source_path).convert("RGBA")
    print(f"源图尺寸: {source.size[0]}x{source.size[1]}")

    os.makedirs(ICONS_DIR, exist_ok=True)

    # 生成各尺寸 PNG 图标
    for filename, size in TAURI_ICONS.items():
        resized = resize_icon(source, size)
        out_path = os.path.join(ICONS_DIR, filename)
        resized.save(out_path, "PNG")
        print(f"  ✅ {filename} ({size}x{size})")

    # 生成 ICO 文件（256x256 单尺寸，Windows 会自动缩放小尺寸）
    # 注: Pillow 12.x 多尺寸 append_images 有 bug，使用单尺寸 256x256 即可
    ico_256 = resize_icon(source, 256)
    ico_path = os.path.join(ICONS_DIR, "icon.ico")
    ico_256.save(ico_path, format="ICO", sizes=[(256, 256)])
    print(f"  ✅ icon.ico (256x256)")

    # 生成 icns (macOS) - 可选
    print("\n全部图标生成完成！")
    print(f"输出目录: {ICONS_DIR}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        source = sys.argv[1]
    else:
        source = os.path.join(SCRIPT_DIR, "source_icon.png")
    generate_icons(source)
