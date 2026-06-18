$f = 'c:\Users\Iqbal\Documents\hrisloka\src\pages\employee\EmpAbsen.jsx'
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

# Replace the entire chip block (line containing the broken emoji array)
$oldBlock = @'
          {/* Feature chips */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
            {[
'@

if ($c.Contains($oldBlock)) {
    # Find start and end of the chip div block
    $start = $c.IndexOf($oldBlock)
    $end = $c.IndexOf('</div>', $start + $oldBlock.Length)
    $end = $c.IndexOf('</div>', $end + 6) # close outer div
    $newBlock = @'
          {/* Feature chips - icon based */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              <HiMapPin size={12} style={{ color: 'var(--primary)' }} /> {t('Accurate', 'Akurat')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              <HiClock size={12} style={{ color: 'var(--primary)' }} /> Real-time
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              <HiShieldCheck size={12} style={{ color: 'var(--primary)' }} /> {t('Safe', 'Aman')}
            </div>
          </div>
'@
    $c = $c.Substring(0, $start) + $newBlock + $c.Substring($end + 6)
    Write-Host "Chip block replaced"
} else {
    Write-Host "Block not found - checking file..."
    # Find chip area by searching for broken emoji bytes
    $c2 = $c -replace '(?s)\{/\* Feature chips \*/\}.*?</div>\s*</div>', '{/* Feature chips - icon based */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
              <HiMapPin size={12} style={{ color: "var(--primary)" }} /> Akurat
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
              <HiClock size={12} style={{ color: "var(--primary)" }} /> Real-time
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
              <HiShieldCheck size={12} style={{ color: "var(--primary)" }} /> Aman
            </div>
          </div>'
    if ($c2 -ne $c) { $c = $c2; Write-Host "Regex replace worked" }
    else { Write-Host "Neither method worked" }
}

[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
Write-Host "Saved"
