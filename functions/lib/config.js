"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOOGLE_MAPS_API_KEY = exports.SCHEMA_VERSION = exports.FUNCTION_REGION = void 0;
const params_1 = require("firebase-functions/params");
exports.FUNCTION_REGION = 'europe-west1';
exports.SCHEMA_VERSION = 1;
exports.GOOGLE_MAPS_API_KEY = (0, params_1.defineSecret)('GOOGLE_MAPS_API_KEY');
