/**
 * The following codepoints are used internally, and may produce unexpected output if present in input text.
 *
 * Special character escapes used in cleanString:
 * - U+F0100: placeholder for literal backslash `\\`
 * - U+F0102: placeholder for literal left square bracket `\[`
 * - U+F0104: placeholder for literal left curly bracket `\{`
 *
 * Special character escapes used in searchBoolean:
 * - U+F0101: placeholder for literal slash `\/`
 * - U+F0108: placeholder for left parenthesis `(`
 * - U+F0109: placeholder for right parenthesis `)`
 * - U+F0180: placeholder for literal quotation mark `\"`
 *
 * Control character escapes used in cleanString:
 * - U+F0200: placeholder for new line `\n`
 * - U+F0201: placeholder for scroll `\r`
 * - U+F0202: placeholder for clear `\c`
 * - U+F0203: placeholder for tab `\t`
 * - U+F0207: placeholder for `[VAR 0207]`
 * - U+F0208: placeholder for `[VAR 0208]`
 * - U+F0250: placeholder for end of text `@`
 * - U+F02FF: placeholder for end of text `\e`
 *
 * Internally used in cleanString:
 * - U+F1100: delimiter between speaker ID and speaker name
 * - U+F1101: delimiter between speaker name and dialogue
 * - U+F1102: start of replaced literal
 * - U+F1103: end of replaced literal
 * - U+F1104: delimiter between branches in a literal
 * - U+F1105: delimiter between literal and replacement
 * - U+F1106: start of text info tag
 * - U+F1107: end of text info tag
 *
 * - U+F1200: mark a gender branch in a literal
 * - U+F1207: mark a version branch in a literal
 *
 * - U+F1300: mark a soft line break
 *
 * - U+F1400-F14FF: reserved for text info sigils
 *
 * Internally used in cleanStringGO:
 * - U+10F306: used as reph placeholder
 * - U+10093F: used as short i placeholder
 *
 * The following codepoints can be used in source documents for multivalued strings:
 * - U+F1000: delimiter between multivalued strings
 * - U+F1001: delimiter between the discriminator and the string itself
 *
 * Private Use Area:
 * Nintendo reserves: E0..E1, F0..F1
 * Pokémon uses:      E3..E4 for or_font
 *                    E8..EE for 3DS Chinese names
 * Pokémon GO uses:   F0..F6 for Hindi
 *                    F7 for Thai
 *
 * Free to use:
 * E2
 * E5
 * E6
 * E7 - assigned to TextInfo
 * EF
 * F8
 *
 */
export const checkAstralSupport = () => {
  const result = '😀 A'.replace(/A/gu, '😄');
  return result === '😀 😄';
};
