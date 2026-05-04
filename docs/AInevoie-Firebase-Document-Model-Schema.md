# AInevoie Firebase Document Model Schema

## Scop
Acest document este sursa de adevăr pentru modelul de date Firebase al proiectului AInevoie.

Este destinat pentru:
- aplicația mobilă
- backend-ul Firebase
- proiectul Next.js Admin Panel

Orice schimbare de model trebuie reflectată și în:
- [AInevoie-Firebase-MVP-Implementation-Plan.md](/Users/code-with-a/Dev/AINEVOIE-CODECANYON/COMPLET%20APP/AI%20NEVOIE%20APP/docs/AInevoie-Firebase-MVP-Implementation-Plan.md)

## Principii de modelare
- ownership-ul trebuie să fie explicit pe fiecare document
- statusurile trebuie să fie enum-uri finite, nu stringuri libere
- documentele publice și cele private nu se amestecă
- denormalizările sunt permise doar pentru query/read efficiency și trebuie regenerate server-side
- toate documentele importante au audit fields
- referințele critice au și snapshot fields minime pentru reziliență UX

## Conveții globale

## ID-uri
- `uid` din Firebase Auth este identity root pentru `users/{uid}` și `providers/{uid}`
- `bookingId` este generat server-side
- `paymentId` este generat server-side
- `reviewId` pentru MVP va fi egal cu `bookingId`
- `serviceId` este Firestore auto-id generat server-side în subcolecția providerului
- `eventId` este Firestore auto-id generat server-side
- `dateKey` pentru excepții de disponibilitate este `YYYY-MM-DD`

## Audit fields standard
Pe documentele importante trebuie să existe:
- `createdAt: Timestamp`
- `updatedAt: Timestamp`
- `createdBy: string`
- `updatedBy: string`
- `schemaVersion: number`

Pe documentele lifecycle-sensitive pot exista și:
- `lastActionAt: Timestamp`
- `lastActionBy: string`
- `isDeleted: boolean`
- `deletedAt: Timestamp | null`

## Enum-uri standard

## Role
- `user`
- `provider`
- `admin`
- `support`

## ProviderStatus
- `pre_registered`
- `pending_review`
- `approved`
- `rejected`
- `suspended`

## ServiceStatus
- `draft`
- `active`
- `inactive`
- `archived`

## BookingStatus
- `requested`
- `confirmed`
- `reschedule_proposed`
- `rejected`
- `cancelled_by_user`
- `cancelled_by_provider`
- `completed`

## PaymentStatus
- `unpaid`
- `in_progress`
- `paid`
- `failed`

## ReviewStatus
- `published`
- `hidden_by_admin`

## DocumentStatus
- `missing`
- `uploaded`
- `under_review`
- `approved`
- `rejected`
- `expired`

## ProviderReviewAction
- `approve`
- `reject`
- `suspend`
- `reinstate`

## Custom Claims model
Custom claims recomandate:

```json
{
  "role": "user|provider|admin|support",
  "providerStatus": "pre_registered|pending_review|approved|rejected|suspended",
  "isSuspended": false
}
```

Note:
- claims sunt hint operațional și pentru rules, nu singura sursă de adevăr
- sursa finală de business state rămâne Firestore
- claims nu se setează din client

## Auth provider notes
- `users/{uid}.authProviders` și `providers/{uid}.authProviders` se alimentează din Firebase Auth `providerData`
- valorile acceptate în MVP sunt:
  - `password`
  - `google.com`
  - `phone`
- implementarea mobilă actuală pentru `Google` folosește `expo-auth-session` și Firebase JS SDK
- implementarea mobilă actuală pentru `Telefon` folosește Firebase JS SDK `signInWithPhoneNumber(...)` pe React Native
- pentru `Telefon`, proiectul Firebase trebuie să aibă:
  - Phone Authentication activ
  - project-level reCAPTCHA Enterprise bot protection configurat în `Enforce mode`, altfel clientul are nevoie de un `ApplicationVerifier` compatibil

## Romania location hierarchy
- pentru `countyCode: "B"` / `countyName: "București"`, câmpurile `cityCode` și `cityName` reprezintă sectorul, nu orașul generic București
- selectorul de oraș pentru București afișează `Sector 1` ... `Sector 6`
- valoarea legacy `cityCode: "bucuresti"` rămâne acceptată doar pentru compatibilitate cu date vechi sau adrese geocodate fără sector detectabil

## Signup email policy
- aplicația nu trimite email de verificare după signup și nu blochează funcționalități pe `firebaseUser.emailVerified`
- `emailVerified` nu este persistat în `users/{uid}` sau `providers/{uid}` și nu face parte din contractul de autorizare MVP
- Firestore rules și callables nu trebuie să condiționeze accesul normal al userilor/providerilor de custom claim-ul Firebase Auth `email_verified`
- email-urile Firebase Auth rămân permise pentru resetare parolă, deoarece acesta este un flow separat de securitate
- dacă se implementează email de signup ulterior, acesta trebuie să fie strict welcome email, trimis server-side prin Cloud Function/trigger și provider email dedicat sau SMTP configurat în backend; clientul mobil nu trimite emailuri custom direct

## Colecții principale

| Path | Tip | Owner | Vizibilitate |
|---|---|---|---|
| `users/{uid}` | profil privat user | user | user self + admin |
| `providers/{uid}` | profil privat provider | provider | provider self + admin |
| `providerDirectory/{uid}` | profil public provider | server-derived | public read |
| `providers/{uid}/services/{serviceId}` | servicii provider | provider | provider self + admin |
| `providers/{uid}/availability/profile` | program săptămânal + zile blocate | provider | public read + provider self/admin via callable |
| `bookings/{bookingId}` | request/booking lifecycle | server-authoritative | user owner + provider owner + admin |
| `payments/{paymentId}` | plată | server-authoritative | owner limitat + admin |
| `reviews/{bookingId}` | review unic per booking | server-authoritative create | public read limitat + admin |
| `auditEvents/{eventId}` | audit operațional | server-only | admin |
| `idempotencyKeys/{scope_key}` | deduplicare acțiuni | server-only | server/admin |

## Colecții full-backend identificate din UI, lipsă în MVP

Acestea sunt necesare pentru a reactiva zonele care acum afișează empty/disabled state sau folosesc utilitare demo. Nu sunt obligatorii pentru fundația MVP deja implementată, dar sunt contractele recomandate pentru backend complet.

| Path | UI afectat | Motiv |
|---|---|---|
| `conversations/{conversationId}` | chat user/provider, booking request/booking actions | listă conversații, lifecycle conversație, legătură cu booking |
| `conversationMemberships/{conversationId_uid}` | chat list user/provider | inbox per participant, unread count, arhivare, mute |
| `conversations/{conversationId}/messages/{messageId}` | chat detail | mesaje reale, atașamente, mesaje sistem |
| `notifications/{notificationId}` | notification feed user/provider | feed persistent, read/unread, deep links |
| `users/{uid}/favorites/{providerId}` | favorite user | prestatori salvați real, fără listă locală |
| `wallets/{walletId}` | wallet user | sold credit, status portofel |
| `walletLedger/{entryId}` | wallet user, admin finance | jurnal contabil append-only pentru credit/debit/refund/reward |
| `referralCodes/{code}` | wallet/referral user | cod recomandare unic și activ/inactiv |
| `referrals/{referralId}` | wallet/referral user, admin growth | legătură inviter/invitee și reward lifecycle |
| `paymentCustomers/{uid}` | checkout/card save | customer id la procesator, server-only |
| `users/{uid}/paymentMethods/{paymentMethodId}` | payment method screen | metode tokenizate; fără PAN/CVC în Firestore |
| `supportTickets/{ticketId}` | support/bug report | cereri suport reale, status și asignare admin |
| `supportTickets/{ticketId}/messages/{messageId}` | suport conversațional ulterior | răspunsuri support/admin și istoric ticket |
| `accountDeletionRequests/{requestId}` | delete account | cerere reală backend/admin, nu doar cleanup local |
| `users/{uid}/searchHistory/{searchId}` | search recent | căutări recente reale, TTL/opțional analytics |
| `contactEvents/{eventId}` | butoane call/contact din booking | elimină phonebook demo, audit opțional contact |
| `promoCampaigns/{campaignId}` | promo notifications/wallet | campanii promo reale, nu promo demo |

