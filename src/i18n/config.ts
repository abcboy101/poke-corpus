import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import translationEN from './en/translation.json';
import collectionsEN from './en/collections.json';
import languagesEN from './en/languages.json';
import translationENGB from './en-GB/translation.json';
import translationJA from './ja/translation.json';
import collectionsJA from './ja/collections.json';
import languagesJA from './ja/languages.json';
import languagesFR from './fr/languages.json';
import languagesIT from './it/languages.json';
import languagesDE from './de/languages.json';
import languagesES from './es/languages.json';
import languagesKO from './ko/languages.json';
import collectionsZHHans from './zh-Hans/collections.json';
import languagesZHHans from './zh-Hans/languages.json';
import collectionsZHHant from './zh-Hant/collections.json';
import languagesZHHant from './zh-Hant/languages.json';

i18next.use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: {
      'zh-Hans': ['zh-Hant', 'en'],
      'zh-Hant': ['zh-Hans', 'en'],
      'default': ['en']
    },
    resources: {
      'en': {
        translation: translationEN,
        collections: collectionsEN,
        languages: languagesEN
      },
      'en-GB': {
        translation: translationENGB,
      },
      'ja': {
        translation: translationJA,
        collections: collectionsJA,
        languages: languagesJA
      },
      'fr': {
        languages: languagesFR,
      },
      'it': {
        languages: languagesIT,
      },
      'de': {
        languages: languagesDE,
      },
      'es': {
        languages: languagesES,
      },
      'ko': {
        languages: languagesKO,
      },
      'zh-Hans': {
        collections: collectionsZHHans,
        languages: languagesZHHans,
      },
      'zh-Hant': {
        collections: collectionsZHHant,
        languages: languagesZHHant,
      },
    }
  });
