import './globals.css';
import { Bricolage_Grotesque, Source_Sans_3 } from 'next/font/google';
import Footer from './Footer';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--display' });
const body = Source_Sans_3({ subsets: ['latin'], variable: '--body' });

export const metadata = { title: 'Daakyehene Foundation – Student Portal' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0b2540' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        <div className="page">{children}</div>
        <Footer />
      <script src="/extras.js" defer></script><script src="/donate.js" defer></script></body>
    </html>
  );
}
