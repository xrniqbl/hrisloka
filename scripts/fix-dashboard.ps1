$file = Join-Path $PSScriptRoot '..' 'src' 'pages' 'Dashboard.jsx'
$content = [System.IO.File]::ReadAllText($file)

# 1. Add showPayment state
$content = $content.Replace(
    "const [billing, setBilling] = useState(billingService.getDefaultBillingInfo());`r`n  const today",
    "const [billing, setBilling] = useState(billingService.getDefaultBillingInfo());`r`n  const [showPayment, setShowPayment] = useState(false);`r`n  const today"
)

# If CRLF didn't match, try LF
if ($content -notmatch 'showPayment') {
    $content = [System.IO.File]::ReadAllText($file)
    $content = $content.Replace(
        "const [billing, setBilling] = useState(billingService.getDefaultBillingInfo());`n  const today",
        "const [billing, setBilling] = useState(billingService.getDefaultBillingInfo());`n  const [showPayment, setShowPayment] = useState(false);`n  const today"
    )
}

[System.IO.File]::WriteAllText($file, $content)
Write-Host "Done. showPayment added: $($content -match 'showPayment')"
