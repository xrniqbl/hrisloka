$file = 'src\pages\LandingPage.css'
$css = Get-Content $file -Raw -Encoding UTF8

$old = @'
.lp2-flow-img-wrap { border-radius:16px; overflow:hidden; margin-bottom:16px; box-shadow:0 8px 24px rgba(0,71,171,0.1); height:200px; }
.lp2-flow-img-wrap img { width:100%; height:100%; object-fit:cover; object-position:top; }
'@

$new = @'
.lp2-flow-icon-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0; margin-bottom:20px; width:120px; height:120px; border-radius:50%; background:linear-gradient(135deg,#e8f0fe 0%,#dbeafe 100%); box-shadow:0 8px 28px rgba(0,71,171,0.12); margin-left:auto; margin-right:auto; transition:transform 0.25s, box-shadow 0.25s; }
.lp2-flow-icon-wrap:hover { transform:translateY(-4px); box-shadow:0 16px 36px rgba(0,71,171,0.18); }
.lp2-flow-badge { display:inline-block; background:#0047AB; color:#fff; font-size:10px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; padding:3px 10px; border-radius:20px; margin-top:14px; }
'@

$css = $css.Replace($old, $new)
$css = $css.Replace('  .lp2-flow-img-wrap { height:160px; }', '  .lp2-flow-icon-wrap { width:100px; height:100px; }')

Set-Content $file -Value $css -Encoding UTF8 -NoNewline
Write-Host "CSS updated successfully"
