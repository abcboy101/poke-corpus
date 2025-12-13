import { MouseEventHandler, useContext } from "react";
import LocalizationContext from "../LocalizationContext";

function ViewNearby({hash, callback}: {hash: string, callback?: MouseEventHandler<HTMLAnchorElement>}) {
  const t = useContext(LocalizationContext);
  return (
    <a href={hash} title={t('viewNearby')} onClick={callback}>
      <svg className="icon">
        <use href="sprites.svg#file-lines" />
      </svg>
    </a>
  );
}

export default ViewNearby;
