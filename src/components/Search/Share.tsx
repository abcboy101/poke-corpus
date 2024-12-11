import { MouseEventHandler } from "react";
import { useTranslation } from "react-i18next";

function Share({hash}: {hash: string}) {
  const { t } = useTranslation();
  const shareWithHash: MouseEventHandler<HTMLAnchorElement> = (e) => {
    const url = new URL(window.location.href);
    url.hash = hash;
    if ("share" in navigator) {
      e.preventDefault();
      navigator.share({url: url.toString()});
    }
  };

  return (
    <a href={hash} rel="bookmark noreferrer" target="_blank" title={t('share')} onClick={shareWithHash}>
      <svg className="icon">
        <use href="sprites.svg#share" />
      </svg>
    </a>
  );
}

export default Share;
