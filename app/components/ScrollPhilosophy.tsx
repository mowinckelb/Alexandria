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

/* Pull quote — large, centered, breathing */
function Pull({ children }: { children: React.ReactNode }) {
  return (
    <Fade>
      <p className="text-[1.15rem] sm:text-[1.35rem] leading-relaxed text-center py-6 sm:py-10 max-w-[480px] mx-auto" style={{ color: 'var(--text-primary)' }}>
        {children}
      </p>
    </Fade>
  );
}

/* Body paragraph — readable, secondary colour */
function Body({ children }: { children: React.ReactNode }) {
  return (
    <Fade>
      <p className="text-[0.88rem] sm:text-[0.92rem] leading-[1.9]" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </p>
    </Fade>
  );
}

/* Section divider */
function Divider() {
  return (
    <Fade>
      <div className="py-10 sm:py-14 text-center">
        <span className="text-[0.7rem] tracking-[0.5em]" style={{ color: 'var(--text-ghost)' }}>&middot;&nbsp;&nbsp;&middot;&nbsp;&nbsp;&middot;</span>
      </div>
    </Fade>
  );
}

/* Section header — "X of 5" progress marker */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Fade>
      <p className="text-[0.6rem] tracking-widest uppercase pb-4" style={{ color: 'var(--text-ghost)', letterSpacing: '0.2em' }}>
        {children}
      </p>
    </Fade>
  );
}

