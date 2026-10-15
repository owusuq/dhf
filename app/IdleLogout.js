'use client';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const IDLE_MS = 5 * 60 * 1000; // 5 minutes of no activity
const EVENTS = ['mousemove', 'mousedown', 'keydown', 'click', 'scroll', 'wheel', 'touchstart', 'touchmove', 'pointerdown', 'input'];

export default function IdleLogout() {
  useEffect(() => {
    let last = Date.now();
    let checker = null;
    let active = false;

    const mark = () => { last = Date.now(); };

    const logout = async () => {
      stop();
      await supabase.auth.signOut();
      if (window.location.pathname !== '/') window.location.href = '/';
    };

    const check = () => {
      if (Date.now() - last >= IDLE_MS) logout();
    };

    const start = () => {
      if (active) return;
      active = true;
      last = Date.now();
      EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true, capture: true }));
      document.addEventListener('visibilitychange', check);
      checker = setInterval(check, 5000);
    };

    function stop() {
      active = false;
      if (checker) clearInterval(checker);
      EVENTS.forEach((e) => window.removeEventListener(e, mark, { capture: true }));
      document.removeEventListener('visibilitychange', check);
    }

    supabase.auth.getSession().then(({ data }) => { if (data.session) start(); });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) start(); else stop();
    });

    return () => { stop(); sub.subscription.unsubscribe(); };
  }, []);

  return null;
}
