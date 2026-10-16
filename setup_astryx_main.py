with open('src/main.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Astryx CSS imports
if '@astryxdesign/core/reset.css' not in content:
    content = content.replace(
        "import './index.css'",
        "import '@astryxdesign/core/reset.css';\nimport '@astryxdesign/core/astryx.css';\nimport './index.css'"
    )

with open('src/main.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Astryx CSS imports added to main.jsx')
