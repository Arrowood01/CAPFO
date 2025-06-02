import { useEffect, useRef } from 'react';

export const useAnimationOnMount = () => {
  const hasAnimated = useRef(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      hasAnimated.current = false;
    } else {
      hasAnimated.current = true;
    }
  }, []);

  return {
    shouldAnimate: !hasAnimated.current,
    animationClass: hasAnimated.current ? '' : 'animate-slide-up',
  };
};