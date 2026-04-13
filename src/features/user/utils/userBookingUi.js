import { Colors } from '../../../../constant/styles';

export function toBookingStateCardItem(booking) {
  return {
    id: booking.id,
    date: booking.dateLabel,
    time: booking.timeLabel,
    person: booking.providerName,
    profession: booking.providerRole,
  };
}

export function getPaymentChipProps(payment) {
  const status = payment?.status;

  if (status === 'paid') {
    return {
      paymentLabel: 'Plătit',
      paymentColor: Colors.discoverySuccessColor,
      paymentBackgroundColor: 'rgba(46,155,106,0.12)',
    };
  }

  if (status === 'in_progress') {
    return {
      paymentLabel: 'În curs',
      paymentColor: Colors.discoveryMutedColor,
      paymentBackgroundColor: Colors.discoverySoftSurfaceColor,
    };
  }

  if (status === 'unpaid') {
    return {
      paymentLabel: 'Neplătit',
      paymentColor: Colors.discoveryAccentColor,
      paymentBackgroundColor: 'rgba(211,84,0,0.10)',
    };
  }

  return null;
}

