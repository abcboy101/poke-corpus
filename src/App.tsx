import { Dispatch, SetStateAction, useState, useMemo } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import Search from './components/Search';
import CacheManager from './components/CacheManager';
import { localStorageGetItem, localStorageSetItem } from './utils/utils';

import './App.css';
import logo from './res/logo.svg';
import supportedLngs from './i18n/supportedLngs.json';
import './i18n/config';
import Modal, { ModalArguments, ShowModalArguments } from './components/Modal';

const modes = ['system', 'light', 'dark'] as const;
const views = ['Search', 'CacheManager'] as const;
type Mode = typeof modes[number];
type View = typeof views[number];

function LanguageSelect() {
  const { t } = useTranslation();
  return (
    <>
      <label htmlFor="language">{t('language')}</label>
      <select name="language" id="language" onChange={(e) => i18next.changeLanguage(e.target.value)} defaultValue={i18next.language}>
        {supportedLngs.map((lang) => <option key={lang.code} value={lang.code} lang={lang.code}>{lang.name}</option>)}
      </select>
    </>
  );
}

function ModeSelect({mode, setMode}: {mode: Mode, setMode: Dispatch<SetStateAction<Mode>>}) {
  const { t } = useTranslation();
  return (
    <>
      <label htmlFor="mode">{t('mode')}</label>
      <select name="mode" id="mode" onChange={(e) => { setMode(e.target.value as Mode); localStorageSetItem('mode', e.target.value); }} defaultValue={mode}>
        {modes.map((mode) => <option key={mode} value={mode}>{t(`modes.${mode}`)}</option>)}
      </select>
    </>
  );
}

function App() {
  const { t } = useTranslation();
  const [mode, setMode] = useState((localStorageGetItem('mode') ?? 'system') as Mode);
  const [view, setView] = useState('Search' as View);
  const [modalArguments, setModalArguments] = useState({active: false} as ModalArguments);

  const showModal = (args: ShowModalArguments) => {
    setModalArguments(args);
  };

  const header = (
    <header className="header">
      <h1>
        <a href="/poke-corpus/">
          <img className="header-logo" src={logo} alt="" height="40" width="40" /> {t('title', {version: t('version')})}
        </a>
      </h1>
      <div className="header-options">
        <LanguageSelect/>
        <ModeSelect mode={mode} setMode={setMode}/>
      </div>
    </header>
  );
  const search = useMemo(() => <Search showModal={showModal}/>, []);
  const cacheManager = <CacheManager active={view === "CacheManager"} showModal={showModal}/>;
  const modal = <Modal {...modalArguments}/>;
  const footer = (
    <footer>
      <span>{t('tagline')}</span>
      <span className="separator"> | </span>
      <span>{t('footerText')}</span>
      <span className="separator"> | </span>
      <span><button className="link" onClick={() => setView(view !== 'Search' ? 'Search' : 'CacheManager')}>{view !== 'Search' ? t('backToSearch') : t('manageCache')}</button></span>
      <span className="separator"> | </span>
      <span><a href="https://github.com/abcboy101/poke-corpus">{t('github')}</a></span>
    </footer>
  );

  return (
    <div className={`app mode-${mode} view-${view.toLowerCase()}`} lang={i18next.language} dir={i18next.dir()}>
      { header }
      { search }
      { cacheManager }
      { footer }
      { modal }
    </div>
  );
}

export default App;
