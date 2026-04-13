import { getHomeRoute } from '../../../../utils/roleRoutes';
import { tr } from '../localization';

export const roleDisplayConfig = {
  user: {
    role: 'user',
    profileDisplayName: 'Stella French',
    profileEmail: 'stella@abc.com',
    defaultAvatarSource: require('../../../../assets/images/user/user_5.jpg'),
    editProfileDefaults: {
      name: 'Stella French',
      email: 'stella@abc.com',
      password: '',
      phoneNumber: '1234567890',
    },
    otp: {
      scrollMode: 'center',
      dialogWidth: 'fixed',
    },
  },
  provider: {
    role: 'provider',
    profileDisplayName: 'Amara Smith',
    profileEmail: 'amara@test.com',
    defaultAvatarSource: require('../../../../assets/images/provider-role/provider_7.jpg'),
    editProfileDefaults: {
      name: 'Amara Smith',
      email: 'amara@test.com',
      password: '',
      phoneNumber: '123456789',
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
    profileDisplayName: profile.displayName || profile.businessName || roleDisplayConfig.provider.profileDisplayName,
    profileEmail: account.email || roleDisplayConfig.provider.profileEmail,
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
