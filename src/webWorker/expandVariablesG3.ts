const expandBlock = (language: string) => ({
  'en-US': 'BLOCK',
  'fr-FR': 'BLOC',
  'it-IT': 'MELLA', // cut off
  'de-DE': 'RIEGEL',
  'es-ES': 'CUBO',
} as const)[language] || 'BLOCK';

const expandLv = (language: string, collectionKey: string = '') => ({
  'ja-Hrkt-JP': 'Lv',
  'en-US': 'Lv',
  'fr-FR': 'N.',
  'it-IT': 'L.',
  'de-DE': 'Lv.',
  'es-ES': collectionKey == 'RubySapphire' ? 'Nv' : 'Nv.',
} as const)[language] || 'Lv';

const expandLv2 = (language: string, collectionKey: string = '') => ({
  'ja-Hrkt-JP': 'Lv',
  'en-US': 'Lv',
  'fr-FR': 'N.',
  'it-IT': 'L.',
  'de-DE': 'Lv.',
  'es-ES': collectionKey == 'RubySapphire' ? 'Nv' : 'Nv.',
} as const)[language] || 'Lv';

const expandPP = (language: string) => language == 'de-DE' ? 'AP' : 'PP';

const expandID = () => 'ID';

const expandNo = (language: string) => ({
  'ja-Hrkt-JP': 'No',
  'en-US': 'No',
  'fr-FR': 'Nº',
  'it-IT': 'Nº',
  'de-DE': 'Nr.',
  'es-ES': 'N.º',
} as const)[language] || 'No';

export { expandBlock, expandLv, expandLv2, expandPP, expandID, expandNo };
