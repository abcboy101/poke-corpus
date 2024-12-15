import { useEffect, useRef } from 'react';
import './Spinner.css';

function Spinner({src, active = true}: {src: string, active?: boolean}) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    ref.current?.classList.add("spinner-stopped");
  }, []);

  useEffect(() => {
    const img = ref.current;
    if (img !== null) {
      const onAnimationIteration = () => {
        if (!active) {
          img.classList.add("spinner-stopped");
        }
      };
      img.addEventListener('animationiteration', onAnimationIteration);
      return () => {
        img.removeEventListener('animationiteration', onAnimationIteration);
      };
    }
  }, [active]);

  const classes = ['spinner', active ? 'spinner-active' : 'spinner-inactive'];
  if (import.meta.env.SSR)
    classes.push('spinner-stopped');
  return <img ref={ref} className={classes.join(' ')} src={src} alt=""/>;
}

export default Spinner;
