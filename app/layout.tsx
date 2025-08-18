import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crossmint Auth Demo',
  description: 'A demo application showcasing Crossmint authentication',
};

// Note: If implementing Content Security Policy (CSP), Checkout.com requires:
// - connect-src: https://*.checkout.com
// - frame-src: https://*.checkout.com  
// - script-src: https://*.checkout.com
// - img-src: https://*.checkout.com

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://checkout-web-components.checkout.com/index.js"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
