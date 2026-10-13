import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Squid Proxy Log Analyzer | nipponbpo.local',
  description: 'High-performance network log analysis dashboard for nipponbpo.local Squid proxy',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100">
      <body className="min-h-full flex flex-col font-sans antialiased bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
