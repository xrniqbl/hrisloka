$f = 'c:\Users\Iqbal\Documents\hrisloka\src\pages\employee\EmpAbsen.jsx'
$c = Get-Content $f -Raw -Encoding UTF8

# Fix 1: language button - replace shield icon + garbled arrow with globe + chevron
$c = $c -replace '<HiShieldCheck size=\{13\} style=\{\{ color: .var\(--primary\). \}\} />\s*\{locale === .en. \? .EN. : .ID.\} .*?\n\s*</button>', '<HiGlobeAlt size={13} style={{ color: ''var(--primary)'' }} />
          {locale === ''en'' ? ''EN'' : ''ID''}
          <HiChevronRight size={11} style={{ color: ''var(--muted)'', transform: ''rotate(90deg)'' }} />
        </button>'

# Fix 2: Add HiGlobeAlt to imports if not present
if ($c -notmatch 'HiGlobeAlt') {
  $c = $c -replace 'HiShieldCheck,', 'HiGlobeAlt,`n  HiShieldCheck,'
}

Set-Content $f $c -Encoding UTF8
Write-Host 'Done'
