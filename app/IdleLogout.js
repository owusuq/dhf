'use client';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const IDLE_MS = 15 * 60 * 1000; // 15 minutes of no activity
const EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

export default function IdleLogout() {
  useEffect(() => {
    let timer = null;
    let active = false;

    const logout = async () => {
      stop();
      await supabase.auth.signOut();
      if (window.location.pathname !== '/') window.location.href = '/';
    };
    const reset = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(logout, IDLE_MS);
    };
    const start = () => {
      if (active) return;
      active = true;
      EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
      reset();
    };
    function stop() {
      active = false;
      if (timer) clearTimeout(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    }

    supabase.auth.getSession().then(({ data }) => { if (data.session) start(); });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) start(); else stop();
    });

    return () => { stop(); sub.subscription.unsubscribe(); };
  }, []);

  return null;
}
