#!/usr/bin/env python3
"""Apply all changes from the chat session"""
import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

print("Applying changes from chat...")

# 1. Change lineHeight from 1.8 to 2.0 for all keywords
content = re.sub(r'lineHeight: 1\.8', 'lineHeight: 2.0', content)
print("✓ Changed lineHeight to 2.0")

# 2. Change autoScan default to true
content = re.sub(
    r"const \[autoScan, setAutoScan\] = useState\(false\);",
    "const [autoScan, setAutoScan] = useState(true);",
    content
)
print("✓ Set autoScan default to true")

# 3. Already done: Remove colored square bullets and add pill shape
print("✓ Colored squares removed, pill shapes added (already done)")

# 4. Already done: Keyword indentation
print("✓ Keyword indentation updated (already done)")

# 5. Icons to baseline and size 10
content = re.sub(
    r"size=\{14\} style=\{\{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 4 \}\}",
    "size={10} style={{ display: 'inline-flex', verticalAlign: 'baseline', marginRight: 4 }}",
    content
)
print("✓ Updated icon sizes and alignment")

# 6. Close icons to size 9 and baseline
content = re.sub(
    r"<Icon name=\"close\" size=\{12\} />",
    '<Icon name="close" size={9} />',
    content
)
content = re.sub(
    r"<Icon name=\"close\" size=\{14\} />",
    '<Icon name="close" size={9} />',
    content
)
content = re.sub(
    r"<Icon name=\"block\" size=\{14\} />",
    '<Icon name="block" size={9} />',
    content
)
content = re.sub(
    r"verticalAlign: 'middle'",
    "verticalAlign: 'baseline'",
    content
)
print("✓ Updated close/block icon sizes")

# 7. Section header icons to size 9
content = re.sub(
    r'(<Icon name="category" size=\{)16(\} />)',
    r'\g<1>9\g<2>',
    content
)
content = re.sub(
    r'(<Icon name="sell" size=\{)16(\} />)',
    r'\g<1>9\g<2>',
    content
)
content = re.sub(
    r'(<Icon name="rate_review" size=\{)16(\} />)',
    r'\g<1>9\g<2>',
    content
)
content = re.sub(
    r'(<Icon name="recommend" size=\{)16(\} />)',
    r'\g<1>9\g<2>',
    content
)
content = re.sub(
    r'(<Icon name="exposure" size=\{)16(\} />)',
    r'\g<1>9\g<2>',
    content
)
print("✓ Updated section header icon sizes")

# 8. Change section spacing from 12 to 20
content = re.sub(r'marginBottom: 12,', 'marginBottom: 20,', content)
content = re.sub(r'marginBottom: 10,', 'marginBottom: 20,', content)
content = re.sub(r'marginBottom: 8,', 'marginBottom: 20,', content)
print("✓ Standardized section spacing to 20px")

# Write output
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ All changes applied successfully!")
