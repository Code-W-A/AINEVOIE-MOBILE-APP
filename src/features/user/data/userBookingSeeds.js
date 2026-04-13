import { DEFAULT_MOCK_CURRENCY } from '../../shared/utils/mockFormatting';

export const USER_BOOKING_STATUSES = {
  upcoming: 'upcoming',
  completed: 'completed',
  cancelled: 'cancelled',
};

export const USER_PAYMENT_STATUSES = {
  paid: 'paid',
  unpaid: 'unpaid',
  in_progress: 'in_progress',
  failed: 'failed',
};

export const USER_PAYMENT_METHODS = {
  card: 'card',
  apple_pay: 'apple_pay',
  google_pay: 'google_pay',
};

const seedUpcoming = [
  {
    id: 'seed_upcoming_1',
    dateLabel: '15 martie 2021',
    timeLabel: '10:00 AM',
    providerName: 'Clean Lux',
    providerRole: 'Specialist curățenie',
    serviceName: 'Curățenie locuință',
    address: 'București',
    price: { amount: 30, currency: DEFAULT_MOCK_CURRENCY, unit: 'oră', estimatedHours: 2 },
    bookingStatus: USER_BOOKING_STATUSES.upcoming,
    payment: {
      status: USER_PAYMENT_STATUSES.unpaid,
      method: USER_PAYMENT_METHODS.card,
      updatedAt: '2021-03-15T07:00:00.000Z',
    },
  },
  {
    id: 'seed_upcoming_2',
    dateLabel: '21 martie 2021',
    timeLabel: '12:00 PM',
    providerName: 'Linnea Hayden',
    providerRole: 'Specialist curățenie',
    serviceName: 'Curățenie locuință',
    address: 'București',
    price: { amount: 32, currency: DEFAULT_MOCK_CURRENCY, unit: 'oră', estimatedHours: 2 },
    bookingStatus: USER_BOOKING_STATUSES.upcoming,
    payment: {
      status: USER_PAYMENT_STATUSES.paid,
      method: USER_PAYMENT_METHODS.apple_pay,
      transactionId: 'TX-DEMO-92133',
      updatedAt: '2021-03-15T07:05:00.000Z',
    },
  },
  {
    id: 'seed_upcoming_3',
    dateLabel: '25 martie 2021',
    timeLabel: '04:00 PM',
    providerName: 'John Smith',
    providerRole: 'Instalator',
    serviceName: 'Instalații',
    address: 'București',
    price: { amount: 40, currency: DEFAULT_MOCK_CURRENCY, unit: 'oră', estimatedHours: 2 },
    bookingStatus: USER_BOOKING_STATUSES.upcoming,
    payment: {
      status: USER_PAYMENT_STATUSES.in_progress,
      method: USER_PAYMENT_METHODS.google_pay,
      transactionId: 'TX-DEMO-92134',
      updatedAt: '2021-03-15T07:07:00.000Z',
    },
  },
];

const seedPast = [
  {
    id: 'seed_past_1',
    dateLabel: '18 martie 2021',
    timeLabel: '12:00 PM',
    providerName: 'Amara Smith',
    providerRole: 'Specialist curățenie',
    serviceName: 'Curățenie locuință',
    address: 'București',
    price: { amount: 32, currency: DEFAULT_MOCK_CURRENCY, unit: 'oră', estimatedHours: 2 },
    bookingStatus: USER_BOOKING_STATUSES.completed,
    payment: {
      status: USER_PAYMENT_STATUSES.paid,
      method: USER_PAYMENT_METHODS.card,
      last4: '4242',
      transactionId: 'TX-DEMO-81101',
      updatedAt: '2021-03-18T09:05:00.000Z',
    },
  },
  {
    id: 'seed_past_2',
    dateLabel: '22 martie 2021',
    timeLabel: '08:00 AM',
    providerName: 'Shira Williamson',
    providerRole: 'Specialist curățenie',
    serviceName: 'Curățenie locuință',
    address: 'București',
    price: { amount: 28, currency: DEFAULT_MOCK_CURRENCY, unit: 'oră', estimatedHours: 2 },
    bookingStatus: USER_BOOKING_STATUSES.completed,
    payment: {
      status: USER_PAYMENT_STATUSES.paid,
      method: USER_PAYMENT_METHODS.google_pay,
      transactionId: 'TX-DEMO-81102',
      updatedAt: '2021-03-22T05:10:00.000Z',
    },
  },
  {
    id: 'seed_past_3',
    dateLabel: '27 martie 2021',
    timeLabel: '03:00 PM',
    providerName: 'John Smith',
    providerRole: 'Electrician',
    serviceName: 'Electricitate',
    address: 'București',
    price: { amount: 38, currency: DEFAULT_MOCK_CURRENCY, unit: 'oră', estimatedHours: 2 },
    bookingStatus: USER_BOOKING_STATUSES.completed,
    payment: {
      status: USER_PAYMENT_STATUSES.paid,
      method: USER_PAYMENT_METHODS.apple_pay,
      transactionId: 'TX-DEMO-81103',
      updatedAt: '2021-03-27T12:10:00.000Z',
    },
  },
  {
    id: 'seed_past_4',
    dateLabel: '2 aprilie 2021',
    timeLabel: '05:00 PM',
    providerName: 'Faina Maxwell',
    providerRole: 'Cosmetică',
    serviceName: 'Cosmetică',
    address: 'București',
    price: { amount: 45, currency: DEFAULT_MOCK_CURRENCY, unit: 'oră', estimatedHours: 1 },
    bookingStatus: USER_BOOKING_STATUSES.completed,
    payment: {
      status: USER_PAYMENT_STATUSES.paid,
      method: USER_PAYMENT_METHODS.card,
      last4: '1881',
      transactionId: 'TX-DEMO-81104',
      updatedAt: '2021-04-02T14:05:00.000Z',
    },
  },
];

const seedCancelled = [
  {
    id: 'seed_cancelled_1',
    dateLabel: '14 martie 2021',
    timeLabel: '04:00 PM',
    providerName: 'Amara Smith',
    providerRole: 'Specialist curățenie',
    serviceName: 'Curățenie locuință',
    address: 'București',
    price: { amount: 32, currency: DEFAULT_MOCK_CURRENCY, unit: 'oră', estimatedHours: 2 },
    bookingStatus: USER_BOOKING_STATUSES.cancelled,
    payment: {
      status: USER_PAYMENT_STATUSES.unpaid,
      method: USER_PAYMENT_METHODS.card,
      updatedAt: '2021-03-14T10:05:00.000Z',
    },
  },
  {
    id: 'seed_cancelled_2',
    dateLabel: '17 martie 2021',
    timeLabel: '09:00 AM',
    providerName: 'Ellison Perry',
    providerRole: 'Specialist curățenie',
    serviceName: 'Curățenie locuință',
    address: 'București',
    price: { amount: 30, currency: DEFAULT_MOCK_CURRENCY, unit: 'oră', estimatedHours: 2 },
    bookingStatus: USER_BOOKING_STATUSES.cancelled,
    payment: {
      status: USER_PAYMENT_STATUSES.paid,
      method: USER_PAYMENT_METHODS.card,
      last4: '4242',
      transactionId: 'TX-DEMO-77121',
      updatedAt: '2021-03-16T09:05:00.000Z',
    },
  },
];

export const userBookingSeeds = [...seedUpcoming, ...seedPast, ...seedCancelled];

export function getUserSeedBookingById(id) {
  return userBookingSeeds.find((booking) => booking.id === id) ?? null;
}
