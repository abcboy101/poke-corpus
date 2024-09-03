import { useTranslation } from 'react-i18next';

import './ProgressBar.css';
import { formatPercentParams } from '../utils/utils';

function ProgressBar({progress}: {progress: number}) {
  const { t } = useTranslation();
  const percent = Math.min(Math.max(0, progress * 100), 100);
  return <div className="progress-bar-container" role="progressbar" aria-label={t('progressBar.title')} aria-valuenow={percent}>
    <div className="progress-bar">
      <div className="progress-bar-complete" style={{width: `${percent}%`}}></div>
    </div>
    <div className="progress-bar-text">{t('progressBar.value', formatPercentParams(progress))}</div>
  </div>;
}

export default ProgressBar;
