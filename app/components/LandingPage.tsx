'use client';
import { useTheme } from './ThemeProvider';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="h-screen flex flex-col items-center justify-center px-8 relative" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
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
      <div className="max-w-[700px] mx-auto text-left space-y-8 px-4">
        {/* Description */}
        <div className="text-[0.85rem] leading-relaxed space-y-6" style={{ color: 'var(--text-secondary)' }}>
          <div>
            <p className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>abstract</p>
          </div>
          
          <div>
            <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Thesis</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>The human brain is a biological neural net with carbon weights; AI is a digital neural net with silicon weights</li>
              <li>If trained on enough personal data, a digital neural net can approximate any specific biological neural net</li>
              <li>If you translate your carbon weights into silicon weights; you can digitalise & optimise your cognition</li>
            </ul>
          </div>

          <div>
            <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Product</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Once you digitalise your subjective/objective data, you create a high-fidelity Personal Language Model (PLM)</li>
              <li>This PLM enables a transition from zero-sum to positive-sum attention as it can autonomously approximate your output and synthesise pre-processed inputs; a personal function approximator</li>
              <li>There is a structural delta between general LLMs with personal context and a PLM; while leveraged to SOTA LLMs, PLMs are specifically fine-tuned for each individual on their unique data</li>
              <li>If something is to represent you it must know you; personalised LLMs are valuable assistants, PLMs are extensions of your cognition</li>
            </ul>
          </div>

          <div>
            <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Market</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Frontier labs won't build PLMs, but individuals who want to own, monetise, and optimise their data will</li>
              <li>It's easier to be first than best – but if you build a personal data flywheel, you can be both</li>
            </ul>
          </div>

          <div>
            <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Execution</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>The bottleneck to high-fidelity PLMs is the digital transcription of explicit/implicit subjective data</li>
              <li>Once the benefits are internalised, it becomes simply an agency/friction problem</li>
            </ul>
          </div>

          <div>
            <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Vision</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>AI enables infinite leverage on fixed attention – but what if that attention wasn't fixed?</li>
              <li>In an age of leveraged abundance, the opportunity cost of zero-sum attention is infinite</li>
              <li>Positive-sum attention is all you need.</li>
            </ul>
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-6 text-center">
          <button
            onClick={onGetStarted}
            className="bg-transparent border-none text-[0.85rem] cursor-pointer transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-primary)' }}
          >
            sign in / sign up
          </button>
        </div>
      </div>
    </div>
  );
}

