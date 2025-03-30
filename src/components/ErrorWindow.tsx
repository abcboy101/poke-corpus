import { useTranslation } from "react-i18next";

function ErrorWindow() {
  const { t } = useTranslation();
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
