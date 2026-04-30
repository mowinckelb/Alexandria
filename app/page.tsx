import {
  Inter,
  Spectral,
  Fraunces,
  UnifrakturMaguntia,
} from 'next/font/google';
import LandingPage from './components/LandingPage';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

// Spectral — warm Plantin-family serif. Primary typeface.
// Closest free analog to Fleet's Martina Plantijn.
const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  axes: ['SOFT', 'WONK'],
});

const fraktur = UnifrakturMaguntia({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-fraktur',
});

export default function Home() {
  return (
    <div
      className={`${inter.variable} ${spectral.variable} ${fraunces.variable} ${fraktur.variable}`}
    >
      <LandingPage brandClassName={spectral.className} />
    </div>
  );
}
