$file = 'c:\Users\Iqbal\Documents\hrisloka\src\pages\employee\EmpAbsen.jsx'
$content = Get-Content $file -Raw

$broken = "import {\n  HiArrowLeftOnRectangle,\n  HiArrowPath,\n  HiArrowRightOnRectangle,\n  HiCalendarDays,\n  HiCamera,\n  HiCheck,\n  HiChevronLeft,\n  HiChevronRight,\n  HiClipboardDocumentCheck,\n  HiClock,\n  HiExclamationTriangle,\n  HiMapPin,\n  HiShieldCheck,\n  HiUser\n} from 'react-icons/hi2';"

$fixed = @"
import {
  HiArrowLeftOnRectangle,
  HiArrowPath,
  HiArrowRightOnRectangle,
  HiCalendarDays,
  HiCamera,
  HiCheck,
  HiChevronLeft,
  HiChevronRight,
  HiClipboardDocumentCheck,
  HiClock,
  HiExclamationTriangle,
  HiMapPin,
  HiShieldCheck,
  HiUser
} from 'react-icons/hi2';
"@

$content = $content -replace [regex]::Escape($broken), $fixed.Trim()
Set-Content $file $content -Encoding UTF8
Write-Host "Done"
