# Parental Yonetim Paneli

## Amac
Bu panel, tum aileler uzerinden sistem kullanimini tek noktadan izlemenizi saglar:
- kac aile var,
- kac cocuk var,
- son 24 saatte aktif cocuk sayisi,
- gunluk/toplam kullanim dakikalari,
- en cok kullanilan uygulamalar,
- aile bazli son gorulme ve kullanim ozetleri.

## URL
- `https://<sunucu-adresin>/parental-admin.html`

## Guvenlik
Panel endpoint'i:
- `GET /parental-control/admin/overview`

Header:
- `x-parental-admin-key: <key>`

Not:
- `PARENTAL_ADMIN_KEY` tanimli degilse endpoint "insecureMode=true" doner.
- Uretimde mutlaka `PARENTAL_ADMIN_KEY` (veya fallback olarak `ADMIN_API_KEY`) tanimlayin.

## Ornek .env
```env
PARENTAL_ADMIN_KEY=super-secret-admin-key
```

## Donen Ozet Alanlari
- `summary.totalFamilies`
- `summary.totalChildren`
- `summary.activeChildren24h`
- `summary.parentSessionsActive`
- `summary.todayMinutes`
- `summary.todayEvents`
- `trend[]`
- `topApps[]`
- `families[]`
