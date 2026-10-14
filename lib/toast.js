// Shows a small popup (toast) from public/site.js. Returns true if it was shown.
export function notify(text) {
  if (typeof window !== 'undefined' && typeof window.toast === 'function') {
    window.toast('\u2713 ' + text);
    return true;
  }
  return false;
}