## Document models

## 1. `users/{uid}`
### Scop
Profil privat pentru contul de utilizator.

### Required
- `uid: string`
- `role: "user"`
- `accountStatus: "active" | "disabled"`
- `displayName: string`
- `email: string | null`
- `phoneNumber: string | null`
- `authProviders: string[]`
- `locale: "ro" | "en"`
- `notificationPreferences`
- `createdAt`
- `updatedAt`
- `schemaVersion`

### Optional
- `photoPath: string | null`
- `primaryLocation`
- `profileCompletion`
- `lastLoginAt`

### Model
```json
{
  "uid": "uid_123",
  "role": "user",
  "accountStatus": "active",
  "displayName": "Andrei Popescu",
  "email": "andrei@example.com",
  "phoneNumber": null,
  "authProviders": ["password", "google.com"],
  "photoPath": "users/uid_123/avatar/profile.jpg",
  "locale": "ro",
  "notificationPreferences": {
    "bookings": true,
    "messages": true,
    "promoSystem": true
  },
  "primaryLocation": {
    "formattedAddress": "Str. Aviatorilor 21, Sector 1, București",
    "lat": 44.46,
    "lng": 26.08,
    "countryCode": "RO",
    "countryName": "România",
    "countyCode": "B",
    "countyName": "București",
    "cityCode": "sector-1",
    "cityName": "Sector 1",
    "source": "gps"
  },
  "profileCompletion": {
    "hasPrimaryLocation": true
  },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "schemaVersion": 1
}
```

## 2. `providers/{uid}`
### Scop
Profil privat și operațional pentru provider.

### Required
- `uid: string`
- `role: "provider"`
- `status: ProviderStatus`
- `accountStatus: "active" | "disabled"`
- `email: string | null`
- `phoneNumber: string | null`
- `authProviders: string[]`
- `locale: "ro" | "en"`
- `notificationPreferences`
- `professionalProfile`
- `documents`
- `reviewState`
- `createdAt`
- `updatedAt`
- `schemaVersion`

### Optional
- `adminReview`
- `suspension`
- `lastPublishedAt`
- `lastLoginAt`

### Notă Etapa 2
- profilul provider este creat inițial cu `status: "pre_registered"`
- după submit din onboarding, statusul trece la `pending_review`
- upload-urile reale pentru avatar și documente sunt salvate ca object path relativ în Storage, nu ca URL public persistent
- documentele de verificare provider sunt finalizate prin callable-ul `finalizeProviderDocumentUpload`, care scrie în Firestore doar `status: "uploaded"`, `storagePath`, `originalFileName` și `uploadedAt`
- statusul UI local `added` folosit în onboarding nu se persistă în Firestore; în modelul Firebase starea echivalentă este `uploaded`
- dashboard-ul admin trebuie să listeze providerii `pending_review` ca "în verificare" și să afișeze acțiunile de review numai prin callable-ul `adminReviewProvider`

### Verificare provider pentru admin panel
- `status` este starea principală afișată în dashboard:
  - `pre_registered`: profil început, netrimis la verificare
  - `pending_review`: profil trimis, așteaptă decizie admin
  - `approved`: profil validat și eligibil pentru publicare în `providerDirectory`
  - `rejected`: profil respins; providerul poate corecta și retrimite
  - `suspended`: profil aprobat anterior, blocat administrativ
- `reviewState.submittedAt` marchează momentul trimiterii la verificare.
- `reviewState.lastReviewedAt` marchează ultima decizie admin.
- `adminReview` păstrează ultima decizie: `reviewedBy`, `action`, `reason`, `reviewedAt`.
- `lastPublishedAt` este setat când providerul este aprobat și snapshot-ul public poate fi publicat.
- `suspension` există doar pentru status `suspended` și păstrează motivul și actorul suspendării.
- Pentru aprobarea unui provider, admin panel-ul trebuie să verifice vizual aceleași condiții pe care backend-ul le impune: profil profesional complet, document `identity` uploadat, document `professional` uploadat și disponibilitate configurată.
- Providerul apare în lista publică a utilizatorilor doar după `status: "approved"` și sincronizare în `providerDirectory/{uid}`; `pending_review`, `rejected` și `suspended` nu sunt publicate.

### Model
```json
{
  "uid": "uid_provider_123",
  "role": "provider",
  "status": "pre_registered",
  "accountStatus": "active",
  "email": "provider@example.com",
  "phoneNumber": "40700000000",
  "authProviders": ["password", "phone"],
  "locale": "ro",
  "notificationPreferences": {
    "bookings": true,
    "messages": true,
    "promoSystem": true
  },
  "professionalProfile": {
    "businessName": "Casa în Ordine SRL",
    "displayName": "Casa în Ordine",
    "specialization": "Curățenie rezidențială",
    "baseRateAmount": 90,
    "baseRateCurrency": "RON",
    "coverageArea": {
      "countryCode": "RO",
      "countryName": "România",
      "countyCode": "B",
      "countyName": "București",
      "cityCode": "sector-6",
      "cityName": "Sector 6",
      "placeId": "ChIJL1Qb0lEwqEcRgmnX4Vv4JpQ",
      "locationLabel": "Bulevardul Iuliu Maniu 10",
      "formattedAddress": "Bulevardul Iuliu Maniu 10, Sector 6, București, România",
      "centerLat": 44.4305,
      "centerLng": 26.0446
    },
    "coverageAreaText": "România, București, Sector 6",
    "shortBio": "Servicii complete pentru locuințe active.",
    "availabilitySummary": "Luni-Sâmbătă: 08:30-17:30",
    "avatarPath": "providers/uid_provider_123/avatar/main.jpg"
  },
  "documents": {
    "identity": {
      "status": "uploaded",
      "storagePath": "providers/uid_provider_123/documents/identity/ci-front.jpg",
      "originalFileName": "ci-front.jpg",
      "uploadedAt": "Timestamp"
    },
    "professional": {
      "status": "uploaded",
      "storagePath": "providers/uid_provider_123/documents/professional/certificat.jpg",
      "originalFileName": "certificat.jpg",
      "uploadedAt": "Timestamp"
    }
  },
  "reviewState": {
    "submittedAt": "Timestamp",
    "lastReviewedAt": null
  },
  "adminReview": {
    "reviewedBy": null,
    "action": null,
    "reason": null,
    "reviewedAt": null
  },
  "suspension": null,
  "lastPublishedAt": null,
  "lastLoginAt": "Timestamp",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "schemaVersion": 1
}
```

