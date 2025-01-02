import { useTranslation } from "react-i18next";

function ErrorWindow() {
  const { t } = useTranslation();
  return <div className="app-window">
    <section className="results-section">
      <h2>{ t('error.title') }</h2>
      <div>{ t('error.message') }</div>
    </section>
  </div>;
}

export default ErrorWindow;
