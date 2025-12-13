import { MouseEventHandler, useContext } from "react";
import LocalizationContext from "../LocalizationContext";

function Copy({callback}: {callback?: MouseEventHandler<HTMLButtonElement>}) {
  const t = useContext(LocalizationContext);
  return (
    <button className="link" title={t('copy')} onClick={callback}>
      <svg className="icon">
        <use href="sprites.svg#copy" />
      </svg>
    </button>
  );
}

export default Copy;
