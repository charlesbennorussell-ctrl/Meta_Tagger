import re

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Change autoScan default to true
content = re.sub(
    r"(const \[autoScan, setAutoScan\] = useState\()false(\);)",
    r"\1true\2",
    content
)

# 2. Remove colored square bullets from TreeNode
content = re.sub(
    r"\{depth === 0 && <span style=\{\{ width: 10, height: 10, borderRadius: 4, background: color \}\} />\}",
    "",
    content
)

# 3. Make section boxes pill-shaped in TreeNode
content = re.sub(
    r'(TreeNode.*?<div style=\{\{ display: \'flex\', alignItems: \'center\', gap: 8, padding: \'6px 8px\', )borderRadius: 6,',
    r"\1borderRadius: depth === 0 ? 20 : 6,",
    content,
    count=1
)

# 4. Make section boxes pill-shaped in MasterTaxonomyNode
content = re.sub(
    r'(MasterTaxonomyNode.*?<div style=\{\{ display: \'flex\', alignItems: \'center\', gap: 8, padding: \'6px 8px\', )borderRadius: 6,',
    r"\1borderRadius: depth === 0 ? 20 : 6,",
    content,
    count=1
)

# 5. Change keyword indentation in TreeNode
content = re.sub(
    r'(TreeNode.*?keywords\.length > 0.*?<div style=\{\{ )marginLeft: 28,',
    r"\1marginLeft: depth > 0 ? 48 : 28,",
    content,
    count=1,
    flags=re.DOTALL
)

# 6. Change keyword indentation in MasterTaxonomyNode
content = re.sub(
    r'(MasterTaxonomyNode.*?hasItems.*?<div style=\{\{ )marginLeft: 28,',
    r"\1marginLeft: depth > 0 ? 48 : 28,",
    content,
    count=1,
    flags=re.DOTALL
)

# 7. Remove statistics text under Taxonomy header
content = re.sub(
    r'<div style=\{\{ color: s\.muted, fontSize: 13, marginTop: 4 \}\}>\s*\{accepted\.length\} accepted · \{taxInfo\.allTerms\.size\} in dictionary\{customCount > 0 \? ` · \$\{customCount\} uncategorized` : \'\'\}\s*</div>',
    '',
    content,
    flags=re.DOTALL
)

# Write the file
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("All changes applied!")
