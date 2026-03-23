'use client';

import { useEffect, useRef, useState } from 'react';

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

function Pull({ children }: { children: React.ReactNode }) {
  return (
    <Fade>
      <p className="text-[0.95rem] sm:text-[1.05rem] leading-relaxed text-center py-4" style={{ color: 'var(--text-primary)' }}>
        {children}
      </p>
    </Fade>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <Fade>
      <p className="text-[0.88rem] sm:text-[0.92rem] leading-[1.9]" style={{ color: 'var(--text-secondary)' }}>
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
            Your kid&rsquo;s drawing on the fridge. You could print the same image from the internet. Better quality, better colours. But you would never swap it. Not because the drawing is good. Because your kid made it.
          </Body>

          <Body>
            Your intelligence, your strength, your skills, your empathy &mdash; machines are learning to do all of it. But that feeling about the drawing? A machine cannot give you that. Not because the technology is not there yet. Because it is not about the technology. It is about who made it.
          </Body>
        </div>

        <Divider />

        {/* THE ALIEN */}
        <div className="space-y-6">
          <Body>
            Imagine an alien shows up. Smarter than any human. Better taste. Better skills. It opens a restaurant &mdash; best food you have ever had. It designs buildings &mdash; stunning. Would you admire the work? Sure. But is it the same as something a human made?
          </Body>

          <Pull>
            No. You already knew that. Humans value humans.
          </Pull>
        </div>

        <Divider />

        {/* THE GAME */}
        <div className="space-y-6">
          <Body>
            But that feeling alone is not enough. You still have to be good enough. Nobody hires a warm waiter who drops every plate. Nobody buys a handmade bowl that leaks. The feeling only kicks in once you have cleared the bar.
          </Body>

          <Body>
            Here is the thing though &mdash; AI helps you clear the bar. You use AI the way humans have always used tools &mdash; to get good enough. And the alien can get good enough too. Same bar, both clear it.
          </Body>

          <Body>
            So the only question left is: does it matter that a human did this? Sometimes it will not. But in the games where it does &mdash; and there are more of them than you think &mdash; the human wins. Not because their version is better. Because it is human.
          </Body>

          <Pull>
            The game is not about being better than AI. It is about being human where it counts.
          </Pull>

          <Body>
            And you get to choose the games. A grandmother making bowls for her village. A founder whose company carries their conviction. A creator whose audience follows them, not their output. The closer the circle, the more your humanity matters and the lower the bar. You do not need to be famous. You do not even need to be the best. You need to be you, be good enough, and create.
          </Body>
        </div>

        <Divider />

        {/* THE DECAY */}
        <div className="space-y-6">
          <Body>
            But the thing that makes you irreplaceable &mdash; your mind, your taste, your judgment &mdash; is the one thing that weakens if you do not use it. Every time you let AI think for you without engaging, it fades a little. The way you forgot mental arithmetic once you had a calculator. Except this is not arithmetic. This is your ability to think.
          </Body>

          <Pull>
            And if your mind gets weak, the thing that would decide to fix it is the thing that got weak.
          </Pull>

          <Body>
            That is the trap. You drift and do not know you are drifting. You outsource and do not notice what you lost. By the time you would want to fix it, you have lost the ability to see the problem.
          </Body>
        </div>

        {/* ALEXANDRIA — no divider, rides the momentum of the trap */}
        <div className="space-y-6 mt-10 sm:mt-14">
          <Fade>
            <p className="text-[1.15rem] sm:text-[1.35rem] leading-relaxed text-center py-4 italic" style={{ color: 'var(--text-primary)' }}>
              Alexandria is a mental gym.
            </p>
          </Fade>

          <Body>
            It develops the thing that makes you irreplaceable. It helps you see the game, reach the bar, and stay above it.
          </Body>

          <Body>
            And it compounds. The earlier you start, the stronger your position. Five dollars. Five minutes.
          </Body>
        </div>

        <Fade>
          <div className="flex flex-col items-center gap-8 py-12 sm:py-16">
            <a
              href="/onboarding"
              className="text-[0.95rem] sm:text-[1.05rem] tracking-wide no-underline transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-primary)' }}
            >
              join now
            </a>
            <div className="flex flex-col gap-3 text-[0.72rem] tracking-wide">
              <span style={{ color: 'var(--text-ghost)' }}>still not convinced?</span>
              <div className="flex flex-col gap-2">
                <p style={{ color: 'var(--text-muted)' }}>
                  <a href="/join" className="no-underline transition-opacity hover:opacity-40" style={{ color: 'var(--text-primary)' }}>pitch</a>
                  {' '}&mdash; what it is in one page
                </p>
                <p style={{ color: 'var(--text-muted)' }}>
                  <a href="/docs/Vision.pdf" target="_blank" rel="noopener noreferrer" className="no-underline transition-opacity hover:opacity-40" style={{ color: 'var(--text-primary)' }}>vision</a>
                  {' '}&mdash; the philosophy in plain English
                </p>
                <p style={{ color: 'var(--text-muted)' }}>
                  <a href="/docs/abstract.pdf" target="_blank" rel="noopener noreferrer" className="no-underline transition-opacity hover:opacity-40" style={{ color: 'var(--text-primary)' }}>abstract</a>
                  {' '}&mdash; the philosophy as written art
                </p>
              </div>
            </div>
          </div>
        </Fade>

      </div>
    </section>
  );
}
