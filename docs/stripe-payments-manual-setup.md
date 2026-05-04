# Stripe Payments v1 - configurare manuala

Acesti pasi trebuie facuti inainte ca platile reale sa functioneze in aplicatia mobila AI Nevoie.

## 0. Mod demo fara Stripe pentru testarea clientului

Pentru ca un client sa poata testa fluxul complet fara chei Stripe, activeaza modul demo in ambele locuri:

```text
EXPO_PUBLIC_PAYMENT_DEMO_MODE=true
PAYMENT_DEMO_MODE=true
```

`EXPO_PUBLIC_PAYMENT_DEMO_MODE` controleaza UI-ul din Expo. `PAYMENT_DEMO_MODE` controleaza Firebase Functions si este obligatoriu pentru securitate: fara el, clientul nu poate marca plati ca reusite.

Setare Firebase Functions pentru deploy cu Firebase params:

```bash
PAYMENT_DEMO_MODE=true firebase deploy --only functions
```

Local, poti pune `PAYMENT_DEMO_MODE=true` in fisierul `.env` folosit de Functions/emulator.

In demo mode:

1. Clientul apasa `Plateste`.
2. Nu se deschide Stripe PaymentSheet.
3. Callable-ul `completeDemoPayment` valideaza booking-ul confirmat si userul autentificat.
4. `bookings/{bookingId}.paymentSummary.status` devine `paid`.
5. `payments/{paymentId}` primeste `processor: "demo"` si `method: "demo"`.
6. Adminul vede programarea ca platita, dar poate identifica plata ca demo.

Pentru plati reale, seteaza:

```text
EXPO_PUBLIC_PAYMENT_DEMO_MODE=false
PAYMENT_DEMO_MODE=false
```

## 1. Stripe Dashboard

1. Creeaza sau foloseste contul Stripe al platformei AI Nevoie.
2. Verifica business country: Romania.
3. Activeaza metodele de plata dorite in Stripe Dashboard:
   - Card
   - Apple Pay
   - Google Pay
4. Copiaza cheia publishable:
   - `pk_test_...` pentru test
   - `pk_live_...` pentru productie
5. Copiaza cheia secret:
   - `sk_test_...` pentru test
   - `sk_live_...` pentru productie

## 2. Firebase Functions secrets

Seteaza secretele in proiectul Firebase folosit de aplicatie:

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

Pentru `STRIPE_SECRET_KEY`, introdu cheia `sk_test_...` sau `sk_live_...`.

Pentru `STRIPE_WEBHOOK_SECRET`, asteapta pana creezi webhook-ul la pasul 3, apoi revino si seteaza valoarea `whsec_...`.

## 3. Stripe webhook

In Stripe Dashboard, creeaza un webhook endpoint catre:

```text
https://europe-west1-<firebase-project-id>.cloudfunctions.net/stripeWebhook
```

Pentru proiectul curent, forma probabila este:

```text
https://europe-west1-ainevoie-ca861.cloudfunctions.net/stripeWebhook
```

Selecteaza evenimentele:

```text
payment_intent.succeeded
payment_intent.payment_failed
payment_intent.canceled
```

Dupa creare, copiaza `Signing secret` (`whsec_...`) si seteaza:

```bash
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

## 4. Expo/EAS environment variables

Seteaza variabilele publice pentru aplicatia mobila:

```text
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER=merchant.com.ainevoie.nrb
```

Pentru local, le poti adauga in `.env`.

Pentru EAS, seteaza-le in EAS Secrets sau in mediul de build folosit:

```bash
eas secret:create --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value pk_test_...
eas secret:create --name EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER --value merchant.com.ainevoie.nrb
```

## 5. Apple Pay

Apple Pay nu functioneaza in Expo Go. Ai nevoie de EAS development build sau production build.

Configurare manuala:

1. In Apple Developer, creeaza Merchant ID:

```text
merchant.com.ainevoie.nrb
```

2. In Stripe Dashboard, mergi la Apple Pay settings si adauga aplicatia iOS.
3. Genereaza certificatul Apple Pay conform pasilor Stripe.
4. Verifica faptul ca `app.json` contine pluginul Stripe cu acelasi merchant ID.
5. Ruleaza un build iOS nou dupa configurare.

## 6. Google Pay

Google Pay nu functioneaza in Expo Go. Ai nevoie de EAS development build sau production build pe un dispozitiv Android fizic.

Configurare manuala:

1. Verifica in Stripe Dashboard ca Google Pay este activ.
2. Verifica faptul ca `app.json` are:

```json
[
  "@stripe/stripe-react-native",
  {
    "merchantIdentifier": "merchant.com.ainevoie.nrb",
    "enableGooglePay": true
  }
]
```

3. Ruleaza un build Android nou dupa configurare.
4. In test mode, Google Pay trebuie testat pe dispozitiv fizic cu wallet compatibil.

## 7. Deploy backend

Dupa setarea secretelor, build si deploy pentru Functions:

```bash
npm --prefix functions run build
firebase deploy --only functions
```

Daca deploy-ul este rulat din folderul `expo-mobile-app`, poti folosi:

```bash
npm run firebase:deploy:functions
```

## 8. Test flow

Fluxul asteptat:

1. Clientul trimite cererea de booking.
2. Booking-ul apare cu plata `unpaid`.
3. Prestatorul confirma booking-ul.
4. Clientul apasa `Plateste acum`.
5. Stripe PaymentSheet se deschide.
6. Dupa plata, Stripe trimite webhook.
7. `bookings/{bookingId}.paymentSummary.status` devine `paid`.
8. `payments/{paymentId}` se actualizeaza cu `processor: "stripe"` si `stripePaymentIntentId`.
9. Adminul vede plata in `/admin/programari` si detaliile in `/admin/programari/[id]`.

## 9. Test cards Stripe

In test mode:

```text
Card succes: 4242 4242 4242 4242
Card esec: 4000 0000 0000 9995
Data expirare: orice data viitoare
CVC: orice 3 cifre
```

## 10. Checklist productie

Inainte de live:

1. Schimba cheile `pk_test_...` / `sk_test_...` cu `pk_live_...` / `sk_live_...`.
2. Creeaza webhook live separat in Stripe Dashboard.
3. Seteaza `STRIPE_WEBHOOK_SECRET` live.
4. Ruleaza deploy Functions.
5. Ruleaza build iOS si Android nou.
6. Testeaza plata reala cu suma mica.
7. Verifica in admin:
   - booking confirmat
   - payment `paid`
   - `stripePaymentIntentId`
   - audit event `payment.stripe_webhook`
