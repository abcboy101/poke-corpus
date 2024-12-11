import { MouseEventHandler } from "react";
import { useTranslation } from "react-i18next";

function ViewNearby({hash, callback}: {hash: string, callback?: MouseEventHandler<HTMLAnchorElement>}) {
  const { t } = useTranslation();
  return (
    <a href={hash} rel="bookmark noreferrer" title={t('viewNearby')} onClick={callback}>
      <svg className="icon">
        <use href="sprites.svg#file-lines" />
      </svg>
    </a>
  );
}

export default ViewNearby;
