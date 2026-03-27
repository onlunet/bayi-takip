param(
  [switch]$BuildIfMissing
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$apkPath = Join-Path $projectRoot "app\\build\\outputs\\apk\\debug\\app-debug.apk"
$packageName = "com.onlun.familycontrol.debug"

if (-not (Test-Path $apkPath)) {
  if ($BuildIfMissing) {
    Write-Host "APK bulunamadi, once derleniyor..."
    & (Join-Path $PSScriptRoot "build-debug.ps1")
  } else {
    Write-Error "APK bulunamadi: $apkPath. Once build-debug.ps1 calistirin."
    exit 1
  }
}

$adbCmd = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbCmd) {
  Write-Error "adb bulunamadi. Android SDK Platform-Tools kurup PATH'e ekleyin."
  exit 1
}

$deviceLines = (adb devices) | Select-Object -Skip 1 | Where-Object { $_ -match "\sdevice$" }
if (-not $deviceLines -or $deviceLines.Count -eq 0) {
  Write-Error "Bagli cihaz bulunamadi. USB hata ayiklama acik bir Android cihaz baglayin."
  exit 1
}

Write-Host "APK yukleniyor: $apkPath"
adb install -r $apkPath | Out-Host
if ($LASTEXITCODE -ne 0) {
  Write-Error "APK yukleme basarisiz."
  exit $LASTEXITCODE
}

Write-Host "Yukleme tamamlandi. Uygulama baslatiliyor..."
adb shell monkey -p $packageName -c android.intent.category.LAUNCHER 1 | Out-Host

