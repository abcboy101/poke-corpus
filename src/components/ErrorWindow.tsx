import { useContext } from "react";
import LocalizationContext from "./LocalizationContext";

function ErrorWindow() {
  const t = useContext(LocalizationContext);
  return <div className="app-window">
    <div className="app-window-inner">
      <section className="results-section">
        <h2>{ t('error.title') }</h2>
        <div>{ t('error.message') }</div>
      </section>
    </div>
  </div>;
}

export default ErrorWindow;
