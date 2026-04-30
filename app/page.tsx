import { Spectral } from 'next/font/google';
import LandingPage from './components/LandingPage';

const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

export default function Home() {
  return (
    <div className={spectral.variable}>
      <LandingPage brandClassName={spectral.className} />
    </div>
  );
}
