#!/usr/bin/env python3
"""
Fix act() warnings comprehensively by:
1. Making all test functions async
2. Wrapping all render() calls in act()
"""

import re

# Read the file
with open('__tests__/components/integration/export-modal-integration.test.tsx', 'r') as f:
    content = f.read()

# Step 1: Make all it() test functions async
content = re.sub(
    r"(\s+it\(['\"].*?['\"],\s*)(\(\) => \{)",
    r"\1async \2",
    content
)

# Step 2: Wrap standalone render() calls in act()
# Pattern: render(<ExportModal ... />);
# Replace with: await act(async () => { render(<ExportModal ... />); });

lines = content.split('\n')
result_lines = []
i = 0

while i < len(lines):
    line = lines[i]

    # Check if this line contains a render() call that's not already in act()
    if re.search(r'^\s+render\(<ExportModal', line):
        # Check if the previous line contains 'act'
        prev_line = lines[i-1] if i > 0 else ''

        if 'act' not in prev_line:
            # This render() is not wrapped in act(), so wrap it
            indent_match = re.match(r'^(\s+)', line)
            indent = indent_match.group(1) if indent_match else '      '

            # Add act() wrapper
            result_lines.append(f'{indent}await act(async () => {{')
            result_lines.append(f'  {line}')

            # Find the closing semicolon (might be on next lines)
            j = i
            while j < len(lines) and not lines[j].rstrip().endswith(');'):
                j += 1
                if j != i:
                    result_lines.append(f'  {lines[j]}')

            # Add closing brace for act()
            result_lines.append(f'{indent}}});')

            i = j + 1
            continue

    result_lines.append(line)
    i += 1

content = '\n'.join(result_lines)

# Write back
with open('__tests__/components/integration/export-modal-integration.test.tsx', 'w') as f:
    f.write(content)

print("Fixed all render() calls with act() wrappers and made all tests async")
