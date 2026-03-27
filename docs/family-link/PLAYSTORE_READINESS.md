# Play Store Hazirlik (MVP)

Bu kontrol listesi, mevcut ebeveyn-kontrol MVP'sini Google Play yayina hazirlarken sorun cikarma ihtimali olan alanlari onceden kapatmak icin hazirlandi.

## A) Kod Tarafinda Tamamlananlar

0. Android uygulama iskeleti eklendi: `apps/android-parental` (guvenli WebView kabugu + yayin derleme dosyalari).
1. Cocuk giris sifresi min 6 karakter yapildi.
2. Eslestirme ve ebeveyn dogrulama kodlari acik metin yerine hash + salt olarak saklaniyor.
3. Kod uretiminde hiz limiti var (`minSecondsBetweenCodeIssue`).
4. Cocuk bilgilendirme onayi olmadan kullanim eventi kabul edilmiyor (`DISCLOSURE_REQUIRED`).
5. Ebeveyn kayit adiminda acik riza alanlari zorunlu:
   - `privacyPolicyVersion`
   - `termsVersion`
   - `prominentDisclosureAccepted`
   - `childMonitoringDisclosureAccepted`
6. Veri saklama suresi varsayilan 90 gun ve saklama suresi temizligi aktif.
7. Veri haklari endpointleri eklendi:
   - Uyum durumu
   - Veri disa aktarim
   - Uygulama ici hesap silme
   - Uygulama disi hesap silme
8. Harici hesap silme sayfasi yayinlandi: `/account-deletion.html`.

## B) Play Console Gonderim Kontrol Listesi (Yayin Gecisi)

1. Uygulama paketi/AAB ile cikis alin.
2. Hedef API seviyesi, Play'in guncel zorunlulugunu karsilasin.
3. Veri Guvenligi formu doldurulsun (hangi veri toplanir, nasil kullanilir, saklama suresi).
4. Gizlilik politikasi baglantisi uygulama sayfasina eklensin.
5. Hesap silme akisi uygulama sayfasi + uygulama ici + harici sayfada acikca gosterilsin.
6. Cocuk/ebeveyn izleme ozellikleri icin "acik bilgilendirme" metni uygulama icinde gorunur olsun.
7. Eger hassas izinler kullaniliyorsa (Erisilebilirlik, Kullanim Erisimi, SMS, Cagri kayitlari vb.) sadece zorunlu olanlar talep edilsin ve uygun beyan formlari doldurulsun.
8. Uygulama 13 yas alti hedefliyorsa Aile Politikasi maddeleri ayri kontrol edilsin.

## C) Yuksek Riskli Noktalar (Onay Reddi Riski)

1. Gizli/aldatici izleme davranisi: cocuga bildirim metni olmadan izleme.
2. Hesap silmeyi zorlastirma: sadece destek maili ile silme, uygulama ici aksiyon olmamasi.
3. Gereksiz hassas izin talebi.
4. Veri Guvenligi beyanlari ile gercek davranisin uyusmamasi.
5. "Uygulamayi gizleme / kaldirmayi engelleme" gibi davranislar:
   - Normal Play uygulamasinda sinirli olabilir.
   - Tam kaldirma engeli ancak cihaz-sahibi/kurumsal senaryolarda mumkundur.
   - Yanlis iddia uygulama sayfasi red sebebi olabilir.

## D) Canli Test (Yayin Oncesi)

1. Yeni aile kaydi olustur, cocuk cihazi eslestirme kodu ile bagla.
2. Cocuk girisi + bilgilendirme onayini tamamla.
3. 3 farkli uygulama icin kullanim kaydi gonder, ebeveyn genel gorunumunde gor.
4. Ebeveyn dogrulama kodu uret, cocukta dogrula.
5. Kurallari degistir (gunluk limit, uyku saati, uygulama limitleri, web filtre) ve cocuk kural endpointinden kontrol et.
6. Veri disa aktarim endpointinden JSON indir.
7. Uygulama ici silme ve uygulama disi silme akislarini hazirlik ortaminda ayri ayri test et.

## E) Referanslar (Resmi)

- Gelistirici Programi Politikasi:
  - https://support.google.com/googleplay/android-developer/answer/16313518
- Kullanici Verisi Politikasi:
  - https://support.google.com/googleplay/android-developer/answer/10144311
- Hesap silme gereksinimi:
  - https://support.google.com/googleplay/android-developer/answer/13327111
- Veri Guvenligi formu:
  - https://support.google.com/googleplay/android-developer/answer/10787469
- Hedef API politikasi:
  - https://support.google.com/googleplay/android-developer/answer/11917020
