'use client';
import { useEffect } from 'react';
import { useTheme } from './ThemeProvider';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();

  // Enable scrolling on this page (override global fixed positioning)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    
    // Store original styles
    const originalHtmlStyle = html.style.cssText;
    const originalBodyStyle = body.style.cssText;
    
    // Enable scrolling
    html.style.overflow = 'auto';
    html.style.position = 'static';
    body.style.overflow = 'auto';
    body.style.position = 'static';
    
    // Cleanup on unmount
    return () => {
      html.style.cssText = originalHtmlStyle;
      body.style.cssText = originalBodyStyle;
    };
  }, []);

  const sections = [
    {
      title: 'Thesis',
      points: [
        'The human brain is a biological neural net with carbon weights; AI is a digital neural net with silicon weights',
        'If trained on enough personal data, a digital neural net can approximate any specific biological neural net',
        'If you translate your carbon weights into silicon weights; you can digitalise & optimise your cognition'
      ]
    },
    {
      title: 'Product',
      points: [
        'Once you digitalise your subjective/objective data, you create a high-fidelity Personal Language Model (PLM)',
        'This agentic PLM enables a transition from zero-sum to positive-sum attention as it can autonomously approximate your output and synthesise pre-processed inputs; a personal function approximator',
        'There is a structural delta between general LLMs with personal context and a PLM; while leveraged to SOTA LLMs, PLMs are specifically fine-tuned for each individual on their unique data',
        'If something is to represent you it must know you; personalised LLMs are valuable assistants, PLMs are extensions of your cognition'
      ]
    },
    {
      title: 'Market',
      points: [
        'Frontier labs won\'t build PLMs, but individuals who want to own, monetise, and optimise their data will',
        'It\'s easier to be first than best – but if you build a personal data flywheel, you can be both'
      ]
    },
    {
      title: 'Execution',
      points: [
        'The bottleneck to high-fidelity PLMs is the digital transcription of explicit/implicit subjective data',
        'Once the benefits are internalised, it becomes simply an agency/friction problem'
      ]
    },
    {
      title: 'Vision',
      points: [
        'AI enables infinite leverage on fixed attention – but what if that attention wasn\'t fixed?',
        'In an age of leveraged abundance, the opportunity cost of zero-sum attention is infinite',
        'Positive-sum attention is all you need.'
      ],
      isConclusion: true
    }
  ];

  return (
    <div 
      className="min-h-screen"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {/* Header - Fixed */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6" style={{ background: 'var(--bg-primary)' }}>
        {/* Centered logo */}
        <div className="flex flex-col items-center gap-0.5 opacity-55">
          <span className="text-[0.85rem] tracking-wide">alexandria.</span>
          <span className="text-[0.7rem] italic opacity-70">mentes aeternae</span>
        </div>
        
        {/* Theme toggle in corner */}
        <div className="absolute top-6 right-6">
          <div className="relative rounded-full p-[1px] inline-flex" style={{ background: 'var(--toggle-bg)' }}>
            <button
              onClick={toggleTheme}
              className="relative z-10 bg-transparent border-none px-2 py-0.5 text-[0.65rem] cursor-pointer"
              style={{ color: theme === 'light' ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              light
            </button>
            <button
              onClick={toggleTheme}
              className="relative z-10 bg-transparent border-none px-2 py-0.5 text-[0.65rem] cursor-pointer"
              style={{ color: theme === 'dark' ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              dark
            </button>
            <div
              className={`absolute top-[1px] left-[1px] w-[calc(50%-1px)] h-[calc(100%-2px)] backdrop-blur-[10px] rounded-full shadow-sm transition-transform duration-300 ease-out ${
                theme === 'dark' ? 'translate-x-full' : ''
              }`}
              style={{ background: 'var(--toggle-pill)' }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 pt-28 pb-20">
        {/* Abstract Label */}
        <div className="mb-12">
          <span className="text-[0.65rem] tracking-[0.2em] uppercase opacity-40" style={{ color: 'var(--text-muted)' }}>
            abstract
          </span>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((section, idx) => (
            <section key={section.title} className={section.isConclusion ? 'pt-4' : ''}>
              {/* Section header */}
              <div className="flex items-center gap-4 mb-5">
                <span 
                  className="text-[0.65rem] opacity-30 tabular-nums"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span 
                  className={`text-[0.8rem] tracking-wide ${section.isConclusion ? 'italic' : ''}`}
                  style={{ color: 'var(--text-primary)', opacity: 0.85 }}
                >
                  {section.title}
                </span>
                <div className="flex-1 h-px opacity-15" style={{ background: 'var(--text-muted)' }} />
              </div>
              
              {/* Section content */}
              <div className="space-y-4 pl-10">
                {section.points.map((point, pointIdx) => (
                  <p 
                    key={pointIdx}
                    className={`text-[0.85rem] leading-[1.8] ${
                      section.isConclusion && pointIdx === section.points.length - 1 
                        ? 'font-medium opacity-85' 
                        : 'opacity-60'
                    }`}
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {point}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-20 pt-10 border-t text-center" style={{ borderColor: 'var(--border-light)' }}>
          <button
            onClick={onGetStarted}
            className="bg-transparent border-none text-[0.85rem] cursor-pointer transition-opacity hover:opacity-60 tracking-wide py-3 px-8"
            style={{ color: 'var(--text-primary)', opacity: 0.8 }}
          >
            sign in / sign up
          </button>
        </div>
      </main>
    </div>
  );
}
