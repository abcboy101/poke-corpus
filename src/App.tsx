import { MouseEventHandler, useCallback, useContext, useEffect, useState } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { getLimit, getMode, getRichText, localStorageRemoveItem } from './utils/utils';
import Options, { OptionsParams } from './components/Options';
import Search from './components/Search/Search';
import CacheManager from './components/CacheManager/CacheManager';
import Modal, { ModalArguments, ShowModal } from './components/Modal';
import NoScript from './components/Search/NoScript';

import './App.css';
import './safari.css';
import './i18n/config';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorWindow from './components/ErrorWindow';
import { initializeLoader, Loader } from './utils/loader';
import Tutorial from './components/Tutorial/Tutorial';
import LocalizationContext from './components/LocalizationContext';

declare global {
  /** Instantiates a Loader during SSR. See entry-server.tsx for definition. */
  function getLoaderSSR(): Loader;
  function reloadCorpus(): void;
}

type View = 'Search' | 'CacheManager';
const initialView = 'Search';

function Header({reset, ...optionsParams}: {reset: MouseEventHandler<HTMLAnchorElement>} & OptionsParams) {
  const t = useContext(LocalizationContext);
  return (
    <header className="header">
      <h1>
        <a href="/poke-corpus/" onClick={reset}>
          <img className="header-logo" src="logo.svg" alt="" height="40" width="40" /> {t('titleVersion', {title: t('title'), version: t('version')})}
        </a>
      </h1>
      <ErrorBoundary fallback={null}>
        <Options {...optionsParams}/>
      </ErrorBoundary>
    </header>
  );
}

function Footer({view, switchView, replaceModal}: {view: View, switchView: () => void, replaceModal: ShowModal}) {
  const t = useContext(LocalizationContext);
  return (
    <footer>
      <span>{t('tagline')}</span>
      <span className="separator" translate="no"> | </span>
      <span>{t('footerText')}</span>
      <span className="separator" translate="no"> | </span>
      <Tutorial replaceModal={replaceModal} />
      <span className="separator" translate="no"> | </span>
      <button id="view-switcher" className="link" onClick={switchView}>{t(view !== 'Search' ? 'backToSearch' : 'manageCache')}</button>
      <span className="separator" translate="no"> | </span>
      <a href="https://github.com/abcboy101/poke-corpus">{t('github')}</a>
    </footer>
  );
}

function App() {
  const [language, setLanguage] = useState(i18next.language);
  const [richText, setRichText] = useState(getRichText);
  const [limit, setLimit] = useState(getLimit);
  const [view, setView] = useState<View>(initialView);
  const [appKey, setAppKey] = useState(0);
  const [modalArguments, setModalArguments] = useState<readonly ModalArguments[]>(import.meta.env.SSR ? [{isModal: false, classes: ['noscript'], messageElement: <NoScript />}] : []);
  const [cacheManagerLoaded, setCacheManagerLoaded] = useState(false);
  const [loader, setLoader] = useState<Loader | null | undefined>(import.meta.env.SSR ? getLoaderSSR() : undefined);
  const { t } = useTranslation();

  useEffect(() => {
    if (window.location.pathname !== import.meta.env.BASE_URL)
      window.location.replace(import.meta.env.BASE_URL + window.location.search + window.location.hash); // redirect to canonical URL, otherwise ServiceWorker can show a broken page
    else if (window.location.search)
      window.history.replaceState(null, '', window.location.pathname + window.location.hash); // remove query param from URL so that internal links don't include it

    const mode = getMode();
    document.body.classList.add(`mode-${mode}`);
    setCacheManagerLoaded(true);
    initializeLoader(setLoader);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = i18next.dir(language);
    document.title = t('title');
    document.querySelector('meta[name="description"]')?.setAttribute("content", t('tutorial:message.intro'));
  }, [language]);

  const reset: MouseEventHandler<HTMLAnchorElement> = useCallback((e) => {
    window.location.hash = '';
    localStorageRemoveItem('corpus-params'); // clear saved search query
    setView(initialView);
    setAppKey((prev) => (prev + 1) & 0xFF); // force re-render
    setModalArguments([]);
    e.preventDefault();
  }, []);

  const showModal: ShowModal = useCallback((args) => {
    setModalArguments((prev) => prev.concat(args));
  }, []);

  const replaceModal: ShowModal = useCallback((args) => {
    setModalArguments([args]);
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
    <LocalizationContext value={t}>
      <div key={appKey} className={classes.join(' ')}>
        <Header showModal={showModal} language={language} setLanguage={setLanguage} richText={richText} setRichText={setRichText} limit={limit} setLimit={setLimit} reset={reset} />
        {
          loader !== null ? (
            <ErrorBoundary FallbackComponent={ErrorWindow}>
              <Search loader={loader} showModal={showModal} language={language} richText={richText} limit={limit}/>
              <CacheManager active={view === 'CacheManager'} loader={loader} showModal={showModal}/>
            </ErrorBoundary>
          ) : <ErrorWindow />
        }
        <Footer view={view} switchView={switchView} replaceModal={replaceModal} />
        <Modal closeCallback={() => { setModalArguments((prev) => prev.slice(0, -1)); }} {...modalArguments.at(-1)} />
      </div>
    </LocalizationContext>
  );
}

export default App;
