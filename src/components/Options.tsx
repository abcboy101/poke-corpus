import { ChangeEventHandler, Dispatch, RefObject, SetStateAction, useRef, useState } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { ModalArguments } from './Modal';
import { getMode, isMode, isValidLimit, localStorageGetItem, localStorageSetItem, Mode, modes, yieldToMain } from '../utils/utils';

import './Options.css';
import supportedLngs from '../i18n/supportedLngs.json';

interface OptionsParams {
  showModal: (args: ModalArguments) => void,
  limit: number,
  setLimit: Dispatch<SetStateAction<number>>,
}

function OptionsMenu({showModal, limit, limitRef}: OptionsParams & {limitRef: RefObject<HTMLInputElement | null>}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>(getMode);

  const onChangeLanguage: ChangeEventHandler<HTMLSelectElement> = async (e) => {
    await yieldToMain();
    await i18next.changeLanguage(e.target.value, (err: readonly Error[] | undefined) => {
      // Vite always throws 'Unknown variable dynamic import' on its first try loading each i18n file.
      // The user-facing error message should only be shown if some other error happens to occur.
      if (err && err.some((e) => !e.message.includes('Unknown variable dynamic import'))) {
        console.log(err);
        showModal({
          message: t('options.network'),
          buttons: [{message: <OptionsClose/>, autoFocus: true}],
        });
      }
    });
  };

  const onChangeMode: ChangeEventHandler<HTMLSelectElement> = (e) => {
    const newMode = e.target.value;
    if (isMode(newMode)) {
      setMode(newMode);
      localStorageSetItem('mode', newMode);
      document.body.classList.replace(`mode-${mode}`, `mode-${newMode}`);
    }
  };

  const onChangeLongURL: ChangeEventHandler<HTMLSelectElement> = (e) => {
    const newLongURL = e.target.value;
    if (newLongURL === "true" || newLongURL === "false") {
      localStorageSetItem('corpus-longURL', newLongURL);
    }
  };

  const onChangeRichText: ChangeEventHandler<HTMLSelectElement> = (e) => {
    const newRichText = e.target.value;
    if (newRichText === "true" || newRichText === "false") {
      localStorageSetItem('corpus-richText', newRichText);
    }
  };

  return (
    <div className="options">
      <div className="options-grid">
        <label htmlFor="language">{t('options.language')}</label>
        <select name="language" id="language" onChange={onChangeLanguage} defaultValue={i18next.language} autoFocus={true}>
          {supportedLngs.map((lang) => <option key={lang.code} value={lang.code} lang={lang.code}>{lang.name}</option>)}
        </select>

        <label htmlFor="mode">{t('options.mode')}</label>
        <select name="mode" id="mode" onChange={onChangeMode} defaultValue={mode}>
          {modes.map((mode) => <option key={mode} value={mode}>{t(`options.modes.${mode}`)}</option>)}
        </select>

        <label htmlFor="longURL">{t('options.longURL')}</label>
        <select name="longURL" id="longURL" onChange={onChangeLongURL} defaultValue={localStorageGetItem('corpus-longURL') ?? "false"}>
          {["true", "false"].map((mode) => <option key={mode} value={mode}>{t(`options.longURLSelect.${mode}`)}</option>)}
        </select>

        <label htmlFor="richText">{t('options.richText')}</label>
        <select name="richText" id="richText" onChange={onChangeRichText} defaultValue={localStorageGetItem('corpus-richText') ?? "true"}>
          {["true", "false"].map((mode) => <option key={mode} value={mode}>{t(`options.richTextSelect.${mode}`)}</option>)}
        </select>

        <label htmlFor="limit">{t(`options.limit`)}</label>
        <input ref={limitRef} type="number" name="limit" id="limit" min={1} defaultValue={limit}/>
      </div>
    </div>
  );
}

function OptionsClose() {
  const { t } = useTranslation();
  return t('options.close');
}

function Options(params: OptionsParams) {
  const { t } = useTranslation();
  const {showModal, setLimit} = params;
  const limitRef = useRef<HTMLInputElement>(null);

  const onClose = () => {
    if (limitRef.current !== null) {
      const newLimit = limitRef.current.valueAsNumber;
      if (isValidLimit(newLimit)) {
        localStorageSetItem('corpus-limit', newLimit.toString());
        setLimit(newLimit);
      }
    }
  };

  const options: ModalArguments = {
    classes: ['modal-options'],
    message: <OptionsMenu {...params} limitRef={limitRef}/>,
    buttons: [{message: <OptionsClose/>, callback: onClose}],
    cancelCallback: onClose,
  };
  return (
    <button className="header-options" onClick={() => showModal(options)}>
      <svg className="icon">
        <use href="sprites.svg#gear" />
      </svg>
      {t('options.options')}
    </button>
  );
}

export default Options;
