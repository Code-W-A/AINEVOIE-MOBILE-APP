import { normalizeLocale } from '../localization';

export const supportTopicConfig = {
  ro: {
    support: {
      title: 'Suport',
      messagePlaceholder: 'Scrie aici',
      successTitle: 'Solicitarea a fost trimisă',
      successMessage: 'Cererea ta demo de suport a fost salvată local.',
    },
    bug: {
      title: 'Raportează un bug',
      messagePlaceholder: 'Descrie problema observată',
      successTitle: 'Raportul de bug a fost trimis',
      successMessage: 'Raportul demo a fost salvat local.',
    },
  },
  en: {
    support: {
      title: 'Support',
      messagePlaceholder: 'Write here',
      successTitle: 'Request sent',
      successMessage: 'Your demo support request was saved locally.',
    },
    bug: {
      title: 'Report a bug',
      messagePlaceholder: 'Describe the issue you found',
      successTitle: 'Bug report sent',
      successMessage: 'Your demo bug report was saved locally.',
    },
  },
};

export function getSupportTopicConfig(topic, locale = 'ro') {
  const normalizedLocale = normalizeLocale(locale);
  const source = supportTopicConfig[normalizedLocale] || supportTopicConfig.ro;
  return topic === 'bug' ? source.bug : source.support;
}
