import re

with open('src/pages/Settings.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add imports
if 'import { Button } from' not in content:
    content = content.replace(
        "import SubscriptionStatus from '../components/SubscriptionStatus';",
        "import SubscriptionStatus from '../components/SubscriptionStatus';\nimport { Button } from '@/components/ui/button';\nimport { Input } from '@/components/ui/input';\nimport { Label } from '@/components/ui/label';\nimport { Textarea } from '@/components/ui/textarea';\nimport { Switch } from '@/components/ui/switch';\nimport { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';"
    )

# 2. Replace tab buttons with Tabs component
content = content.replace(
    '<div className="settings-tabs">',
    '<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">\n                <TabsList className="settings-tabs">'
)

# Replace each tab button
content = content.replace(
    '''<button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={settings-tab-btn }
                    >
                        {tab.icon} {tab.label}
                    </button>''',
    '''<TabsTrigger
                        key={tab.key}
                        value={tab.key}
                        className="settings-tab-btn"
                    >
                        {tab.icon} {tab.label}
                    </TabsTrigger>'''
)

# Close TabsList
content = content.replace(
    '</div>\n\n            {/* Account Tab */}',
    '</TabsList>\n\n            <TabsContent value="account" className="mt-6">'
)

# 3. Replace account tab conditional
content = content.replace(
    '{activeTab === \'account\' && (\n                <div style={cardStyle}>',
    '<div style={cardStyle}>'
)

# 4. Replace security tab
content = content.replace(
    '</div>\n            )}\n\n            {/* Security Tab */}\n            {activeTab === \'security\' && (\n                <div style={cardStyle}>',
    '</div>\n            </TabsContent>\n\n            <TabsContent value="security" className="mt-6">\n                <div style={cardStyle}>'
)

# 5. Replace company tab
content = content.replace(
    '</div>\n            )}\n\n            {/* Company Tab */}\n            {activeTab === \'company\' && (\n                <div style={cardStyle}>',
    '</div>\n            </TabsContent>\n\n            <TabsContent value="company" className="mt-6">\n                <div style={cardStyle}>'
)

# 6. Replace notifications tab
content = content.replace(
    '</div>\n            )}\n\n            {/* Notifications Tab */}\n            {activeTab === \'notifications\' && (\n                <div style={{ display: \'grid\', gap: 20 }}>',
    '</div>\n            </TabsContent>\n\n            <TabsContent value="notifications" className="mt-6">\n                <div style={{ display: \'grid\', gap: 20 }}>'
)

# 7. Replace appearance tab
content = content.replace(
    '</div>\n            )}\n\n            {/* Appearance Tab */}\n            {activeTab === \'appearance\' && (\n                <div style={cardStyle}>',
    '</div>\n            </TabsContent>\n\n            <TabsContent value="appearance" className="mt-6">\n                <div style={cardStyle}>'
)

# 8. Replace subscription tab
content = content.replace(
    '</div>\n            )}\n\n            {/* -- Subscription Tab ------------------------------------------- */}\n            {activeTab === \'subscription\' && (\n                <div style={{ display: \'flex\', flexDirection: \'column\', gap: 16 }}>',
    '</div>\n            </TabsContent>\n\n            <TabsContent value="subscription" className="mt-6">\n                <div style={{ display: \'flex\', flexDirection: \'column\', gap: 16 }}>'
)

# 9. Close last TabsContent and Tabs
content = content.replace(
    '</div>\n            )}\n        </div>\n    );\n}',
    '</div>\n            </TabsContent>\n        </Tabs>\n        </div>\n    );\n}'
)

# 10. Replace form inputs
content = content.replace('<input className="form-input"', '<Input className="form-input"')
content = content.replace('<textarea className="form-textarea"', '<Textarea className="form-textarea"')

# 11. Replace buttons (but not tab buttons)
content = content.replace('<button className="btn-primary"', '<Button className="btn-primary"')
content = content.replace('<button className="btn-secondary"', '<Button variant="outline" className="btn-secondary"')

# Replace closing buttons (but be careful with tab buttons which are already TabsTrigger)
lines = content.split('\n')
new_lines = []
for i, line in enumerate(lines):
    if '</button>' in line and 'TabsTrigger' not in lines[max(0, i-5):i]:
        line = line.replace('</button>', '</Button>')
    new_lines.append(line)
content = '\n'.join(new_lines)

# 12. Replace notification toggles with Switch
content = content.replace(
    '''<label style={{ position: 'relative', width: 44, height: 24, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={notifications[item.key]}
                                        onChange={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{
                                        width: 44, height: 24, borderRadius: 12,
                                        background: notifications[item.key] ? 'var(--primary)' : '#D1D5DB',
                                        transition: 'background 0.2s ease',
                                    }}>
                                        <div style={{
                                            width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                            position: 'absolute', top: 3,
                                            left: notifications[item.key] ? 23 : 3,
                                            transition: 'left 0.2s ease',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        }} />
                                    </div>
                                </label>''',
    '''<Switch
                                    checked={notifications[item.key]}
                                    onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
                                />'''
)

with open('src/pages/Settings.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Settings.jsx migrated v2')
