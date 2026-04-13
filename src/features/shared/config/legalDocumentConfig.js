import { normalizeLocale } from '../localization';

export const legalDocumentConfig = {
  ro: {
    privacyPolicy: {
    title: 'Politica de confidențialitate',
    updatedAtLabel: 'Ultima actualizare: 9 aprilie 2026',
    intro: 'AI Nevoie folosește datele introduse în aplicație pentru a susține experiența de rezervare, comunicarea dintre utilizator și prestator și gestionarea contului tău.',
    sections: [
      {
        heading: '1. Ce date colectăm în interfața actuală',
        paragraphs: [
          'În această versiune de produs, interfața poate stoca local date precum nume, e-mail, număr de telefon, adrese salvate, detalii de rezervare, preferințe de plată și informații profesionale introduse de prestatori.',
          'Datele afișate în aplicație sunt folosite exclusiv pentru funcționarea flow-urilor vizibile și pentru pregătirea integrării backend ulterioare.',
        ],
      },
      {
        heading: '2. Cum folosim aceste date',
        paragraphs: [
          'Datele sunt folosite pentru autentificare la nivel UI, completarea profilului, programări, afișarea istoricului de servicii, rezumate de plată și personalizarea ecranelor relevante.',
          'În cazul prestatorilor, informațiile profesionale și documentele introduse sunt folosite pentru a pregăti profilul contractual și statusurile de verificare vizibile în aplicație.',
        ],
      },
      {
        heading: '3. Cine poate vedea anumite informații',
        paragraphs: [
          'Utilizatorii văd doar informațiile necesare pentru selectarea și rezervarea unui prestator, precum numele afișat, tipul de serviciu, tariful, disponibilitatea și zona de acoperire.',
          'Prestatorii văd informațiile necesare pentru gestionarea cererilor și programărilor, inclusiv datele de contact sau de adresă asociate unei rezervări.',
        ],
      },
      {
        heading: '4. Drepturile tale',
        paragraphs: [
          'Poți actualiza datele profilului din ecranele de editare disponibile în aplicație și poți solicita corectarea informațiilor introduse greșit.',
          'Pentru solicitări privind datele personale, suportul afișat în aplicație rămâne punctul de contact vizibil până la conectarea unui proces operațional complet.',
        ],
      },
    ],
    },
    termsOfUse: {
    title: 'Termeni de utilizare',
    updatedAtLabel: 'Ultima actualizare: 9 aprilie 2026',
    intro: 'Prin folosirea aplicației AI Nevoie, accepți regulile de bază pentru utilizarea contului, rezervarea serviciilor și interacțiunea cu celelalte roluri din produs.',
    sections: [
      {
        heading: '1. Utilizarea contului',
        paragraphs: [
          'Ești responsabil pentru corectitudinea informațiilor introduse în cont și pentru actualizarea lor atunci când se schimbă.',
          'Nu este permisă folosirea aplicației pentru informații false, rezervări abuzive, conținut ofensator sau încercări de a ocoli flow-urile vizibile din produs.',
        ],
      },
      {
        heading: '2. Rezervări și solicitări',
        paragraphs: [
          'Utilizatorul trebuie să introducă detalii suficiente despre serviciul dorit, iar prestatorul trebuie să răspundă la cereri într-un mod clar și coerent cu statusurile vizibile din aplicație.',
          'Informațiile despre disponibilitate, tarif și acoperire trebuie menținute cât mai corecte pentru a evita rezervări greșite sau așteptări incorecte.',
        ],
      },
      {
        heading: '3. Plăți și statusuri',
        paragraphs: [
          'Ecranele de plată și statusurile asociate au rol demonstrativ în această etapă și descriu fluxul UI pe care îl va urma integrarea reală de plată.',
          'Un status afișat în aplicație nu înlocuiește validările financiare sau contractuale care vor fi conectate ulterior în infrastructura finală.',
        ],
      },
      {
        heading: '4. Profiluri profesionale',
        paragraphs: [
          'Prestatorii trebuie să completeze corect informațiile profesionale, documentele și zona de activitate pentru ca profilul să poată fi evaluat și afișat corect în aplicație.',
          'Statusurile de verificare afișate în profil reflectă stadiul vizibil al contului în interfață și vor fi conectate ulterior la procesele administrative reale.',
        ],
      },
    ],
    },
  },
  en: {
    privacyPolicy: {
      title: 'Privacy Policy',
      updatedAtLabel: 'Last updated: April 9, 2026',
      intro: 'AI Nevoie uses the data entered in the app to support the booking experience, communication between user and provider, and account management.',
      sections: [
        {
          heading: '1. What data we collect in the current interface',
          paragraphs: [
            'In this product version, the interface can store locally data such as name, email, phone number, saved addresses, booking details, payment preferences, and professional information entered by providers.',
            'The data shown in the app is used only to support the visible flows and to prepare later backend integration.',
          ],
        },
        {
          heading: '2. How we use this data',
          paragraphs: [
            'The data is used for UI-level authentication, profile completion, bookings, service history, payment summaries, and personalization of relevant screens.',
            'For providers, the professional information and uploaded documents are used to prepare the contractual profile and the verification statuses shown in the app.',
          ],
        },
        {
          heading: '3. Who can see certain information',
          paragraphs: [
            'Users only see the information needed to select and book a provider, such as the displayed name, service type, rate, availability, and coverage area.',
            'Providers see the information needed to manage requests and bookings, including contact or address details associated with a reservation.',
          ],
        },
        {
          heading: '4. Your rights',
          paragraphs: [
            'You can update your profile data from the edit screens available in the app and ask for correction of information entered incorrectly.',
            'For personal data requests, the support entry point visible in the app remains the contact channel until a full operational process is connected.',
          ],
        },
      ],
    },
    termsOfUse: {
      title: 'Terms of Use',
      updatedAtLabel: 'Last updated: April 9, 2026',
      intro: 'By using the AI Nevoie app, you accept the ground rules for account usage, service booking, and interaction with the other roles inside the product.',
      sections: [
        {
          heading: '1. Account usage',
          paragraphs: [
            'You are responsible for the accuracy of the information entered in your account and for updating it when it changes.',
            'Using the app for false information, abusive bookings, offensive content, or attempts to bypass the visible product flows is not allowed.',
          ],
        },
        {
          heading: '2. Requests and bookings',
          paragraphs: [
            'The user must enter enough detail about the requested service, and the provider must answer requests clearly and consistently with the statuses shown in the app.',
            'Availability, rate, and coverage information should remain as accurate as possible to avoid incorrect bookings or incorrect expectations.',
          ],
        },
        {
          heading: '3. Payments and statuses',
          paragraphs: [
            'The payment screens and related statuses are demonstrative at this stage and describe the UI flow that the real payment integration will follow.',
            'A status shown in the app does not replace the financial or contractual validations that will be connected later in the final infrastructure.',
          ],
        },
        {
          heading: '4. Professional profiles',
          paragraphs: [
            'Providers must complete professional information, documents, and coverage area correctly so the profile can be reviewed and displayed properly in the app.',
            'The verification statuses shown in the profile reflect the visible account state in the interface and will later be connected to the real administrative processes.',
          ],
        },
      ],
    },
  },
};

export function getLegalDocumentConfig(documentType, locale = 'ro') {
  const normalizedLocale = normalizeLocale(locale);
  const source = legalDocumentConfig[normalizedLocale] || legalDocumentConfig.ro;
  return source[documentType] || source.privacyPolicy;
}
