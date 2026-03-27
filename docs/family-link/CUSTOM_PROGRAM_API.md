# Custom Program API (Play Uyumlu MVP)

Bu dokuman, `apps/api/src/routes/parentalControl.ts` icindeki ebeveyn-cocuk kontrol API'sinin mevcut sozlesmesini ozetler.

## Hedef
- Gunluk ekran suresi limiti ve uygulama bazli takip
- Cocuk cihazina kod ile baglama
- Cocuk uygulamasina sifreli giris
- Ebeveyn cihazindan dogrulama kodu uretme
- Play uyumlulugu icin veri haklari:
  - Cocuk bilgilendirme onayi
  - Veri disa aktarim
  - Hesap silme (uygulama ici + harici sayfa)

## Kimlik Basliklari
- `x-parent-token`: Ebeveyn oturum basligi
- `x-child-token`: Cocuk oturum basligi

## 1) Ebeveyn Kayit ve Giris

### `POST /parental-control/parent/register`
Body:
```json
{
  "parentName": "Anne",
  "parentPin": "1234",
  "parentEmail": "anne@example.com",
  "parentPhone": "+90555...",
  "countryCode": "TR",
  "consent": {
    "privacyPolicyVersion": "2026.03",
    "termsVersion": "2026.03",
    "prominentDisclosureAccepted": true,
    "childMonitoringDisclosureAccepted": true
  }
}
```
Response:
```json
{
  "ok": true,
  "familyId": "family_xxx",
  "parentToken": "parent_xxx",
  "compliance": {
    "familyId": "family_xxx",
    "dataRetentionDays": 90,
    "privacyPolicyVersion": "2026.03",
    "termsVersion": "2026.03",
    "childDisclosurePendingCount": 0,
    "accountDeletionAvailable": true,
    "accountDeletionPagePath": "/account-deletion.html"
  }
}
```

### `POST /parental-control/parent/login`
Body:
```json
{
  "familyId": "family_xxx",
  "parentPin": "1234"
}
```

## 2) Cihaz Eslestirme (Kod ile)

### `POST /parental-control/parent/pairing-code`
Header: `x-parent-token`  
Body (opsiyonel):
```json
{
  "expiresInMinutes": 10
}
```
Notlar:
- Kod 6 hane uretilir.
- Kod hash olarak saklanir, plaintext saklanmaz.
- Kod uretimi hiz limiti vardir (`minSecondsBetweenCodeIssue`).

### `POST /parental-control/children/link`
Body:
```json
{
  "familyId": "family_xxx",
  "pairingCode": "123456",
  "childName": "Ali",
  "childPassword": "123456",
  "deviceId": "android-abc-123",
  "childDisclosureExplained": true
}
```
Notlar:
- `childPassword` min 6 karakter.
- Ayni `deviceId` ayni aileye ikinci kez baglanamaz.

## 3) Cocuk Sifreli Giris ve Bilgilendirme Onayi

### `POST /parental-control/children/login`
Body:
```json
{
  "familyId": "family_xxx",
  "childId": "child_xxx",
  "childPassword": "123456",
  "deviceId": "android-abc-123"
}
```
Response icinde `childToken` ve `disclosureAckAt` doner.

### `POST /parental-control/children/:childId/ack-disclosure`
Header: `x-child-token`  
Body:
```json
{
  "acknowledged": true
}
```

## 4) Ebeveyn Dogrulama Kodu

### `POST /parental-control/parent/verification-code`
Header: `x-parent-token`  
Body:
```json
{
  "childId": "child_xxx"
}
```
Response icinde tek kullanimlik 6 haneli kod doner.

### `POST /parental-control/children/:childId/verify-parent-code`
Header: `x-child-token`  
Body:
```json
{
  "code": "123456"
}
```

## 5) Politika Yonetimi

### `PUT /parental-control/children/:childId/policy`
Header: `x-parent-token`

### `GET /parental-control/children/:childId/policy`
Header: `x-parent-token` veya `x-child-token`

Policy formati:
```json
{
  "dailyLimitMinutes": {
    "mon": 150,
    "tue": 150,
    "wed": 150,
    "thu": 150,
    "fri": 150,
    "sat": 210,
    "sun": 210
  },
  "bedtime": {
    "mon": { "start": "21:30", "end": "07:00" },
    "tue": { "start": "21:30", "end": "07:00" },
    "wed": { "start": "21:30", "end": "07:00" },
    "thu": { "start": "21:30", "end": "07:00" },
    "fri": { "start": "21:30", "end": "07:00" },
    "sat": { "start": "22:30", "end": "08:00" },
    "sun": { "start": "22:30", "end": "08:00" }
  },
  "appLimitsMinutes": {
    "YouTube": 45
  },
  "webFilter": {
    "safeSearch": true,
    "blockedDomains": ["example.org"],
    "allowDomains": []
  }
}
```

## 6) Kullanim Takibi

### `POST /parental-control/children/:childId/usage`
Header: `x-child-token`

Body:
```json
{
  "appName": "YouTube",
  "minutes": 15,
  "startedAt": "2026-03-20T12:00:00.000Z"
}
```

Not:
- Cocuk bilgilendirme onayi alinmadiysa endpoint `403 DISCLOSURE_REQUIRED` doner.

### `GET /parental-control/children/:childId/usage-summary?date=YYYY-MM-DD`
Header: `x-parent-token`

### `GET /parental-control/parent/dashboard?date=YYYY-MM-DD`
Header: `x-parent-token`

### `GET /parental-control/parent/children`
Header: `x-parent-token`

## 7) Uyum, Veri Haklari, Silme

### `GET /parental-control/parent/compliance-status`
Header: `x-parent-token`

### `GET /parental-control/parent/data-export`
Header: `x-parent-token`

### `POST /parental-control/parent/delete-account`
Header: `x-parent-token`
```json
{
  "parentPin": "1234",
  "confirmation": "DELETE"
}
```

### `POST /parental-control/public/delete-account`
Uygulama disi silme endpoint'i:
```json
{
  "familyId": "family_xxx",
  "parentPin": "1234",
  "confirmation": "DELETE"
}
```

### Meta endpointleri
- `GET /parental-control/meta/day-keys`
- `GET /parental-control/meta/compliance`

## UI Dosyalari
- Ebeveyn panel: `apps/api/public/parent-parental.html`
- Cocuk panel: `apps/api/public/child-parental.html`
- Harici silme sayfasi: `apps/api/public/account-deletion.html`

## Hata Kodlari (Ozet)
- `400`: Veri/form hatasi
- `401`: Yetkisiz token veya hatali kimlik
- `403`: Cocuk bilgilendirme onayi eksik (`DISCLOSURE_REQUIRED`)
