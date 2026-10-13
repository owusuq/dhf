'use client';
import Link from 'next/link';
import { BUILDER_NAME } from '../lib/config';

export default function Footer() {
  return (
    <footer className="foot">
      <Link href="/dashboard" aria-label="Home"><img src="/logo.jpeg" alt="" onError={(e) => (e.target.style.display = 'none')} /></Link>
      <p className="foot-tag">Empowering People · Building Communities · Creating a Brighter Future</p>
      <p>© {new Date().getFullYear()} Daakyehene Foundation. Built by <b>{BUILDER_NAME}</b>.</p>
    </footer>
  );
}
