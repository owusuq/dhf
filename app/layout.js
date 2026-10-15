import './globals.css';
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import Footer from './Footer';
import CookieNotice from './CookieNotice';
import IdleLogout from './IdleLogout';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], display: 'swap', variable: '--display' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-jakarta' });

export const metadata = { title: 'Daakyehene Foundation – Student Portal' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0b2540' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('dark')==='1')document.documentElement.classList.add('dark')}catch(e){}" }} />
      </head>
      <body className={display.variable + ' ' + jakarta.variable}>
        <div className="page">{children}</div>
        <CookieNotice />
        <IdleLogout />
        <Footer />
      <Script src="/site.js" strategy="lazyOnload" /></body>
    </html>
  );
}
