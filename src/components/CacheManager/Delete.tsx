import { MouseEventHandler } from "react";
import { useTranslation } from "react-i18next";

function Delete({callback}: {callback: MouseEventHandler<HTMLButtonElement>}) {
  const { t } = useTranslation();
  return (
    <button className="link" title={t('delete')} onClick={callback}>
      <svg className="icon">
        <use href="sprites.svg#trash-can" />
      </svg>
    </button>
  );
}

export default Delete;
