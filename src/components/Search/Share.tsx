import { MouseEventHandler, useContext } from "react";
import LocalizationContext from "../LocalizationContext";

const shareWithHash: MouseEventHandler<HTMLAnchorElement> = (e) => {
  if ("share" in navigator) {
    const url = e.currentTarget.href;
    e.preventDefault();
    navigator.share({url: url}).catch((err: unknown) => {
      if (err instanceof Error && err.name !== 'AbortError')
        return; // user canceled the share operation
      console.error(err);
      window.open(url, '_blank'); // fall back to opening it in a new tab
    });
  }
};

function Share({hash}: {hash: string}) {
  const t = useContext(LocalizationContext);
  return (
    <a href={hash} rel="noreferrer" target="_blank" title={t('share')} onClick={shareWithHash}>
      <svg className="icon">
        <use href="sprites.svg#share" />
      </svg>
    </a>
  );
}

export default Share;
