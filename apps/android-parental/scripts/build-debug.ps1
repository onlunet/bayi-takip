$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$gradlewBat = Join-Path $projectRoot "gradlew.bat"
$localPropertiesPath = Join-Path $projectRoot "local.properties"
$apkPath = Join-Path $projectRoot "app\\build\\outputs\\apk\\debug\\app-debug.apk"

if (-not (Test-Path $gradlewBat)) {
  Write-Error "gradlew.bat bulunamadi. Wrapper dosyalari eksik."
  exit 1
}

if (-not (Test-Path $localPropertiesPath)) {
  $sdkRoot = $env:ANDROID_SDK_ROOT
  if (-not $sdkRoot) { $sdkRoot = $env:ANDROID_HOME }

  if ($sdkRoot -and (Test-Path $sdkRoot)) {
    "sdk.dir=$($sdkRoot -replace '\\','\\\\')" | Set-Content -Path $localPropertiesPath -Encoding ASCII
    Write-Host "local.properties otomatik olusturuldu."
  } else {
    Write-Error "local.properties yok ve SDK yolu bulunamadi. local.properties.example dosyasini doldurun."
    exit 1
  }
}

Push-Location $projectRoot
try {
  & .\gradlew.bat --no-daemon clean assembleDebug
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Debug derleme basarisiz."
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}

if (-not (Test-Path $apkPath)) {
  Write-Error "APK uretilmedi: $apkPath"
  exit 1
}

Write-Host "Debug APK hazir: $apkPath"

