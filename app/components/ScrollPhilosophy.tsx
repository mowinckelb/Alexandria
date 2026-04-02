'use client';

import { useEffect, useRef, useState } from 'react';
import PhilosophyFiveWays from './PhilosophyFiveWays';

function Fade({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`fade-section ${visible ? 'visible' : ''} ${className}`}>
      {children}
    </div>
  );
}

function Pull({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <Fade>
      <p className={`text-[0.95rem] sm:text-[1.05rem] leading-relaxed text-center ${className}`} style={{ color: 'var(--text-primary)', textWrap: 'pretty' as never }}>
        {children}
      </p>
    </Fade>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <Fade>
      <p className="text-[0.88rem] sm:text-[0.92rem] leading-[1.9]" style={{ color: 'var(--text-secondary)', textWrap: 'pretty' as never }}>
        {children}
      </p>
    </Fade>
  );
}

function Divider() {
  return (
    <Fade>
      <div className="py-10 sm:py-14 text-center">
        <span className="text-[0.7rem] tracking-[0.5em]" style={{ color: 'var(--text-ghost)' }}>&middot;&nbsp;&nbsp;&middot;&nbsp;&nbsp;&middot;</span>
      </div>
    </Fade>
  );
}

export default function ScrollPhilosophy() {
  return (
    <section id="philosophy" className="px-8 sm:px-12">
      <div className="max-w-[520px] mx-auto">

        <div className="pt-8 sm:pt-12" />

        {/* THE FEELING */}
        <div className="space-y-6">
          <Body>
            Your kid&rsquo;s drawing on the fridge. You could print a better version. You would never swap it. Not because the drawing is&nbsp;good. Because your kid&nbsp;made&nbsp;it.
          </Body>

          <Body>
            Your intelligence, your strength, your skills, your empathy&nbsp;&mdash; machines are learning to do all of it. But that feeling about the drawing? No machine can give you&nbsp;that. Not because the technology is not there&nbsp;yet. Because it is about who&nbsp;made&nbsp;it.
          </Body>
        </div>

        <Divider />

        {/* THE ALIEN */}
        <div className="space-y-6">
          <Body>
            Imagine an alien shows up. Smarter than any human. Better taste. Better skills. It opens a restaurant&nbsp;&mdash; best food you have ever had. It designs buildings&nbsp;&mdash; stunning. Would you admire the work? Yes. But is it the same as something a human&nbsp;made?
          </Body>

          <Pull className="py-8 sm:py-10">
            No.<br />Humans value&nbsp;humans.
          </Pull>
        </div>

        <Divider />

        {/* THE GAME */}
        <div className="space-y-6">
          <Body>
            But that feeling alone is not enough. You still have to be good enough. Nobody hires a warm waiter who drops every plate. Nobody buys a handmade bowl that&nbsp;leaks. The feeling only matters once you have cleared the&nbsp;bar.
          </Body>

          <Body>
            AI helps you clear the bar. You use AI the way humans have always used tools&nbsp;&mdash; to get good enough. The alien gets good enough too. Same bar, both clear&nbsp;it.
          </Body>

          <Body>
            So the only question left is: does it matter that a human did&nbsp;this? Not always. But in the games where it does&nbsp;&mdash; and there are more of them than you think&nbsp;&mdash; the human wins. Not because their version is&nbsp;better. Because it is&nbsp;human.
          </Body>

          <Pull className="py-4">
            The game is not about being better than&nbsp;AI.<br />It is about being human where it&nbsp;counts.
          </Pull>

          <Pull className="pt-2 pb-6 sm:pb-8">
            And you get to choose the&nbsp;games.
          </Pull>

          <Body>
            A grandmother making bowls for her village. A founder whose company carries their conviction. A creator whose audience follows them, not their output. The closer the circle, the more your humanity matters and the lower the&nbsp;bar. You do not need to be famous. You do not even need to be the best. You need to be you, be good enough, and&nbsp;create.
          </Body>
        </div>

        <Divider />

        {/* THE DECAY */}
        <div className="space-y-6">
          <Body>
            But the thing that makes you irreplaceable&nbsp;&mdash; your mind, your taste, your judgment&nbsp;&mdash; is the one thing that weakens if you do not use it. Every time you let AI think for you, something fades. The way you forgot arithmetic once you had a calculator. Except this is not arithmetic. This is your ability to&nbsp;think.
          </Body>

          <Pull className="py-6 sm:py-8">
            And if your mind gets weak, the thing that would decide to fix&nbsp;it<br />is the thing that got&nbsp;weak.
          </Pull>
        </div>

        {/* ALEXANDRIA — no divider, maximum silence before the turn */}
        <div className="mt-16 sm:mt-24">
          <Fade>
            <p className="text-[1.2rem] sm:text-[1.4rem] leading-relaxed text-center py-8 sm:py-12 italic" style={{ color: 'var(--text-primary)' }}>
              Alexandria is a mental&nbsp;gym.
            </p>
          </Fade>

          <div className="space-y-6 mt-4 sm:mt-6">
            <Body>
              It develops the thing that makes you irreplaceable. It helps you see the game, reach the bar, and stay above&nbsp;it.
            </Body>

            <Body>
              And it compounds. The earlier you start, the stronger your&nbsp;position.
            </Body>

            <Body>
              So start&nbsp;now.
            </Body>
          </div>
        </div>

        <Fade>
          <div className="flex flex-col items-center gap-16 py-12 sm:py-16">
            <a
              href="/signup"
              className="text-[0.95rem] sm:text-[1.05rem] tracking-wide no-underline transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-primary)' }}
            >
              try now
            </a>
            <PhilosophyFiveWays current="frame" />
          </div>
        </Fade>

      </div>
    </section>
  );
}
