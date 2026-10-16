with open('src/main.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Astryx theme imports
if 'hris-neutral' not in content:
    content = content.replace(
        "import '@astryxdesign/core/reset.css';",
        "import '@astryxdesign/core/reset.css';\nimport '@astryxdesign/core/astryx.css';\nimport './astryx-theme.css';\nimport { hrisNeutralTheme } from './hris-neutral';\nimport { Theme } from '@astryxdesign/core';"
    )
    
    # Wrap App with Theme
    content = content.replace(
        "<App />",
        "<Theme theme={hrisNeutralTheme}>\n      <App />\n    </Theme>"
    )

with open('src/main.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Astryx theme integrated into main.jsx')
