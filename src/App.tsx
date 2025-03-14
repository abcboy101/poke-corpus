import { lazy, useEffect, useState, useTransition } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { getLimit, getMode, getRichText } from './utils/utils';
import Options from './components/Options.js';
import Search from './components/Search/Search.js';
import Modal, { ModalArguments, ShowModal } from './components/Modal';

import './App.css';
import './safari.css';
import './i18n/config';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorWindow from './components/ErrorWindow';

type View = 'Search' | 'CacheManager';

// Allow these to be lazy-loaded so the page can be displayed first.
const CacheManager = lazy(() => import('./components/CacheManager/CacheManager.js'));

function App() {
  const { t } = useTranslation();
  const [, startTransition] = useTransition();
  const [richText, setRichText] = useState(getRichText);
  const [limit, setLimit] = useState(getLimit);
  const [view, setView] = useState<View>('Search');
  const [modalArguments, setModalArguments] = useState<ModalArguments | null>(null);
  const [cacheManagerLoaded, setCacheManagerLoaded] = useState(false);

  useEffect(() => {
    const mode = getMode();
    document.body.classList.add(`mode-${mode}`);
    setCacheManagerLoaded(true);
  }, []);

  const showModal: ShowModal = (args) => {
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
          <img className="header-logo" src="logo.svg" alt="" height="40" width="40" /> {t('title', {version: t('version')})}
        </a>
      </h1>
      <ErrorBoundary fallback={null}>
        <Options showModal={showModal} richText={richText} setRichText={setRichText} limit={limit} setLimit={setLimit}/>
      </ErrorBoundary>
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

  const classes = ['app', `view-${view.toLowerCase()}`];
  if (!import.meta.env.SSR && /^((?!chrome|android).)*safari/i.test(navigator.userAgent))
    classes.push('ua-safari');
  return (
    <div className={classes.join(' ')} lang={i18next.language} dir={i18next.dir()}>
      { header }
      <ErrorBoundary FallbackComponent={ErrorWindow}>
        <Search showModal={showModal} richText={richText} limit={limit}/>
        { cacheManager }
      </ErrorBoundary>
      { footer }
      <Modal {...modalArguments}/>
    </div>
  );
}

export default App;
