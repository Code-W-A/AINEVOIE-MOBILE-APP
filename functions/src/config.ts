import { defineSecret, defineString } from 'firebase-functions/params';

export const FUNCTION_REGION = 'europe-west1';
export const SCHEMA_VERSION = 1;
export const GOOGLE_MAPS_API_KEY = defineSecret('GOOGLE_MAPS_API_KEY');
export const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
export const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
export const PAYMENT_DEMO_MODE = defineString('PAYMENT_DEMO_MODE', { default: 'false' });
