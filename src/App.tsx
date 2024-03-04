import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { cacheVersion } from './webWorker/corpus';
import Search from './components/Search';

import './App.css';
import logo from './res/logo.svg';
import supportedLngs from './i18n/supportedLngs.json';
import './i18n/config';

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

function ModeSelect({mode, setMode}: {mode: string, setMode: Dispatch<SetStateAction<string>>}) {
  const { t } = useTranslation();
  return (
    <>
      <label htmlFor="mode">{t('mode')}</label>
      <select name="mode" id="mode" onChange={(e) => { setMode(e.target.value); localStorage.setItem('mode', e.target.value); }} defaultValue={mode}>
        <option value='system'>{t('modeSystem')}</option>
        <option value='light'>{t('modeLight')}</option>
        <option value='dark'>{t('modeDark')}</option>
      </select>
    </>
  );
}

function App() {
  const { t } = useTranslation();
  const [mode, setMode] = useState(localStorage.getItem('mode') ?? 'system');

  // invalidate old caches on load
  useEffect(() => {
    if ('caches' in window) {
      window.caches.keys().then((keyList) => {
        Promise.all(keyList.filter((key) => key.startsWith('corpus-') && key !== cacheVersion).map((key) => window.caches.delete(key)))
      });
    }
  }, []);

  return (
    <div className={`App App-mode-${mode}`} lang={i18next.language} dir={i18next.dir()}>
      <header className="App-header">
        <h1>
          <a href="/poke-corpus/">
            <img className="App-header-logo" src={logo} alt="" height="40" width="40" /> {t('title', {version: t('version')})}
          </a>
        </h1>
        <div className="App-header-options">
          <LanguageSelect/>
          <ModeSelect mode={mode} setMode={setMode}/>
        </div>
      </header>
      <Search/>
      <footer>
        {t('tagline')} | {t('footerText')} | <a href="https://github.com/abcboy101/poke-corpus">{t('github')}</a>
      </footer>
    </div>
  );
}

export default App;