export default function ScrollPhilosophy() {
  return (
    <section id="philosophy" className="px-8 sm:px-12">
      <div className="max-w-[520px] mx-auto">

        {/* Reading time marker */}
        <Fade>
          <p className="text-[0.6rem] tracking-widest uppercase text-center pt-16 sm:pt-24 pb-8" style={{ color: 'var(--text-ghost)', letterSpacing: '0.2em' }}>
            5 minute read.
          </p>
        </Fade>

        {/* ——— 1 of 5 — WHAT YOU ARE ——— */}

        <SectionHeader>1 of 5 &mdash; What you are</SectionHeader>

        <Pull>
          There are five things a human being brings to the world.
        </Pull>

        <div className="space-y-6 mt-4">
          <Body>
            Your brain &mdash; intelligence, analysis, problem-solving. Your legs &mdash; strength, endurance, physical power. Your hands &mdash; dexterity, craft, precision. Your heart &mdash; empathy, emotional intelligence, understanding what someone else is feeling. And then there is a fifth thing, which is not like the other four. It is not something you do. It is something you are. The fact that you are a human being. That you are this specific person. Your kid&rsquo;s drawing on the fridge &mdash; it is the same image you could print from the internet. But it is not the same thing. It is not even close. Because a human made it, and you know which one.
          </Body>

          <Fade>
            <p className="text-[0.82rem] sm:text-[0.85rem] italic py-2" style={{ color: 'var(--text-muted)' }}>
              The first four are capabilities. The fifth is a property. Different category entirely.
            </p>
          </Fade>
        </div>

        <Divider />

        {/* ——— 2 of 5 — THE SHIFT ——— */}

        <SectionHeader>2 of 5 &mdash; The shift</SectionHeader>

        <div className="space-y-6">
          <Body>
            Our dominance over those four capabilities is being competed away. And it is not new &mdash; the first one already went.
          </Body>

          <Body>
            Strength &mdash; the industrial revolution made human muscle irrelevant for most work two centuries ago. That is settled. Now look at the other three. Intelligence &mdash; every few months, AI does something that surprises even the people building it. It keeps saturating benchmarks, solving problems nobody expected it to solve, and taking on work that was supposed to be safe from automation. Whether you think it is truly intelligent or not, the direction is not in doubt. Dexterity &mdash; look at factory floors, look at surgical robots. Both ends of the spectrum are already handled by machines. The gap in the middle is narrowing, and obviously it will close. Empathy &mdash; you already see it. Kids forming deep relationships with their AIs. People perfectly comfortable with emotional support that is not human. The approximation is getting better every month.
          </Body>

          <Fade>
            <p className="text-[0.82rem] sm:text-[0.85rem] italic py-2" style={{ color: 'var(--text-muted)' }}>
              All four are already in motion. The first is finished. The other three are at different stages, but the direction is the same. Taking this to its logical conclusion is not radical &mdash; it is obvious.
            </p>
          </Fade>

          <Body>
            If you are sceptical, take a moment to reflect on the position you are holding. Every government, every military, every brilliant engineer, every spare dollar on earth is on the other side. They are betting everything on this. Look back five years at where AI was. Look at where it is now. Project forward ten years. Twenty. There is no law of physics, no hard limit between here and there. Just time. And this is not some distant hypothetical where it does not matter whether you are right or wrong. This is your one life. Your one family. The one civilisation you are part of. The most important transition that will happen in your lifetime is already underway, and you have very little influence over its direction. What you do have influence over is how you position yourself within it. That starts with accepting where we are &mdash; clearly, honestly &mdash; so that the solution makes sense when you hear it. Read the room.
          </Body>

          <Pull>
            The fifth thing &mdash; the fact that a human is involved &mdash; is not going anywhere. Not because machines are not good enough yet. By definition. A machine cannot be you. And that matters, because we are a species that values its own kind.
          </Pull>
        </div>

        <Divider />

        {/* ——— 3 of 5 — THE ALIEN ——— */}

        <SectionHeader>3 of 5 &mdash; The alien</SectionHeader>

        <div className="space-y-6">
          <Fade>
            <p className="text-[0.82rem] sm:text-[0.85rem] italic" style={{ color: 'var(--text-muted)' }}>
              Try a thought experiment.
            </p>
          </Fade>

          <Body>
            Imagine an alien &mdash; vastly more intelligent than any human, with perfect emotional intelligence, exquisite taste, and extraordinary dexterity. It can cook a better meal than any chef on earth. Design a more beautiful building. Write a more compelling argument. It even has better taste than you &mdash; it knows what you like before you do.
          </Body>

          <Body>
            Would you eat at the alien&rsquo;s restaurant? Probably. Would you admire its work? Sure. But is it the same as something a human made?
          </Body>

          <Fade>
            <p className="text-[0.95rem] sm:text-[1.05rem] leading-relaxed py-2" style={{ color: 'var(--text-primary)' }}>
              No. And you know exactly why. Not because the alien&rsquo;s version is worse. It is better. But it is not one of us. If the word &ldquo;speciesist&rdquo; just crossed your mind &mdash; very astute. That is exactly what it is. Humans value humans. That is what this company is built on. If that does not sit well with you, this is probably not your thing.
            </p>
          </Fade>
        </div>

        <Divider />

        {/* ——— 4 of 5 — WHY IT MATTERS ——— */}

        <SectionHeader>4 of 5 &mdash; Why it matters</SectionHeader>

        <div className="space-y-6">
          <Body>
            Humans have always augmented themselves &mdash; books, experts, institutions, tools. Not in a science fiction sense. In the ordinary sense. You have always used things to extend what you can do. AI is just the most powerful version of that. The difference is that AI can also close the loop without you. No book ever wrote itself. No tool ever finished the job on its own. AI can. Your involvement is now a choice, not a requirement.
          </Body>

          <Body>
            Which means the question for every job, every task, every role becomes simple. Can a human do it to an adequate level? And does anyone care that it is a human doing it? The coder who does not write code anymore and just approves what the AI generated &mdash; nobody cares that a human pressed accept. The analyst who reformats what the AI produced &mdash; there is no human premium there. The human costs more and adds nothing. That is an easy decision. The human gets replaced.
          </Body>

          <Pull>
            The only roles where humans have a future are the ones where it matters that a human is involved.
          </Pull>

          <Body>
            And your ability to be in those roles &mdash; to be above the bar where your involvement actually counts &mdash; depends entirely on your mind being sharp enough to keep you there.
          </Body>

          <Body>
            But here is the problem. Every time you let AI think for you without engaging, that sharpness fades. Every decision you outsource entirely, every thought you skip because the machine already answered &mdash; your ability to direct weakens. Quietly, the way you stop being able to do mental arithmetic after years of using a calculator. Except this is not arithmetic. This is your ability to think, to decide, to know what you actually believe.
          </Body>

          <Fade>
            <p className="text-[0.95rem] sm:text-[1.05rem] leading-relaxed py-2" style={{ color: 'var(--text-primary)' }}>
              The same way people need a physical gym because machines handle physical labour, people need a mental gym because AI handles cognitive labour.
            </p>
          </Fade>

          <Body>
            But the mental gym is more important. If your body weakens, your mind can decide to fix it. If your mind weakens, the thing that would decide to fix it is the thing that weakened. It is the one muscle where letting it go means losing the ability to realise you need it back.
          </Body>
        </div>

        <Divider />

        {/* ——— 5 of 5 — ALEXANDRIA ——— */}

        <SectionHeader>5 of 5 &mdash; Alexandria</SectionHeader>

        <Fade>
          <p className="text-[1.15rem] sm:text-[1.35rem] leading-relaxed text-center py-2 italic" style={{ color: 'var(--text-primary)' }}>
            Alexandria is that mental gym.
          </p>
        </Fade>

        <Fade>
          <p className="text-[0.82rem] sm:text-[0.85rem] text-center italic py-2 mb-6" style={{ color: 'var(--text-muted)' }}>
            The product is not the technology. The product is the changed person.
          </p>
        </Fade>

        <div className="space-y-6">
          <Body>
            We see this problem clearly, and we have a simple, elegant solution for it. Most AI companies are built for the transition &mdash; they help you use AI better right now. Alexandria is built for what comes after. But it has to exist now, because the foundations have to be in place during the transition or you do not survive it. Your mind decays during the transition if you do not maintain it. And it compounds &mdash; the earlier you start, the stronger your position, the sharper your mind, the more your AI has to work with. Not starting is not the same as waiting. It is a decision &mdash; and it is the wrong one.
          </Body>

          <Body>
            At the first level &mdash; AI insurance. It runs quietly in the background across all your AI &mdash; whatever you use, it does not matter. It builds a structured, living map of how you think &mdash; your values, your taste, your worldview, your blind spots &mdash; stored on your own files, not ours. We hold nothing. We cannot see it. You own it completely and can take it anywhere. That alone is worth having.
          </Body>

          <Body>
            At the second level &mdash; the mental gym. Alexandria actively develops your mind. New ideas you would not have found on your own. Sharpening what you already believe. Keeping alive the things that would otherwise quietly fade. But this is not just maintenance &mdash; it is what lets you actually absorb the extraordinary abundance that is coming. More ideas, more tools, more possibilities than any generation has ever had access to. The people who can direct that abundance &mdash; who know what they think, what they want, what matters to them &mdash; will do things that were never possible before. The mental gym is what puts you in that position. You walk out a different person &mdash; not because someone told you what to think, but because you know yourself better, and everything you do with AI gets better because of it.
          </Body>

          <Body>
            Even if you are only half-convinced by what you just read &mdash; even if you think there is merely a chance this is as important as we are suggesting &mdash; it is five dollars. If we are wrong, you lost five dollars. If we are right and you did nothing, you lost something you cannot get back. That is not a close call.
          </Body>

          <Fade>
            <p className="text-[0.95rem] sm:text-[1.05rem] leading-relaxed py-6" style={{ color: 'var(--text-primary)' }}>
              If you have read this far, the $5 AI insurance is a no-brainer. One connection. Five minutes. Everything your AI learns about you, saved to your own files, yours to keep no matter what happens. The $15 is for the people who understand what is coming and do not want to be caught without it &mdash; the mental gym, the full experience. It compounds. It only gets better. And it gets more relevant every single day, not less.
            </p>
          </Fade>

          <Fade>
            <p className="text-[0.82rem] sm:text-[0.85rem] italic py-2" style={{ color: 'var(--text-muted)' }}>
              One employee. No database. No way to hold your data. Breaks even at ~150 subscribers. The market is every person who uses AI &mdash; which is everyone.
            </p>
          </Fade>
        </div>

        {/* ——— CLOSE ——— */}

        <Fade>
          <p className="text-[0.95rem] sm:text-[1.05rem] leading-relaxed py-12 sm:py-20" style={{ color: 'var(--text-primary)' }}>
            This is the most terrifying and the most exhilarating moment in human history. The future that is coming can be extraordinarily good &mdash; for you, for your family, for everyone. But it will not happen automatically. The people who thrive will be the ones who took ownership of their own minds &mdash; who positioned themselves, who kept their edge sharp, who made sure the abundance worked for them instead of washing over them. That is what Alexandria is for. Take ownership of your life and the future can be better than anything you have ever imagined. Do not take ownership, and someone else &mdash; or something else &mdash; will. Start now.
          </p>
        </Fade>

      </div>
    </section>
  );
}
