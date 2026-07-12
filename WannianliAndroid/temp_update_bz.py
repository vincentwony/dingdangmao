# -*- coding: utf-8 -*-
"""Update Bz object text arrays in index.html with classical-source-enriched content."""
import sys

FILE = r"h:\Phone\index.html"

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def replace_lines(start, end, new_lines):
    """Replace lines[start:end] (0-indexed) with new_lines."""
    return lines[:start] + new_lines + lines[end:]

# ===== 1. mgd (命宫简断): lines 3432-3443 (0-indexed: 3431-3442) =====
mgd_new = [
    '  // 来源：《三命通会》卷六·论命宫，《星平会海》十二宫断，《七政四余》分野\n',
    '  mgd:new Array(\n',
    "'子宫，天贵星，坎位正北，水德之垣。《三命通会》云：「子為天費，坎宫正位，志氣不凡。」子宫之人，态度愉悦，文雅动人，平生极少消极厌世之表现。朋友结合，有念旧之深情；夫妇唱随，有持久之厚爱；聪明笃实，有过人之处。有时标新立异，发激越之言，或于事务判断独持异议，主观未免过强。然意志坚强，为其优点。论事而非论人，不念宿怨，有宽宏大量之风度。《星平会海》谓其「清吉多福，心志高明」。如逢岁运不佳，生理方面，可能影响心脏，或患血液循环之病、神思厌倦、怔忡不宁等症。',\n",
    # ... this is going to be impractical to write character by character via unicode escapes
]
"""

# This approach with unicode escapes is impractical for such long text.
# Let me use a different strategy - write the new lines to a temp file and splice.

print("Using sed-based approach instead...")

