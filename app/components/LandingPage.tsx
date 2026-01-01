'use client';
import { useTheme } from './ThemeProvider';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="h-screen flex flex-col items-center justify-center px-8 relative overflow-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-6 text-center text-[0.85rem] opacity-55 z-50" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-1">
          <span>alexandria.</span>
          <span className="text-[0.75rem] italic opacity-80">mentes aeternae</span>
        </div>
      </div>

      {/* Theme Toggle - subtle in corner */}
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
      <div className="flex-1 flex flex-col items-center justify-center w-full pt-20 pb-8 px-6 md:px-8">
        <div className="max-w-[600px] w-full flex flex-col h-full max-h-[70vh]">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pr-2 mb-6 scrollbar-thin" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--scrollbar-thumb) transparent' }}>
            <div className="text-[0.7rem] leading-relaxed space-y-5" style={{ color: 'var(--text-secondary)' }}>
              <div>
                <p className="text-[0.65rem] tracking-wider uppercase mb-4 opacity-60" style={{ color: 'var(--text-muted)' }}>abstract</p>
              </div>
              
              <div>
                <p className="text-[0.72rem] mb-2.5 font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>Thesis</p>
                <div className="space-y-2">
                  <p className="pl-0">The human brain is a biological neural net with carbon weights; AI is a digital neural net with silicon weights</p>
                  <p className="pl-0">If trained on enough personal data, a digital neural net can approximate any specific biological neural net</p>
                  <p className="pl-0">If you translate your carbon weights into silicon weights; you can digitalise & optimise your cognition</p>
                </div>
              </div>

              <div>
                <p className="text-[0.72rem] mb-2.5 font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>Product</p>
                <div className="space-y-2">
                  <p className="pl-0">Once you digitalise your subjective/objective data, you create a high-fidelity Personal Language Model (PLM)</p>
                  <p className="pl-0">This PLM enables a transition from zero-sum to positive-sum attention as it can autonomously approximate your output and synthesise pre-processed inputs; a personal function approximator</p>
                  <p className="pl-0">There is a structural delta between general LLMs with personal context and a PLM; while leveraged to SOTA LLMs, PLMs are specifically fine-tuned for each individual on their unique data</p>
                  <p className="pl-0">If something is to represent you it must know you; personalised LLMs are valuable assistants, PLMs are extensions of your cognition</p>
                </div>
              </div>

              <div>
                <p className="text-[0.72rem] mb-2.5 font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>Market</p>
                <div className="space-y-2">
                  <p className="pl-0">Frontier labs won't build PLMs, but individuals who want to own, monetise, and optimise their data will</p>
                  <p className="pl-0">It's easier to be first than best – but if you build a personal data flywheel, you can be both</p>
                </div>
              </div>

              <div>
                <p className="text-[0.72rem] mb-2.5 font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>Execution</p>
                <div className="space-y-2">
                  <p className="pl-0">The bottleneck to high-fidelity PLMs is the digital transcription of explicit/implicit subjective data</p>
                  <p className="pl-0">Once the benefits are internalised, it becomes simply an agency/friction problem</p>
                </div>
              </div>

              <div>
                <p className="text-[0.72rem] mb-2.5 font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>Vision</p>
                <div className="space-y-2">
                  <p className="pl-0">AI enables infinite leverage on fixed attention – but what if that attention wasn't fixed?</p>
                  <p className="pl-0">In an age of leveraged abundance, the opportunity cost of zero-sum attention is infinite</p>
                  <p className="pl-0">Positive-sum attention is all you need.</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
            <button
              onClick={onGetStarted}
              className="bg-transparent border-none text-[0.75rem] cursor-pointer transition-opacity hover:opacity-70 mt-4"
              style={{ color: 'var(--text-primary)' }}
            >
              sign in / sign up
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb);
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-thumb-hover);
        }
      `}</style>
    </div>
  );
}

