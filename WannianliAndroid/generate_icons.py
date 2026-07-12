"""Generate gradient app icons for 万年历·八卦掌决版.
- 1 gradient background PNG (432x432)
- 12 shichen clock-face icons (432x432) with gradient bg
- 5-density PNGs for mipmap directories
"""
from PIL import Image, ImageDraw
import math, os

SZ = 432  # base size (xxxhdpi = 192dp * 4 = 768, but 432 is enough for drawable)
CX, CY = SZ / 2, SZ / 2
R_OUTER = SZ / 2 * 0.92
R_INNER = SZ / 2 * 0.76
RING_W = SZ / 2 * 0.04
HAND_R = SZ / 2 * 0.52
DOT_R = SZ / 2 * 0.06
TIP_R = SZ / 2 * 0.10

# Shichen: name, hour range, clock angle (0=12h up, clockwise)
SHICHEN = [
    ("zi",   "子", 180),  # 23-01 → 6h position
    ("chou", "丑", 210),  # 01-03 → ~7h
    ("yin",  "寅", 240),  # 03-05 → ~8h
    ("mao",  "卯", 270),  # 05-07 → 9h (left)
    ("chen", "辰", 300),  # 07-09 → ~10h
    ("si",   "巳", 330),  # 09-11 → ~11h
    ("wu",   "午", 0),    # 11-13 → 12h (up)
    ("wei",  "未", 30),   # 13-15 → ~1h
    ("shen", "申", 60),   # 15-17 → ~2h
    ("you",  "酉", 90),   # 17-19 → 3h (right)
    ("xu",   "戌", 120),  # 19-21 → ~4h
    ("hai",  "亥", 150),  # 21-23 → ~5h
]

DENSITIES = {
    "mdpi":    48,
    "hdpi":    72,
    "xhdpi":   96,
    "xxhdpi":  144,
    "xxxhdpi": 192,
}

def create_gradient_bg(size=SZ):
    """Create a red→purple→blue→orange diagonal gradient image."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = img.load()
    for y in range(size):
        for x in range(size):
            # Normalize coordinates to 0..1
            u = x / (size - 1)
            v = y / (size - 1)
            # Diagonal blend: top-left=red, top-right=purple, bottom-right=blue, bottom-left=orange
            # Bilinear interpolation of 4 corners
            r = int(
                (1-u)*(1-v)*0xE0 +  # top-left: red
                u*(1-v)*0x80 +       # top-right: purple
                u*v*0x30 +           # bottom-right: blue
                (1-u)*v*0xF0         # bottom-left: orange
            )
            g = int(
                (1-u)*(1-v)*0x40 +
                u*(1-v)*0x30 +
                u*v*0x60 +
                (1-u)*v*0x90
            )
            b = int(
                (1-u)*(1-v)*0x40 +
                u*(1-v)*0xC0 +
                u*v*0xE0 +
                (1-u)*v*0x30
            )
            px[x, y] = (r, g, b, 255)
    return img

def make_circle_mask(size, r):
    """Create a circular mask."""
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse([CX-r, CY-r, CX+r, CY+r], fill=255)
    return mask

def draw_clock_face(draw, angle_deg, size=SZ):
    """Draw clock face elements: outer ring, center dot, hand, tip dot."""
    # Gold outer ring
    draw.ellipse([CX-R_OUTER, CY-R_OUTER, CX+R_OUTER, CY+R_OUTER],
                 outline=(0xD4, 0xA8, 0x53, 255), width=int(RING_W))
    # Gold inner ring
    draw.ellipse([CX-R_INNER, CY-R_INNER, CX+R_INNER, CY+R_INNER],
                 outline=(0xD4, 0xA8, 0x53, 180), width=int(RING_W*0.7))

    # Center pivot dot
    draw.ellipse([CX-DOT_R, CY-DOT_R, CX+DOT_R, CY+DOT_R],
                 fill=(0xD4, 0xA8, 0x53, 255))

    # Clock hand
    rad = math.radians(angle_deg - 90)  # -90: 0° -> 12 o'clock
    hx = CX + HAND_R * math.cos(rad)
    hy = CY + HAND_R * math.sin(rad)
    # Draw hand as a line with slight thickening
    for w in range(-2, 3):
        dx = w * math.cos(rad + math.pi/2) * 0.4
        dy = w * math.sin(rad + math.pi/2) * 0.4
        draw.line([CX+dx, CY+dy, hx+dx, hy+dy],
                  fill=(0xD4, 0xA8, 0x53, 255), width=2)

    # Tip dot
    draw.ellipse([hx-TIP_R, hy-TIP_R, hx+TIP_R, hy+TIP_R],
                 fill=(0xF7, 0xE3, 0xAF, 255))
    # Tip dot border
    draw.ellipse([hx-TIP_R, hy-TIP_R, hx+TIP_R, hy+TIP_R],
                 outline=(0xD4, 0xA8, 0x53, 200), width=1)

def draw_bagua_symbol(draw, size=SZ):
    """Draw a subtle bagua (八卦) symbol in the background."""
    r = size / 2 * 0.55
    # Yin-yang halves
    draw.pieslice([CX-r, CY-r, CX+r, CY+r], -90, 90,
                  fill=(0xD4, 0xA8, 0x53, 40))
    draw.pieslice([CX-r, CY-r, CX+r, CY+r], 90, 270,
                  fill=(0xD4, 0xA8, 0x53, 20))

def create_icon(angle_deg, size=SZ, with_bagua=True):
    """Create a full icon with gradient bg + clock face."""
    bg = create_gradient_bg(size)
    # Apply circular mask
    mask = make_circle_mask(size, R_OUTER)
    bg.putalpha(mask)

    # Create transparent layer for drawing
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon.paste(bg, (0, 0), bg)

    draw = ImageDraw.Draw(icon)
    if with_bagua:
        draw_bagua_symbol(draw, size)
    draw_clock_face(draw, angle_deg, size)

    return icon

def create_default_icon(size=SZ):
    """Create default launcher icon (子时 + bagua symbol)."""
    return create_icon(180, size, with_bagua=True)  # 子时

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
RES_DIR = os.path.join(OUT_DIR, "app", "src", "main", "res")

# ── 1. Gradient background for drawable references ──
bg = create_gradient_bg(SZ)
mask = make_circle_mask(SZ, R_OUTER)
bg.putalpha(mask)
bg.save(os.path.join(RES_DIR, "drawable", "ic_gradient_bg.png"))
print("[OK] Gradient background saved to drawable/ic_gradient_bg.png")

# ── 2. 12 shichen icons (PNG for drawable/) ──
for name, char, angle in SHICHEN:
    icon = create_icon(angle, SZ)
    path = os.path.join(RES_DIR, "drawable", f"ic_launcher_{name}.png")
    icon.save(path)
    print(f"[OK] Shichen icon: ic_launcher_{name}.png ({char} {angle}°)")

# ── 3. Update 12 shichen drawables to layer-list XMLs referencing PNGs ──
for name, char, angle in SHICHEN:
    xml = f"""<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@drawable/ic_gradient_bg"/>
    <item android:drawable="@drawable/ic_launcher_{name}"/>
