/* Grammar string arrays from romfs/bin/message/grammar, with duplicates removed */
// English: VAR 1300-03 (VAR 1303-06 in BDSP)
export const grammarEN = [
  ["the "],          // DefArt
  ["The "],          // DefArtCap
  ["a ", "an ", ""], // IndArt
  ["A ", "An ", ""], // IndArtCap
];

// French: VAR 1400-0B (VAR 1403-0C,0F-10 in BDSP)
export const grammarFR = [
  ["le ", "l’", "la ", "les "],           // DefArt
  ["Le ", "L’", "La ", "Les "],           // DefArtCap
  ["un ", "une ", "des ", ""],            // IndArt
  ["Un ", "Une ", "Des ", ""],            // IndArtCap
  ["au ", "à l’", "à la ", "aux ", "à "], // A_DefArt
  ["Au ", "À l’", "À la ", "Aux ", "À "], // A_DefArtCap
  ["du ", "de l’", "de la ", "des "],     // De_DefArt
  ["Du ", "De l’", "De la ", "Des "],     // De_DefArtCap
  ["de ", "d’"],                          // De
  ["De ", "D’"],                          // DeCap
  ["que ", "qu’"],                        // Que
  ["Que ", "Qu’"],                        // QueCap
];

// Italian: VAR 1500-0F (VAR 1403-0C,10-15 in BDSP)
export const grammarIT = [
  ["il ", "l’", "lo ", "la ", "i ", "gli ", "le "],                                                // DefArt
  ["Il ", "L’", "Lo ", "La ", "I ", "Gli ", "Le "],                                                // DefArtCap
  ["un ", "uno ", "una ", "un’", "dei ", "degli ", "delle ", "del ", "dell’", "dello ", "della "], // IndArt
  ["Un ", "Uno ", "Una ", "Un’", "Dei ", "Degli ", "Delle ", "Del ", "Dell’", "Dello ", "Della "], // IndArtCap
  ["del ", "dell’", "dello ", "della ", "dei ", "degli ", "delle "],                               // Di_DefArt
  ["Del ", "Dell’", "Dello ", "Della ", "Dei ", "Degli ", "Delle "],                               // Di_DefArtCap
  ["sul ", "sull’", "sullo ", "sulla ", "sui ", "sugli ", "sulle "],                               // Su_DefArt
  ["Sul ", "Sull’", "Sullo ", "Sulla ", "Sui ", "Sugli ", "Sulle "],                               // Su_DefArtCap
  ["al ", "all’", "allo ", "alla ", "ai ", "agli ", "alle "],                                      // A_DefArt
  ["Al ", "All’", "Allo ", "Alla ", "Ai ", "Agli ", "Alle "],                                      // A_DefArtCap
  ["nel ", "nell’", "nello ", "nella ", "nei ", "negli ", "nelle "],                               // In_DefArt
  ["Nel ", "Nell’", "Nello ", "Nella ", "Nei ", "Negli ", "Nelle "],                               // In_DefArtCap
  ["e ", "ed "],                                                                                   // Ed
  ["E ", "Ed "],                                                                                   // EdCap
  ["a ", "ad "],                                                                                   // Ad
  ["A ", "Ad "],                                                                                   // AdCap
];

// German: VAR 1600-07 (VAR 1603-0A in BDSP)
export const grammarDE = [
  ["der ", "die ", "das "],        // DefArtNom
  ["Der ", "Die ", "Das "],        // DefArtNomCap
  ["ein ", "eine ", ""],           // IndArtNom
  ["Ein ", "Eine ", ""],           // IndArtNomCap
  ["den ", "die ", "das "],        // DefArtAcc
  ["Den ", "Die ", "Das "],        // DefArtAccCap
  ["einen ", "eine ", "ein ", ""], // IndArtAcc
  ["Einen ", "Eine ", "Ein ", ""], // IndArtAccCap
];

// Spanish: VAR 1700-0F (VAR 1703-0E,13-16 in BDSP)
export const grammarES = [
  ["el ", "la ", "los ", "las "],                  // DefArt
  ["El ", "La ", "Los ", "Las "],                  // DefArtCap
  ["un ", "una ", "unos ", "unas ", ""],           // IndArt
  ["Un ", "Una ", "Unos ", "Unas ", ""],           // IndArtCap
  ["del ", "de la ", "de los ", "de las "],        // De_DefArt
  ["Del ", "De la ", "De los ", "De las "],        // De_DefArtCap
  ["al ", "a la ", "a los ", "a las "],            // A_DefArt
  ["Al ", "A la ", "A los ", "A las "],            // A_DefArtCap
  ["el ", "la ", "los ", "las ", ""],              // DefArt_TrTypeAndName
  ["El ", "La ", "Los ", "Las ", ""],              // DefArtCap_TrTypeAndName
  ["al ", "a la ", "a los ", "a las ", "a "],      // A_DefArt_TrTypeAndName
  ["del ", "de la ", "de los ", "de las ", "de "], // De_DefArt_TrTypeAndName
  ["y ", "e "],                                    // y_e
  ["Y ", "E "],                                    // Y_E
  ["o ", "u "],                                    // o_u
  ["O ", "U "],                                    // O_U
];

// Korean: VAR 1900
export const particlesKO = [
  ['', ''], // no particle
  ['는', '은'], // 은(는), topic particle, equivalent to Japanese "ha"
  ['를', '을'], // 을(를), object particle, equivalent to Japanese "wo"
  ['가', '이'], // 이(가), subject particle, equivalent to Japanese "ga"
  ['와', '과'], // 와(과), conjunctive particle, equivalent to Japanese "to"
  ['', '으'], // (으)로, directional particle, equivalent to Japanese "ni"
  ['', '이'], // (이), optional "i" in particles such as 이다/이랑/이야
  ['야', '아'], // 아(야), vocative particle
];

/**
 * Remap indices for grammar tags in BDSP to the standard indices used in the Game Freak games.
 */
export const remapBDSPGrammarIndex = (index: number, isSpanish: boolean = false) => {
  // All languages: skip 0x00, 0x01, 0x02
  // English/German: max value is 0x06/0x0A (total of 3)
  // French/Italian: also skip 0x0D, 0x0E (2 more, total of 5)
  // Spanish: also skip 0x0F, 0x10, 0x11, 0x12 (4 more, total of 7)
  return (index < 0xF) ? (index - 3) : (isSpanish ? (index - 7) : (index - 5));
};
