"""
从 APPS.PNG 生成所有 Android 图标尺寸
用法: python generate_icons_from_apps.py
"""
from PIL import Image
import os

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(BASE), 'APPS.PNG')  # h:/Phone/APPS.PNG
RES = os.path.join(BASE, 'app', 'src', 'main', 'res')

# Android 密度映射
DENSITIES = {
    'mdpi':    1.0,
    'hdpi':    1.5,
    'xhdpi':   2.0,
    'xxhdpi':  3.0,
    'xxxhdpi': 4.0,
}

# 静态启动图标尺寸 (48dp)
STATIC_DP = 48
# 自适应图标前景/背景 (108dp)
ADAPTIVE_DP = 108
# 动态时辰图标
DYNAMIC_SIZE = 432
# 十二地支
SHICHEN = ['zi', 'chou', 'yin', 'mao', 'chen', 'si',
           'wu', 'wei', 'shen', 'you', 'xu', 'hai']

def main():
    if not os.path.exists(SRC):
        print(f'错误: 找不到源文件 {SRC}')
        return

    src = Image.open(SRC).convert('RGBA')
    print(f'源图: {src.size}, 模式: {src.mode}')

    # 1. 生成静态启动图标
    print('\n--- 静态启动图标 (ic_launcher.png) ---')
    for density, scale in DENSITIES.items():
        size = int(STATIC_DP * scale)
        dst_dir = os.path.join(RES, f'mipmap-{density}')
        dst = os.path.join(dst_dir, 'ic_launcher.png')
        img = src.resize((size, size), Image.LANCZOS)
        img.save(dst, 'PNG')
        print(f'  {density}: {size}×{size} → {dst}')

    # 2. 生成自适应图标前景
    print('\n--- 自适应图标前景 (ic_launcher_foreground.png) ---')
    for density, scale in DENSITIES.items():
        size = int(ADAPTIVE_DP * scale)
        dst_dir = os.path.join(RES, f'mipmap-{density}')
        dst = os.path.join(dst_dir, 'ic_launcher_foreground.png')
        img = src.resize((size, size), Image.LANCZOS)
        img.save(dst, 'PNG')
        print(f'  {density}: {size}×{size} → {dst}')

    # 3. 生成自适应图标背景 (深色纯色)
    print('\n--- 自适应图标背景 (ic_launcher_background.png) ---')
    bg_color = (44, 24, 16)  # 深棕色，匹配 app 主题
    for density, scale in DENSITIES.items():
        size = int(ADAPTIVE_DP * scale)
        dst_dir = os.path.join(RES, f'mipmap-{density}')
        dst = os.path.join(dst_dir, 'ic_launcher_background.png')
        img = Image.new('RGBA', (size, size), bg_color + (255,))
        img.save(dst, 'PNG')
        print(f'  {density}: {size}×{size} → {dst}')

    # 4. 生成单色图标 (灰度前景)
    print('\n--- 单色图标 (ic_launcher_monochrome.png) ---')
    for density, scale in DENSITIES.items():
        size = int(ADAPTIVE_DP * scale)
        dst_dir = os.path.join(RES, f'mipmap-{density}')
        dst = os.path.join(dst_dir, 'ic_launcher_monochrome.png')
        gray = src.convert('L').resize((size, size), Image.LANCZOS)
        gray.save(dst, 'PNG')
        print(f'  {density}: {size}×{size} → {dst}')

    # 5. 生成 12 时辰动态图标
    print('\n--- 12时辰动态图标 (drawable/) ---')
    dynamic_img = src.resize((DYNAMIC_SIZE, DYNAMIC_SIZE), Image.LANCZOS)
    for name in SHICHEN:
        dst = os.path.join(RES, 'drawable', f'ic_launcher_{name}.png')
        dynamic_img.save(dst, 'PNG')
    print(f'  全部12个时辰: {DYNAMIC_SIZE}×{DYNAMIC_SIZE} → drawable/ic_launcher_*.png')

    # 6. 更新渐变背景图
    print('\n--- 渐变背景图 (ic_gradient_bg.png) ---')
    bg_dst = os.path.join(RES, 'drawable', 'ic_gradient_bg.png')
    bg_full = Image.new('RGBA', (432, 432), bg_color + (255,))
    bg_full.save(bg_dst, 'PNG')
    print(f'  432×432 → {bg_dst}')

    print('\n✅ 全部图标生成完成!')

if __name__ == '__main__':
    main()