</layer-list>
"""
    # Actually, we already have the full PNG. Let's just keep the PNG as the drawable.
    # The layer-list approach would double-render. Instead, just use the PNG directly.
    pass

# The PNG files ARE the drawables now. No need for layer-list XMLs since
# the PNGs already contain both gradient bg and clock face.

# ── 4. 5-density mipmap PNGs ──
for density, px_size in DENSITIES.items():
    mipmap_dir = os.path.join(RES_DIR, f"mipmap-{density}")
    os.makedirs(mipmap_dir, exist_ok=True)

    # Default launcher icon
    icon = create_default_icon(px_size)
    icon.save(os.path.join(mipmap_dir, "ic_launcher.png"))

    # Background layer (gradient only, circular)
    bg_small = create_gradient_bg(px_size)
    mask_small = make_circle_mask(px_size, px_size/2*0.92)
    bg_small.putalpha(mask_small)
    bg_small.save(os.path.join(mipmap_dir, "ic_launcher_background.png"))

    # Foreground layer (bagua symbol only, transparent bg)
    fg = Image.new("RGBA", (px_size, px_size), (0, 0, 0, 0))
    fg_draw = ImageDraw.Draw(fg)
    # Bagua on foreground
    r = px_size / 2 * 0.55
    fg_draw.pieslice([px_size/2-r, px_size/2-r, px_size/2+r, px_size/2+r],
                     -90, 90, fill=(0xD4, 0xA8, 0x53, 60))
    fg_draw.pieslice([px_size/2-r, px_size/2-r, px_size/2+r, px_size/2+r],
                     90, 270, fill=(0xD4, 0xA8, 0x53, 35))
    # Clock hand at 子时
    CX_s = px_size / 2
    CY_s = px_size / 2
    hand_r = px_size / 2 * 0.52
    dot_r = px_size / 2 * 0.06
    tip_r = px_size / 2 * 0.10
    # Center dot
    fg_draw.ellipse([CX_s-dot_r, CY_s-dot_r, CX_s+dot_r, CY_s+dot_r],
                    fill=(0xD4, 0xA8, 0x53, 255))
    # Hand to bottom (子时 = 180°)
    hx = CX_s
    hy = CY_s + hand_r
    fg_draw.line([CX_s, CY_s, hx, hy], fill=(0xD4, 0xA8, 0x53, 255), width=2)
    # Tip
    fg_draw.ellipse([hx-tip_r, hy-tip_r, hx+tip_r, hy+tip_r],
                    fill=(0xF7, 0xE3, 0xAF, 255))
    fg.save(os.path.join(mipmap_dir, "ic_launcher_foreground.png"))

    # Monochrome (silhouette version)
    mono = Image.new("RGBA", (px_size, px_size), (0, 0, 0, 0))
    mono_draw = ImageDraw.Draw(mono)
    mono_draw.ellipse([CX_s-hand_r, CY_s-hand_r, CX_s+hand_r, CY_s+hand_r],
                      fill=(0xFF, 0xFF, 0xFF, 255))
    mono.save(os.path.join(mipmap_dir, "ic_launcher_monochrome.png"))

    print(f"[OK] Mipmap {density} ({px_size}x{px_size}px): launcher + background + foreground + monochrome")

print("\n=== All icons generated successfully! ===")
print(f"Output: {RES_DIR}")
