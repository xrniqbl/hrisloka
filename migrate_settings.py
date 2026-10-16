import re

with open('src/pages/Settings.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if 'import { Button } from' not in content:
    content = content.replace(
        "import SubscriptionStatus from '../components/SubscriptionStatus';",
        "import SubscriptionStatus from '../components/SubscriptionStatus';\nimport { Button } from '@/components/ui/button';\nimport { Input } from '@/components/ui/input';\nimport { Label } from '@/components/ui/label';\nimport { Textarea } from '@/components/ui/textarea';\nimport { Switch } from '@/components/ui/switch';\nimport { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';"
    )

# Replace tab buttons with Tabs component
content = content.replace(
    '<div className="settings-tabs">',
    '<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">\n                <TabsList className="settings-tabs">'
)

content = content.replace(
    '<button\n                        key={tab.key}\n                        onClick={() => setActiveTab(tab.key)}\n                        className={settings-tab-btn }\n                    >\n                        {tab.icon} {tab.label}\n                    </button>',
    '<TabsTrigger key={tab.key} value={tab.key} className="settings-tab-btn">\n                            {tab.icon} {tab.label}\n                        </TabsTrigger>'
)

# Close TabsList and open TabsContent
content = content.replace(
    '</div>\n\n            {/* Account Tab */}',
    '</TabsList>\n\n            <TabsContent value="account" className="mt-6">'
)

# Replace tab content wrappers
content = content.replace(
    '{activeTab === \'account\' && (\n                <div style={cardStyle}>',
    '<div style={cardStyle}>'
)

# Security tab
content = content.replace(
    '</div>\n            )}\n\n            {/* Security Tab */}\n            {activeTab === \'security\' && (\n                <div style={cardStyle}>',
    '</div>\n            </TabsContent>\n\n            <TabsContent value="security" className="mt-6">\n                <div style={cardStyle}>'
)

# Company tab
content = content.replace(
    '</div>\n            )}\n\n            {/* Company Tab */}\n            {activeTab === \'company\' && (\n                <div style={cardStyle}>',
    '</div>\n            </TabsContent>\n\n            <TabsContent value="company" className="mt-6">\n                <div style={cardStyle}>'
)

# Notifications tab
content = content.replace(
    '</div>\n            )}\n\n            {/* Notifications Tab */}\n            {activeTab === \'notifications\' && (\n                <div style={cardStyle}>',
    '</div>\n            </TabsContent>\n\n            <TabsContent value="notifications" className="mt-6">\n                <div style={cardStyle}>'
)

# Appearance tab
content = content.replace(
    '</div>\n            )}\n\n            {/* Appearance Tab */}\n            {activeTab === \'appearance\' && (\n                <div style={cardStyle}>',
    '</div>\n            </TabsContent>\n\n            <TabsContent value="appearance" className="mt-6">\n                <div style={cardStyle}>'
)

# Subscription tab
content = content.replace(
    '</div>\n            )}\n\n            {/* -- Subscription Tab ------------------------------------------- */}\n            {activeTab === \'subscription\' && (\n                <div style={{ display: \'flex\', flexDirection: \'column\', gap: 16 }}>',
    '</div>\n            </TabsContent>\n\n            <TabsContent value="subscription" className="mt-6">\n                <div style={{ display: \'flex\', flexDirection: \'column\', gap: 16 }}>'
)

# Close all TabsContent
content = content.replace(
    '</div>\n            )}\n        </div>\n    );\n}',
    '</div>\n            </TabsContent>\n        </Tabs>\n        </div>\n    );\n}'
)

# Replace form inputs
content = content.replace('<input className="form-input"', '<Input className="form-input"')
content = content.replace('<textarea className="form-textarea"', '<Textarea className="form-textarea"')

# Replace buttons
content = content.replace('<button className="btn-primary"', '<Button className="btn-primary"')
content = content.replace('<button className="btn-secondary"', '<Button variant="outline" className="btn-secondary"')
content = content.replace('</button>', '</Button>')

# Replace notification toggles with Switch
content = content.replace(
    '<label\n                                            style={{\n                                                position: \'relative\',\n                                                display: \'inline-flex\',\n                                                alignItems: \'center\',\n                                                cursor: \'pointer\',\n                                            }}\n                                        >\n                                            <input\n                                                type="checkbox"\n                                                checked={notifications[key]}\n                                                onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}\n                                                style={{ display: \'none\' }}\n                                            />',
    '<div style={{ display: \'flex\', alignItems: \'center\', justifyContent: \'space-between\' }}>\n                                            <Label style={{ fontSize: 13, fontWeight: 600 }}>{label}</Label>\n                                            <Switch\n                                                checked={notifications[key]}\n                                                onCheckedChange={(checked) => setNotifications({ ...notifications, [key]: checked })}'
)

content = content.replace(
    '<div\n                                                style={{\n                                                    width: 44,\n                                                    height: 24,\n                                                    borderRadius: 12,\n                                                    background: notifications[key] ? \'var(--primary)\' : \'#E5E7EB\',\n                                                    transition: \'background 0.2s ease\',\n                                                    position: \'relative\',\n                                                }}\n                                            >\n                                                <div\n                                                    style={{\n                                                        position: \'absolute\',\n                                                        width: 20,\n                                                        height: 20,\n                                                        borderRadius: \'50%\',\n                                                        background: \'#fff\',\n                                                        top: 2,\n                                                        left: notifications[key] ? 22 : 2,\n                                                        transition: \'left 0.2s ease\',\n                                                        boxShadow: \'0 1px 3px rgba(0,0,0,0.2)\',\n                                                    }}\n                                                />\n                                            </div>\n                                        </label>',
    '</Switch>\n                                        </div>'
)

with open('src/pages/Settings.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Settings.jsx migrated')
