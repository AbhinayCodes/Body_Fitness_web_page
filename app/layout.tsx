import type { Metadata } from 'next';
import '../styles.css';

export const metadata: Metadata = {
  title: 'Formwell | Fitness that fits your life',
  description: 'A simple fitness plan built around your life.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
