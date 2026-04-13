# AInevoie UI Audit Task List

## Scop
Acest document transformă auditul UI/front-end într-un backlog concret de implementare pentru AInevoie.

Scopul este strict:
- front-end / UI / mock flows;
- fără backend real în această etapă;
- fără schimbare de produs sau inventare de feature-uri în afara cerințelor deja extrase;
- pregătirea aplicației pentru integrare backend ulterioară.

## Regulă De Design Obligatorie
Toate taskurile de mai jos trebuie implementate în același sistem de design descris în [AInevoie-Design-System-Guide.md](/Users/code-with-a/Dev/AINEVOIE-CODECANYON/COMPLET%20APP/AI%20NEVOIE%20APP/docs/AInevoie-Design-System-Guide.md).

Asta înseamnă:
- light-only shell;
- business / premium / semi-minimal visual language;
- accent unificat AInevoie, fără palete noi arbitrare;
- suprafețe curate, aerisite, fără look de template generic;
- ierarhie clară prin spacing, tipografie și density calmă;
- user și provider trebuie să pară parte din același produs, nu două template-uri diferite;
- orice ecran nou trebuie să continue direcția deja folosită în zonele modernizate din aplicație.

## Snapshot Coverage Estimat
- User: 52%
- Provider: 33%
- Admin: 0%

## Ce Înseamnă P0 / P1 / P2
- P0 (Critic): fără aceste ecrane/flow-uri, produsul nu poate respecta contractul sau nu poate susține integrarea backend fără refaceri mari; blochează lansarea.
- P1 (Important): necesar pentru un marketplace coerent și “complete feeling”, dar nu blochează demo-ul principal; reduce riscul de refactor ulterior.
- P2 (Nice to have): polish și readiness; îmbunătățește produsul, dar poate fi amânat fără a rupe cerințele de bază.

## Ce Există Deja Și Poate Fi Păstrat Ca Bază
- separare clară user/provider la nivel de navigație;
- flow de booking user de bază;
- inbox + conversation screen pentru ambele roluri;
- reviews UI pentru user și provider;
- notificări mock;
- flow de locație user cu GPS + manual;
- all bookings / requests / booking detail pentru provider;
- support și legal screens;
- profiluri de bază pentru user și provider.

## P0 Critic

### 1. Payments UI Pentru User
- checkout screen complet;
- formular card details;
- opțiuni Apple Pay și Google Pay la nivel UI;
- confirmare plată;
- status tranzacție;
- stări paid / unpaid / in progress la nivel de booking și payment summary.

### 2. Provider Onboarding Profesional
- signup provider în pași dedicați;
- upload / prezentare documente de validare;
- informații profesionale clare;
- diferențiere reală față de signup user;
- flow compatibil cu aprobare ulterioară din admin.

### 3. Provider Profile Contractual
- descriere servicii oferite;
- tarife;
- disponibilitate;
- zonă de acoperire;
- structură UI pregătită pentru date reale, nu doar text static.

### 4. Provider Service Management
- ecran listă servicii;
- adăugare serviciu;
- editare serviciu;
- ștergere serviciu;
- formulare și stări empty/error/success.

### 5. Provider Availability Calendar
- setare zile disponibile;
- setare intervale orare disponibile;
- UI clar pentru disponibilitate săptămânală;
- structură compatibilă cu booking engine ulterior.

### 6. Provider Request / Booking Decisions
- confirmare programare;
- respingere programare;
- amânare / reschedule;
- statusuri consistente în listă și detaliu;
- refacerea ecranelor încă dependente de template vechi.

### 7. Curățare Template Dependence Pe Fluxurile Critice
- eliminarea ecranelor vechi care nu respectă design system-ul;
- unificare naming și copy;
- eliminarea conținutului generic / placeholder / english leftovers din zone critice;
- alinierea tuturor ecranelor importante la identitatea AInevoie.

### 8. Admin Web Shell
- structură admin web separată;
- layout desktop-first;
- bază responsive compatibilă PWA;
- navigație pentru modulele contractuale admin.

## P1 Important

### 1. Advanced Search Pentru User
- filtrare coerentă pe categorie;
- filtrare pe locație;
- filtrare pe evaluări furnizori;
- rezultate de căutare cu state clare;
- experiență de search/filter unificată și mai puțin fragmentată.


-------CONTINUAM DE AICI IN JOS----------

