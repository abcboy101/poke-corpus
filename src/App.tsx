import { Dispatch, MouseEventHandler, SetStateAction, useCallback, useEffect, useState } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { getLimit, getMode, getRichText, localStorageRemoveItem } from './utils/utils';
import Options from './components/Options';
import Search from './components/Search/Search';
import CacheManager from './components/CacheManager/CacheManager';
import Modal, { ModalArguments, ShowModal } from './components/Modal';

import './App.css';
import './safari.css';
import './i18n/config';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorWindow from './components/ErrorWindow';
import { initializeLoader, Loader } from './utils/loader';

declare global {
  /** Instantiates a Loader during SSR. See entry-server.tsx for definition. */
  function getLoaderSSR(): Loader;
  function reloadCorpus(): void;
}

type View = 'Search' | 'CacheManager';
const initialView = 'Search';

function Header({showModal, richText, setRichText, limit, setLimit, reset}: {showModal: ShowModal, richText: boolean, setRichText: Dispatch<SetStateAction<boolean>>, limit: number, setLimit: Dispatch<SetStateAction<number>>, reset: MouseEventHandler<HTMLAnchorElement>}) {
  const { t } = useTranslation();
  return (
    <header className="header">
      <h1>
        <a href="/poke-corpus/" onClick={reset}>
          <img className="header-logo" src="logo.svg" alt="" height="40" width="40" /> {t('title', {version: t('version')})}
        </a>
      </h1>
      <ErrorBoundary fallback={null}>
        <Options showModal={showModal} richText={richText} setRichText={setRichText} limit={limit} setLimit={setLimit}/>
      </ErrorBoundary>
    </header>
  );
}

function Footer({view, switchView}: {view: View, switchView: () => void}) {
  const { t } = useTranslation();
  return (
    <footer>
      <span>{t('tagline')}</span>
      <span className="separator" translate="no"> | </span>
      <span>{t('footerText')}</span>
      <span className="separator" translate="no"> | </span>
      <span><button className="link" onClick={switchView}>{t(view !== 'Search' ? 'backToSearch' : 'manageCache')}</button></span>
      <span className="separator" translate="no"> | </span>
      <span><a href="https://github.com/abcboy101/poke-corpus">{t('github')}</a></span>
    </footer>
  );
}

function App() {
  const [richText, setRichText] = useState(getRichText);
  const [limit, setLimit] = useState(getLimit);
  const [view, setView] = useState<View>(initialView);
  const [appKey, setAppKey] = useState(0);
  const [modalKey, setModalKey] = useState(0);
  const [modalArguments, setModalArguments] = useState<ModalArguments | null>(null);
  const [cacheManagerLoaded, setCacheManagerLoaded] = useState(false);
  const [loader, setLoader] = useState<Loader | null | undefined>(import.meta.env.SSR ? getLoaderSSR() : undefined);

  useEffect(() => {
    const mode = getMode();
    document.body.classList.add(`mode-${mode}`);
    setCacheManagerLoaded(true);
    initializeLoader(setLoader);
  }, []);

  const reset: MouseEventHandler<HTMLAnchorElement> = useCallback((e) => {
    window.location.hash = '';
    localStorageRemoveItem('corpus-params'); // clear saved search query
    setView(initialView);
    setAppKey((prev) => (prev + 1) & 0xFF); // force re-render
    setModalKey(0);
    setModalArguments(null);
    e.preventDefault();
  }, []);

  const showModal: ShowModal = useCallback((args) => {
    setModalArguments(args);
    setModalKey((prev) => (prev + 1) & 0xFF);
  }, []);

  const switchView = useCallback(() => {
    setView((prev) => {
      const newView = prev !== 'Search' ? 'Search' : 'CacheManager';
      if (!cacheManagerLoaded)
        setCacheManagerLoaded(newView === 'CacheManager');
      return newView;
    });
  }, []);

  if (loader === undefined) {
    return undefined;
  }

  const classes = ['app', `view-${view.toLowerCase()}`];
  if (!import.meta.env.SSR && /^((?!chrome|android).)*safari/i.test(navigator.userAgent))
    classes.push('ua-safari');
  return (
    <div key={appKey} className={classes.join(' ')} lang={i18next.language} dir={i18next.dir()}>
      <Header showModal={showModal} richText={richText} setRichText={setRichText} limit={limit} setLimit={setLimit} reset={reset} />
      {
        loader !== null ? (
          <ErrorBoundary FallbackComponent={ErrorWindow}>
            <Search loader={loader} showModal={showModal} richText={richText} limit={limit}/>
            <CacheManager active={view === 'CacheManager'} loader={loader} showModal={showModal}/>
          </ErrorBoundary>
        ) : <ErrorWindow />
      }
      <Footer view={view} switchView={switchView} />
      <Modal key={modalKey} {...modalArguments}/>
    </div>
  );
}

export default App;
