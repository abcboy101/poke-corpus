import { MouseEventHandler } from "react";
import { useTranslation } from "react-i18next";

function Copy({callback}: {callback?: MouseEventHandler<HTMLButtonElement>}) {
  const { t } = useTranslation();
  return (
    <button className="link" title={t('copy')} onClick={callback}>
      <svg className="icon">
        <use href="sprites.svg#copy" />
      </svg>
    </button>
  );
}

export default Copy;
