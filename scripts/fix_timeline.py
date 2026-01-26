
import os

file_path = r"c:\Users\amiri\FavoritePart\src\components\PlayerTimeline.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False

# We know the duplicate block starts after the NEW block ends.
# The NEW block ends with `            })()}` (plus garbage `ips...`) at line 1388 (1-indexed) -> index 1387.
# The duplicate block ends at line 1753 (1-indexed) -> index 1752.

# Let's inspect line 1387
print(f"Line 1387: {lines[1387]}")
# Expected: "            })()}ips (Bi-directional)\n"

# We will correct line 1387
lines[1387] = "            })()}\n"

# We want to KEEP lines 0 to 1387.
new_lines.extend(lines[:1388])

# We want to SKIP lines 1388 to 1752 (inclusive of 1752 which is `            })()}`)
# Wait, line 1753 (index 1752) is `            })()}`.
# This logic is tricky. 
# The NEW block is 1067 to 1388.
# The OLD block should be removed.
# The OLD block starts at 1389 (index 1388).
# The OLD block ends at 1753 (index 1752).
# We want to keep 1754 (index 1753) onwards.

print(f"Line 1753 (should be skipped): {lines[1752]}")
print(f"Line 1754 (should be kept): {lines[1753]}")

new_lines.extend(lines[1753:])

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Fixed PlayerTimeline.tsx")
