import { Colors } from '../../../../constant/styles';
import { tr } from '../localization';

export function getProviderVerificationUi(status) {
  if (status === 'approved') {
    return {
      label: tr('providerVerification.approvedLabel'),
      icon: 'verified-user',
      color: Colors.discoverySuccessColor,
      backgroundColor: '#EAF7F0',
      description: tr('providerVerification.approvedDescription'),
    };
  }

  if (status === 'rejected') {
    return {
      label: tr('providerVerification.rejectedLabel'),
      icon: 'cancel',
      color: Colors.redColor,
      backgroundColor: '#FFF1F0',
      description: tr('providerVerification.rejectedDescription'),
    };
  }

  if (status === 'suspended') {
    return {
      label: tr('providerVerification.suspendedLabel'),
      icon: 'block',
      color: Colors.redColor,
      backgroundColor: '#FFF1F0',
      description: tr('providerVerification.suspendedDescription'),
    };
  }

  if (status === 'pending') {
    return {
      label: tr('providerVerification.pendingLabel'),
      icon: 'schedule',
      color: Colors.discoveryAccentColor,
      backgroundColor: Colors.discoverySoftSurfaceColor,
      description: tr('providerVerification.pendingDescription'),
    };
  }

  return {
    label: tr('providerVerification.draftLabel'),
    icon: 'edit',
    color: Colors.discoveryMutedColor,
    backgroundColor: '#F3F5F8',
    description: tr('providerVerification.draftDescription'),
  };
}
