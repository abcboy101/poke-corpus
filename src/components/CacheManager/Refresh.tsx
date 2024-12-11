import { MouseEventHandler } from "react";
import { useTranslation } from "react-i18next";

function Refresh({callback}: {callback: MouseEventHandler<HTMLButtonElement>}) {
  const { t } = useTranslation();
  return (
    <button className="link" title={t('refresh')} onClick={callback}>
      <svg className="icon">
        <use href="sprites.svg#arrows-rotate" />
      </svg>
    </button>
  );
}
export default Refresh;
