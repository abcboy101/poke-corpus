import { ReactElement } from "react";
import { ModalArguments } from "../../components/Modal";
import { SearchParamsFactory } from "../../utils/searchParams";

import './ResultsTextInfo.css';
import { CollectionKey, LanguageKey } from "../../utils/corpus";
import { TFunction } from "i18next";
import { getCorpusGroups, getNamespace } from "../../utils/corpusGroups";
import { variableCodeToName, variableNameToCode } from "../../utils/string/variableNames";
import { getParamDescKeys, getParamValueDescKeys, groupNamesGen4, groupNames, remapParamName, tagGroup } from "./ResultsTextInfoMeta";

function textInfo(t: TFunction, factory: SearchParamsFactory, element: HTMLElement, collection: CollectionKey, language: LanguageKey, code: string, message: ReactElement): ModalArguments {
  const onCancel = () => {
    setTimeout(() => {
      element.focus();
    }, 0);
  };
  return {
    classes: ['modal-text-info'],
    messageElement: message,
    buttons: [
      {
        message: t('infoModal.viewLines'),
        callback: () => {
          const cb = document.getElementById('showAllLanguages');
          const showAllLanguages = cb instanceof HTMLInputElement && cb.checked;
          window.location.hash = factory.searchParamsToHash({
            query: code,
            type: 'exact',
            caseInsensitive: false,
            common: true,
            script: true,
            showAllLanguages: showAllLanguages,
            collections: [collection],
            languages: [language],
            run: true,
          });
        },
      },
      {
        message: t('infoModal.close'),
        autoFocus: true,
        callback: onCancel,
      },
    ],
    cancelCallback: onCancel,
  };
}

interface InfoStr { group: string, tag: string, parameters: string }
interface InfoNum { group: number, tag: number, parameters: ReturnType<typeof parseParameters> }

