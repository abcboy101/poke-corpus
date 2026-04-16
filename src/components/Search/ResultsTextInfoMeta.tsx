import { CollectionKey } from "../../utils/corpus";
import { particlesKONames } from "../../utils/string/grammar";

export const groupNames = new Map<number, string>([
  [0x01, "Name"],
  [0x02, "Digit"],
  [0x10, "Grm"],
  [0x11, "StrSel"],
  [0x12, "JP"],
  [0x13, "EN"],
  [0x14, "FR"],
  [0x15, "IT"],
  [0x16, "DE"],
  [0x17, "ES"],
  [0x19, "Kor"],
  [0x1A, "SC"],
  [0x32, "Character1"],
  [0x33, "Character2"],
  [0xBD, "Ctrl1"],
  [0xBE, "Ctrl2"],
  [0xFF, "System"],
]);

export const groupNamesGen4 = new Map<number, string>([
  [0x01, "Name"],
  [0x02, "Ctrl1"],
  [0xFF, "Ctrl2"],
]);

export const tagGroup = new Map<string, string>([
  ["ItemAcc", "Name"],
  ["ItemAccClassified", "Name"],
  ["ForceSingular", "Grm"],
  ["ForcePlural", "Grm"],
  ["ForceMasculine", "Grm"],
  ["ForceInitialCap", "Grm"],
  ["Gen", "StrSel"],
  ["Qty", "StrSel"],
  ["GenQty", "StrSel"],
  ["GenQtyDE", "StrSel"],
  ["Elision", "StrSel"],
  ["QtyZero", "StrSel"],
  ["DateIT", "StrSel"],
  ["Version", "StrSel"],
]);

const paramNames = new Map<string, string>([
  ["Name.*|[0]", "Idx"],
  ["Name.*|[1]@BlackWhite", "char"],
  ["Digit.*|[0]", "Idx"],
  ["Digit.*|[1]", "Sep"],
  ["Digit.*|[1]@BlackWhite", "char"],
  ["StrSel.*|[0]", "Ref"],
  ["StrSel.Gen|[1]", "M,F"],
  ["StrSel.Qty|[1]", "S,P"],
  ["StrSel.GenQty|[1]", "MS,FS"],
  ["StrSel.GenQty|[2]", "MP,FP"],
  ["StrSel.GenQtyDE|[1]", "MS,FS"],
  ["StrSel.GenQtyDE|[2]", "NS,P"],
  ["StrSel.Elision|[1]", "N,Y"],
  ["StrSel.QtyZero|[1]", "S,P"],
  ["StrSel.QtyZero|[2]", "Z"],
  ["StrSel.DateIT|[1]", "V,C"],
  ["StrSel.Version|[1]", "A,B"],
  ["EN.*|[0]", "Ref"],
  ["EN.*|[1]", "Force"],
  ["FR.*|[0]", "Ref"],
  ["FR.*|[1]", "Force"],
  ["IT.*|[0]", "Ref"],
  ["IT.*|[1]", "Force"],
  ["DE.*|[0]", "Ref"],
  ["DE.*|[1]", "Force"],
  ["ES.*|[0]", "Ref"],
  ["ES.*|[1]", "Force"],
  ["Kor.Particle|[0]", "char"],
  ["Ctrl1.Color|[0]", "Letter"],
  ["Ctrl1.Color|[1]", "Shadow"],
  ["Ctrl1.Color|[2]", "Back"],
  ["Ctrl1.xright|[0]", "value"],
  ["Ctrl1.xadd|[0]", "value"],
  ["Ctrl1.xset|[0]", "value"],
  ["Ctrl1.battle_oneline|[0]", "value"],
  ["Ctrl1.KeyCode|[0]", "name"],
  ["Ctrl1.NotUsed|[0]", "ID"],
  ["Ctrl2.WaitOne|[0]", "frame"],
  ["Ctrl2.WaitCont|[0]", "frame"],
  ["Ctrl2.CallBackOne|[0]", "arg"],
  ["Ctrl2.CallBackCont|[0]", "arg"],
  ["Ctrl2.CtrlSpeed|[0]", "mode"],
  ["System.Color|[0]", "Idx"],
]);

function* getParamDescription(groupName: string, tagName: string, paramName: string) {
  if (paramName === 'char')
    yield `Kor.Particle|${paramName}`;
  yield `${groupName}.${tagName}|${paramName}`;
  yield `${groupName}.*|${paramName}`;
  yield `*|${paramName}`;
  yield `*|*`;
}

function* getParamValueDescription(groupName: string, tagName: string, paramName: string, paramValue: string | number) {
  if (paramName === 'char' && typeof paramValue === 'number')
    yield `Kor.Particle|${paramName}=${particlesKONames[paramValue]}`;
  const pair = `${paramName}=${paramValue}`;
  yield `${groupName}.${tagName}|${pair}`;
  yield `${groupName}.*|${pair}`;
  yield `*|${pair}`;
  yield '';
}

function* appendCollection(collection: CollectionKey, iterable: Generator<string>) {
  for (const s of iterable) {
    yield `${s}@${collection}`;
    yield s;
  }
}

function* prependNamespace(iterable: Generator<string>) {
  for (const s of iterable) {
    yield `info:${s}`;
  }
}

export function getParamDescKeys(collection: CollectionKey, groupName: string, tagName: string, paramName: string): string[] {
  const result = [...prependNamespace(appendCollection(collection, getParamDescription(groupName, tagName, paramName)))];
  console.debug(result);
  return result;
}

export function getParamValueDescKeys(collection: CollectionKey, groupName: string, tagName: string, paramName: string, paramValue: string | number): string[] {
  const result = [...prependNamespace(appendCollection(collection, getParamValueDescription(groupName, tagName, paramName, paramValue)))];
  console.debug(result);
  return result;
}

export function remapParamName(collection: CollectionKey, groupName: string, tagName: string, i: number) {
  const paramName = `[${i}]`;
  for (const s of appendCollection(collection, getParamDescription(groupName, tagName, paramName))) {
    const remap = paramNames.get(s);
    if (remap !== undefined)
      return remap;
  }
  return paramName;
}
