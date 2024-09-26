import { lazy, Suspense, useState, useTransition } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { getLimit, getMode, Mode } from './utils/utils';
import Modal, { ModalArguments } from './components/Modal';

import './App.css';
import logo from './res/logo.svg';
import './i18n/config';

type View = 'Search' | 'CacheManager';

// Allow these to be lazy-loaded so the page can be displayed first.
const Options = lazy(() => import('./components/Options.js'));
const Search = lazy(() => import('./components/Search.js'));
const CacheManager = lazy(() => import('./components/CacheManager.js'));

function Placeholder() {
  const { t } = useTranslation();
  return <>
    <div className="item-group">{t('status.loading')}</div>
    <div className="app-window"></div>
  </>;
}

function App() {
  const { t } = useTranslation();
  const [, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>(getMode);
  const [limit, setLimit] = useState(getLimit);
  const [view, setView] = useState<View>('Search');
  const [modalArguments, setModalArguments] = useState<ModalArguments | null>(null);
  const [cacheManagerLoaded, setCacheManagerLoaded] = useState(false);

  const showModal = (args: ModalArguments) => {
    setModalArguments(args);
  };

  const switchView = () => {
    startTransition(() => {
      const newView = view !== 'Search' ? 'Search' : 'CacheManager';
      setView(newView);
      if (!cacheManagerLoaded)
        setCacheManagerLoaded(newView === 'CacheManager');
    });
  };

  // Don't need to load the cache manager until the user navigates to it.
  // Once it's loaded, keep it open in the background to maintain its state.
  const cacheManager = cacheManagerLoaded && <CacheManager active={view === 'CacheManager'} showModal={showModal}/>;

  const header = (
    <header className="header">
      <h1>
        <a href="/poke-corpus/">
          <img className="header-logo" src={logo} alt="" height="40" width="40" /> {t('title', {version: t('version')})}
        </a>
      </h1>
      <Suspense><Options showModal={showModal} mode={mode} setMode={setMode} limit={limit} setLimit={setLimit}/></Suspense>
    </header>
  );

  const footer = (
    <footer>
      <span>{t('tagline')}</span>
      <span className="separator"> | </span>
      <span>{t('footerText')}</span>
      <span className="separator"> | </span>
      <span><button className="link" onClick={switchView}>{view !== 'Search' ? t('backToSearch') : t('manageCache')}</button></span>
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
      <Suspense fallback={<Placeholder/>}>
        <Search showModal={showModal} limit={limit}/>
        { cacheManager }
      </Suspense>
      { footer }
      <Modal {...modalArguments}/>
    </div>
  );
}

export default App;
