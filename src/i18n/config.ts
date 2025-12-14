import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

import translation from './en/translation.json';
import collections from './en/collections.json';
import languages from './en/languages.json';
import files from './en/files.json';
import icons from './en/icons.json';
import tutorial from './en/tutorial.json';
import translation_enGB from './en-GB/translation.json';
import { CollectionKey, FileKey, LanguageKey } from '../utils/corpus';
import { logErrorToConsole } from '../utils/utils';

i18next.use(LanguageDetector)
  .use(initReactI18next)
  .use(resourcesToBackend((language: string, namespace: string) => import(`./${language}/${namespace}.json`)))
  .init({
    keySeparator: '.',
    nsSeparator: ':',
    fallbackLng: 'en',
    ns: [
      'translation',
      'collections',
      'languages',
      'files',
      'icons',
      'tutorial',
    ],

    // Since English is the fallback language, we always need to load it.
    resources: {
      'en': {
        translation,
        collections: collections satisfies Record<CollectionKey, {name: string, short: string}>,
        languages: languages satisfies Record<LanguageKey, {name: string, code: string}>,
        files: files satisfies Record<FileKey, string>,
        icons,
        tutorial,
      },
      'en-GB': {
        translation: translation_enGB,
      },
    },
    partialBundledLanguages: true,

    // i18next-browser-languagedetector
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
    },

    // Enable Trans component
    react: {
      hashTransKey: () => false,
    },
  })
  .catch(logErrorToConsole);
