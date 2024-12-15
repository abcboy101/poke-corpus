import ReactDOMServer from "react-dom/server";
import App from "./App";

export const render = () => {
  return ReactDOMServer.renderToStaticMarkup(<noscript><App /></noscript>);
};
