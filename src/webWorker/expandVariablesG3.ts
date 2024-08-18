export const expandBlock = (language: string) => ({
  'en-US': 'BLOCK',
  'fr-FR': 'BLOC',
  'it-IT': 'MELLA', // cut off
  'de-DE': 'RIEGEL',
  'es-ES': 'CUBO',
} as const)[language] || 'BLOCK';

// Used in Western RSE (34)
// Text as displayed in the main font
export const expandLv = (language: string, collectionKey: string = '') => ({
  'en-US': 'Lv',
  'fr-FR': 'N.',
  'it-IT': 'L.',
  'de-DE': 'Lv.',
  'es-ES': collectionKey == 'RubySapphire' ? 'Nv' : 'Nv.',
} as const)[language] || 'Lv';

// Used in Japanese/Western FRLGE (F9 05)
// Text as displayed in the main font
export const expandLv2 = (language: string) => ({
  'ja-Hrkt-JP': 'Lv',
  'en-US': 'Lv',
  'fr-FR': 'N.',
  'it-IT': 'L.',
  'de-DE': 'Lv.',
  'es-ES': 'Nv.',
} as const)[language] || 'Lv';

// Used in German/Spanish FRLGE (F9 05 F9 18)
// In the small font (used to display a Pokémon's level in battle, etc.), each character is 8 pixels wide.
// These strings are 9 pixels wide, so two characters are used to display it all.
export const expandLv3 = (language: string) => ({
  'de-DE': 'Lv.',
  'es-ES': 'Nv',
} as const)[language] || 'Lv';

export const expandPP = (language: string) => language == 'de-DE' ? 'AP' : 'PP';

export const expandID = () => 'ID';

export const expandNo = (language: string) => ({
  'ja-Hrkt-JP': 'No',
  'en-US': 'No',
  'fr-FR': 'Nº',
  'it-IT': 'Nº',
  'de-DE': 'Nr.',
  'es-ES': 'N.º',
} as const)[language] || 'No';

// French BP (Battle Points)
export const expandPco = () => 'Pco';
