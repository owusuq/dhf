'use client';
import { useEffect, useRef, useState } from 'react';

const fmt = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

// Counts a number up (or to a new value) in under a second.
export default function CountUp({ value = 0, prefix = '', duration = 800 }) {
  const target = Number(value) || 0;
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || from.current === target) { from.current = target; setN(target); return undefined; }
    const a = from.current;
    let raf;
    let start;
    const step = (t) => {
      if (start === undefined) start = t;
      const k = Math.min(1, (t - start) / duration);
      const v = k >= 1 ? target : a + (target - a) * (1 - Math.pow(1 - k, 3));
      from.current = v;
      setN(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  const shown = n === target ? target : Number.isInteger(target) ? Math.round(n) : Math.round(n * 100) / 100;
  return <>{prefix}{fmt(shown)}</>;
}