## 3. `providerDirectory/{uid}`
### Scop
Document public, denormalizat, citit de aplicația mobilă în search și provider detail.

### Required
- `providerId: string`
- `status: "approved" | "suspended"`
- `displayName: string`
- `categoryPrimary: string`
- `countryCode: string`
- `countryName: string`
- `countyCode: string`
- `countyName: string`
- `cityCode: string`
- `cityName: string`
- `coverageAreaText: string`
- `hasConfiguredAvailability: boolean`
- `availabilitySummary: string`
- `availabilityDayChips: string[]`
- `ratingAverage: number`
- `reviewCount: number`
- `ratingSum: number`
- `jobCount: number`
- `serviceSummaries: array`
- `searchKeywordsNormalized: string[]`
- `updatedAt`

### Important
- doar providerii `approved` ar trebui publicați normal
- dacă un provider devine `rejected` sau `suspended`, documentul poate fi retras sau marcat nebookable server-side
- snapshot-ul public nu expune `placeId`, coordonatele exacte sau alt detaliu privat al locației providerului
- matching-ul public pe coverage folosește ierarhia `țară > județ > oraș`, nu o rază publică
- pentru București, nivelul `city` din `providerDirectory` este sectorul (`Sector 1` ... `Sector 6`)
- `ratingAverage`, `reviewCount` și `ratingSum` sunt menținute incremental de trigger-ul `onReviewWrite` prin tranzacție delta (status `published` și rating); `syncProviderDirectorySnapshot` preia aceste valori existente când actualizează alte câmpuri, iar un full rescan din `reviews` se face doar la bootstrap (când documentul `providerDirectory` nu există încă)

### Model
```json
{
  "providerId": "uid_provider_123",
  "status": "approved",
  "displayName": "Casa în Ordine",
  "categoryPrimary": "Curățenie",
  "countryCode": "RO",
  "countryName": "România",
  "countyCode": "B",
  "countyName": "București",
  "cityCode": "sector-6",
  "cityName": "Sector 6",
  "coverageAreaText": "România, București, Sector 6",
  "coverageTags": ["România", "București", "Sector 6"],
  "hasConfiguredAvailability": true,
  "availabilitySummary": "Luni-Sâmbătă: 08:30-17:30",
  "availabilityDayChips": ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"],
  "description": "Servicii complete pentru locuințe active.",
  "baseRateAmount": 90,
  "baseRateCurrency": "RON",
  "ratingAverage": 4.9,
  "reviewCount": 42,
  "ratingSum": 206,
  "jobCount": 259,
  "avatarPath": "providers/uid_provider_123/avatar/main.jpg",
  "serviceSummaries": [
    {
      "serviceId": "auto_fire_id_1",
      "name": "Curățenie generală",
      "categoryKey": "cleaning",
      "categoryLabel": "Curățenie",
      "status": "active",
      "baseRateAmount": 90,
      "baseRateCurrency": "RON",
      "estimatedDurationMinutes": 180
    }
  ],
  "searchKeywordsNormalized": ["casa in ordine", "curatenie", "sector 6", "militari"],
  "updatedAt": "Timestamp"
}
```

## 4. `providers/{uid}/availability/profile`
### Scop
Sursa reală de adevăr pentru booking engine, provider profile și snapshot-ul public `providerDirectory`.

### Required
- `weekSchedule: array`
- `blockedDates: array`
- `availabilitySummary: string`
- `availabilityDayChips: string[]`
- `hasConfiguredAvailability: boolean`
- `updatedAt`

### Important
- write-urile client direct în acest document sunt blocate de rules
- providerul salvează prin callable/backend validator, care normalizează `weekSchedule`, respinge overlap-uri și duplicate în `blockedDates`
- `blockedDates` nu stochează câmp `note`; motivele interne nu sunt persistate pentru a evita expunerea accidentală prin canalele publice (directory/booking engine)

### Model
```json
{
  "weekSchedule": [
    {
      "dayKey": "monday",
      "label": "Luni",
      "shortLabel": "Lu",
      "isEnabled": true,
      "timeRanges": [
        {
          "id": "range_1",
          "startTime": "09:00",
          "endTime": "17:00"
        }
      ]
    }
  ],
  "blockedDates": [
    {
      "id": "blocked_1",
      "dateKey": "2026-05-01",
      "createdAt": "Timestamp"
    }
  ],
  "availabilitySummary": "Luni: 09:00-17:00",
  "availabilityDayChips": ["Luni"],
  "hasConfiguredAvailability": true,
  "updatedAt": "Timestamp"
}
```

