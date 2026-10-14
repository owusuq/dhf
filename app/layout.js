import './globals.css';
import { Bricolage_Grotesque } from 'next/font/google';
import Script from 'next/script';
import Footer from './Footer';
import CookieNotice from './CookieNotice';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], display: 'swap', variable: '--display' });

export const metadata = { title: 'Daakyehene Foundation – Student Portal' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0b2540' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('dark')==='1')document.documentElement.classList.add('dark')}catch(e){}" }} />
      </head>
      <body className={display.variable}>
        <div className="page">{children}</div>
        <CookieNotice />
        <Footer />
      <Script src="/site.js" strategy="lazyOnload" /></body>
    </html>
  );
}
