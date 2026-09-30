$ErrorActionPreference = 'Stop'
$envPath = Join-Path $PSScriptRoot '.env'
$secureKey = Read-Host 'Enter CANGYUAN_VIDEO_API_KEY (input is hidden)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
  $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  $lines = if (Test-Path $envPath) { @(Get-Content $envPath) } else { @() }
  $lines = @($lines | Where-Object { $_ -notmatch '^CANGYUAN_VIDEO_API_KEY=' })
  $lines += "CANGYUAN_VIDEO_API_KEY=$key"
  if (-not ($lines | Where-Object { $_ -match '^CANGYUAN_VIDEO_BASE_URL=' })) { $lines += 'CANGYUAN_VIDEO_BASE_URL=https://ai.cangyuansuanli.cn' }
  if (-not ($lines | Where-Object { $_ -match '^CANGYUAN_VIDEO_MODEL=' })) { $lines += 'CANGYUAN_VIDEO_MODEL=sd10-seedance-2.0' }
  Set-Content -LiteralPath $envPath -Value $lines -Encoding utf8NoBOM
  Write-Host "Video API key saved to $envPath. The key is not displayed."
  Write-Host 'Restart npm run api, then check /api/seedance/models.'
}
finally {
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  $key = $null
}
