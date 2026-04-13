import { Colors } from '../../../../constant/styles';
import { getPaymentStatusUi } from '../../shared/utils/paymentUi';
import { tr } from '../../shared/localization';

export function getProviderBookingStatusUi(status) {
  if (status === 'new' || status === 'requested') {
    return {
      label: tr('profile.requests'),
      icon: 'schedule',
      color: Colors.discoveryAccentColor,
      backgroundColor: Colors.discoverySoftSurfaceColor,
    };
  }

  if (status === 'rescheduled' || status === 'reschedule_proposed') {
    return {
      label: tr('providerBooking.statusRescheduled'),
      icon: 'update',
      color: '#A05A00',
      backgroundColor: '#FFF4E6',
    };
  }

  if (status === 'completed') {
    return {
      label: tr('profile.completed'),
      icon: 'check-circle',
      color: '#2D8C57',
      backgroundColor: '#EAF7F0',
    };
  }

  if (status === 'rejected') {
    return {
      label: tr('providerBooking.statusRejected'),
      icon: 'cancel',
      color: '#D94841',
      backgroundColor: '#FFF1F0',
    };
  }

  if (status === 'cancelled' || status === 'cancelled_by_user' || status === 'cancelled_by_provider') {
    return {
      label: tr('profile.cancelled'),
      icon: 'event-busy',
      color: '#D94841',
      backgroundColor: '#FFF1F0',
    };
  }

  return {
    label: tr('providerBooking.statusConfirmed'),
    icon: 'check',
    color: Colors.discoveryAccentColor,
    backgroundColor: Colors.discoverySoftSurfaceColor,
  };
}

export function getProviderPaymentStatusUi(status) {
  return getPaymentStatusUi(status);
}
