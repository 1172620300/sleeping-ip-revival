$ErrorActionPreference = 'Stop'
$envPath = Join-Path $PSScriptRoot '.env'
$secureKey = Read-Host 'Enter CANGYUAN_API_KEY (input is hidden)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
  $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  $lines = if (Test-Path $envPath) { @(Get-Content $envPath) } else { @() }
  $lines = @($lines | Where-Object { $_ -notmatch '^CANGYUAN_API_KEY=' })
  $lines += "CANGYUAN_API_KEY=$key"
  if (-not ($lines | Where-Object { $_ -match '^CANGYUAN_BASE_URL=' })) { $lines += 'CANGYUAN_BASE_URL=http://direct-api.cangyuansuanli.cn' }
  if (-not ($lines | Where-Object { $_ -match '^AI_PROVIDER=' })) { $lines += 'AI_PROVIDER=openai-compatible' }
  Set-Content -LiteralPath $envPath -Value $lines -Encoding utf8NoBOM
  Write-Host "API key saved to $envPath. The key is not displayed."
  Write-Host 'Next: set CANGYUAN_TEXT_MODEL from /v1/models, then run npm run api.'
}
finally {
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  $key = $null
}
