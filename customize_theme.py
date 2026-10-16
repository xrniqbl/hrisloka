import re

with open('src/themes/astryx-theme.ts/neutralTheme.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace brand colors with HRIS colors
# Primary: #635BFF (purple/indigo)
# Accent: #3B82F6 (blue)

# Update the theme name
content = content.replace("name: 'neutral',", "name: 'hris-neutral',")

# Add custom brand colors after the motion section
custom_colors = """
  // Custom HRIS Brand Colors
  tokens: {
    // Brand Primary - Purple/Indigo
    '--color-brand-primary': '#635BFF',
    '--color-brand-primary-hover': '#5249E0',
    '--color-brand-primary-active': '#4138C7',
    
    // Brand Accent - Blue
    '--color-brand-accent': '#3B82F6',
    '--color-brand-accent-hover': '#2563EB',
    '--color-brand-accent-active': '#1D4ED8',
    
    // Success - Green
    '--color-success': '#10B981',
    '--color-success-hover': '#059669',
    
    // Warning - Yellow/Orange
    '--color-warning': '#F59E0B',
    '--color-warning-hover': '#D97706',
    
    // Error - Red
    '--color-error': '#EF4444',
    '--color-error-hover': '#DC2626',
    
    // Info - Cyan
    '--color-info': '#06B6D4',
    '--color-info-hover': '#0891B2',
"""

# Find where to insert - after motion section
content = content.replace(
    "motion: {fast: 125, medium: 300, slow: 700, ratio: 0.75},",
    "motion: {fast: 125, medium: 300, slow: 700, ratio: 0.75},\n" + custom_colors
)

# Update button primary color
content = content.replace(
    "button: {\n      base: {",
    "button: {\n      base: {\n        '--color-accent': '#635BFF',\n        '--color-accent-hover': '#5249E0',"
)

# Update link color
content = content.replace(
    "link: {\n      base: {",
    "link: {\n      base: {\n        '--color-accent': '#3B82F6',"
)

with open('src/themes/astryx-theme.ts/neutralTheme.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Theme customized with HRIS brand colors')
