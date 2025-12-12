import { Trans, useTranslation } from 'react-i18next';

import { ShowModal } from '../Modal';

import './Tutorial.css';
import '../../i18n/config';
import { ReactNode, useEffect, useState } from 'react';
import { localStorageGetItem, localStorageSetItem } from '../../utils/utils';
import { Link } from '../Link';
import { Message } from '../Message';

const key = 'corpus-tutorial';
const closed = 0;
const first = 1;
const last = 5;

function TutorialMessage({page}: {page: number}) {
  const { t } = useTranslation('tutorial');
  let message: ReactNode = '';
  switch (page) {
    case 1:
      message = <>
        <div><b>{t('message.welcome')}</b></div>
        <div>{t('message.intro')}</div>
      </>;
      page satisfies typeof first;
      break;
    case 2:
      message = t('message.filters');
      break;
    case 3:
      message = t('message.search');
      break;
    case 4:
      message = t('message.results');
      break;
    case 5:
      message = <>
        <div><Trans t={t} i18nKey='message.more' components={{ Link: <Link href={t('moreUrl')} /> }}/></div>
        <div>{t('message.done')}</div>
      </>;
      page satisfies typeof last;
      break;
  }
  return message;
}

function Tutorial({replaceModal}: {replaceModal: ShowModal}) {
  const { t } = useTranslation('tutorial');
  const [page, setPage] = useState(localStorageGetItem(key) ? closed : first); // Check if tutorial has been completed, show it if it hasn't

  const dismiss = () => {
    setPage(closed);
    document.body.removeAttribute('data-tutorial-page');
    localStorageSetItem(key, 'true'); // Mark tutorial as completed
  };

  useEffect(() => {
    if (page !== closed) {
      document.body.setAttribute('data-tutorial-page', page.toString());
      replaceModal({
        isModal: false,
        classes: ['tutorial'],
        message: <TutorialMessage page={page} />,
        buttons: [
          {
            id: 'tutorial-skip',
            message: <Message ns='tutorial' i18nKey='button.skip' />,
            autoFocus: page === last,
            callback: dismiss,
          },
          {
            id: 'tutorial-back',
            message: <Message ns='tutorial' i18nKey='button.back' />,
            disabled: page === first,
            callback: () => {
              setPage((p) => p - 1);
            },
            close: false,
          },
          {
            id: 'tutorial-next',
            message: <Message ns='tutorial' i18nKey='button.next' />,
            autoFocus: page < last,
            disabled: page === last,
            callback: () => {
              setPage((p) => p + 1);
            },
            close: false,
          },
        ],
        cancelCallback: dismiss,
      });
    }
  }, [page]);

  const toggle = () => {
    if (page === closed)
      setPage(first);
  };

  return <button className="link" onClick={toggle}>{t('link')}</button>;
}

export default Tutorial;
