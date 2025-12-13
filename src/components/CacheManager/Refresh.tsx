import { MouseEventHandler, useContext } from "react";
import LocalizationContext from "../LocalizationContext";

function Refresh({callback}: {callback: MouseEventHandler<HTMLButtonElement>}) {
  const t = useContext(LocalizationContext);
  return (
    <button className="link" title={t('refresh')} onClick={callback}>
      <svg className="icon">
        <use href="sprites.svg#arrows-rotate" />
      </svg>
    </button>
  );
}
export default Refresh;
