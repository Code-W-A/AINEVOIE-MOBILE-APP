Am continuat analiza full-stack și acum am suficient context ca să formulez un raport complet. Mai jos este lista bugurilor și zonelor cu risc identificate în interacțiunea front-end ↔ back-end, grupate pe severitate. Nu am modificat nimic (e doar analiză).

## 🔴 Critice (blockere pentru preview dacă fluxul e atins)

### 1. Plata rămâne blocată „în curs” pentru card
- Flow: `src/features/user/routes/paymentMethod/paymentMethodScreen.js` → apelează `createBooking` / `updateBookingPayment` cu `status: "in_progress"` → `src/firebase/bookings.js` → `updateBookingPaymentSummary` (callable) → `functions/src/bookings.ts` (`updateBookingPaymentSummaryService`) salvează statusul primit, fără gateway real.
- `src/features/user/routes/paymentStatus/paymentStatusScreen.js` așteaptă ca `booking.payment.status` să treacă la `paid` / `failed`, dar nimic (nici client, nici backend) nu face această tranziție. Rezultatul: ecranul de confirmare afișează la nesfârșit „Procesăm plata”.
- Recomandare: până apare integrarea reală, backend-ul ar trebui să forțeze `paid` imediat pentru metoda „card” (mock) sau clientul să seteze `paid` după validarea datelor de card. Fără o minimă simulare, fluxul preview este nefuncțional.

### 2. `ratePerHour` – împărțire posibilă la 0 / `NaN`
- `src/features/user/routes/checkout/checkoutScreen.js` linia ~330:
```328:332:src/features/user/routes/checkout/checkoutScreen.js
ratePerHour: String(parseNumber(draft.price?.amount ?? 0) / (parseNumber(draft.price?.estimatedHours ?? normalizeEstimatedHours(draft.requestDetails?.estimatedHours)) || normalizeEstimatedHours(draft.requestDetails?.estimatedHours))),
```
- Dacă ambele valori (`price.estimatedHours` și `requestDetails.estimatedHours`) revin `0` sau invalid, numitorul e `0` → `Infinity`/`NaN`. Apoi acest string ajunge în `createBooking` → `functions/src/bookings.ts` care validează `price.amount` ca fiind finit, dar `ratePerHour` ajunge stocat ca `"Infinity"` / `"NaN"`. Recomandare: guard explicit (`ratePerHour = hours > 0 ? amount / hours : 0`).

### 3. Erorile de la `createBooking` / `updateBookingPaymentSummary` sunt înghițite silențios
- `paymentMethodScreen.handleContinue` și `checkoutScreen.handlePayPress` nu apelează `createBooking().catch` și nu afișează un `Alert` spre utilizator. Orice `HttpsError` (ex: `failed-precondition` din `ensureSlotFitsAvailability`, sau validare rată/ore invalidă) închide `isSubmitting` fără feedback → userul vede doar blocarea la „Procesăm plata”.
- Backend-ul `createBookingRequestService` aruncă explicit `badRequest` / `failedPrecondition` / `permissionDenied`, deci trebuie tratate pe client.

## 🟠 Majore (pot compromite preview-ul)

### 4. Interogări bookings nu folosesc indexurile compuse
- `firestore.indexes.json` definește `userId+status+scheduledStartAt` și `providerId+status+scheduledStartAt`, dar `fetchUserBookings` și `fetchProviderBookings` din `src/firebase/bookings.js` fac `where(userId, ==)` / `where(providerId, ==)` fără `orderBy('scheduledStartAt')` sau filtru pe `status`.
- Firestore va permite query-ul simplu, dar când colecția crește devii plătitor de multă muncă inutilă. În plus, orice upgrade la `orderBy` (recomandat pentru UX pe listele de programări) va cere build nou de index. Recomandare: adaugă `orderBy('scheduledStartAt', 'desc')` + sortare corespunzătoare și publică indexul.