function getTagDescription(t: TFunction, collection: CollectionKey, flags: ReturnType<typeof getCorpusGroups>, info: InfoStr | InfoNum) {
  let groupName: string, groupNum: number, tagName: string, tagNum: number, groupRemap: string;
  const params: ReactElement[] = [];
  if (typeof info.group === 'string') {
    const { group, tag, parameters } = info as InfoStr;
    const code = variableNameToCode(`${group}:${tag}`, collection);
    [groupName, tagName] = [group, tag] as const;
    [groupNum, tagNum] = [parseInt(code.slice(0, 2), 16), parseInt(code.slice(2, 4), 16)];
    if (groupName === 'DE' && tagName === 'GenQty')
      tagName = 'GenQtyDE';
    groupRemap = tagGroup.get(tagName) ?? groupName;
    for (const match of parameters.matchAll(/([^= ]+)="([^"]+)" /g)) {
      const [paramName, paramValue] = [match[1], match[2]];
      const paramDesc = t(getParamDescKeys(collection, groupRemap, tagName, paramName));
      const paramValueDesc = t(getParamValueDescKeys(collection, groupRemap, tagName, paramName, paramValue));
      params.push(<li key={match[1]}>{match[1]} &#x2013; {paramDesc} ({paramValueDesc || paramValue})</li>);
    }
  }
  else {
    const { group, tag, parameters } = info as InfoNum;
    const name = variableCodeToName(((group * 0x100) + tag).toString(16).toUpperCase().padStart(4, '0'), collection) ?? 'Unknown:all';
    [groupName, tagName] = name.split(':');
    [groupNum, tagNum] = [group, tag] as const;
    if (groupName === 'StrSel' && tagName === 'Gen' && parameters.num.length >= 3)
      tagName = 'GenQtyDE';
    if (groupName === 'Unknown')
      groupName = (flags.isGen4 ? groupNamesGen4 : groupNames).get(groupNum) ?? 'Unknown';
    groupRemap = tagGroup.get(tagName) ?? groupName;
    let parameterStr = parameters.str;
    for (let i = 0; i < parameters.num.length; i++) {
      const paramNameArr = remapParamName(collection, groupName, tagName, i).split(',');
      for (let j = 0; j < paramNameArr.length; j++) {
        const paramName = paramNameArr[j];
        const treatAsNum = paramNameArr.length === 1 && paramName !== 'name';
        const paramValueNum = treatAsNum ? parameters.num[i] : ((parameters.num[i] & (0xFF << (8 * j))) >> (8 * j));
        const paramValue = treatAsNum ? paramValueNum : (() => {
          const paramValueStr = parameterStr.slice(0, paramValueNum);
          parameterStr = parameterStr.slice(paramValueNum);
          return paramValueStr;
        })();
        if (paramValue === '')
          continue;
        const paramDesc = t(getParamDescKeys(collection, groupRemap, tagName, paramName));
        const paramValueDesc = t(getParamValueDescKeys(collection, groupRemap, tagName, paramName, paramValue));
        params.push(<li key={paramName}>{paramName} &#x2013; {paramDesc} ({paramValueDesc || paramValue})</li>);
      }
    }
  }

  const tagDesc = t([
    `info:${groupRemap}.${tagName}`,
    `info:${groupRemap}.*`,
    `info:*`,
  ]);
  return [
    <>
      <dt>{t('infoModal.groupHeader')}</dt>
      <dd>{ collection === 'Masters' ? groupName : `${groupName} (${groupNum}:${tagNum})`}</dd>
    </>,
    <>
      <p>{tagDesc}</p>
      { params.length > 0 && <ul>{params}</ul> }
    </>,
  ];
}

function getOtherDescription(t: TFunction, collection: CollectionKey, flags: ReturnType<typeof getCorpusGroups>, code: string) {
  const namespace = getNamespace(collection);
  const tagDesc = t([
    `info:${namespace}.${code}@${collection}`,
    `info:${namespace}.${code}`,
    `info:Other.${code}@${collection}`,
    `info:Other.${code}`,
    `info:*`,
  ]);
  const params: ReactElement[] = [];
  return [
    null,
    <>
      <p>{tagDesc}</p>
      { params.length > 0 && <ul>{params}</ul> }
    </>,
  ];
}

function parseParameters(numParams: string, strParams: string) {
  const num: number[] = numParams ? numParams.slice(1, -1).split(',').map((param) => parseInt(param, 16)) : [];
  return { num, str: strParams };
}

function message(t: TFunction, { code, end, collection }: { code: string, end: string, collection: CollectionKey }) {
  const [fields, description] = match(t, code, collection);
  return (
    <div className="text-info">
      <dl>
        <dt>{t('infoModal.codeHeader')}</dt>
        <dd className="code">{end ? `${code}…${end}` : code}</dd>
        { fields }
      </dl>
      { description }
    </div>
  );
}

function match(t: TFunction, code: string, collection: CollectionKey) {
  const flags = getCorpusGroups(collection);
  let match: RegExpExecArray | null;
  if (['BrilliantDiamondShiningPearl', 'Champions', 'Masters'].includes(collection)) {
    if ((match = /\[([^: ]+):([^: ]+) ((?:[^= ]+="[^"]+" )*)\]/.exec(code)) !== null)
      return getTagDescription(t, collection, flags, { group: match[1], tag: match[2], parameters: match[3] });
    else
      return getOtherDescription(t, collection, flags, code);
  }
  if (flags.isModern) {
    if ((match = /\[VAR ([0-9A-F]{2})([0-9A-F]{2})((?:\((?:[0-9A-F]{4},)*[0-9A-F]{4}\))?)\](.*)/.exec(code)) !== null)
      return getTagDescription(t, collection, flags, { group: parseInt(match[1], 16), tag: parseInt(match[2], 16), parameters: parseParameters(match[3], match[4]) });
    else if ((match = /\[~ (\d+)\]/.exec(code)) !== null)
      return getTagDescription(t, collection, flags, { group: 0xBD, tag: 0xFF, parameters: { num: [Number(match[1])], str: '' } });
    else if (code === '\\r')
      return getTagDescription(t, collection, flags, { group: 0xBE, tag: 0x00, parameters: { num: [], str: '' } });
    else if (code === '\\c')
      return getTagDescription(t, collection, flags, { group: 0xBE, tag: 0x01, parameters: { num: [], str: '' } });
    else if ((match = /\[WAIT (\d+)\]/.exec(code)) !== null)
      return getTagDescription(t, collection, flags, { group: 0xBE, tag: 0x02, parameters: { num: [], str: '' } });
    else
      return getOtherDescription(t, collection, flags, code);
  }
  return [null, null];
}

export function getTextInfo(t: TFunction, factory: SearchParamsFactory, element: HTMLElement, collection: CollectionKey, language: LanguageKey): ModalArguments {
  const code = element.getAttribute('data-start') ?? '';
  const end = element.getAttribute('data-end') ?? '';
  return textInfo(t, factory, element, collection, language, code, message(t, { code, end, collection }));
};
