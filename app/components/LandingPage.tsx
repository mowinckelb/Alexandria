'use client';
import { useTheme } from './ThemeProvider';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();

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
        'This PLM enables a transition from zero-sum to positive-sum attention as it can autonomously approximate your output and synthesise pre-processed inputs; a personal function approximator',
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
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-6 text-center text-[0.85rem] opacity-55 z-50" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-0.5">
          <span className="tracking-wide">alexandria.</span>
          <span className="text-[0.7rem] italic opacity-70">mentes aeternae</span>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <div className="relative rounded-full p-[1px] inline-flex" style={{ background: 'var(--toggle-bg)' }}>
          <button
            onClick={() => theme !== 'light' && toggleTheme()}
            className="relative z-10 bg-transparent border-none px-2 py-0.5 text-[0.65rem] transition-colors cursor-pointer"
            style={{ color: theme === 'light' ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            light
          </button>
          <button
            onClick={() => theme !== 'dark' && toggleTheme()}
            className="relative z-10 bg-transparent border-none px-2 py-0.5 text-[0.65rem] transition-colors cursor-pointer"
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center pt-24 pb-6 px-6 overflow-hidden">
        <div className="max-w-[520px] w-full flex flex-col flex-1 min-h-0">
          
          {/* Abstract Label */}
          <div className="text-center mb-6">
            <span className="text-[0.6rem] tracking-[0.25em] uppercase opacity-40" style={{ color: 'var(--text-muted)' }}>
              abstract
            </span>
          </div>

          {/* Scrollable Content */}
          <div 
            className="flex-1 overflow-y-auto min-h-0 px-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--scrollbar-thumb) transparent' }}
          >
            <div className="space-y-6 pb-4">
              {sections.map((section, idx) => (
                <div key={section.title} className={section.isConclusion ? 'pt-2' : ''}>
                  {/* Section header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span 
                      className="text-[0.6rem] opacity-30 tabular-nums"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span 
                      className={`text-[0.68rem] tracking-wide ${section.isConclusion ? 'italic' : ''}`}
                      style={{ color: 'var(--text-primary)', opacity: section.isConclusion ? 0.9 : 0.8 }}
                    >
                      {section.title}
                    </span>
                    <div className="flex-1 h-px opacity-20" style={{ background: 'var(--text-muted)' }} />
                  </div>
                  
                  {/* Section content */}
                  <div className="space-y-2.5 pl-7">
                    {section.points.map((point, pointIdx) => (
                      <p 
                        key={pointIdx}
                        className={`text-[0.68rem] leading-[1.7] ${
                          section.isConclusion && pointIdx === section.points.length - 1 
                            ? 'font-medium opacity-90' 
                            : 'opacity-65'
                        }`}
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {point}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="pt-5 text-center">
            <button
              onClick={onGetStarted}
              className="bg-transparent border-none text-[0.72rem] cursor-pointer transition-all hover:opacity-60 tracking-wide"
              style={{ color: 'var(--text-primary)', opacity: 0.7 }}
            >
              enter →
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        div::-webkit-scrollbar {
          width: 3px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb);
          border-radius: 1.5px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-thumb-hover);
        }
      `}</style>
    </div>
  );
}