### 5. `providers/{uid}/availability/profile` este citibil public
- Regula în `firestore.rules` permite `allow read: if docId == 'profile'`. Documentul conține `blockedDates` cu note opționale scrise de provider („concediu”, „training”, etc.) și programul săptămânal complet.
- `useProviderAvailability` citește direct din Firestore (fără callable), deci orice user anonim poate accesa notele personale ale providerului. Dacă nota e considerată privată, trebuie să expui doar un rezumat (ex: câmpul `availabilitySummary` deja snapshotat în `providerDirectory/{uid}`) sau să muți notele într-un subdocument separat protejat.

### 6. Validare expirare card incompletă
- `paymentMethodScreen.isValidExpiry` verifică doar `month ∈ [1..12]` și `year >= 0`, nu și dacă cardul este deja expirat. În preview se pot introduce `01/20` și plata „trece”. Recomandare: compară cu `new Date()` (ultima zi a lunii selectate).

### 7. Politică signup email clarificată
- Email verification nu mai este cerință de produs în MVP: signup-ul cu email/parolă creează contul fără gating pe `email_verified`. Dacă apare un email de signup ulterior, acesta trebuie să fie welcome email server-side, nu link de verificare Firebase Auth.

### 8. `reviews` publice fără filtru de stare
- `firestore.rules` permite `reviews: allow read: if true`. În backend, `saveBookingReviewService` setează `status = 'published'`, dar dacă în viitor apare `pending`/`rejected`, orice client le va primi. `src/firebase/reviews.js` și `useProviderReviews` nu filtrează pe `status == 'published'`. Adaugă filtrul defensiv pe client și eventual în regulă.

### 9. `SharedRoleProfileScreen` apelează simultan toate hook-urile user + provider
- În `src/features/shared/screens/SharedRoleProfileScreen.js` (linia 70-78) se invocă întotdeauna `useProviderOnboarding`, `useProviderAvailability`, `useProviderServices`, `useProviderBookings`, `useProviderReviews`, `useUserBookings`, `useUserProfile`, `useUserReviews`, `useProfileAvatar(normalizedRole)`.
- Fiecare hook rulează `setIsLoading(true)` la mount și are propriul `useFocusEffect`, ceea ce declanșează re-render-uri suplimentare și posibil request-uri paralele chiar dacă `canUseRemote` e `false` pe ramura inactivă. Nu crapă, dar cade inutil prin render cycle-ul de profil. Condiționează apelul în funcție de `normalizedRole`.

## 🟡 Medii (de remediat înainte de producție)

### 10. Ras de condiționări la hydrare în `SessionProvider`
- `context/sessionContext.js` (liniile 155-168): `persistSession` citește `nextSessionState` dintr-un closure local, dar scrie în `AsyncStorage` după ce `setSession` a fost invocat. Dacă două apeluri `persistSession` concurente ruleaza, scrierile în storage pot ajunge „out of order”. Folosește o coadă / `useRef` cu ultimul state sau serializează cu un `mutex` pe async write.
- La liniile 260-268, `hydrateSession` setează temporar `isHydrated: false` și se bazează pe `onAuthStateChanged` să o readucă la `true`. Pe `Firebase` corect configurat listener-ul întotdeauna emite o dată, dar în caz de network instability / restart de token, `RouteGuard` vede `isHydrated = false` și rămâne pe splash la nesfârșit.

### 11. `checkoutScreen` apel `navigate('paymentStatus')` fără verificare că bookingul există
- După `await createBooking(...)`, ecranul navighează imediat la `paymentStatus` cu `bookingId`. Dar `useUserBookings` se actualizează pe `focus` – în navigarea imediată `getBookingById` poate returna `null`, iar `paymentStatusScreen` intră într-un loading perpetuu. `useUserBookings` ar trebui reîncărcat forțat după creare, sau `paymentStatusScreen` să facă fallback direct la `getDoc(bookings/{id})`.

### 12. `SharedChatListScreen` – semantică inversată
- Proprietatea `isReadable` e folosită ca „is unread” (setată la `false` când apeși „marchează toate ca citite”). Nu este bug funcțional, dar induce în eroare pe oricine modifică codul și rămâne un potențial regres.

