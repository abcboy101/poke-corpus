import { useState } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import Search from './components/Search';
import CacheManager from './components/CacheManager';
import Options, { asValidMode, Mode } from './components/Options';
import Modal, { ModalArguments, ShowModalArguments } from './components/Modal';
import { localStorageGetItem } from './utils/utils';

import './App.css';
import logo from './res/logo.svg';
import './i18n/config';

type View = 'Search' | 'CacheManager';

function App() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>(asValidMode(localStorageGetItem('mode')));
  const [view, setView] = useState<View>('Search');
  const [modalArguments, setModalArguments] = useState<ModalArguments>({});

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
      <Options showModal={showModal} mode={mode} setMode={setMode}/>
    </header>
  );
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

  const classes = ['app', `mode-${mode}`, `view-${view.toLowerCase()}`];
  if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent))
    classes.push('ua-safari');
  return (
    <div className={classes.join(' ')} lang={i18next.language} dir={i18next.dir()}>
      { header }
      <Search showModal={showModal}/>
      <CacheManager active={view === "CacheManager"} showModal={showModal}/>
      { footer }
      <Modal {...modalArguments}/>
    </div>
  );
}

export default App;
