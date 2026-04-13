import { defineSecret } from 'firebase-functions/params';

export const FUNCTION_REGION = 'europe-west1';
export const SCHEMA_VERSION = 1;
export const GOOGLE_MAPS_API_KEY = defineSecret('GOOGLE_MAPS_API_KEY');
