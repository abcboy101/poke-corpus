import './ProgressBar.css';

function ProgressBar({progress}: {progress: number}) {
  return <div className="progress-bar">
    <div className="progress-bar-complete" style={{width: `${progress * 100.0}%`}}></div>
  </div>
}

export default ProgressBar;
