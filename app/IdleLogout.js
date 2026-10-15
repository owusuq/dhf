'use client';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const IDLE_MS = 5 * 60 * 1000;
const DEBUG = true;
const EVENTS = ['mousemove', 'mousedown', 'keydown', 'click', 'scroll', 'wheel', 'touchstart', 'touchmove', 'pointerdown', 'input'];

export default function IdleLogout() {
  useEffect(() => {
    let last = Date.now();
    let checker = null;
    let active = false;
    let badge = null;

    const mark = () => { last = Date.now(); };

    const logout = async () => {
      stop();
      try { await supabase.auth.signOut({ scope: 'local' }); } catch (e) {}
      window.location.href = '/';
    };

    const check = () => {
      const idle = Date.now() - last;
      if (DEBUG && badge) badge.textContent = 'idle: ' + Math.round(idle / 1000) + 's / ' + Math.round(IDLE_MS / 1000) + 's';
      if (idle >= IDLE_MS) logout();
    };

    const start = () => {
      if (active) return;
      active = true;
      last = Date.now();
      if (DEBUG) {
        badge = document.createElement('div');
        badge.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:99999;background:#0b2540;color:#fff;font:12px sans-serif;padding:4px 8px;border-radius:6px;pointer-events:none';
        document.body.appendChild(badge);
      }
      EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true, capture: true }));
      document.addEventListener('visibilitychange', check);
      checker = setInterval(check, 1000);
    };

    function stop() {
      active = false;
      if (checker) clearInterval(checker);
      if (badge) { badge.remove(); badge = null; }
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
