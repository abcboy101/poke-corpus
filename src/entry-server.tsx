import ReactDOMServer from "react-dom/server";
import App from "./App";
import ErrorApp from "./components/ErrorApp";

import { readCorpus } from './utils/corpusFs';
import { getLoader } from './utils/loader';

export const render = () => {
  // Add loader to global scope. See App.tsx for usage.
  const corpus = readCorpus();
  const loader = getLoader(corpus);
  global.getLoaderSSR = () => loader;

  const errorApp = ReactDOMServer.renderToStaticMarkup(<ErrorApp />);
  return ReactDOMServer.renderToStaticMarkup(<>
    <noscript><App /></noscript>
    <script dangerouslySetInnerHTML={{__html: `window.addEventListener('error', function() { document.getElementById('root').innerHTML = '${errorApp}'; });`}}/>
  </>);
};
