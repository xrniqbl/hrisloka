# -----------------------------------------------------------
# KiniKerja � Convert Landing Images to WebP
# Run: powershell -ExecutionPolicy Bypass -File scripts/convert-webp.ps1
# -----------------------------------------------------------

$images = @(
  @{ src="public/landing/cewe.png"; webp="public/landing/cewe.webp"; q=80 },
  @{ src="public/landing/hp.png"; webp="public/landing/hp.webp"; q=80 },
  @{ src="public/landing/db.png"; webp="public/landing/db.webp"; q=80 },
  @{ src="public/landing/kinikerjalogo.jpeg"; webp="public/landing/kinikerjalogo.webp"; q=85 },
  @{ src="public/landing/analytics-chart.png"; webp="public/landing/analytics-chart.webp"; q=80 },
  @{ src="public/landing/how-it-works.png"; webp="public/landing/how-it-works.webp"; q=80 },
  @{ src="public/landing/integration-globe.png"; webp="public/landing/integration-globe.webp"; q=80 },
  @{ src="public/landing/pricing.png"; webp="public/landing/pricing.webp"; q=80 },
  @{ src="public/landing/team-working.png"; webp="public/landing/team-working.webp"; q=80 },
  @{ src="public/og-image.png"; webp="public/og-image.webp"; q=85 }
)

# Check if sharp-cli is installed
if (!(Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Host "Error: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
  exit 1
}

Write-Host "Installing sharp-cli..." -ForegroundColor Yellow
npm install -g sharp-cli 2>$null

$totalBefore = 0
$totalAfter = 0

foreach ($img in $images) {
  if (Test-Path $img.src) {
    $beforeSize = (Get-Item $img.src).Length
    $totalBefore += $beforeSize
    Write-Host "Converting $($img.src) -> $($img.webp) (quality: $($img.q))..." -ForegroundColor Cyan
    npx sharp-cli -i $img.src -o $img.webp format webp quality $img.q 2>$null
    if (Test-Path $img.webp) {
      $afterSize = (Get-Item $img.webp).Length
      $totalAfter += $afterSize
      $savings = [math]::Round((1 - $afterSize/$beforeSize) * 100, 1)
      Write-Host "  Before: $([math]::Round($beforeSize/1KB,1))KB -> After: $([math]::Round($afterSize/1KB,1))KB (saved $savings%)" -ForegroundColor Green
    }
  } else {
    Write-Host "  Skip: $($img.src) not found" -ForegroundColor Gray
  }
}

Write-Host ""
Write-Host "Total before: $([math]::Round($totalBefore/1MB,2))MB" -ForegroundColor Yellow
Write-Host "Total after:  $([math]::Round($totalAfter/1MB,2))MB" -ForegroundColor Green
Write-Host "Savings:      $([math]::Round((1 - $totalAfter/$totalBefore) * 100, 1))%" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Update image references in LandingPage.jsx to use .webp extensions" -ForegroundColor Cyan
