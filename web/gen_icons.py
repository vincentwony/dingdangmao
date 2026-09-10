#!/usr/bin/env python3
# 纯依赖生成 PWA PNG 图标（无 Pillow/cairo），金箔徽记风格
import struct, zlib, math

def png_bytes(width, height, rgba):
    # rgba: bytearray length width*height*4, RGBA
    def chunk(typ, data):
        c = typ + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type 0
        raw.extend(rgba[y*width*4:(y+1)*width*4])
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA
    idat = zlib.compress(bytes(raw), 9)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')

def smoothstep(a, b, x):
    if a == b:
        return 1.0 if x >= b else 0.0
    t = (x - a) / (b - a)
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

def make_icon(size, bg, gold, maskable):
    buf = bytearray(size * size * 4)
    cx = cy = (size - 1) / 2.0
    R = size * 0.36          # 外环半径
    T = size * 0.055         # 环厚
    RD = size * 0.12         # 内圆点半径
    # 软边
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - cx, y - cy)
            a = 0.0
            # 外环
            rd = abs(d - R)
            if rd < T:
                a = max(a, 1.0 - smoothstep(T * 0.35, T * 0.65, rd))
            # 内圆点
            if d < RD:
                a = max(a, 1.0 - smoothstep(RD * 0.8, RD, d))
            i = (y * size + x) * 4
            if maskable:
                # 暗底不透明，gold 按 alpha 叠加
                buf[i]   = int(bg[0] * (1 - a) + gold[0] * a)
                buf[i+1] = int(bg[1] * (1 - a) + gold[1] * a)
                buf[i+2] = int(bg[2] * (1 - a) + gold[2] * a)
                buf[i+3] = 255
            else:
                # 透明底，仅金色像素写入
                buf[i]   = gold[0]
                buf[i+1] = gold[1]
                buf[i+2] = gold[2]
                buf[i+3] = int(255 * a)
    return png_bytes(size, size, buf)

GOLD = (201, 162, 75)      # #C9A24B 金箔
DARK = (60, 36, 21)        # #3C2415 深褐（主题色）

with open('H:/Phone/web/icons/icon-192.png', 'wb') as f:
    f.write(make_icon(192, DARK, GOLD, False))
with open('H:/Phone/web/icons/icon-512.png', 'wb') as f:
    f.write(make_icon(512, DARK, GOLD, False))
with open('H:/Phone/web/icons/icon-maskable-512.png', 'wb') as f:
    f.write(make_icon(512, DARK, GOLD, True))
print('PNG icons generated: 192 (any), 512 (any), 512 (maskable)')
