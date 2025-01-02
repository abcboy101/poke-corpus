import ReactDOMServer from "react-dom/server";
import App from "./App";
import ErrorApp from "./components/ErrorApp";

export const render = () => {
  const errorApp = ReactDOMServer.renderToStaticMarkup(<ErrorApp />);
  return ReactDOMServer.renderToStaticMarkup(<>
    <noscript><App /></noscript>
    <script dangerouslySetInnerHTML={{__html: `window.addEventListener('error', function() { document.getElementById('root').innerHTML = '${errorApp}'; });`}}/>
  </>);
};
