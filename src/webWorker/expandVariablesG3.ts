/* eslint-disable @stylistic/quote-props */
export const expandBlock = (language: string) => ({
  'en': 'BLOCK',
  'fr': 'BLOC',
  'it': 'MELLA', // cut off
  'de': 'RIEGEL',
  'es': 'CUBO',
} as const)[language] || 'BLOCK';

// Used in Western RSE (34)
// Text as displayed in the main font
export const expandLv = (language: string, collectionKey: string = '') => ({
  'en': 'Lv',
  'fr': 'N.',
  'it': 'L.',
  'de': 'Lv.',
  'es': collectionKey === 'RubySapphire' ? 'Nv' : 'Nv.',
} as const)[language] || 'Lv';

// Used in Japanese/Western FRLGE (F9 05)
// Text as displayed in the main font
export const expandLv2 = (language: string) => ({
  'ja-Hrkt': 'Lv',
  'en': 'Lv',
  'fr': 'N.',
  'it': 'L.',
  'de': 'Lv.',
  'es': 'Nv.',
} as const)[language] || 'Lv';

// Used in German/Spanish FRLGE (F9 05 F9 18)
// In the small font (used to display a Pokémon's level in battle, etc.), each character is 8 pixels wide.
// These strings are 9 pixels wide, so two characters are used to display it all.
export const expandLv3 = (language: string) => ({
  'de': 'Lv.',
  'es': 'Nv',
} as const)[language] || 'Lv';

export const expandPP = (language: string) => language === 'de' ? 'AP' : 'PP';

export const expandID = () => 'ID';

export const expandNo = (language: string) => ({
  'ja-Hrkt': 'No',
  'en': 'No',
  'fr': 'Nº',
  'it': 'Nº',
  'de': 'Nr.',
  'es': 'N.º',
} as const)[language] || 'No';

// French BP (Battle Points)
export const expandPco = () => 'Pco';
