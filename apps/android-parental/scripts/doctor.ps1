$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Write-Ok($msg) {
  Write-Host "[OK] $msg" -ForegroundColor Green
}

function Write-WarnMsg($msg) {
  Write-Host "[UYARI] $msg" -ForegroundColor Yellow
}

function Write-Err($msg) {
  Write-Host "[HATA] $msg" -ForegroundColor Red
}

Write-Host "Android derleme ortami kontrol ediliyor..."

$javaCmd = Get-Command java -ErrorAction SilentlyContinue
if ($javaCmd) {
  Write-Ok "Java bulundu: $($javaCmd.Source)"
} else {
  Write-WarnMsg "Java bulunamadi. Android Studio ile JDK 17 kurmaniz gerekir."
}

$adbCmd = Get-Command adb -ErrorAction SilentlyContinue
if ($adbCmd) {
  Write-Ok "adb bulundu: $($adbCmd.Source)"
} else {
  Write-WarnMsg "adb bulunamadi. Android SDK Platform-Tools kurun ve PATH'e ekleyin."
}

$sdkRoot = $env:ANDROID_SDK_ROOT
if (-not $sdkRoot) { $sdkRoot = $env:ANDROID_HOME }
if ($sdkRoot -and (Test-Path $sdkRoot)) {
  Write-Ok "Android SDK bulundu: $sdkRoot"
} else {
  Write-WarnMsg "ANDROID_SDK_ROOT / ANDROID_HOME tanimli degil."
}

$gradlewBat = Join-Path $projectRoot "gradlew.bat"
$gradlew = Join-Path $projectRoot "gradlew"
$wrapperJar = Join-Path $projectRoot "gradle\\wrapper\\gradle-wrapper.jar"
$wrapperProps = Join-Path $projectRoot "gradle\\wrapper\\gradle-wrapper.properties"

if ((Test-Path $gradlewBat) -and (Test-Path $gradlew) -and (Test-Path $wrapperJar) -and (Test-Path $wrapperProps)) {
  Write-Ok "Gradle Wrapper dosyalari tam."
} else {
  Write-Err "Gradle Wrapper dosyalari eksik."
  exit 1
}

$localProps = Join-Path $projectRoot "local.properties"
if (Test-Path $localProps) {
  Write-Ok "local.properties mevcut."
} else {
  Write-WarnMsg "local.properties yok. local.properties.example'dan olusturun."
}

Write-Host "Kontrol tamamlandi."

