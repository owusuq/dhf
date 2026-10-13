'use client';
import { useEffect, useState } from 'react';

const KEY = 'dhf-install-hidden';
const WEEK = 7 * 24 * 60 * 60 * 1000;

export default function InstallPrompt() {
  const [evt, setEvt] = useState(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let hidden = false;
    try { hidden = Date.now() - Number(localStorage.getItem(KEY) || 0) < WEEK; } catch (e) { /* ignore */ }
    const installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (hidden || installed) return undefined;

    const ua = window.navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    if (isIos) { setIos(true); setShow(true); }

    const onPrompt = (e) => { e.preventDefault(); setEvt(e); setShow(true); };
    const onInstalled = () => setShow(false);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function hide() {
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* ignore */ }
    setShow(false);
  }
  async function install() {
    if (!evt) return;
    evt.prompt();
    await evt.userChoice;
    setEvt(null);
    setShow(false);
  }

  if (!show) return null;
  return (
    <div className="ins" role="dialog" aria-label="Install the portal">
      <div className="ins-row">
        <img src="/pwa-icon?size=192" alt="" width="40" height="40" />
        <div>
          <b>Install the portal</b>
          <small>Open it like an app, straight from your home screen.</small>
        </div>
      </div>
      {ios && !evt && <p className="ins-steps">1. Tap the Share button in Safari<br />2. Choose Add to Home Screen</p>}
      <div className="ins-btns">
        {evt && <button type="button" className="btn lg-mail" onClick={install}>Install</button>}
        <button type="button" className="btn alt" onClick={hide}>{evt ? 'Not now' : 'Got it'}</button>
      </div>
    </div>
  );
}