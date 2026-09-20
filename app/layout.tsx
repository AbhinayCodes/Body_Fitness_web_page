import type { Metadata } from 'next';
import '@fontsource-variable/manrope';
import '@fontsource-variable/space-grotesk';
import './globals.css';

export const metadata: Metadata = {
  title: 'Formwell | Fitness that fits your life',
  description: 'Your daily space for training, nutrition, and steady progress.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
