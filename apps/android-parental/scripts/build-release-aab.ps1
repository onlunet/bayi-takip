$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$gradlewBat = Join-Path $projectRoot "gradlew.bat"
$aabPath = Join-Path $projectRoot "app\\build\\outputs\\bundle\\release\\app-release.aab"
$keystoreProps = Join-Path $projectRoot "keystore.properties"

if (-not (Test-Path $gradlewBat)) {
  Write-Error "gradlew.bat bulunamadi. Wrapper dosyalari eksik."
  exit 1
}

if (-not (Test-Path $keystoreProps)) {
  Write-Warning "keystore.properties bulunamadi. Release derleme debug imzasi ile yapilacak."
  Write-Warning "Play Console icin keystore.properties dosyasini doldurmaniz gerekir."
}

Push-Location $projectRoot
try {
  & .\gradlew.bat --no-daemon clean bundleRelease
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Release AAB derleme basarisiz."
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}

if (-not (Test-Path $aabPath)) {
  Write-Error "AAB uretilmedi: $aabPath"
  exit 1
}

Write-Host "Release AAB hazir: $aabPath"

