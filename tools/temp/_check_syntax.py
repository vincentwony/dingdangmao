import re

with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

blocks = list(re.finditer(r'<script(?![^>]*type="module")[^>]*>\s*([\s\S]*?)</script>', c))
block7 = blocks[6].group(1).strip()
lines = block7.split('\n')

for i, line in enumerate(lines):
    s = line.strip()
    # Check for backslash-prefixed lines (should be // comments, not \ comments)
    if s.startswith('\') and not s.startswith('\\'):
        print(f'Line {i+1}: PROBLEM - {repr(s[:60])}')
    # Find our fixes
    if 'H6 fix' in s or 'H7 fix' in s or 'M8' in s:
        print(f'Line {i+1}: OK fix comment - {repr(s[:60])}')

print(f'Total lines in block 7: {len(lines)}')
