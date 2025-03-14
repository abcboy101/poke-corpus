/**
 * Converts the male and female forms of a string to HTML, separated by a slash.
 *
 * Returns the resulting string.
 */
export function genderBranch(male: string, female: string, neuter: string = '') {
  const results = [];
  if (male.length > 0) results.push(`<span class="branch male">${male}</span>`);
  if (female.length > 0) results.push(`<span class="branch female">${female}</span>`);
  if (neuter.length > 0) results.push(`<span class="branch neuter">${neuter}</span>`);
  return results.join('<span class="gender">/</span>');
}

/**
 * Converts the singular and plural forms of a string to HTML, separated by a slash.
 *
 * Returns the resulting string.
 */
export function numberBranch(singular: string, plural: string, zero: string = '') {
  const results = [];
  if (singular.length > 0) results.push(`<span class="branch singular">${singular}</span>`);
  if (plural.length > 0) results.push(`<span class="branch plural">${plural}</span>`);
  if (zero.length > 0) results.push(`<span class="branch zero">${zero}</span>`);
  return results.join('<span class="number">/</span>');
}

/**
 * Converts the male singular, female singular, male plural, and female plural forms of a string to HTML, separated by a slash.
 *
 * Returns the resulting string.
 */
export function genderNumberBranch(maleSingular: string, femaleSingular: string, malePlural: string, femalePlural: string) {
  const singularResults = [];
  if (maleSingular.length > 0) singularResults.push(`<span class="branch male singular">${maleSingular}</span>`);
  if (femaleSingular.length > 0) singularResults.push(`<span class="branch female singular">${femaleSingular}</span>`);
  const singular = singularResults.join('<span class="gender singular">/</span>');

  const pluralResults = [];
  if (malePlural.length > 0) pluralResults.push(`<span class="branch male plural">${malePlural}</span>`);
  if (femalePlural.length > 0) pluralResults.push(`<span class="branch female plural">${femalePlural}</span>`);
  const plural = pluralResults.join('<span class="gender plural">/</span>');

  const classResults = ['number'];
  if (maleSingular.length > 0 && malePlural.length > 0) classResults.push('male');
  if (femaleSingular.length > 0 && femalePlural.length > 0) classResults.push('female');
  const className = classResults.join(' ');
  return [singular, plural].join(`<span class="${className}">/</span>`);
}

/**
 * Converts the context-dependent forms of a string to HTML, separated by a slash.
 * Used for definite articles, indefinite articles, prepositions, French elision, Italian dates, and Korean particles.
 *
 * Returns the resulting string.
 */
export function grammarBranch(...forms: readonly string[]) {
  return forms.filter((form) => form !== '').map((form, index) => `<span class="branch form form-${index}">${form}</span>`).join('<span class="grammar">/</span>');
}

/**
 * Converts the version-specific forms of a string to HTML, separated by a slash.
 *
 * Returns the resulting string.
 */
export function versionBranch(form1: string, form2: string, version1: string, version2: string) {
  const results = [];
  if (form1.length > 0) results.push(`<span class="branch version-${version1}">${form1}</span>`);
  if (form2.length > 0) results.push(`<span class="branch version-${version2}">${form2}</span>`);
  return results.join('<span class="version">/</span>');
}
