'use client';
import Image from 'next/image';
import Link from 'next/link';
import { BUILDER_NAME } from '../lib/config';

export default function Footer() {
  return (
    <footer className="foot">
      <Link href="/dashboard" aria-label="Home"><Image src="/logo.jpeg" alt="" width={112} height={112} onError={(e) => (e.target.style.display = 'none')} /></Link>
      <p className="foot-tag">Empowering People · Building Communities · Creating a Brighter Future</p>
      <p>© {new Date().getFullYear()} Daakyehene Foundation. Built by <b>{BUILDER_NAME}</b>.</p>
    <p><button type="button" className="foot-link" onClick={() => window.dispatchEvent(new Event('dhf-consent-open'))}>Cookie settings</button></p>
    </footer>
  );
}
