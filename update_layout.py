with open('src/layouts/DashboardLayout.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'AppShellAstryx' not in content:
    content = content.replace(
        "import Sidebar from '../components/Sidebar';",
        "import Sidebar from '../components/Sidebar';\nimport { AppShellAstryx, SideNavAstryx } from '../components/ui/astryx-layout';"
    )

with open('src/layouts/DashboardLayout.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('DashboardLayout updated with Astryx imports')
