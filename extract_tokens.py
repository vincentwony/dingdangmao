import re, json

css = open('h:/qlcc_css_raw.css', 'r', encoding='utf-8').read()

# Extract CSS custom properties
all_vars = re.findall(r'(--[\w-]+)\s*:\s*([^;]+);', css)

# Filter for design-related
design_keys = {'color','font','size','spacing','radius','shadow','blur','weight','leading','tracking','height','width'}
seen = {}
for name, val in all_vars:
    if name not in seen and any(k in name for k in design_keys):
        seen[name] = val.strip()

print("=== DESIGN TOKENS ===")
for k, v in sorted(seen.items()):
    print(f"  {k}: {v}")

print(f"\n=== TOTAL CSS VARS: {len(all_vars)} ===")

# Extract font-face
fonts = re.findall(r'@font-face\s*\{[^}]+\}', css)
print(f"\n=== @font-face ({len(fonts)}) ===")
for f in fonts:
    family_m = re.search(r"font-family:\s*'([^']+)'", f)
    src_m = re.search(r"src:\s*url\(([^)]+)\)", f)
    if family_m:
        print(f"  {family_m.group(1)}: {src_m.group(1) if src_m else '?'}")

# Extract color values (hex, rgb, hsl)
colors = set(re.findall(r'(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|oklch\([^)]+\))', css))
print(f"\n=== UNIQUE COLORS ({len(colors)}) ===")
for c in sorted(colors)[:40]:
    print(f"  {c}")

# Check for Tailwind
if 'tailwind' in css.lower():
    print("\n=== STACK: Tailwind CSS detected ===")
