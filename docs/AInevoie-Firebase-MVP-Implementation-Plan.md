# AInevoie Firebase MVP Implementation Plan

## Scop
Acest document definește planul progresiv de implementare pentru backend-ul MVP AInevoie pe Firebase, fără a presupune doar happy path.

Documentul este gândit pentru:
- aplicația mobilă Expo/React Native din acest repo
- viitorul proiect Next.js Admin Panel
- aliniere între Auth, Firestore, Storage, Cloud Functions, security rules, observability și testing

## Regulă de aliniere cu schema bazei de date
Acest plan nu este sursa finală pentru structura datelor. Sursa de adevăr pentru modelul de date este:
- [AInevoie-Firebase-Document-Model-Schema.md](/Users/code-with-a/Dev/AINEVOIE-CODECANYON/COMPLET%20APP/AI%20NEVOIE%20APP/docs/AInevoie-Firebase-Document-Model-Schema.md)

Regulă obligatorie:
- orice schimbare de colecții, câmpuri, enum-uri, ownership, statusuri sau denormalizări trebuie actualizată întâi sau simultan în schema document model
- dacă implementarea diferă de document model, document model-ul trebuie corectat în același task
- admin panel-ul Next.js trebuie să consume același document model, nu un model paralel

## Contextul actual al repo-ului
- aplicația mobilă este Expo + React Native + expo-router
- există deja Jest în proiect și trebuie reutilizat
- există deja fundația Firebase pentru Etapa 0 și Etapa 1:
  - Firebase Auth email/password în client
  - Google auth în client prin `expo-auth-session` + Firebase JS SDK credential sign-in
  - phone auth în client prin Firebase JS SDK `signInWithPhoneNumber(...)` + OTP confirm
  - callable `bootstrapSession`
  - callable `submitProviderOnboarding`
  - profile minime persistate în `users/{uid}` și `providers/{uid}`
  - `functions/`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`
- aplicația folosește acum AsyncStorage și mock state pentru auth, bookings, reviews, provider onboarding, availability și settings
- există deja termeni de business utili în UI care merită păstrați în backend:
  - roluri: `user`, `provider`
  - provider verification status UI: `draft`, `pending`, `approved`, `rejected`
  - booking/payment/review/request details deja vizibile în client

## Obiective MVP backend
- autentificare și bootstrap robuste pentru `user` și `provider`
- modele Firestore clare, cu ownership și audit fields explicite
- logică sensibilă mutată server-side în Cloud Functions
- security rules stricte, cu prevenire privilege escalation și tampering
- validări defensive și idempotency unde există risc de duplicate submit
- logging structurat și urme utile pentru debug și audit
- teste unitare locale prin Jest și verificare manuală pe proiectul Firebase dev

## Decizii arhitecturale de bază
- un cont Firebase Auth va avea exact un rol de business în MVP: `user` sau `provider`
- `admin` nu este rol disponibil în aplicația mobilă; este rol operațional pentru admin panel și funcții server-side
- providerul va avea două reprezentări:
  - document privat complet pentru operare și verificare
  - document public denormalizat pentru listarea în aplicație
- booking request și booking confirmat vor fi aceeași entitate Firestore, cu lifecycle status clar, nu două adevăruri separate
- review-ul va fi unic per booking și va avea `bookingId` ca identity naturală
- documentele sensibile și imaginile vor merge în Firebase Storage, nu în Firestore
- orice câmp critic de rol, status, payment și ownership va fi stabilit sau validat server-side

## Segmente de implementare

## Etapa 0. Foundation Setup
### Obiectiv
Punerea bazei tehnice minime pentru a putea construi și valida backend-ul corect.

### Scope
- adăugare Firebase SDK client, Firebase Admin SDK și Firebase Functions
- configurare proiect Firebase dev real
- structură inițială pentru:
  - `functions/`
  - `firestore.rules`
  - `storage.rules`
  - `firestore.indexes.json`
- setup de environment separation pentru `dev`, `staging`, `prod`
- convenție de logging și naming

### Deliverables
- config Firebase local runnable
- deploy scripts pentru functions și rules
- Jest setup pentru teste unitare backend
- skeleton pentru validators, services, lifecycle logic și shared enums

### Definition of done
- aplicația se poate conecta la proiectul Firebase dev configurat în `.env`
- functions și rules se pot deploya explicit pe proiectul selectat
- testele unitare backend rulează local
- există structură clară pentru functions, rules și shared backend types
- document model schema este actualizată și versiunea inițială este acceptată

## Etapa 1. Auth + Safe Bootstrap
### Obiectiv
Autentificare sigură și bootstrap consistent pentru `user` și `provider`.

### Scope
- email/password și identity bootstrap model
- Google auth prin OAuth browser flow + Firebase credential sign-in
- phone auth prin OTP, pe Firebase JS SDK
- suport pentru roluri prin custom claims și/sau bootstrap response
- bootstrap sigur după signup/login
- healing pentru cazurile:
  - user în Auth fără profil Firestore
  - profil parțial
  - custom claims lipsă sau învechite

### Server-side responsibilities
- `onAuthUserCreate` sau callable bootstrap care creează profil minim dacă lipsește
- callable `bootstrapSession` care:
  - verifică Auth
  - citește rolul real
  - verifică existența profilului
  - repară documentele minime lipsă dacă este permis
  - returnează starea minimă de sesiune pentru client
- setare controlată pentru custom claims

### Tests
- signup user cu bootstrap complet
- signup provider cu bootstrap complet
- login cu profil existent
- login cu profil lipsă
- login cu claims lipsă
- acces refuzat pentru rol invalid

### Definition of done
- niciun client valid nu rămâne blocat în stare Auth fără profil coerent
- clientul nu poate seta singur rol sau provider status
- bootstrap este idempotent
- `email/password`, `Google` și `Telefon` folosesc Firebase Auth real
- `Apple` nu mai rulează flow mock și rămâne marcat explicit ca indisponibil până la etapa dedicată

### Note operaționale
- implementarea mobilă curentă pentru `Telefon` pe React Native folosește Firebase JS SDK `signInWithPhoneNumber(...)`
- pentru acest flux, proiectul Firebase trebuie să aibă:
  - Phone Authentication activ
  - project-level reCAPTCHA Enterprise bot protection în `Enforce mode`, altfel OTP-ul are nevoie de un `ApplicationVerifier` compatibil

## Etapa 2. Profiles + Provider Review Pipeline + Storage
### Obiectiv
Trecerea de la sesiune minimă la profiluri persistente, cu model clar pentru provider onboarding și verificare.

### Scope
- `users/{uid}`
- `providers/{uid}`
- `providerDirectory/{uid}`
- Storage paths pentru:
  - avatar user/provider
  - documente provider
- status provider:
  - `pre_registered`
  - `pending_review`
  - `approved`
  - `rejected`
  - `suspended`

### Business rules
- providerul nu apare în `providerDirectory` până nu este `approved`
- providerul poate completa profilul și documentele înainte de aprobare
- admin panel-ul controlează `approved`, `rejected`, `suspended`
- clientul mobil nu poate promova singur statusul providerului
- coverage provider este modelat ca `țară > județ > oraș` plus o locație Google Places validată server-side
- `providerDirectory` publică doar ierarhia și `coverageAreaText`; coordonatele exacte și `placeId` rămân private în `providers/{uid}`
- matching-ul pentru `my_location` și filtrele de coverage nu mai folosește rază publică sau distanță client-side, ci ierarhia normalizată

### Cloud Functions
- submit provider for review
- finalize user avatar upload
- finalize provider avatar upload
- finalize provider document upload
- publish/unpublish provider directory snapshot
- admin review action
- profile normalization/update hooks
- Google Places proxy callables pentru coverage provider

### Tests
- provider neaprobat nu este vizibil public
- provider aprobat apare în directory
- provider suspendat devine non-bookable
- acces neautorizat la documente private este blocat

### Definition of done
- profilurile user/provider au ownership clar
- documentele sensibile sunt doar în Storage
- provider status este server-authoritative
- avatarul user/provider și documentele provider nu mai depind de AsyncStorage ca sursă finală de adevăr

## Etapa 3. Services + Availability
### Obiectiv
Persistență corectă pentru serviciile providerului și disponibilitate.

### Scope
- `providers/{uid}/services/{serviceId}`
- `providers/{uid}/availability/profile`
- denormalizare controlată în `providerDirectory`
- catalog partajat de categorii de servicii
- discovery și provider detail alimentate din `providerDirectory.serviceSummaries`

### Business rules
- doar providerul proprietar își poate modifica serviciile
- disponibilitatea se citește direct din `providers/{uid}/availability/profile`, dar se salvează doar prin callable backend validator
- doar serviciile `active` și providerii `approved` intră în public directory
- `providerDirectory.categoryPrimary` rămâne backward-compatible, derivat din primul serviciu `active`, cu fallback la `professionalProfile.specialization`
- `providerDirectory.serviceSummaries[]` devine sursa publică pentru profil public, listare și category filtering
- zilele blocate și intervalele invalide sunt validate server-side
- disponibilitatea publică este derivată din modelul privat, nu setată arbitrar de client

### Tests
- add/edit/archive/toggle service
- migrare one-time din AsyncStorage în Firestore fără duplicate
- public directory rebuild după create/update/archive service
- invalid overlap în disponibilitate
- blocked date duplicat
- provider suspendat nu poate publica schimbări noi
- filtrele user folosesc serviciile active reale din `providerDirectory`

### Definition of done
- serviciile și disponibilitatea nu mai depind de state local-only
- `professionalServicesScreen`, `serviceProviderListScreen` și `serviceProviderScreen` nu mai folosesc liste hardcodate pentru servicii
- booking flow propagă `serviceId` și `serviceName` din serviciul selectat
- datele publice și private au surse de adevăr separate și coerente

## Etapa 4. Bookings Lifecycle
### Obiectiv
Mutarea request-urilor și booking-urilor pe logică server-authoritative.

### Scope
- colecția `bookings`
- state machine pentru lifecycle
- control concurență și idempotency
- ownership user/provider clar

### Lifecycle minim propus
- `requested`
- `confirmed`
- `reschedule_proposed`
- `rejected`
- `cancelled_by_user`
- `cancelled_by_provider`
- `completed`

### Server-side responsibilities
- create booking request
- confirm booking
- reject booking cu motiv
- propose reschedule
- cancel booking
- mark completed

### Invariants
- booking-ul are exact un `userId` și un `providerId`
- doar userul poate crea request inițial
- doar providerul atribuit poate confirma/reject/reschedule
- doar actorii autorizați pot anula
- tranzițiile invalide sunt blocate în tranzacție
- aceeași acțiune nu poate fi aplicată de două ori în mod inconsistent

### Edge cases obligatoriu tratate
- duplicate submit
- dublă confirmare
- dublă anulare
- reschedule după cancel
- confirmare pe provider neaprobat
- referințe rupte la user/provider/service
- scrieri concurente pe același booking

### Tests
- happy path complet
- invalid transition tests
- duplicate request with same idempotency key
- race test confirm vs cancel
- neautorizat user/provider

### Definition of done
- lifecycle-ul este modelat centralizat
- clientul nu poate seta direct statusuri sensibile
- toate acțiunile trec prin funcții sau tranzacții controlate

## Etapa 5. Payments Summary + Reviews
### Obiectiv
Separarea clară între statusul de plată și statusul booking-ului, plus review unic per booking.

### Scope
- `payments`
- summary denormalizat în `bookings.paymentSummary`
- `reviews/{bookingId}`
- agregate `ratingAverage/reviewCount` regenerate pentru `providerDirectory`

### Implementare MVP
- `createBookingRequest` creează și `payments/{paymentId}` în aceeași tranzacție cu booking-ul
- `paymentId` este determinist pentru MVP: `pay_${bookingId}`
- `updateBookingPaymentSummary` rămâne entrypoint-ul client, dar actualizează server-side atât `bookings.paymentSummary`, cât și documentul `payments/{paymentId}`
- clientul nu citește direct `payments/{paymentId}`; UI consumă doar summary-ul denormalizat din booking
- `saveBookingReview` creează sau actualizează review-ul unic din `reviews/{bookingId}`
- la fiecare write pe `reviews`, snapshot-ul public din `providerDirectory` se resincronizează pentru `ratingAverage` și `reviewCount`
- profilul public și listele de recenzii citesc `providerDirectory` pentru agregate și `reviews` pentru conținutul public

### Business rules
- review doar pentru booking completat
- exact un review per booking
- payment status nu este setat liber de client
- `payments` rămâne server-only; clientul folosește doar `bookings.paymentSummary`
- payment `paid` nu poate fi setat pe booking respins/anulat
- update-ul de payment summary este blocat pentru booking închis (`rejected`, `cancelled_*`, `completed`)
- review-ul poate fi actualizat pentru același booking, dar nu pot exista documente multiple pentru același `bookingId`

### Edge cases
- review duplicat
- booking nefinalizat cu review
- payment `paid` pe booking `rejected`
- payment `failed` pe booking `completed`

### Tests
- review create/update same booking
- duplicate review blocked
- invalid payment/booking invariants
- rules de acces pentru review și payment summary
- agregare provider reviews (`ratingAverage/reviewCount`)

### Definition of done
- review și payment au ownership și invariants clare
- booking-ul consumă doar un summary denormalizat minim, nu payload brut de procesator
- `useUserReviews`, `provider review tab`, `all reviews` și profilul public consumă surse Firebase, nu AsyncStorage sau liste hardcodate

## Etapa 6. Security Hardening + Logging + Audit
### Obiectiv
Întărirea accesului și observabilității înainte de rollout.

### Scope
- Firestore rules finale MVP
- Storage rules finale MVP
- structured logs
- audit trail pentru acțiuni sensibile
- negative tests pentru access control

### Logging standard
Pentru acțiuni sensibile și erori relevante trebuie logate:
- `uid`
- `role`
- `action`
- `resourceType`
- `resourceId`
- `statusFrom`
- `statusTo`
- `result`
- `errorCode`

Nu se loghează:
- tokenuri
- parole
- payloaduri brute de documente
- date sensibile inutile

### Audit events recomandate
- provider submit for review
- provider approve/reject/suspend
- provider availability save
- booking confirm/reject/reschedule/cancel/complete
- payment state sync
- review create

### Definition of done
- rules negative tests există
- acțiunile sensibile lasă urme clare în logs și audit trail
- nu există paths critice scriibile direct de client fără control

## Etapa 7. Admin Panel Contract + Rollout
### Obiectiv
Stabilirea contractului de date dintre backend și Next.js admin panel, plus migrare controlată din mock client.

### Scope
- definire queries și actions folosite de admin
- moderare provider
- investigare booking/payment/review issues
- rollout incremental din AsyncStorage/mock către backend real
- callables read-only pentru dashboard, listări și case details, fără colecții noi

### Admin responsibilities
- review provider documents și status
- suspend/reactivate provider
- audit booking disputes și inconsistențe
- vizibilitate pe loguri și audit events

### Contract backend pentru admin panel
- read contract expus prin callables:
  - `getAdminDashboardSummary`
  - `listAdminProviders`
  - `getAdminProviderCase`
  - `listAdminBookings`
  - `getAdminBookingCase`
  - `listAdminReviews`
  - `listAdminAuditEvents`
- roluri acceptate pentru read:
  - `admin`
  - `support`
- acțiunile de moderare rămân separate:
  - `adminReviewProvider` pentru `approve`, `reject`, `suspend`, `reinstate`
- sursele de adevăr rămân colecțiile existente:
  - `providers`
  - `providerDirectory`
  - `providers/{uid}/availability/profile`
  - `providers/{uid}/services/{serviceId}`
  - `bookings`
  - `payments`
  - `reviews`
  - `auditEvents`
- contractul admin serializează timestamp-urile în ISO strings și expune DTO-uri consumabile direct de Next.js, fără a introduce un model paralel față de document model

### Definition of done
- admin panel are document model stabil și consumabil
- mobilul și admin panel-ul folosesc aceleași enum-uri și aceleași status rules
- mesajele mobile care descriau aprobarea admin sau flow-uri mock depășite sunt aliniate cu backend-ul real acolo unde rollout-ul a fost deja închis

## Cross-cutting requirements

## Validation
- folosește validare shared server-side pentru toate payloadurile importante
- separă validators de business services
- nu accepta enum-uri libere venite din client
- verifică existența referințelor critice înainte de tranzacții

## Security
- clientul poate scrie doar documentele pe care le deține și doar câmpurile permise
- rolurile și statusurile critice se schimbă doar prin funcții sau Admin SDK
- providerul nu poate vedea date private ale altui provider
- userul nu poate citi documentele altui user

## Idempotency
Acțiunile următoare trebuie tratate idempotent:
- bootstrap session
- create booking request
- confirm booking
- cancel booking
- create review
- payment status sync

## Concurrency
Acțiunile următoare trebuie protejate cu tranzacții Firestore:
- confirm/reject/reschedule/cancel pe același booking
- create review dacă review-ul este unic per booking
- payment update dacă schimbă și booking summary

## Testing strategy
- Jest rămâne runner principal
- se adaugă cel puțin:
  - unit tests pentru validators și lifecycle logic
  - negative tests pentru transitions, duplicate actions și access denial
- pentru batch-ul curent fără Emulator Suite:
  - `unit tests` rulează local și sunt obligatorii
  - `integration tests` și `rules tests` nu sunt active implicit în npm scripts
  - validarea operațională se face pe proiectul Firebase dev prin smoke manual controlat

## Comenzi recomandate pentru faza de implementare
Acestea sunt comenzile utile pentru batch-ul curent:

```bash
npm run test:backend
npm run test:backend:unit
npm run firebase:deploy:functions
npm run firebase:deploy:rules
npm run firebase:deploy:backend
```

## Definition of done pe fiecare segment
O etapă nu este considerată gata dacă:
- nu are validări suficiente
- nu are access control clar
- nu tratează minim edge cases relevante
- nu are logging util
- nu are teste relevante și rulare clară
- nu este documentată și sincronizată cu document model schema

## Assumptions
- în MVP, un cont Firebase Auth are exact un rol de business: `user` sau `provider`
- `admin` este operat separat prin Next.js admin panel și Admin SDK
- payment processor real poate veni ulterior; deocamdată modelăm corect statusurile și ownership-ul
- chat, push și suport ticketing nu sunt în primul segment critic de fundație

## Non-goals pentru prima fază
- marketplace billing complet
- chat realtime complet
- push delivery pipeline complet
- analytics avansat sau BI
- multi-role account în același cont Auth

## Risk notes
- UI-ul actual are role switching mock; acest comportament poate intra în conflict cu ipoteza de un singur rol per cont
- provider status UI existent folosește și `draft`; backend-ul propus folosește `pre_registered` pentru faza inițială reală, deci mapping-ul trebuie clarificat la implementare
- fără Emulator Suite, rules tests și integration tests automate nu sunt acoperite implicit în acest batch
- dacă public/private provider data nu sunt separate, există risc de scurgere a datelor sensibile
- dacă booking request și booking confirmat sunt modelate ca entități diferite, crește riscul de inconsistență
- dacă review-ul nu este identificat natural prin `bookingId`, duplicatele vor fi mai greu de controlat

## Open questions înainte de cod
- același om trebuie să poată avea și cont user, și cont provider sub același e-mail?
- aprobarea providerului va fi manuală exclusiv din admin panel sau și semi-automată?
- payment status va veni dintr-un procesator extern în MVP sau rămâne manual/mock o perioadă?
- avem nevoie de soft delete pentru user/provider sau este suficient disable + tombstone în MVP?

## Recomandare de start
Ordinea recomandată pentru implementarea reală în cod este:
1. Etapa 0
2. Etapa 1
3. Etapa 2
4. Etapa 4
5. Etapa 3
6. Etapa 5
7. Etapa 6
8. Etapa 7

Motiv:
- auth, roles, bootstrap și profile ownership trebuie stabilizate înainte de bookings și admin
- bookings fără status machine și rules clare vor genera rapid datorie tehnică
- services și availability pot fi construite după ce identitatea și statusul providerului sunt deja authoritative
