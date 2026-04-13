# AInevoie UI Roadmap Pe Sprinturi (Mock Flows Only)

Acest roadmap este pentru implementare UI/front-end cu mock data și logică minimă, fără backend real.
Toate ecranele trebuie implementate conform [AInevoie-Design-System-Guide.md](/Users/code-with-a/Dev/AINEVOIE-CODECANYON/COMPLET%20APP/AI%20NEVOIE%20APP/docs/AInevoie-Design-System-Guide.md).

## Presupuneri
- Sprint = 2 săptămâni (poate fi ajustat).
- Nu se schimbă produsul; se completează cerințele contractuale la nivel de UI și stări.
- Mock-urile trebuie structurate astfel încât integrarea backend să nu forțeze rescrierea ecranelor.

## Definition Of Done (Pentru Orice Sprint)
- ecranele sunt coerente cu sistemul de design AInevoie (light-only, premium/business, spacing calm);
- există stări clare: loading, empty, error, success și statusuri specifice zonei;
- navigarea este completă (rute, back, deep links interne unde e cazul);
- formularele au validare UI și mesaje de eroare utilizabile;
- componentele sunt reutilizabile unde are sens, fără a crea “mega-components”.

## Sprint 1 Foundations (Stabilizare + Template Cleanup Pe Zone Critice)
- unificare naming/copy pentru ecranele critice (fără engleză/placeholder în zonele importante);
- definire și aplicare consistență pentru UI states în liste și detalii (booking/request/notifications);
- curățare ecrane vechi/legacy dependente de template în fluxurile provider (request/detail etc.);
- checklist de statusuri (pending/approved/rejected/paid/unpaid/in-progress/upcoming/completed/cancelled) și unde apar în UI, chiar dacă sunt mock.

## Sprint 2 Payments UI (User) End-to-End (Mock)
- flow de checkout: sumar serviciu, adresă, data/ora, costuri;
- card details form (UI complet + validări);
- opțiuni Apple Pay / Google Pay ca entry points UI;
- confirmare plată + status tranzacție (success/fail/pending) pe booking detail și în istoric;
- sistem UI pentru “paid/unpaid/in progress” pe rezervări.

## Sprint 3 Provider Onboarding Profesional (Mock) + Profile Skeleton
- signup provider în pași: date cont -> documente -> servicii -> tarife -> zonă acoperire -> disponibilitate (structură UI);
- upload/preview documente (mock storage) + status “în verificare/aprobat/respins” în UI;
- provider profile: secțiuni contractuale (servicii, tarife, disponibilitate, acoperire) cu stări empty/error și CTA-uri clare.

## Sprint 4 Provider Service Management (CRUD UI, Mock)
- listă servicii provider;
- adăugare serviciu (formular);
- editare serviciu (formular);
- ștergere serviciu (confirm dialog);
- integrare în provider profile și în flow-ul user de “servicii oferite”.

## Sprint 5 Provider Availability Calendar (UI, Mock)
- setare zile disponibile (week view);
- setare intervale orare disponibile (time ranges);
- reguli UX pentru suprapuneri, conflict, validare;
- afișare disponibilitate în profil provider (read-only) și pregătire pentru booking engine.

## Sprint 6 Provider Requests + Booking Decisions (Mock)
- confirmare / respingere / amânare programare (flow UI complet);
- statusuri consistente în listă, detaliu și notificări;
- actualizări vizuale în all bookings (inclusiv calendar view) pentru statusuri;
- empty/loading/error states pe requests și booking details.

## Sprint 7 User Advanced Search + Service Request Form (Mock)
- advanced search unificat: categorie + locație + rating provider, cu rezultate coerente;
- service request form (descriere + timp dorit), poziționat clar în flow înainte de rezervare unde e relevant;
- conectare UX între search -> provider list -> provider detail -> request/booking.

## Sprint 8 Profiles + Security UI (Mock)
- user profile: istoric servicii + review-urile lăsate (listă dedicată);
- provider profile: feedback received și management minim (filtre/scanability);
- OTP/2FA: integrare coerentă în auth flow la nivel UI (fără ecrane orfane).

## Sprint 9 Admin Web Shell + Module Scaffolding (Mock)
- shell admin web desktop-first + responsive/PWA-ready layout;
- tabele/list views pentru: users, providers, services/categories, requests/bookings, reviews;
- căutare/filtrare UI + activate/deactivate + approve/reject (mock);
- stats overview (mock) + export UI (mock) + pricing management UI (mock).

## Note De Planificare
- Dacă admin web trebuie livrat mai devreme contractual, Sprint 9 poate fi tras în paralel cu Sprint 3-6 ca “track” separat.
- Dacă durata sprintului e mai mică (1 săptămână), se sparg sprinturile 2-6 în sub-livrabile pe ecrane.
