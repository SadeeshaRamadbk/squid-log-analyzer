import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Squid Proxy Log Analyzer | nipponbpo.local',
  description: 'High-performance network log analysis dashboard for nipponbpo.local Squid proxy',
};

import { AuthProvider } from '@/components/auth/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('app-theme');if(t==='light'||(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches)){document.documentElement.classList.add('light-theme');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased bg-slate-950 text-slate-100">
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
