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

    if (DEBUG) {
      badge = document.createElement('div');
      badge.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 4px);left:4px;z-index:99999;background:#b00020;color:#fff;font:12px sans-serif;padding:4px 8px;border-radius:6px;pointer-events:none';
      badge.textContent = 'idle-logout: loaded, checking session';
      document.body.appendChild(badge);
    }

    const say = (t) => { if (badge) badge.textContent = t; };
    const mark = () => { last = Date.now(); };

    const logout = async () => {
      stop();
      try { await supabase.auth.signOut({ scope: 'local' }); } catch (e) {}
      window.location.href = '/';
    };

    const check = () => {
      const idle = Date.now() - last;
      say('idle: ' + Math.round(idle / 1000) + 's / ' + Math.round(IDLE_MS / 1000) + 's');
      if (idle >= IDLE_MS) logout();
    };

    const start = () => {
      if (active) return;
      active = true;
      last = Date.now();
      EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true, capture: true }));
      document.addEventListener('visibilitychange', check);
      checker = setInterval(check, 1000);
    };

    function stop() {
      active = false;
      if (checker) clearInterval(checker);
      EVENTS.forEach((e) => window.removeEventListener(e, mark, { capture: true }));
      document.removeEventListener('visibilitychange', check);
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) say('idle-logout: session error');
      else if (data.session) start();
      else say('idle-logout: no session');
    }).catch(() => say('idle-logout: getSession failed'));

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) start(); else { stop(); say('idle-logout: signed out'); }
    });

    return () => { stop(); sub.subscription.unsubscribe(); if (badge) badge.remove(); };
  }, []);

  return null;
}'use client';
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

    if (DEBUG) {
      badge = document.createElement('div');
      badge.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 4px);left:4px;z-index:99999;background:#b00020;color:#fff;font:12px sans-serif;padding:4px 8px;border-radius:6px;pointer-events:none';
      badge.textContent = 'idle-logout: loaded, checking session';
      document.body.appendChild(badge);
    }

    const say = (t) => { if (badge) badge.textContent = t; };
    const mark = () => { last = Date.now(); };

    const logout = async () => {
      stop();
      try { await supabase.auth.signOut({ scope: 'local' }); } catch (e) {}
      window.location.href = '/';
    };

    const check = () => {
      const idle = Date.now() - last;
      say('idle: ' + Math.round(idle / 1000) + 's / ' + Math.round(IDLE_MS / 1000) + 's');
      if (idle >= IDLE_MS) logout();
    };

    const start = () => {
      if (active) return;
      active = true;
      last = Date.now();
      EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true, capture: true }));
      document.addEventListener('visibilitychange', check);
      checker = setInterval(check, 1000);
    };

    function stop() {
      active = false;
      if (checker) clearInterval(checker);
      EVENTS.forEach((e) => window.removeEventListener(e, mark, { capture: true }));
      document.removeEventListener('visibilitychange', check);
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) say('idle-logout: session error');
      else if (data.session) start();
      else say('idle-logout: no session');
    }).catch(() => say('idle-logout: getSession failed'));

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) start(); else { stop(); say('idle-logout: signed out'); }
    });

    return () => { stop(); sub.subscription.unsubscribe(); if (badge) badge.remove(); };
  }, []);

  return null;
}
