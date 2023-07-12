import './Spinner.css';

function Spinner({src}: {src: string}) {
  return <img className="spinner" src={src} alt=""/>
}

export default Spinner;
