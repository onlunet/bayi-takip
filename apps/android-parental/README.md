# Android Uygulamasi (Play Store Hazir Iskelet)

Bu klasor, ebeveyn/cocuk web panellerini guvenli WebView ile acan Android uygulama iskeletidir.

## Ozellikler

- Tek uygulama icinde 3 ekran rotasi:
  - `/parent-parental.html`
  - `/child-parental.html`
  - `/account-deletion.html`
- Sadece `https://` adreslerine izin verir.
- Ana API adresi hostu disina giden yonlendirmeleri engeller.
- Acik metin trafik kapali (`network_security_config`).
- Minimal izin politikasi (`INTERNET` disinda izin yok).
- Oturum temizleme butonu (cookie + cache sifirlama).

## Gereksinimler

- Android Studio (guncel)
- JDK 17
- Android SDK Platform 35

## Ilk Kurulum

1. `apps/android-parental` klasorunu Android Studio ile acin.
2. `local.properties` dosyasini olusturun:
   - `local.properties.example` dosyasini kopyalayin.
   - `sdk.dir` degerini kendi bilgisayarinizdaki Android SDK yoluna ayarlayin.
3. Ortam kontrolunu calistirin:
   - `./scripts/doctor.ps1`

## Derleme Komutlari

- Gelistirme APK:
  - `./scripts/build-debug.ps1`
- Yayin AAB (Play Console yukleme):
  - `./scripts/build-release-aab.ps1`

## Telefona Kurulum

1. USB hata ayiklama acik bir Android cihazi baglayin.
2. Kurulumu calistirin:
   - `./scripts/install-debug.ps1 -BuildIfMissing`
3. Komut basariliysa uygulama telefonda otomatik acilir.

Uretilen debug APK yolu:
- `app/build/outputs/apk/debug/app-debug.apk`

Uretilen release AAB yolu:
- `app/build/outputs/bundle/release/app-release.aab`

## Yayin Oncesi

1. `app/build.gradle.kts` icindeki:
   - `applicationId`
   - `versionCode`
   - `versionName`
   - `BuildConfig.DEFAULT_BASE_URL`
   alanlarini ortaminiza gore guncelleyin.
2. Yayin imzalama ayarlarini ekleyin:
   - `keystore.properties.example` dosyasini `keystore.properties` olarak kopyalayin.
   - Dosyadaki alanlari gercek upload keystore bilgilerinizle doldurun.
3. Play Console Veri Guvenligi, Gizlilik Politikasi ve Hesap Silme alanlarini doldurun.
4. `docs/family-link/PLAYSTORE_READINESS.md` kontrol listesini tam calistirin.

## Onemli Sinir

- "Uygulamayi gizleme" ve "silmeyi tamamen engelleme" davranisi standart Play uygulamasinda garanti edilemez.
- Tam kaldirma engelleme icin cihaz-sahibi/kurumsal (MDM) seviyesi gerekir.
