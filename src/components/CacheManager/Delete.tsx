import { MouseEventHandler, useContext } from "react";
import LocalizationContext from "../LocalizationContext";

function Delete({callback}: {callback: MouseEventHandler<HTMLButtonElement>}) {
  const t = useContext(LocalizationContext);
  return (
    <button className="link" title={t('delete')} onClick={callback}>
      <svg className="icon">
        <use href="sprites.svg#trash-can" />
      </svg>
    </button>
  );
}

export default Delete;
