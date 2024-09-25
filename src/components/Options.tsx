import { ChangeEventHandler, Dispatch, RefObject, SetStateAction, useRef } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { ModalArguments } from './Modal';
import { localStorageGetItem, localStorageSetItem, yieldToMain } from '../utils/utils';

import './Options.css';
import supportedLngs from '../i18n/supportedLngs.json';

const modes = ['system', 'light', 'dark'] as const;
export type Mode = typeof modes[number];
const isMode = (s: string): s is Mode => (modes as readonly string[]).includes(s);
const asValidMode = (s: unknown) => (typeof s === 'string' && isMode(s)) ? s : 'system';
export const getMode = (): Mode => asValidMode(localStorageGetItem('mode'));

export const defaultLimit = 500;
const isValidLimit = (n: unknown) => (typeof n === 'number' && !Number.isNaN(n) && Number.isInteger(n) && n > 0);
export const getLimit = () => {
  const value = +(localStorageGetItem('corpus-limit') ?? defaultLimit);
  return Number.isNaN(value) ? defaultLimit : value;
};

interface OptionsParams {
  showModal: (args: ModalArguments) => void,
  mode: Mode,
  setMode: Dispatch<SetStateAction<Mode>>,
  limit: number,
  setLimit: Dispatch<SetStateAction<number>>,
}

function OptionsMenu({showModal, mode, setMode, limit, limitRef}: OptionsParams & {limitRef: RefObject<HTMLInputElement>}) {
  const { t } = useTranslation();

  const onChangeLanguage: ChangeEventHandler<HTMLSelectElement> = async (e) => {
    await yieldToMain();
    await i18next.changeLanguage(e.target.value, (err: Error[] | undefined) => {
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
    }
  };

  const onChangeLongURL: ChangeEventHandler<HTMLSelectElement> = (e) => {
    const newLongURL = e.target.value;
    if (newLongURL === "true" || newLongURL === "false") {
      localStorageSetItem('corpus-longURL', newLongURL);
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
          {["true", "false"].map((mode) => <option key={mode} value={mode}>{t(`options.longURLs.${mode}`)}</option>)}
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
      <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512">
        {/* Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. */}
        <path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z" fill="currentColor"/>
      </svg>
      {t('options.options')}
    </button>
  );
}

export default Options;
