'use client';
import { BUILDER_NAME } from '../lib/config';

export default function Footer() {
  return (
    <footer className="foot">
      <img src="/logo.jpeg" alt="" onError={(e) => (e.target.style.display = 'none')} />
      <p className="foot-tag">Empowering People · Building Communities · Creating a Brighter Future</p>
      <p>© {new Date().getFullYear()} Daakyehene Foundation. Built by <b>{BUILDER_NAME}</b>.</p>
    </footer>
  );
}
