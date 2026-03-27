param(
  [string]$GradleVersion = "8.9"
)

$gradleCmd = Get-Command gradle -ErrorAction SilentlyContinue
if (-not $gradleCmd) {
  Write-Error "Gradle bulunamadi. Android Studio ile yukleyin veya PATH'e ekleyin."
  exit 1
}

Write-Host "Gradle wrapper olusturuluyor (version: $GradleVersion)..."
gradle wrapper --gradle-version $GradleVersion
if ($LASTEXITCODE -ne 0) {
  Write-Error "Gradle wrapper olusturma basarisiz."
  exit $LASTEXITCODE
}

Write-Host "Tamamlandi. Simdi .\\gradlew.bat assembleDebug komutunu calistirabilirsiniz."