### 13. `useProviderPublicProfile` – state inițial `isLoading = true` chiar fără `providerId`
- Când screen-ul e montat fără `providerId` (edge case pe deep link invalid), hook-ul face `setIsLoading(false)` doar în branch-ul guard. Foarte minor, dar poate face ca UI-ul să arate un spinner scurt fără motiv.

### 14. `professionalServicesScreen` – categoriile fallback pot fi goale
- Când `provider.serviceSummaries` e gol, utilizează `[{ categoryKey: provider.categoryPrimary, categoryLabel: provider.categoryPrimary }]`. Dacă providerul nu are nici `categoryPrimary` (profil incomplet publicat greșit), categoria rezultată e `undefined` și filtrul `category?.key` o elimină – OK, dar pentru tracked users cu providerDirectory inconsistent, vor vedea lista goală fără mesaj explicit.

### 15. Apeluri callable fără `configError` check pe client
- `src/firebase/bookings.js` apelează `httpsCallable(functions, 'createBookingRequest')` fără să verifice `isFirebaseConfigured()`. Dacă `.env` pierde o cheie, eroarea returnată este generică (`Firebase: Error (functions/internal).`) în loc de mesajul localizat din `getFirebaseConfigError`. Wrap-uri de genul `authHelpers` sau `providerAvailability` o fac – consistență necesară.

### 16. `createBookingRequestService` – `fetchProviderAvailabilityProfile` în afara tranzacției
- În `functions/src/bookings.ts`, dacă snapshot-ul de availability nu există, se citește în afara `runTransaction`. E acceptabil pentru date considerate „public/idempotente”, dar dacă providerul își actualizează programul simultan cu o cerere, clientul primește un snapshot pre-update. Mută read-ul în interiorul tranzacției pentru consistență strictă.

## 🟢 Minore (polish sau tech debt)

### 17. Triggere `onProviderAvailabilityWrite` / `onProviderServiceWrite` citesc mereu documentul provider
- Pentru fiecare scriere de serviciu / disponibilitate se face `providers/{uid}.get()` + `syncProviderDirectorySnapshot`. Dacă providerul salvează 5 servicii la rând, se rescrie providerDirectory de 5 ori. Consider debouncing sau coalescing (debounced scheduler pe Pub/Sub) dacă volumul crește.

### 18. `reviews` → recompute global al mediei
- `onReviewWrite` apelează `syncProviderDirectoryFromProviderRef` care probabil re-calculează media prin `fetchProviderReviewAggregate` (scanarea tuturor recenziilor). La 10k recenzii devine scump. Stochează agregatul incremental.

### 19. `paymentStatusScreen` – mesaj hard-coded „Clean Lux”
- `shared.js` (ex: `notifications.user.bookingConfirmed`) conține texte cu numele unui provider fictiv („Clean Lux”). Inofensiv pentru demo, dar dacă textul apare public ar fi stâlcit brandingul.

### 20. Lipsă `orderBy` pe query-uri de provider bookings
- Provider bookings list e afișat ordonat pe client, nu pe server. La scală (100+ rezervări) e vizibil. Combină cu fix #4.

### 21. Lipsă TODO tracker pentru mock-uri / feature flags
- `WalletScreen`, `FavoriteScreen`, `SharedNotificationsScreen`, `SharedMessageScreen` se bazează pe string-uri „Indisponibil în MVP”. Până la preview ar fi util un flag unic `FEATURES.wallet = false` ca să le poți activa/dezactiva din config fără să mai umbli prin mai multe ecrane.

---

### Recomandare pentru preview
Înainte de submit-ul preview, aș bloca cel puțin #1, #2, #3, #5, #6 – fluxul de booking + plată trebuie să ajungă la o stare finală stabilă. Pentru restul bugurilor (4, 7-20), poți deschide tickete urmăritoare.

Pot intra punctual pe oricare dintre aceste puncte (implementare fix concret, test, etc.) dacă vrei să prioritizăm reparațiile înainte de preview. Spune-mi cu care începem.
