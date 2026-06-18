$file = 'c:\Users\Iqbal\Documents\hrisloka\src\pages\employee\EmpAbsen.jsx'
$content = Get-Content $file -Raw -Encoding UTF8

# Fix chip icons - remove emoji, use inline SVG text indicators
$oldChips = @"
          {/* Feature chips */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: t('Accurate', 'Akurat'), icon: 'ðŸŽ¯' },
              { label: 'Real-time', icon: 'ðŸ"¡' },
              { label: t('Safe Location', 'Lokasi Aman'), icon: 'ðŸ›¡ï¸' },
            ].map(chip => (
              <div key={chip.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                <span style={{ fontSize: 13 }}>{chip.icon}</span> {chip.label}
              </div>
            ))}
          </div>
"@

$newChips = @"
          {/* Feature chips - icon only, no emoji */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              <HiMapPin size={13} style={{ color: 'var(--primary)' }} /> {t('Accurate', 'Akurat')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              <HiClock size={13} style={{ color: 'var(--primary)' }} /> Real-time
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              <HiShieldCheck size={13} style={{ color: 'var(--primary)' }} /> {t('Safe', 'Aman')}
            </div>
          </div>
"@

$content = $content.Replace($oldChips, $newChips)

# Fix language button arrow - replace garbled arrow character
$content = $content -replace 'ID \u25be', 'ID'
$content = $content -replace 'ID ▾', 'ID'

Set-Content $file $content -Encoding UTF8
Write-Host "Chips fixed"
