import { Alert, Linking } from 'react-native';
import { tr } from '../src/features/shared/localization';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mockPhoneBook = {
  'Amara Smith': '+1555010110',
  'Clean Lux': '+1555010111',
  'Beatriz Warner': '+1555010112',
  'David Hayden': '+1555010113',
  'Ellison Perry': '+1555010114',
  'Elisson Perry': '+1555010114',
  'John Smith': '+1555010115',
  'Linnea Hayden': '+1555010116',
  'Natasha': '+1555010117',
  'Russel Taylor': '+1555010118',
  'Russeil TayloFaina Maxwell': '+1555010119',
  'Shara Williamson': '+1555010120',
  'Simone Root': '+1555010121',
  'Stella French': '+1555010122',
};

export function getSupportContent(topic) {
  const resolvedTopic = topic === 'bug' ? 'bug' : 'support';

  if (resolvedTopic === 'bug') {
    return {
      topic: 'bug',
      title: tr('support.bugTitle'),
      messagePlaceholder: tr('support.bugPlaceholder'),
      successTitle: tr('support.bugSuccessTitle'),
      successMessage: tr('support.bugSuccessBody'),
    };
  }

  return {
    topic: 'support',
    title: tr('support.supportTitle'),
    messagePlaceholder: tr('support.supportPlaceholder'),
    successTitle: tr('support.supportSuccessTitle'),
    successMessage: tr('support.supportSuccessBody'),
  };
}

export function validateSupportForm({ name, email, message }) {
  if (!name.trim()) {
    return tr('support.validationName');
  }

  if (!email.trim()) {
    return tr('support.validationEmail');
  }

  if (!emailPattern.test(email.trim())) {
    return tr('support.validationEmailInvalid');
  }

  if (!message.trim()) {
    return tr('support.validationMessage');
  }

  return null;
}

export function getMockPhoneNumber(name) {
  return mockPhoneBook[name] || '+1555010100';
}

export async function handleDemoCall(name) {
  const phoneNumber = getMockPhoneNumber(name);
  const phoneUrl = `tel:${phoneNumber}`;

  try {
    const canOpen = await Linking.canOpenURL(phoneUrl);

    if (!canOpen) {
      Alert.alert(
        tr('demo.callUnavailableTitle'),
        tr('demo.demoNumber', { phoneNumber }),
      );
      return;
    }

    await Linking.openURL(phoneUrl);
  } catch {
    Alert.alert(
      tr('demo.callUnavailableTitle'),
      tr('demo.demoNumber', { phoneNumber }),
    );
  }
}
