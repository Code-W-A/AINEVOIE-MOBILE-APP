import { Colors } from '../../../../constant/styles';
import { tr } from '../localization';

export const PAYMENT_STATUSES = {
  unpaid: 'unpaid',
  in_progress: 'in_progress',
  paid: 'paid',
  failed: 'failed',
};

export const PAYMENT_METHODS = {
  card: 'card',
  apple_pay: 'apple_pay',
  google_pay: 'google_pay',
};

export function normalizePaymentStatus(status) {
  return Object.values(PAYMENT_STATUSES).includes(status) ? status : PAYMENT_STATUSES.unpaid;
}

export function normalizePaymentMethod(method) {
  return Object.values(PAYMENT_METHODS).includes(method) ? method : PAYMENT_METHODS.card;
}

export function normalizePaymentPayload(payment) {
  const status = normalizePaymentStatus(payment?.status);
  const method = normalizePaymentMethod(payment?.method);
  const last4 = payment?.last4 ? String(payment.last4).slice(-4) : undefined;

  return {
    status,
    method,
    last4,
    transactionId: payment?.transactionId,
    updatedAt: payment?.updatedAt || null,
  };
}

export function getPaymentStatusUi(paymentStatus) {
  const normalizedStatus = normalizePaymentStatus(paymentStatus);

  if (normalizedStatus === PAYMENT_STATUSES.paid) {
    return {
      label: tr('payment.paid'),
      shortLabel: tr('payment.paid'),
      icon: 'check-circle',
      color: Colors.discoverySuccessColor,
      backgroundColor: 'rgba(46,155,106,0.12)',
    };
  }

  if (normalizedStatus === PAYMENT_STATUSES.in_progress) {
    return {
      label: tr('payment.inProgress'),
      shortLabel: tr('payment.inProgress'),
      icon: 'schedule',
      color: Colors.discoveryMutedColor,
      backgroundColor: Colors.discoverySoftSurfaceColor,
    };
  }

  if (normalizedStatus === PAYMENT_STATUSES.failed) {
    return {
      label: tr('payment.failed'),
      shortLabel: tr('payment.failed'),
      icon: 'error-outline',
      color: '#D94841',
      backgroundColor: '#FFF1F0',
    };
  }

  return {
    label: tr('payment.unpaid'),
    shortLabel: tr('payment.unpaid'),
    icon: 'credit-card-off',
    color: Colors.discoveryAccentColor,
    backgroundColor: 'rgba(211,84,0,0.10)',
  };
}

export function getPaymentMethodLabel(method, last4) {
  const normalizedMethod = normalizePaymentMethod(method);

  if (normalizedMethod === PAYMENT_METHODS.apple_pay) {
    return 'Apple Pay';
  }

  if (normalizedMethod === PAYMENT_METHODS.google_pay) {
    return 'Google Pay';
  }

  return last4 ? tr('payment.cardMasked', { last4 }) : tr('payment.card');
}
