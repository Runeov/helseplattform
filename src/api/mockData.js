// Centralized mock personas and helpers for demo authentication and data flows
// This is frontend-only mock data; no backend or infrastructure impact.

// Employer persona: Anne Avdelingsleder
export const anneEmployer = {
  id: 'anne-dept-manager',
  type: 'employer',
  username: 'anne_avdelingsleder', // Username for platform
  name: 'Anne Avdelingsleder', // Real name from ID-porten (displayed)
  role: 'department_manager',
  email: 'anne@gran.kommune.no',
  personalNumber: '15067512345', // Mock fødselsnummer
  municipality: {
    id: 'gran',
    name: 'Gran kommune',
  },
  department: {
    id: 'sykehjem-avd-2',
    name: 'Sykehjemmet avd. 2',
  },
  // Kostnadssted er viktig for fakturering
  costCenter: 'GRAN-SYK-AVD2-001',
  // Enkle rettigheter for å demonstrere tilgangsstyring i UI
  permissions: ['create_shift'],
};

// Worker persona: Thomas Sykepleier
export const thomasWorker = {
  id: 'thomas-nurse',
  type: 'worker',
  username: 'thomas_sykepleier', // Username for platform
  name: 'Thomas Sykepleier', // Real name from ID-porten (displayed)
  role: 'nurse',
  email: 'thomas@helsepersonell.no',
  personalNumber: '12088512345', // Mock fødselsnummer
  // Helsepersonellregister-nummer (mock, 7-sifret)
  hprNumber: '1234567',
  // Autorisasjonstype i henhold til norsk lovverk
  authorization: 'Sykepleier',
  // Enkel tilgjengelighetsstatus
  status: 'available', // 'available' | 'busy'
  // Lønnskrav (timepris) som skal være synlig i UI
  hourlyRate: 450,
  currency: 'NOK',
  // Hvor han kan jobbe
  locations: [
    {
      municipalityId: 'gran',
      municipalityName: 'Gran kommune',
      radiusKm: 20,
      primary: true,
    },
  ],
};

// Samling av alle demo-brukere (kan brukes til å lage en enkel bruker-velger senere)
export const DEMO_USERS = [anneEmployer, thomasWorker];

// Enkel "session" for gjeldende demo-bruker med localStorage persistence
// Default er Anne som avdelingsleder (kunde-siden).
const STORAGE_KEY = 'helseplattform_current_user_id';

function getStoredUserId() {
  try {
    return localStorage.getItem(STORAGE_KEY) || anneEmployer.id;
  } catch (e) {
    return anneEmployer.id;
  }
}

function storeUserId(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch (e) {
    console.warn('[mockData] Could not store user ID in localStorage');
  }
}

export function getAllUsers() {
  return DEMO_USERS;
}

export function getUserById(id) {
  return DEMO_USERS.find((user) => user.id === id) || null;
}

export function getCurrentUser() {
  const currentUserId = getStoredUserId();
  return getUserById(currentUserId) || anneEmployer;
}

export function setCurrentUser(id) {
  const user = getUserById(id);

  if (!user) {
    // I dev-miljø logger vi en advarsel for å fange feil id-er tidlig
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
      console.warn('[mockData] Ukjent demo-bruker id:', id);
    }
    return;
  }

  storeUserId(id);
  console.log('[mockData] Switched to user:', user.name);
}