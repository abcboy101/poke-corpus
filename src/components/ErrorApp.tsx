import { useTranslation } from "react-i18next";
import ErrorWindow from "./ErrorWindow";
import LocalizationContext from "./LocalizationContext";

function ErrorApp() {
  const { t } = useTranslation();
  return <LocalizationContext value={t}>
    <div className="app">
      <ErrorWindow />
    </div>
  </LocalizationContext>;
}

export default ErrorApp;