### 2. Service Request Form Pentru User
- formular dedicat pentru solicitare serviciu;
- descriere cerere;
- timp dorit pentru prestare;
- poziționare clară în flow înainte de confirmarea booking-ului unde este relevant.

### 3. User Profile Completion
- istoric servicii mai clar;
- evaluările lăsate de utilizator;
- secțiuni de profil mai utile decât simple date de identitate;
- compatibilitate cu data model backend.

### 4. Provider Profile Completion
- feedback primit;
- overview profesional mai clar;
- elemente de business credibility;
- UI pentru statusuri de validare și activitate.

### 5. Unified Status System
- pending;
- approved;
- rejected;
- paid;
- unpaid;
- upcoming;
- in progress;
- completed;
- cancelled;
- prezentare coerentă în booking-uri, requests, plăți, notificări și istoric.

### 6. OTP / 2FA Flow Real La Nivel UI
- integrare reală în auth flow sau refactor complet al mock-ului actual;
- clarificare a stărilor de verificare;
- UX fără ecrane orfane sau redirecționări artificiale.

## P2 Nice To Have

### 1. Notification Preferences
- ecran de preferințe notificări;
- permisiuni și categorii de notificări;
- pregătire pentru push notifications reale.

### 2. Review Management Extins
- listă cu review-urile lăsate de user;
- gestionare feedback pentru provider;
- mai mult context în jurul evaluărilor.

### 3. Consistență Globală Pentru UI States
- loading states dedicate;
- empty states dedicate;
- error states dedicate;
- success feedback consistent;
- skeleton / placeholder states unde ajută scanarea.

### 4. Curățare Legacy Routes Și Naming
- simplificare wrappere/rute vechi;
- eliminare naming generic rămas din template;
- structură mai clară pentru mentenanță și backend handoff.

## Module Admin Care Lipsesc Complet
Acestea trebuie considerate backlog separat, dar critic pentru acoperirea contractului.

### Admin Utilizatori
- listă utilizatori;
- căutare;
- filtrare;
- activare / dezactivare conturi.

### Admin Furnizori
- verificare date;
- aprobare / respingere;
- status;
- gestionare profiluri.

### Admin Servicii Și Categorii
- adăugare;
- editare;
- ștergere;
- gestionare structură catalog.

### Admin Cereri Și Programări
- vizualizare;
- status;
- monitorizare solicitări.

### Admin Feedback
- vizualizare;
- moderare, dacă este necesar.

### Admin Stats
- număr utilizatori;
- furnizori activi;
- solicitări;
- programări.

### Admin Export
- export tabelar / structură similară.

### Admin Pricing
- setare / modificare tarife;
- preț fix sau interval minim-maxim.

## Elemente Ambigue Sau Implicit Necesare

### Chat / Mesaje
- contractual explicit: mesajele există ca zonă de produs;
- implicit necesar: inbox list + conversation screen trebuie păstrate și mature;
- recomandat ulterior: atașamente, typing, arhivare, block, delete persistent, search mai avansat.

### Push Notifications
- momentan există mai degrabă inbox mock;
- lipsesc stările și setările specifice pentru permisiuni și canale.

## Checklist De State UI Obligatorii
Pentru fiecare modul important trebuie verificate și completate următoarele stări:
- loading
- empty
- success
- error
- pending
- approved
- rejected
- paid
- unpaid
- in progress
- upcoming
- completed

## Reguli De Execuție Pentru Toate Taskurile
- fără backend real în etapa curentă;
- fiecare ecran nou trebuie să fie pregătit pentru integrare de date reale;
- fără a introduce UI generic de template;
- fără inconsistențe între user și provider;
- fără dark hero patterns sau stil vechi UrbanHome;
- fără card-in-card inutil și fără supraîncărcare vizuală;
- focus pe business clarity, scanability și premium calm spacing.

## Ordinea Recomandată De Execuție
1. P0 fluxuri lipsă critice user/provider.
2. P0 admin shell.
3. P1 search, service request, profile completion, status system.
4. P2 polish, settings, cleanup, extra readiness.

## Livrabil Așteptat Pentru Etapa Următoare
Un backlog de implementare UI care:
- completează acoperirea contractuală;
- reduce dependența de template;
- păstrează aplicația coerentă vizual;
- permite conectarea backend-ului fără rescriere majoră a front-end-ului.
