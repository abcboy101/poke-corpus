import { useTranslation } from 'react-i18next';

import './ProgressBar.css';
import { formatPercentParams } from '../utils/utils';

function ProgressBar({progress}: {progress: number}) {
  const { t } = useTranslation();
  // const showValue = +progress.toFixed(2) > 0 && +progress.toFixed(2) < 1;
  return <div className="progress-bar">
    <progress value={progress} max={1} aria-label={t('progressBar.title')}/>
    <div className="progress-bar-text">{t('progressBar.value', formatPercentParams(progress))}</div>
  </div>;
}

export default ProgressBar;
