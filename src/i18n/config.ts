import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

i18next.use(LanguageDetector)
  .use(initReactI18next)
  .use(resourcesToBackend((language: string, namespace: string) => import(`./${language}/${namespace}.json`)))
  .init({
    partialBundledLanguages: true,
    fallbackLng: {
      'zh-Hans': ['zh-Hant', 'en'],
      'zh-Hant': ['zh-Hans', 'en'],
      'default': ['en'],
    },
    ns: [
      'translation',
      'collections',
      'languages',
      'files',
    ],
    resources: {},
  });
