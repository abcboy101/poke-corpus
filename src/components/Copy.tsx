import { MouseEventHandler } from "react";
import { useTranslation } from "react-i18next";

function Copy({callback}: {callback?: MouseEventHandler<HTMLButtonElement>}) {
  const { t } = useTranslation();
  return (
    <button className="link" title={t('copy')} onClick={callback}>
      <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="-64 0 512 512">
        {/* Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. */}
        <path d="M208 0H332.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V336c0 26.5-21.5 48-48 48H208c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zM48 128h80v64H64V448H256V416h64v48c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V176c0-26.5 21.5-48 48-48z" fill="currentColor"/>
      </svg>
    </button>
  )
}

export default Copy;