## 4. `providers/{uid}/services/{serviceId}`
### Required
- `serviceId`
- `providerId`
- `name`
- `description`
- `categoryKey`
- `categoryLabel`
- `status: ServiceStatus`
- `baseRateAmount`
- `baseRateCurrency`
- `estimatedDurationMinutes`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`
- `schemaVersion`

### Important
- `serviceId` este Firestore auto-id generat la creare și devine ID-ul canonic al serviciului
- `archive` în UI mapează pe `status: "archived"`, nu pe hard delete
- doar serviciile `active` sunt republicate în `providerDirectory.serviceSummaries`

### Model
```json
{
  "serviceId": "auto_fire_id_1",
  "providerId": "uid_provider_123",
  "name": "Curățenie generală",
  "description": "Intervenție completă pentru apartament sau casă.",
  "categoryKey": "cleaning",
  "categoryLabel": "Curățenie",
  "status": "active",
  "baseRateAmount": 90,
  "baseRateCurrency": "RON",
  "estimatedDurationMinutes": 180,
  "createdBy": "uid_provider_123",
  "updatedBy": "uid_provider_123",
  "schemaVersion": 1,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

## 7. `bookings/{bookingId}`
### Scop
Sursa unică de adevăr pentru request și booking lifecycle.

### Required
- `bookingId`
- `userId`
- `providerId`
- `serviceId`
- `status: BookingStatus`
- `scheduledStartAt`
- `scheduledEndAt`
- `timezone`
- `requestDetails`
- `pricingSnapshot`
- `paymentSummary`
- `userSnapshot`
- `providerSnapshot`
- `serviceSnapshot`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`
- `schemaVersion`

### Optional
- `providerDecision`
- `cancellation`
- `completion`
- `reviewSummary`

### Model
```json
{
  "bookingId": "bk_123",
  "userId": "uid_user_1",
  "providerId": "uid_provider_123",
  "serviceId": "svc_1",
  "status": "requested",
  "scheduledStartAt": "Timestamp",
  "scheduledEndAt": "Timestamp",
  "timezone": "Europe/Bucharest",
  "requestDetails": {
    "description": "Am nevoie de curățenie generală înainte de weekend.",
    "estimatedHours": 3
  },
  "pricingSnapshot": {
    "amount": 270,
    "currency": "RON",
    "unit": "hour",
    "estimatedHours": 3
  },
  "paymentSummary": {
    "paymentId": "pay_bk_123",
    "status": "in_progress",
    "method": "card",
    "last4": "4242",
    "transactionId": "TX-1713000000000-ABC123",
    "updatedAt": "Timestamp"
  },
  "userSnapshot": {
    "displayName": "Andrei Popescu",
    "photoPath": null,
    "primaryLocation": {
      "formattedAddress": "Str. Aviatorilor 21, București"
    }
  },
  "providerSnapshot": {
    "displayName": "Casa în Ordine",
    "statusAtBookingTime": "approved"
  },
  "serviceSnapshot": {
    "name": "Curățenie generală",
    "baseRateAmount": 90,
    "baseRateCurrency": "RON"
  },
  "providerDecision": {
    "type": null,
    "reason": null,
    "proposedStartAt": null
  },
  "cancellation": null,
  "completion": null,
  "reviewSummary": {
    "reviewId": null,
    "rating": null
  },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "createdBy": "uid_user_1",
  "updatedBy": "uid_user_1",
  "schemaVersion": 1
}
```

## 8. `payments/{paymentId}`
### Required
- `paymentId`
- `bookingId`
- `userId`
- `providerId`
- `status: PaymentStatus`
- `method`
- `amount`
- `currency`
- `processor`
- `createdAt`
- `updatedAt`
- `schemaVersion`

### Optional
- `last4`
- `transactionId`
- `updatedBy`

### Important (MVP mock)
- în MVP, procesatorul real nu este încă integrat; metodele `card`, `apple_pay` și `google_pay` sunt auto-finalizate server-side la `status: "paid"` în momentul creării booking-ului, cu `transactionId` generat server-side când lipsește
- `processor: "manual_mvp"` semnalează că plata este gestionată local fără procesator extern; la integrarea reală, acest câmp va lua valoarea procesatorului (`stripe`, etc.) iar auto-finalize-ul mock dispare
- `paymentSummary` din booking reflectă aceeași stare, astfel încât UI-ul de `paymentStatus` să vadă booking-ul drept `paid` imediat după checkout

### Model
```json
{
  "paymentId": "pay_bk_123",
  "bookingId": "bk_123",
  "userId": "uid_user_1",
  "providerId": "uid_provider_123",
  "status": "in_progress",
  "method": "card",
  "amount": 270,
  "currency": "RON",
  "processor": "manual_mvp",
  "last4": "4242",
  "transactionId": "TX-1713000000000-ABC123",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "updatedBy": "uid_user_1",
  "schemaVersion": 1
}
```

## 9. `reviews/{bookingId}`
### Required
- `reviewId`
- `bookingId`
- `authorUserId`
- `providerId`
- `status: ReviewStatus`
- `rating`
- `review`
- `authorSnapshot`
- `providerSnapshot`
- `serviceSnapshot`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`
- `schemaVersion`

### Important
- exact un review per booking
- create/update doar dacă booking-ul este `completed`

### Model
```json
{
  "reviewId": "bk_123",
  "bookingId": "bk_123",
  "authorUserId": "uid_user_1",
  "providerId": "uid_provider_123",
  "status": "published",
  "rating": 5,
  "review": "Punctual și atent la detalii.",
  "authorSnapshot": {
    "displayName": "Andrei Popescu",
    "photoPath": null
  },
  "providerSnapshot": {
    "displayName": "Casa în Ordine",
    "providerRole": "Curățenie generală"
  },
  "serviceSnapshot": {
    "serviceId": "svc_1",
    "serviceName": "Curățenie generală"
  },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "createdBy": "uid_user_1",
  "updatedBy": "uid_user_1",
  "schemaVersion": 1
}
```

## 10. `auditEvents/{eventId}`
### Scop
Urme clare pentru debugging și audit operațional.

### Important
- `eventId` este generat server-side la momentul scrierii evenimentului
- evenimentele de audit sunt append-only și nu sunt scrise direct din client

### Required
- `eventId`
- `action`
- `actorUid`
- `actorRole`
- `resourceType`
- `resourceId`
- `result`
- `createdAt`

### Optional
- `statusFrom`
- `statusTo`
- `context`
- `errorCode`

### Model
```json
{
  "eventId": "evt_123",
  "action": "booking.confirm",
  "actorUid": "uid_provider_123",
  "actorRole": "provider",
  "resourceType": "booking",
  "resourceId": "bk_123",
  "statusFrom": "requested",
  "statusTo": "confirmed",
  "result": "success",
  "context": {
    "providerId": "uid_provider_123",
    "userId": "uid_user_1"
  },
  "createdAt": "Timestamp"
}
```

## 11. `idempotencyKeys/{scope_key}`
### Scop
Deduplicare pentru acțiuni critice.

### Required
- `scopeKey`
- `action`
- `ownerUid`
- `requestHash`
- `resourceType`
- `resourceId`
- `createdAt`
- `expiresAt`

### Model
```json
{
  "scopeKey": "uid_user_1:create_booking:req_abc123",
  "action": "create_booking",
  "ownerUid": "uid_user_1",
  "requestHash": "sha256:...",
  "resourceType": "booking",
  "resourceId": "bk_123",
  "createdAt": "Timestamp",
  "expiresAt": "Timestamp"
}
```

## 12. `conversations/{conversationId}`
### Scop
Conversație reală între user și provider, de obicei legată de un booking.

### Required
- `conversationId`
- `type: "booking" | "direct" | "support_handoff"`
- `participantIds: string[]`
- `participantRoles`
- `status: "active" | "closed" | "blocked"`
- `createdAt`
- `updatedAt`
- `schemaVersion`

### Optional
- `bookingId`
- `providerId`
- `userId`
- `lastMessage`
- `closedAt`
- `closedBy`

### Model
```json
{
  "conversationId": "conv_bk_123",
  "type": "booking",
  "participantIds": ["uid_user_1", "uid_provider_123"],
  "participantRoles": {
    "uid_user_1": "user",
    "uid_provider_123": "provider"
  },
  "bookingId": "bk_123",
  "userId": "uid_user_1",
  "providerId": "uid_provider_123",
  "status": "active",
  "lastMessage": {
    "messageId": "msg_456",
    "senderUid": "uid_user_1",
    "type": "text",
    "preview": "Bună, confirm adresa.",
    "createdAt": "Timestamp"
  },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "schemaVersion": 1
}
```

## 13. `conversationMemberships/{conversationId_uid}`
### Scop
Inbox per participant, ca userul/providerul să poată lista conversațiile fără query-uri grele pe mesaje.

### Required
- `membershipId`
- `conversationId`
- `uid`
- `role: "user" | "provider" | "support"`
- `otherParticipantSnapshot`
- `unreadCount`
- `lastMessageAt`
- `createdAt`
- `updatedAt`

### Optional
- `lastReadMessageId`
- `archivedAt`
- `mutedUntil`
- `blockedAt`

### Model
```json
{
  "membershipId": "conv_bk_123_uid_user_1",
  "conversationId": "conv_bk_123",
  "uid": "uid_user_1",
  "role": "user",
  "otherParticipantSnapshot": {
    "uid": "uid_provider_123",
    "displayName": "Casa în Ordine",
    "avatarPath": "providers/uid_provider_123/avatar/profile.jpg"
  },
  "unreadCount": 2,
  "lastReadMessageId": "msg_400",
  "lastMessageAt": "Timestamp",
  "archivedAt": null,
  "mutedUntil": null,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

## 14. `conversations/{conversationId}/messages/{messageId}`
### Scop
Mesaje reale pentru chat și mesaje sistem generate de booking lifecycle.

### Required
- `messageId`
- `conversationId`
- `senderUid`
- `senderRole`
- `type: "text" | "system" | "image" | "attachment"`
- `status: "sent" | "deleted" | "failed"`
- `createdAt`
- `updatedAt`

### Optional
- `body`
- `attachment`
- `systemEvent`
- `deletedAt`

### Model
```json
{
  "messageId": "msg_456",
  "conversationId": "conv_bk_123",
  "senderUid": "uid_user_1",
  "senderRole": "user",
  "type": "text",
  "body": "Bună, confirm adresa pentru mâine.",
  "attachment": null,
  "systemEvent": null,
  "status": "sent",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

## 15. `notifications/{notificationId}`
### Scop
Feed persistent pentru user/provider, separat de preferințele de notificări existente pe profil.

### Required
- `notificationId`
- `recipientUid`
- `recipientRole: "user" | "provider" | "admin" | "support"`
- `type`
- `title`
- `body`
- `status: "unread" | "read" | "archived"`
- `createdAt`
- `updatedAt`

### Optional
- `i18nKey`
- `i18nParams`
- `entityType`
- `entityId`
- `deepLink`
- `channels`
- `delivery`
- `readAt`
- `expiresAt`

### Model
```json
{
  "notificationId": "notif_123",
  "recipientUid": "uid_provider_123",
  "recipientRole": "provider",
  "type": "booking_requested",
  "title": "Cerere nouă",
  "body": "Ai primit o cerere pentru Curățenie generală.",
  "i18nKey": "notifications.provider.bookingRequested",
  "i18nParams": {
    "serviceName": "Curățenie generală"
  },
  "entityType": "booking",
  "entityId": "bk_123",
  "deepLink": "/provider/nextBookingRequestDetail/nextBookingRequestDetailScreen?bookingId=bk_123",
  "channels": ["in_app", "push"],
  "delivery": {
    "push": "queued"
  },
  "status": "unread",
  "readAt": null,
  "expiresAt": null,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

## 16. `users/{uid}/favorites/{providerId}`
### Scop
Prestatori salvați de user.

### Required
- `providerId`
- `ownerUid`
- `providerSnapshot`
- `createdAt`
- `updatedAt`

### Model
```json
{
  "providerId": "uid_provider_123",
  "ownerUid": "uid_user_1",
  "providerSnapshot": {
    "displayName": "Casa în Ordine",
    "categoryPrimary": "cleaning",
    "city": "București",
    "ratingAverage": 4.9,
    "avatarPath": "providers/uid_provider_123/avatar/profile.jpg"
  },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

## 17. `wallets/{walletId}` și `walletLedger/{entryId}`
### Scop
Credit AI Nevoie, refund-uri, ajustări și reward-uri referral. Ledger-ul este sursa contabilă; soldul din wallet este agregat server-side.

### Required `wallets/{walletId}`
- `walletId`
- `ownerUid`
- `ownerRole`
- `currency`
- `availableBalance`
- `pendingBalance`
- `status: "active" | "locked" | "closed"`
- `createdAt`
- `updatedAt`

### Required `walletLedger/{entryId}`
- `entryId`
- `walletId`
- `ownerUid`
- `type: "credit" | "debit" | "hold" | "release" | "refund" | "referral_reward" | "adjustment"`
- `amount`
- `currency`
- `sourceType`
- `sourceId`
- `createdAt`

### Model
```json
{
  "walletId": "wallet_uid_user_1",
  "ownerUid": "uid_user_1",
  "ownerRole": "user",
  "currency": "RON",
  "availableBalance": 50,
  "pendingBalance": 0,
  "lifetimeEarned": 120,
  "status": "active",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

```json
{
  "entryId": "ledger_123",
  "walletId": "wallet_uid_user_1",
  "ownerUid": "uid_user_1",
  "type": "referral_reward",
  "amount": 25,
  "currency": "RON",
  "sourceType": "referral",
  "sourceId": "ref_123",
  "balanceAfter": 50,
  "createdAt": "Timestamp"
}
```

## 18. `referralCodes/{code}` și `referrals/{referralId}`
### Scop
Program real de recomandări, cu reward-uri acordate doar server-side.

### Required `referralCodes/{code}`
- `code`
- `ownerUid`
- `ownerRole`
- `status: "active" | "disabled"`
- `createdAt`
- `updatedAt`

### Required `referrals/{referralId}`
- `referralId`
- `code`
- `inviterUid`
- `inviteeUid`
- `status: "pending" | "qualified" | "rewarded" | "cancelled"`
- `createdAt`
- `updatedAt`

### Model
```json
{
  "referralId": "ref_123",
  "code": "ANDREI25",
  "inviterUid": "uid_user_1",
  "inviteeUid": "uid_user_2",
  "status": "qualified",
  "qualification": {
    "bookingId": "bk_456",
    "qualifiedAt": "Timestamp"
  },
  "reward": {
    "walletId": "wallet_uid_user_1",
    "amount": 25,
    "currency": "RON",
    "ledgerEntryId": "ledger_123",
    "rewardedAt": "Timestamp"
  },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

## 19. `paymentCustomers/{uid}` și `users/{uid}/paymentMethods/{paymentMethodId}`
### Scop
Metode de plată salvate prin procesator. Firestore nu stochează niciodată card number complet, CVC sau payload brut de procesator.

### Required `paymentCustomers/{uid}`
- `uid`
- `processor`
- `processorCustomerId`
- `createdAt`
- `updatedAt`

### Required `users/{uid}/paymentMethods/{paymentMethodId}`
- `paymentMethodId`
- `ownerUid`
- `processor`
- `processorPaymentMethodId`
- `type`
- `brand`
- `last4`
- `status: "active" | "expired" | "removed"`
- `createdAt`
- `updatedAt`

### Optional
- `expMonth`
- `expYear`
- `billingName`
- `isDefault`

### Model
```json
{
  "paymentMethodId": "pm_local_123",
  "ownerUid": "uid_user_1",
  "processor": "stripe",
  "processorPaymentMethodId": "pm_123",
  "type": "card",
  "brand": "visa",
  "last4": "4242",
  "expMonth": 12,
  "expYear": 2030,
  "billingName": "Andrei Popescu",
  "isDefault": true,
  "status": "active",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

## 20. `supportTickets/{ticketId}` și `supportTickets/{ticketId}/messages/{messageId}`
### Scop
Suport și bug reports reale, cu status vizibil în admin/support.

### Required `supportTickets/{ticketId}`
- `ticketId`
- `topic: "support" | "bug" | "payment" | "booking" | "provider" | "account"`
- `requesterUid`
- `requesterRole`
- `requesterSnapshot`
- `subject`
- `initialMessage`
- `status: "open" | "in_progress" | "waiting_on_user" | "closed"`
- `createdAt`
- `updatedAt`

### Optional
- `priority`
- `assignedTo`
- `relatedEntity`
- `closedAt`

### Model
```json
{
  "ticketId": "ticket_123",
  "topic": "bug",
  "requesterUid": "uid_user_1",
  "requesterRole": "user",
  "requesterSnapshot": {
    "displayName": "Andrei Popescu",
    "email": "andrei@example.com"
  },
  "subject": "Raport bug",
  "initialMessage": "Butonul de plată nu răspunde.",
  "status": "open",
  "priority": "normal",
  "assignedTo": null,
  "relatedEntity": {
    "type": "booking",
    "id": "bk_123"
  },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

## 21. `accountDeletionRequests/{requestId}`
### Scop
Cerere reală pentru ștergere/dezactivare cont, auditabilă și procesată server/admin.

### Required
- `requestId`
- `uid`
- `role`
- `status: "requested" | "cancelled" | "processing" | "completed" | "rejected"`
- `requestedAt`
- `updatedAt`

### Optional
- `reason`
- `retentionUntil`
- `processedAt`
- `processedBy`
- `anonymizationSummary`

### Model
```json
{
  "requestId": "del_uid_user_1_user",
  "uid": "uid_user_1",
  "role": "user",
  "status": "requested",
  "reason": "Nu mai folosesc aplicația.",
  "retentionUntil": "Timestamp",
  "requestedAt": "Timestamp",
  "updatedAt": "Timestamp",
  "processedAt": null,
  "processedBy": null
}
```

## 22. `users/{uid}/searchHistory/{searchId}`
### Scop
Căutări recente reale pentru user. Pentru analytics global se poate adăuga separat `searchEvents`, dar UI-ul curent are nevoie doar de istoric per user.

### Required
- `searchId`
- `ownerUid`
- `query`
- `normalizedQuery`
- `createdAt`

### Optional
- `selectedCategoryKey`
- `resultCount`
- `sourceScreen`
- `expiresAt`

### Model
```json
{
  "searchId": "search_123",
  "ownerUid": "uid_user_1",
  "query": "curățenie",
  "normalizedQuery": "curatenie",
  "selectedCategoryKey": "cleaning",
  "resultCount": 8,
  "sourceScreen": "search",
  "createdAt": "Timestamp",
  "expiresAt": "Timestamp"
}
```

## 23. `contactEvents/{eventId}`
### Scop
Audit opțional pentru acțiuni de contact din booking/request. Numărul de telefon trebuie venit din profil/provider directory sau booking snapshot, nu din phonebook demo.

### Required
- `eventId`
- `actorUid`
- `actorRole`
- `targetUid`
- `targetRole`
- `type: "call" | "sms" | "external_map"`
- `status: "opened" | "failed" | "blocked"`
- `createdAt`

### Optional
- `bookingId`
- `phoneLast4`
- `sourceScreen`
- `errorCode`

### Model
```json
{
  "eventId": "contact_123",
  "actorUid": "uid_provider_123",
  "actorRole": "provider",
  "targetUid": "uid_user_1",
  "targetRole": "user",
  "bookingId": "bk_123",
  "type": "call",
  "phoneLast4": "0100",
  "sourceScreen": "provider_booking",
  "status": "opened",
  "createdAt": "Timestamp"
}
```

## 24. `promoCampaigns/{campaignId}`
### Scop
Promoții reale, eligibilitate și generare notificări/cupoane fără date demo.

### Required
- `campaignId`
- `title`
- `description`
- `status: "draft" | "active" | "paused" | "ended"`
- `startsAt`
- `endsAt`
- `createdAt`
- `updatedAt`

### Optional
- `audience`
- `benefit`
- `usageLimits`
- `createdBy`

### Model
```json
{
  "campaignId": "promo_spring_2026",
  "title": "Reducere curățenie de primăvară",
  "description": "Credit promo pentru următoarea rezervare eligibilă.",
  "status": "active",
  "startsAt": "Timestamp",
  "endsAt": "Timestamp",
  "audience": {
    "roles": ["user"],
    "city": "București"
  },
  "benefit": {
    "type": "wallet_credit",
    "amount": 25,
    "currency": "RON"
  },
  "usageLimits": {
    "maxGlobalRedemptions": 1000,
    "maxPerUser": 1
  },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "createdBy": "uid_admin_1"
}
```

## Storage model

## Paths
- `users/{uid}/avatar/{fileName}`
- `providers/{uid}/avatar/{fileName}`
- `providers/{uid}/documents/identity/{fileName}`
- `providers/{uid}/documents/professional/{fileName}`
- `conversations/{conversationId}/attachments/{messageId}/{fileName}` pentru chat full-backend
- `supportTickets/{ticketId}/attachments/{messageId}/{fileName}` pentru suport full-backend

## Reguli
- userul își poate scrie doar avatarul propriu
- providerul își poate scrie doar avatarul și documentele proprii
- documentele provider sunt read-protected pentru provider și admin, nu public
- URL-urile publice nu se salvează brut pentru documentele sensibile; se salvează `storagePath`
- atașamentele de chat/support sunt vizibile doar participanților conversației/ticketului și admin/support

## Implementare avatar profil
- Upload-ul de avatar este conectat în `src/features/shared/screens/SharedEditProfileScreen.js` pentru user și provider, cu selecție din cameră sau galerie.
- Clientul salvează fișierul în Storage și apoi apelează `finalizeUserAvatarUpload` sau `finalizeProviderAvatarUpload`, care persistă doar path-ul relativ în Firestore.

## Implementare documente verificare provider
- Upload-ul documentelor de verificare este conectat în `src/features/auth/screens/ProviderOnboardingScreen.js`.
- Flow-ul curent acceptă imagini selectate din galerie prin `expo-image-picker`; documentele PDF nu sunt încă selectabile din UI.
- Documentele acceptate în modelul MVP sunt:
  - `identity`: document de identitate provider
  - `professional`: document/certificat profesional
- Clientul salvează fișierul în Storage sub `providers/{uid}/documents/{identity|professional}/{fileName}` și apoi apelează `finalizeProviderDocumentUpload`.
- Callable-ul verifică prefixul Storage, existența fișierului și statusul providerului, apoi persistă în `providers/{uid}.documents.{identity|professional}` doar metadatele necesare: `status: "uploaded"`, `storagePath`, `originalFileName`, `uploadedAt`.
- `submitProviderOnboarding` permite trimiterea la verificare doar dacă ambele documente au `status: "uploaded"` și `storagePath` valid.
- Dacă se adaugă suport PDF ulterior, UI-ul trebuie extins cu document picker, iar regulile/validările de tip fișier trebuie documentate aici înainte de activare.

## Ownership și access matrix

| Resource | User owner | Provider owner | Admin | Public |
|---|---|---|---|---|
| `users/{uid}` | read/write self | nu | da | nu |
| `providers/{uid}` | nu | read/write self limitat | da | nu |
| `providerDirectory/{uid}` | read | read | da | da |
| `providers/{uid}/services/*` | nu | read/write self | da | nu direct |
| `providers/{uid}/availability/*` | nu | read/write self | da | nu direct |
| `bookings/{bookingId}` | read own, writes limitate | read own, writes limitate | da | nu |
| `payments/{paymentId}` | nu direct; summary via booking | nu direct; summary via booking | da/server | nu |
| `reviews/{bookingId}` | nu direct write; create/update via callable | public read pentru profil și tab provider | da | da |
| `auditEvents/{eventId}` | nu | nu | da | nu |
| `idempotencyKeys/{scope_key}` | nu | nu | da/server | nu |
| `conversations/{conversationId}` | read participant | read participant | da | nu |
| `conversationMemberships/{conversationId_uid}` | read/write own state limitat | read/write own state limitat | da | nu |
| `conversations/{conversationId}/messages/*` | read participant, write via callable | read participant, write via callable | da | nu |
| `notifications/{notificationId}` | read own, mark own read/archive | read own, mark own read/archive | da/server write | nu |
| `users/{uid}/favorites/*` | read/write self | nu | da | nu |
| `wallets/{walletId}` | read own | read own dacă ownerRole provider | da/server write | nu |
| `walletLedger/{entryId}` | read own | read own dacă ownerRole provider | da/server write | nu |
| `referralCodes/{code}` | read own/public validate limitat | read own/public validate limitat | da/server write | validare limitată |
| `referrals/{referralId}` | read own participant | read own participant | da/server write | nu |
| `paymentCustomers/{uid}` | nu direct | nu | da/server | nu |
| `users/{uid}/paymentMethods/*` | read own, write via callable/tokenizare | nu | da/server | nu |
| `supportTickets/{ticketId}` | create/read own | create/read own | da/support | nu |
| `accountDeletionRequests/{requestId}` | create/read own | create/read own | da/server | nu |
| `users/{uid}/searchHistory/*` | read/write self | nu | da | nu |
| `contactEvents/{eventId}` | read own participant | read own participant | da/server write | nu |
| `promoCampaigns/{campaignId}` | read active eligibil | read active eligibil | da | active public/eligibil |

## Server-authoritative actions
Acestea nu trebuie executate prin client direct:
- setare rol și custom claims
- bootstrap/repair profil după signup/login
- provider submit for review
- approve/reject/suspend provider
- create booking
- confirm/reject/reschedule booking
- cancel booking dacă afectează lifecycle
- mark booking completed
- payment status update
- booking payment summary update
- publish/unpublish provider directory
- save review
- create/update conversation and send message, dacă mesajele afectează unread counters sau audit
- create notification și push delivery
- add/remove favorite, dacă se salvează `providerSnapshot`
- create setup intent/save payment method tokenizat; niciodată card raw din client în Firestore
- wallet ledger writes, referral qualification și reward settlement
- create/update support ticket status și răspunsuri admin/support
- request/cancel/complete account deletion
- contact event logging pentru call/contact actions, dacă se păstrează audit

## Status transition rules

## Provider
- `pre_registered -> pending_review`
- `pending_review -> approved`
- `pending_review -> rejected`
- `approved -> suspended`
- `rejected -> pending_review`
- `suspended -> approved`

Nu sunt permise direct din client:
- `pre_registered -> approved`
- `approved -> rejected` fără acțiune admin

Admin panel trebuie să folosească `adminReviewProvider` pentru decizii:

```json
{
  "providerId": "uid_provider_123",
  "action": "approve|reject|suspend|reinstate",
  "reason": "Motiv obligatoriu pentru reject/suspend"
}
```

Reguli backend pentru `adminReviewProvider`:
- `approve` este permis doar din `pending_review` și cere profil complet, documente uploadate și disponibilitate configurată.
- `reject` este permis doar din `pending_review` și cere `reason`.
- `suspend` este permis doar din `approved` și cere `reason`.
- `reinstate` este permis doar din `suspended`.
- după `approve` sau `reinstate`, backend-ul setează custom claims și sincronizează `providerDirectory/{uid}`.
- după `reject` sau `suspend`, backend-ul șterge/depublică snapshot-ul din `providerDirectory/{uid}`.

## Booking
- `requested -> confirmed`
- `requested -> rejected`
- `requested -> reschedule_proposed`
- `requested -> cancelled_by_user`
- `confirmed -> cancelled_by_user`
- `confirmed -> cancelled_by_provider`
- `confirmed -> completed`
- `reschedule_proposed -> confirmed`
- `reschedule_proposed -> rejected`
- `reschedule_proposed -> cancelled_by_user`
- `reschedule_proposed -> cancelled_by_provider`

Nu sunt permise:
- `completed -> requested`
- `cancelled_* -> confirmed`
- `rejected -> completed`

## Payment / booking invariants
- booking `completed` nu trebuie să rămână cu `paymentSummary.status = failed` fără flag explicit de excepție
- booking `rejected` nu trebuie să fie `paymentSummary.status = paid` fără workflow de refund/override
- booking `requested` poate avea `in_progress` sau `unpaid`
- review nu poate exista dacă booking-ul nu este `completed`

## Denormalizări permise
- `providerDirectory` din `providers + services + availability + reviews aggregates` (incluzând `ratingSum`, `ratingAverage`, `reviewCount` menținute incremental prin `onReviewWrite`)
- `bookings.userSnapshot`
- `bookings.providerSnapshot`
- `bookings.serviceSnapshot`
- `bookings.paymentSummary`
- `bookings.reviewSummary`
- `conversations.lastMessage`
- `conversationMemberships.otherParticipantSnapshot`
- `notifications.title/body/i18nParams`
- `users/{uid}/favorites.providerSnapshot`
- `wallets.availableBalance` din `walletLedger`

## Denormalizări interzise
- duplicarea documentelor sensibile provider în documente publice
- duplicarea rolului în documente client-writable fără validare server-side
- payment payload brut de procesator în booking document
- card number complet, CVC sau payload brut de procesator în `paymentMethods`
- sold wallet editabil direct de client fără ledger server-side

## Indexuri recomandate
- `bookings` pe `(providerId, status, scheduledStartAt desc)`
- `bookings` pe `(userId, status, scheduledStartAt desc)`
- `bookings` pe `(providerId, updatedAt desc)`
- `bookings` pe `(userId, scheduledStartAt desc)` pentru listări user ordonate cronologic fără filtru pe status
- `bookings` pe `(providerId, scheduledStartAt desc)` pentru listări provider ordonate cronologic fără filtru pe status
- `reviews` pe `(providerId, createdAt desc)`
- `reviews` pe `(providerId, status)` pentru aggregate published și filtrare rapidă în profil public
- `reviews` pe `(authorUserId, createdAt desc)` pentru istoric review-uri per user
- `reviews` pe `(status, createdAt desc)` pentru moderation feed admin
- `providerDirectory` pe `(status, categoryPrimary, cityName, ratingAverage desc)`
- `conversationMemberships` pe `(uid, role, archivedAt, lastMessageAt desc)`
- `conversations` pe `(participantIds array-contains, updatedAt desc)` doar dacă se listează direct conversații fără membership
- `notifications` pe `(recipientUid, recipientRole, status, createdAt desc)`
- `walletLedger` pe `(walletId, createdAt desc)`
- `referrals` pe `(inviterUid, status, createdAt desc)`
- `referrals` pe `(inviteeUid, status, createdAt desc)`
- `supportTickets` pe `(requesterUid, requesterRole, updatedAt desc)`
- `supportTickets` pe `(status, updatedAt desc)`
- `accountDeletionRequests` pe `(uid, role, status, requestedAt desc)`
- `contactEvents` pe `(actorUid, createdAt desc)`
- `promoCampaigns` pe `(status, startsAt desc, endsAt desc)`

## Mapping util din modelul mock actual
- `session.authFlow.role` -> Firebase Auth claims + bootstrap response
- `providerOnboarding.verificationStatus` -> `providers/{uid}.status`
- `useUserBookings.requestDetails` -> `bookings.requestDetails`
- `useUserBookings.payment.status` -> `bookings.paymentSummary.status` + `payments.status`
- `providerDecision` -> `bookings.providerDecision`
- `cancellation` -> `bookings.cancellation`
- `useUserReviews` unic pe `bookingId` -> `reviews/{bookingId}`
- `blockedDates` -> `providers/{uid}/availability/profile.blockedDates`

## Inventar UI rămas fără colecții Firebase full-backend

Aceste locații nu mai trebuie alimentate din mock, dar încă nu pot afișa date reale până când colecțiile full-backend de mai sus nu sunt implementate.

| Locație UI | Stare curentă | Backend lipsă |
|---|---|---|
| `src/features/user/routes/(tabs)/chat/chatScreen.js` | trimite `conversations={[]}` | `conversations`, `conversationMemberships`, `messages` |
| `src/features/provider/routes/(tabs)/chat/chatScreen.js` | trimite `conversations={[]}` | `conversations`, `conversationMemberships`, `messages` |
| `src/features/shared/screens/SharedChatListScreen.js` | empty state, filtre doar pe listă goală | `conversationMemberships` + `conversations.lastMessage` |
| `src/features/shared/screens/SharedMessageScreen.js` | `messagesList` gol, composer dezactivat | `messages`, callable `sendMessage` |
| `src/features/shared/screens/SharedNotificationsScreen.js` | feed gol, doar link la preferințe | `notifications` |
| `src/features/user/routes/favorite/favoriteScreen.js` | favorite indisponibile | `users/{uid}/favorites/{providerId}` |
| `src/features/user/routes/(tabs)/wallet/walletScreen.js` | sold `0 RON`, referral indisponibil | `wallets`, `walletLedger`, `referralCodes`, `referrals` |
| `src/features/user/routes/paymentMethod/paymentMethodScreen.js` | formular card creează doar payment summary; salvarea cardului dezactivată | `paymentCustomers`, `users/{uid}/paymentMethods` + procesator tokenizare |
| `src/features/user/routes/search/searchScreen.js` | sugestii din `providerDirectory`, dar căutări recente goale | `users/{uid}/searchHistory/{searchId}` |
| `src/features/shared/screens/SharedSupportScreen.js` | formular validat local și alert de succes local/demo | `supportTickets`, opțional `supportTickets/*/messages` |
| `src/features/shared/screens/SharedDeleteAccountScreen.js` | curăță doar storage tehnic local și sesiunea | `accountDeletionRequests` + callable de ștergere/dezactivare |
| `src/features/provider/routes/(tabs)/booking/bookingScreen.js` | buton call folosește `handleDemoCall` | telefon real din snapshot/profil + opțional `contactEvents` |
| `src/features/provider/routes/bookingRequest/BookingRequestsContent.js` | buton call folosește `handleDemoCall` | telefon real din booking snapshot + opțional `contactEvents` |
| `src/features/provider/routes/allBookings/allBookingsScreen.js` | buton call folosește `handleDemoCall` | telefon real din booking snapshot + opțional `contactEvents` |
| `src/features/user/routes/upcomingBookingDetail/upcomingBookingDetailScreen.js` | buton call folosește `handleDemoCall` | telefon real din provider profile/directory + opțional `contactEvents` |
| `src/features/provider/routes/nextBookingRequestDetail/nextBookingRequestDetailScreen.js` | opțiuni reprogramare includ date hardcodate | derivare sloturi din `providers/{uid}/availability/profile` + booking conflict query |
| `src/features/shared/config/supportTopicConfig.js` și `src/features/shared/localization/messages/shared.js` | copy încă menționează demo/local pentru suport, ștergere, promo | trebuie actualizat odată cu colecțiile reale |

## Implementare recomandată pe incrementuri
- Chat: `conversations` + `conversationMemberships` + `messages`, apoi badge unread în tab.
- Notifications: feed in-app derivat din booking/review/chat events, apoi push delivery.
- Favorites: subcolecție user simplă și buton favorite în provider detail/list.
- Wallet/referral: ledger server-only înainte de orice sold afișat editabil.
- Payments: tokenizare cu procesator, apoi payment methods salvate; nu se salvează PAN/CVC.
- Support/delete account: ticket/request real + admin/support workflow.
- Search/contact/promo: istoric recent, contact audit și campanii reale după ce flow-urile principale sunt stabile.

## Assumptions
- un cont Auth corespunde unui singur rol de business în MVP
- admin panel-ul Next.js folosește Admin SDK și nu depinde de documente client-writable pentru acțiuni sensibile
- provider public discovery este servit din `providerDirectory`, nu direct din documentul privat `providers/{uid}`
- colecțiile full-backend identificate mai sus se implementează incremental și nu schimbă contractele MVP pentru profile/services/availability/bookings/payments/reviews

## Risk notes
- dacă viitorul produs cere multi-role sub același cont Auth, document model-ul trebuie extins
- dacă plata reală vine ulterior dintr-un procesator extern, `payments` poate necesita câmpuri suplimentare
- dacă admin panel-ul cere audit trail persistent și query-heavy, `auditEvents` ar putea necesita export sau TTL strategy
- pentru chat/notifications, costul Firestore poate crește rapid fără membership documents, pagination și TTL/archivare
- pentru wallet/referral, orice abatere de la ledger server-only poate produce solduri inconsistente sau fraudă

## Admin panel callable contract
- Etapa 7 nu introduce colecții noi pentru admin panel; consumă colecțiile deja definite în acest document
- contractul read pentru Next.js admin panel este expus server-side prin callables care returnează DTO-uri serializate:
  - `getAdminDashboardSummary`
  - `listAdminProviders`
  - `getAdminProviderCase`
  - `listAdminBookings`
  - `getAdminBookingCase`
  - `listAdminReviews`
  - `listAdminAuditEvents`
- accesul read este permis doar pentru actori operaționali cu rol:
  - `admin`
  - `support`
- acțiunile sensibile de moderare rămân separate de query contract și folosesc funcții dedicate, de exemplu `adminReviewProvider`
- pentru lista de verificare provider, `listAdminProviders` expune câmpurile necesare pentru tabel:
  - `providerId`
  - `status`
  - `accountStatus`
  - `email`
  - `phoneNumber`
  - `businessName`
  - `displayName`
  - `specialization`
  - `coverageAreaText`
  - `availabilitySummary`
  - `identityDocumentStatus`
  - `professionalDocumentStatus`
  - `submittedAt`
  - `lastReviewedAt`
  - `reviewedAt`
  - `reviewAction`
  - `lastPublishedAt`
  - `updatedAt`
- pentru pagina de detaliu/review provider, `getAdminProviderCase` întoarce:
  - `provider`: documentul complet `providers/{uid}`
  - `providerDirectory`: snapshot-ul public, sau `null` dacă nu este publicat
  - `availability`: `providers/{uid}/availability/profile`
  - `services`: serviciile providerului
  - `recentBookings`
  - `recentAuditEvents`
- DTO-urile admin pot agrega date din:
  - `providers/{uid}`
  - `providerDirectory/{uid}`
  - `providers/{uid}/availability/profile`
  - `providers/{uid}/services/{serviceId}`
  - `bookings/{bookingId}`
  - `payments/{paymentId}`
  - `reviews/{bookingId}`
  - `auditEvents/{eventId}`
- pentru incrementurile full-backend, admin/support va mai consuma:
  - `notifications/{notificationId}`
  - `supportTickets/{ticketId}`
  - `accountDeletionRequests/{requestId}`
  - `wallets/{walletId}`
  - `walletLedger/{entryId}`
  - `referrals/{referralId}`
  - `promoCampaigns/{campaignId}`

## Open questions
- avem nevoie de soft delete oficial pentru user și provider sau de disable + tombstone?
- chat-ul trebuie permis doar după existența unui booking/request sau și pentru contact direct din provider profile?
- notificările persistente au nevoie de TTL automat sau istoric complet în cont?
- wallet/referral intră în același increment cu plățile reale sau după procesatorul de plăți?
- ștergerea contului trebuie să fie hard delete, soft delete sau anonimizare cu retention period?
