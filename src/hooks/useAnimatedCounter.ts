import { useEffect, useRef, useState } from 'react';

interface UseAnimatedCounterOptions {
  duration?: number;
  start?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export const useAnimatedCounter = (
  end: number,
  options: UseAnimatedCounterOptions = {}
) => {
  const {
    duration = 1000,
    start = 0,
    prefix = '',
    suffix = '',
    decimals = 0,
  } = options;

  const [value, setValue] = useState(start);
  const previousEndRef = useRef(start);

  useEffect(() => {
    const startValue = previousEndRef.current;
    const startTime = Date.now();
    const endTime = startTime + duration;

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(endTime - now, 0);
      const progress = 1 - remaining / duration;
      
      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (end - startValue) * eased;
      setValue(currentValue);

      if (remaining > 0) {
        requestAnimationFrame(tick);
      } else {
        previousEndRef.current = end;
      }
    };

    requestAnimationFrame(tick);
  }, [end, duration]);

  const formattedValue = `${prefix}${value.toFixed(decimals)}${suffix}`;

  return { value, formattedValue };
};