import { CollectionKey, LanguageKey } from "../corpus";

export const expandBlock = (language: LanguageKey) => {
  switch (language) {
    case 'en': return 'BLOCK';
    case 'fr': return 'BLOC';
    case 'it': return 'MELLA'; // cut off
    case 'de': return 'RIEGEL';
    case 'es': return 'CUBO';
    default:   return 'BLOCK';
  }
};

// Used in Western RSE (34)
// Text as displayed in the main font
export const expandLv = (language: LanguageKey, collectionKey?: CollectionKey) => {
  switch (language) {
    case 'en': return 'Lv';
    case 'fr': return 'N.';
    case 'it': return 'L.';
    case 'de': return 'Lv.';
    case 'es': return collectionKey === 'RubySapphire' ? 'Nv' : 'Nv.';
    default:   return 'Lv';
  }
};

// Used in Japanese/Western FRLGE (F9 05)
// Text as displayed in the main font
export const expandLv2 = (language: LanguageKey) => {
  switch (language) {
    case 'ja-Hrkt': return 'Lv';
    case 'en':      return 'Lv';
    case 'fr':      return 'N.';
    case 'it':      return 'L.';
    case 'de':      return 'Lv.';
    case 'es':      return 'Nv.';
    default:        return 'Lv';
  }
};

// Used in German/Spanish FRLGE (F9 05 F9 18)
// In the small font (used to display a Pokémon's level in battle, etc.), each character is 8 pixels wide.
// These strings are 9 pixels wide, so two characters are used to display it all.
export const expandLv3 = (language: LanguageKey) => {
  switch (language) {
    case 'de': return 'Lv.';
    case 'es': return 'Nv';
    default:   return 'Lv';
  }
};

export const expandPP = (language: LanguageKey) => language === 'de' ? 'AP' : 'PP';

export const expandID = () => 'ID';

export const expandNo = (language: LanguageKey) => {
  switch (language) {
    case 'ja-Hrkt': return 'No';
    case 'en':      return 'No';
    case 'fr':      return 'Nº';
    case 'it':      return 'Nº';
    case 'de':      return 'Nr.';
    case 'es':      return 'N.º';
    default:        return 'No';
  }
};

// French BP (Battle Points)
export const expandPco = () => 'Pco';
