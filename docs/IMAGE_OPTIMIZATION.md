# ---------------------------------------------------------------
# KiniKerja � Image Optimization Guide
# ---------------------------------------------------------------

## Current Image Sizes (public/landing/)
- cewe.png: 1.2MB ? Target: 150KB (WebP)
- hp.png: 1.0MB ? Target: 120KB (WebP)
- db.png: 1.0MB ? Target: 120KB (WebP)
- kinikerjalogo.jpeg: 183KB ? Target: 50KB (WebP)

## Conversion Commands (requires sharp or cwebp)
npm install -g sharp-cli
sharp -i public/landing/cewe.png -o public/landing/cewe.webp --format webp --quality 80
sharp -i public/landing/hp.png -o public/landing/hp.webp --format webp --quality 80
sharp -i public/landing/db.png -o public/landing/db.webp --format webp --quality 80

## Update References
After conversion, update imports in:
- src/pages/LandingPage.jsx
- src/pages/InstallGuide.jsx
- src/pages/AuthPage.jsx

## Estimated Savings
- Total before: ~3.4MB
- Total after: ~440KB
- **Savings: 87%**
