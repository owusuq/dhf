export default function manifest() {
  return {
    name: 'Daakyehene Foundation Student Portal',
    short_name: 'DHF Portal',
    description: 'Track your fees, payment dates and receipts in one place.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0b2540',
    theme_color: '#0b2540',
    icons: [
      { src: '/pwa-icon?size=192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon?size=512', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
