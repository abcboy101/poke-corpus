import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './en/translation.json';
import translationENGB from './en-GB/translation.json';
import translationJA from './ja/translation.json';
import translationFR from './fr/translation.json';
import translationFRCA from './fr-CA/translation.json';
import translationIT from './it/translation.json';
import translationDE from './de/translation.json';
import translationES from './es/translation.json';
import translationKO from './ko/translation.json';
import translationZHHans from './zh-Hans/translation.json';
import translationZHHant from './zh-Hant/translation.json';

import collectionsEN from './en/collections.json';
import collectionsJA from './ja/collections.json';
import collectionsFR from './fr/collections.json';
import collectionsIT from './it/collections.json';
import collectionsDE from './de/collections.json';
import collectionsES from './es/collections.json';
import collectionsKO from './ko/collections.json';
import collectionsZHHans from './zh-Hans/collections.json';
import collectionsZHHant from './zh-Hant/collections.json';

import languagesEN from './en/languages.json';
import languagesJA from './ja/languages.json';
import languagesFR from './fr/languages.json';
import languagesIT from './it/languages.json';
import languagesDE from './de/languages.json';
import languagesES from './es/languages.json';
import languagesKO from './ko/languages.json';
import languagesZHHans from './zh-Hans/languages.json';
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
        translation: translationFR,
        collections: collectionsFR,
        languages: languagesFR,
      },
      'fr-CA': {
        translation: translationFRCA,
      },
      'it': {
        translation: translationIT,
        collections: collectionsIT,
        languages: languagesIT,
      },
      'de': {
        translation: translationDE,
        collections: collectionsDE,
        languages: languagesDE,
      },
      'es': {
        translation: translationES,
        collections: collectionsES,
        languages: languagesES,
      },
      'ko': {
        translation: translationKO,
        collections: collectionsKO,
        languages: languagesKO,
      },
      'zh-Hans': {
        translation: translationZHHans,
        collections: collectionsZHHans,
        languages: languagesZHHans,
      },
      'zh-Hant': {
        translation: translationZHHant,
        collections: collectionsZHHant,
        languages: languagesZHHant,
      },
    }
  });
