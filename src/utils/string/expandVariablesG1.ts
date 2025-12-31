import { LanguageKey } from "../corpus";

export const expandED = (language: LanguageKey) => language === 'fr' ? 'OK' : 'ED';

export const expandID = (language: LanguageKey) => {
  switch (language) {
    case 'ja-Hrkt': return 'ID';
    case 'en':      return 'ID';
    case 'fr':      return '.ID';  // to form "No.ID"
    case 'it':      return 'ID';
    case 'de':      return 'ID-';  // to form "ID-Nr."
    case 'es':      return 'ID';
    default:        return 'ID';
  }
};

export const expandNo = (language: LanguageKey) => {
  switch (language) {
    case 'ja-Hrkt': return 'No';
    case 'en':      return 'No';
    case 'fr':      return 'No';
    case 'it':      return 'Nº';
    case 'de':      return 'Nr';
    case 'es':      return 'Nº';
    default:        return 'No';
  }
};

export const expandDot = (language: LanguageKey) => language === 'ja-Hrkt' ? '．' : '.';

export const expandDexEnd = (language: LanguageKey) => language === 'ja-Hrkt' ? '。' : '.';
