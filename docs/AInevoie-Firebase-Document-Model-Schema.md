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
    "formattedAddress": "Str. Aviatorilor 21, București",
    "lat": 44.46,
    "lng": 26.08,
    "countryCode": "RO",
    "countryName": "România",
    "countyCode": "B",
    "countyName": "București",
    "cityCode": "bucuresti",
    "cityName": "București",
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
      "cityCode": "bucuresti",
      "cityName": "București",
      "placeId": "ChIJL1Qb0lEwqEcRgmnX4Vv4JpQ",
      "locationLabel": "Bulevardul Iuliu Maniu 10",
      "formattedAddress": "Bulevardul Iuliu Maniu 10, București, România",
      "centerLat": 44.4305,
      "centerLng": 26.0446
    },
    "coverageAreaText": "România, București, București",
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
      "storagePath": "providers/uid_provider_123/documents/professional/certificat.pdf",
      "originalFileName": "certificat.pdf",
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
- `jobCount: number`
- `serviceSummaries: array`
- `searchKeywordsNormalized: string[]`
- `updatedAt`

### Important
- doar providerii `approved` ar trebui publicați normal
- dacă un provider devine `rejected` sau `suspended`, documentul poate fi retras sau marcat nebookable server-side
- snapshot-ul public nu expune `placeId`, coordonatele exacte sau alt detaliu privat al locației providerului
- matching-ul public pe coverage folosește ierarhia `țară > județ > oraș`, nu o rază publică

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
  "cityCode": "bucuresti",
  "cityName": "București",
  "coverageAreaText": "România, București, București",
  "coverageTags": ["România", "București"],
  "hasConfiguredAvailability": true,
  "availabilitySummary": "Luni-Sâmbătă: 08:30-17:30",
  "availabilityDayChips": ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"],
  "description": "Servicii complete pentru locuințe active.",
  "baseRateAmount": 90,
  "baseRateCurrency": "RON",
  "ratingAverage": 4.9,
  "reviewCount": 42,
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
      "note": "Concediu",
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

## Storage model

## Paths
- `users/{uid}/avatar/{fileName}`
- `providers/{uid}/avatar/{fileName}`
- `providers/{uid}/documents/identity/{fileName}`
- `providers/{uid}/documents/professional/{fileName}`

## Reguli
- userul își poate scrie doar avatarul propriu
- providerul își poate scrie doar avatarul și documentele proprii
- documentele provider sunt read-protected pentru provider și admin, nu public
- URL-urile publice nu se salvează brut pentru documentele sensibile; se salvează `storagePath`

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
- `providerDirectory` din `providers + services + availability + reviews aggregates`
- `bookings.userSnapshot`
- `bookings.providerSnapshot`
- `bookings.serviceSnapshot`
- `bookings.paymentSummary`
- `bookings.reviewSummary`

## Denormalizări interzise
- duplicarea documentelor sensibile provider în documente publice
- duplicarea rolului în documente client-writable fără validare server-side
- payment payload brut de procesator în booking document

## Indexuri recomandate
- `bookings` pe `(providerId, status, scheduledStartAt desc)`
- `bookings` pe `(userId, status, scheduledStartAt desc)`
- `bookings` pe `(providerId, updatedAt desc)`
- `reviews` pe `(providerId, createdAt desc)`
- `providerDirectory` pe `(status, categoryPrimary, city, ratingAverage desc)`

## Mapping util din modelul mock actual
- `session.authFlow.role` -> Firebase Auth claims + bootstrap response
- `providerOnboarding.verificationStatus` -> `providers/{uid}.status`
- `useUserBookings.requestDetails` -> `bookings.requestDetails`
- `useUserBookings.payment.status` -> `bookings.paymentSummary.status` + `payments.status`
- `providerDecision` -> `bookings.providerDecision`
- `cancellation` -> `bookings.cancellation`
- `useUserReviews` unic pe `bookingId` -> `reviews/{bookingId}`
- `blockedDates` -> `providers/{uid}/availability/profile.blockedDates`

## Colecții deferate sau out of scope pentru fundația inițială
- `conversations`
- `messages`
- `notifications`
- `supportTickets`
- `favorites`
- `promoCampaigns`

Acestea pot fi adăugate ulterior, dar nu trebuie să blocheze fundația:
- auth
- roles
- profiles
- provider review pipeline
- services
- availability
- bookings
- payments
- reviews

## Assumptions
- un cont Auth corespunde unui singur rol de business în MVP
- admin panel-ul Next.js folosește Admin SDK și nu depinde de documente client-writable pentru acțiuni sensibile
- provider public discovery este servit din `providerDirectory`, nu direct din documentul privat `providers/{uid}`

## Risk notes
- dacă viitorul produs cere multi-role sub același cont Auth, document model-ul trebuie extins
- dacă plata reală vine ulterior dintr-un procesator extern, `payments` poate necesita câmpuri suplimentare
- dacă admin panel-ul cere audit trail persistent și query-heavy, `auditEvents` ar putea necesita export sau TTL strategy

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
- DTO-urile admin pot agrega date din:
  - `providers/{uid}`
  - `providerDirectory/{uid}`
  - `providers/{uid}/availability/profile`
  - `providers/{uid}/services/{serviceId}`
  - `bookings/{bookingId}`
  - `payments/{paymentId}`
  - `reviews/{bookingId}`
  - `auditEvents/{eventId}`

## Open questions
- avem nevoie de soft delete oficial pentru user și provider sau de disable + tombstone?
- `support` trebuie modelat în Firestore din prima sau rămâne out of scope?
- există nevoie de `favorites` și `notifications` în primul backend increment sau rămân în etapa ulterioară?
