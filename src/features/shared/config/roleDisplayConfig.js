import { getHomeRoute } from '../../../../utils/roleRoutes';
import { tr } from '../localization';

export const roleDisplayConfig = {
  user: {
    role: 'user',
    profileDisplayName: '',
    profileEmail: '',
    defaultAvatarSource: require('../../../../assets/images/user/user_5.jpg'),
    editProfileDefaults: {
      name: '',
      email: '',
      password: '',
      phoneNumber: '',
    },
    otp: {
      scrollMode: 'center',
      dialogWidth: 'fixed',
    },
  },
  provider: {
    role: 'provider',
    profileDisplayName: '',
    profileEmail: '',
    defaultAvatarSource: require('../../../../assets/images/provider-role/provider_7.jpg'),
    editProfileDefaults: {
      name: '',
      email: '',
      password: '',
      phoneNumber: '',
    },
    otp: {
      scrollMode: 'top',
      dialogWidth: 'percent',
    },
  },
};

export function getProviderProfileFallback(providerOnboarding, t = tr) {
  const profile = providerOnboarding?.professionalProfile || {};
  const account = providerOnboarding?.account || {};

  return {
    profileDisplayName: profile.displayName || profile.businessName || account.name || t('role.provider.profileTitle'),
    profileEmail: account.email || '',
    profileSubtitle: providerOnboarding?.verificationStatus === 'pending'
      ? t('role.provider.pendingSubtitle')
      : t('role.provider.profileSubtitle'),
  };
}

export function getRoleDisplayConfig(role, t = tr) {
  const baseConfig = role === 'provider' ? roleDisplayConfig.provider : roleDisplayConfig.user;
  const keyPrefix = role === 'provider' ? 'role.provider' : 'role.user';

  return {
    ...baseConfig,
    label: t(`${keyPrefix}.label`),
    accountLabel: t(`${keyPrefix}.accountLabel`),
    profileTitle: t(`${keyPrefix}.profileTitle`),
    profileSubtitle: t(`${keyPrefix}.profileSubtitle`),
  };
}

export function getRoleHomeRoute(role) {
  return getHomeRoute(role === 'provider' ? 'provider' : 'user');
}
