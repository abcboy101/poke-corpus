/**
 * Returns the flags for each group of collections for the given collection.
 */
export function getCorpusGroups(collectionKey: string) {
  const isGen1 = ["RedBlue", "Yellow"].includes(collectionKey);
  const isGen2 = ["GoldSilver", "Crystal"].includes(collectionKey);
  const isGen3 = ["RubySapphire", "FireRedLeafGreen", "Emerald"].includes(collectionKey);
  const isGen4 = ["DiamondPearl", "Platinum", "HeartGoldSoulSilver"].includes(collectionKey);
  const isGen5 = ["BlackWhite", "Black2White2"].includes(collectionKey);
  const isBDSP = collectionKey === "BrilliantDiamondShiningPearl";
  const isPBR = collectionKey === "BattleRevolution";
  const isRanch = collectionKey === "Ranch";
  const isDreamRadar = collectionKey === "DreamRadar";
  const isGO = collectionKey === "GO";
  const isMasters = collectionKey === "Masters";
  const isHOME = collectionKey === "HOME";
  const isChampions = collectionKey === "Champions";

  const isGB = isGen1 || isGen2;
  const isNDS = isGen4 || isGen5;
  const is3DS = ["XY", "OmegaRubyAlphaSapphire", "SunMoon", "UltraSunUltraMoon", "Bank"].includes(collectionKey);
  const isSwitch = ["LetsGoPikachuLetsGoEevee", "SwordShield", "BrilliantDiamondShiningPearl", "LegendsArceus", "ScarletViolet", "LegendsZA", "HOME", "Champions"].includes(collectionKey);
  const isN64 = ["Stadium", "Stadium2"].includes(collectionKey);
  const isGCN = ["Colosseum", "XD"].includes(collectionKey);
  const isModern = isGen5 || is3DS || isSwitch;

  return {
    isGen1, isGen2, isGen3, isGen4, isGen5, isBDSP,
    isPBR, isRanch, isDreamRadar, isGO, isMasters, isHOME, isChampions,
    isGB, isNDS, is3DS, isSwitch, isN64, isGCN, isModern,
  };
}

/**
 * Returns the description namespace for the given collection.
 */
export function getNamespace(collectionKey: string) {
  const { isGB, isGen3, isGen4, isModern, isN64, isGCN, isPBR } = getCorpusGroups(collectionKey);

  if (isGB) return 'gb';
  if (isGen3) return 'g3';
  if (isGen4) return 'g4';
  if (isModern) return 'modern';
  if (isN64) return 'n64';
  if (isGCN) return 'gcn';
  if (isPBR) return 'pbr';
  return collectionKey.toLowerCase();
}
