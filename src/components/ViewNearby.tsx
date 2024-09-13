import { MouseEventHandler } from "react";
import { useTranslation } from "react-i18next";

function ViewNearby({hash, callback}: {hash: string, callback?: MouseEventHandler<HTMLAnchorElement>}) {
  const { t } = useTranslation();
  return (
    <a href={hash} rel="bookmark noreferrer" title={t('viewNearby')} onClick={callback}>
      <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="-64 0 512 512">
        {/* Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. */}
        <path d="M64 464c-8.8 0-16-7.2-16-16V64c0-8.8 7.2-16 16-16H224v80c0 17.7 14.3 32 32 32h80V448c0 8.8-7.2 16-16 16H64zM64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V154.5c0-17-6.7-33.3-18.7-45.3L274.7 18.7C262.7 6.7 246.5 0 229.5 0H64zm56 256c-13.3 0-24 10.7-24 24s10.7 24 24 24H264c13.3 0 24-10.7 24-24s-10.7-24-24-24H120zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24H264c13.3 0 24-10.7 24-24s-10.7-24-24-24H120z" fill="currentColor"/>
      </svg>
    </a>
  );
}

export default ViewNearby;