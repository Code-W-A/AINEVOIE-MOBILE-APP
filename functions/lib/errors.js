"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.badRequest = badRequest;
exports.permissionDenied = permissionDenied;
exports.failedPrecondition = failedPrecondition;
exports.internalError = internalError;
const https_1 = require("firebase-functions/v2/https");
function badRequest(message) {
    return new https_1.HttpsError('invalid-argument', message);
}
function permissionDenied(message) {
    return new https_1.HttpsError('permission-denied', message);
}
function failedPrecondition(message) {
    return new https_1.HttpsError('failed-precondition', message);
}
function internalError(message) {
    return new https_1.HttpsError('internal', message);
}
