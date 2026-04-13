import { ReactElement } from "react";
import { ModalArguments } from "../../components/Modal";
import { SearchParamsFactory } from "../../utils/searchParams";

import './ResultsTextInfo.css';
import { CollectionKey, LanguageKey } from "../../utils/corpus";
import { TFunction } from "i18next";

function textInfo(t: TFunction, factory: SearchParamsFactory, element: HTMLElement, collection: CollectionKey, language: LanguageKey, code: string, message: ReactElement): ModalArguments {
  const onCancel = () => {
    setTimeout(() => {
      element.focus();
    }, 0);
  };
  return {
    classes: ['modal-text-info'],
    messageElement: message,
    buttons: [
      {
        message: t('info:viewLines'),
        callback: () => {
          const cb = document.getElementById('showAllLanguages');
          const showAllLanguages = cb instanceof HTMLInputElement && cb.checked;
          window.location.hash = factory.searchParamsToHash({
            query: code,
            type: 'exact',
            caseInsensitive: false,
            common: true,
            script: true,
            showAllLanguages: showAllLanguages,
            collections: [collection],
            languages: [language],
            run: true,
          });
        },
      },
      {
        message: t('info:close'),
        autoFocus: true,
        callback: onCancel,
      },
    ],
    cancelCallback: onCancel,
  };
}

function message(t: TFunction, { code, end }: { code: string, end: string }) {
  return (
    <dl className="text-info">
      <dt>{t('info:codeHeader')}</dt>
      <dd className="code">{end ? `${code}…${end}` : code}</dd>
    </dl>
  );
}

export function getTextInfo(t: TFunction, factory: SearchParamsFactory, element: HTMLElement, collection: CollectionKey, language: LanguageKey): ModalArguments {
  const code = element.getAttribute('data-start') ?? '';
  const end = element.getAttribute('data-end') ?? '';
  return textInfo(t, factory, element, collection, language, code, message(t, { code, end }));
};
