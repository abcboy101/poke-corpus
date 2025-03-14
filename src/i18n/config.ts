import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

import translation from './en/translation.json';
import collections from './en/collections.json';
import languages from './en/languages.json';
import files from './en/files.json';
import icons from './en/icons.json';
import translation_enGB from './en-GB/translation.json';

i18next.use(LanguageDetector)
  .use(initReactI18next)
  .use(resourcesToBackend((language: string, namespace: string) => import(`./${language}/${namespace}.json`)))
  .init({
    partialBundledLanguages: true,
    fallbackLng: 'en',
    ns: [
      'translation',
      'collections',
      'languages',
      'files',
      'icons',
    ],

    // Since English is the fallback language, we always need to load it.
    resources: {
      'en': {
        translation: translation,
        collections: collections,
        languages: languages,
        files: files,
        icons: icons,
      },
      'en-GB': {
        translation: translation_enGB,
      },
    },
  })
  .catch((err: unknown) => {
    console.error(err);
  });
