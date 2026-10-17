import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Outfit } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CrystalBackground from '@/components/CrystalBackground';
import QuickPracticeDock from '@/components/QuickPracticeDock';
import GlobalCallNotifier from '@/components/GlobalCallNotifier';
import DownloadAppPrompt from '@/components/DownloadAppPrompt';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '700', '800', '900'],
  variable: '--font-heading',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
  themeColor: '#060a14',
};

export const metadata: Metadata = {
  title: 'English Booster — Global SaaS for Spoken English Fluency & Real-Time Practice',
  description: 'Boost your spoken English fluency by practicing live conversations with international partners worldwide.',
  keywords: ['English learning', 'conversation partner', 'international chat', 'CEFR fluency', 'SaaS English', 'Tychique Bongo'],
  authors: [{ name: 'Tychique Bongo', url: 'https://englishbooster.com' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'English Booster',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${plusJakartaSans.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                localStorage.removeItem('eb_theme');
                document.documentElement.classList.remove('light');
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#030611] text-white selection:bg-emerald-500 selection:text-slate-950 font-sans relative">
        <AuthProvider>
          <GlobalCallNotifier />
          <DownloadAppPrompt />
          <CrystalBackground />
          <Navbar />
          <main className="flex-1 w-full relative z-10 pb-20 sm:pb-24">
            {children}
          </main>
          <QuickPracticeDock />
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
