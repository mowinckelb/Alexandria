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

export default function ScrollPhilosophy() {
  return (
    <section id="philosophy" className="px-8 sm:px-12">
      <div className="max-w-[520px] mx-auto">

        {/* ——— OPENING ——— */}

        <div className="pt-16 sm:pt-24">
          <Pull>
            There are five things a human being brings to the world.
          </Pull>
        </div>

        <div className="space-y-6 mt-4">
          <Body>
            Your brain &mdash; intelligence, analysis, problem-solving, knowledge. Your legs &mdash; strength, endurance, physical power. Your hands &mdash; dexterity, craft, precision. Your heart &mdash; empathy, emotional intelligence, understanding what someone else is feeling.
          </Body>

          <Body>
            And then there is a fifth thing, which is not like the other four. It is not something you do. It is something you are. The fact that you are a human being. That you are mortal, specific, yours. That your grandmother knitted that blanket and not someone else.
          </Body>

          <Fade>
            <p className="text-[0.82rem] sm:text-[0.85rem] italic py-2" style={{ color: 'var(--text-muted)' }}>
              The first four are capabilities. The fifth is a property. Different category entirely.
            </p>
          </Fade>
        </div>

        <Divider />

        {/* ——— THE SHIFT ——— */}

        <div className="space-y-6">
          <Body>
            Now here is what is happening. Each of those four capabilities is being matched and then surpassed by a machine. Strength went first &mdash; the industrial revolution made human muscle irrelevant for most work. Intelligence is going now &mdash; AI already outperforms any individual human at analysis, writing, coding, and reasoning. Dexterity is next &mdash; robotic hands already operate with precision no surgeon can match.
          </Body>

          <Body>
            And empathy, the one people resist &mdash; AI is learning to approximate it so well that most people will not care whether their therapist is human. They will just care that they feel better.
          </Body>

          <Pull>
            Four capabilities. Four technologies. Each one makes the human version unnecessary.
          </Pull>

          <Body>
            This is not a prediction. Every dollar, every brilliant engineer, every government, every military on earth is betting the house on AI and robotics. There is no structural wall between here and there &mdash; just time. And it is much faster than you think, because human beings cannot intuit exponentials. It has been decided. It is happening. If you think otherwise, you are in denial.
          </Body>

          <Body>
            But the fifth thing &mdash; the fact that a human is involved &mdash; cannot be replaced. Not because machines are not good enough yet. By definition. A machine cannot be you.
          </Body>
        </div>

        <Divider />

        {/* ——— THE ALIEN ——— */}

        <div className="space-y-6">
          <Fade>
            <p className="text-[0.82rem] sm:text-[0.85rem] italic" style={{ color: 'var(--text-muted)' }}>
              Try a thought experiment.
            </p>
          </Fade>

          <Body>
            Imagine an alien &mdash; vastly more intelligent than any human, with perfect emotional intelligence, exquisite taste, and extraordinary dexterity. This alien can cook a better meal than any chef on earth. Design a more beautiful building. Write a more compelling argument. It even has better taste than you &mdash; it knows what you like before you do.
          </Body>

          <Body>
            Would you eat at the alien&rsquo;s restaurant? Probably. Would you admire its work? Sure. But is it the same as something a human made?
          </Body>

          <Fade>
            <p className="text-[0.95rem] sm:text-[1.05rem] leading-relaxed py-2" style={{ color: 'var(--text-primary)' }}>
              No. And you know exactly why. Not because the alien&rsquo;s version is worse. It is better. But it is not one of us.
            </p>
          </Fade>

          <Body>
            The fifth thing is not a capability gap that closes with enough talent or data. It is a category difference. And it holds whether the alien is made of carbon or silicon.
          </Body>
        </div>

        <Divider />

        {/* ——— WHAT IT MEANS ——— */}

        <Pull>
          So what does this mean for you?
        </Pull>

        <div className="space-y-6 mt-2">
          <Body>
            Most of your value used to come from the first four &mdash; your intelligence, your skills, your strength. Those are what got you paid, hired, respected. And all four are being competed away. If you try to compete on intelligence alone, you are finished. AI is better. If you try to compete on any capability alone, you lose to the machine.
          </Body>

          <Body>
            But you can compete if you are augmented. A human working with AI is vastly more capable than either alone. AI handles the raw intelligence, the analysis, the heavy lifting. You bring something AI cannot bring &mdash; the fact that it is you doing it. Your involvement makes the output yours. Not generically &ldquo;human.&rdquo; Specifically yours.
          </Body>

          <Body>
            That is not taste &mdash; the alien has better taste. It is not perspective &mdash; the alien has a richer perspective. It is the partial derivative &mdash; the part of the output that exists only because you were involved. Remove you and the output could have been made by anyone or anything. Keep you in and it is irreducibly from a specific person.
          </Body>
        </div>

        <Divider />

        {/* ——— THE LENS ——— */}

        <div className="space-y-6">
          <Pull>
            That is what the lens is.
          </Pull>

          <Body>
            The lens is not a skill. It is your presence in your own work. The clearer that presence &mdash; the more developed your self-knowledge, the sharper your sense of what you actually think and value &mdash; the more of your output carries your partial derivative.
          </Body>

          <Fade>
            <p className="text-[0.95rem] sm:text-[1.05rem] leading-relaxed py-2" style={{ color: 'var(--text-primary)' }}>
              A developed lens means everything you produce has you in it. An undeveloped lens means your involvement is invisible &mdash; interchangeable with the machine &mdash; even when you are technically in the loop.
            </p>
          </Fade>

          <Body>
            When the augmented human and the pure AI produce similar quality, someone has to get the nod. That is the tiebreaker. And the tiebreaker goes to the human &mdash; if people value human involvement. Not automatically. A culture that values humanity tips every close call toward the person. A culture that does not tips it toward the machine.
          </Body>

          <Fade>
            <p className="text-[0.82rem] sm:text-[0.85rem] italic py-2" style={{ color: 'var(--text-muted)' }}>
              Philosophy creates that culture. It is not decoration. It is the mechanism that determines whether the tiebreaker falls your way.
            </p>
          </Fade>

          <Body>
            None of this is theory. Humans already value things this way and always have. The sporting event is valuable because a human body is doing it. The live performance matters because a person is on stage. The handwritten letter means something the printed one does not. These are not sentimental exceptions. They are the rule &mdash; observable, measurable, as old as trade itself.
          </Body>
        </div>

        <Divider />

        {/* ——— THE DANGER ——— */}

        <Pull>
          There are two ways to drown.
        </Pull>

        <div className="space-y-6 mt-2">
          <Body>
            The first is giving up. Every time you let AI think for you without engaging, the muscle weakens. Every decision you outsource entirely, every thought you skip because the machine already answered &mdash; your presence in your own work fades a little. Quietly, the way you stop being able to do mental arithmetic after years of using a calculator. Except this is not arithmetic. This is your ability to think for yourself, to know what you believe, to bring something to the table that is recognisably you.
          </Body>

          <Fade>
            <p className="text-[0.82rem] sm:text-[0.85rem] italic py-2" style={{ color: 'var(--text-muted)' }}>
              And for kids growing up inside AI, it is not even decay &mdash; it is never developing the muscle in the first place.
            </p>
          </Fade>

          <Body>
            The second is being overwhelmed. The abundance is real. More information, more tools, more capability, more options than any human has ever faced. Without a clear sense of who you are and what you think, you suffocate under it. You react to everything and direct nothing.
          </Body>
        </div>

        <Divider />

        {/* ——— THE RESOLUTION ——— */}

        <div className="space-y-6">
          <Body>
            But here is what changes with AI. You do not need to hold deep, fully articulated knowledge on everything anymore. Humans have always augmented &mdash; with books, with experts, with tools. The difference now is that the tools are so powerful that you only need the spark. A hazy fragment. A directional instinct. The sense that something matters, without knowing exactly why yet.
          </Body>

          <Fade>
            <p className="text-[0.95rem] sm:text-[1.05rem] leading-relaxed py-2" style={{ color: 'var(--text-primary)' }}>
              AI fills in everything underneath &mdash; the research, the articulation, the execution. Your job is the touchpoint. The &ldquo;something about this.&rdquo; The rest is handled.
            </p>
          </Fade>

          <Body>
            This means you can cover vastly more ground than any human ever could. Thousands of hazy fragments across hundreds of domains, each one light enough to hold, each one enough for AI to act on. Maximum surface area, minimum cognitive load. The tools fill everything under the curve.
          </Body>

          <Body>
            But you cannot remove the touchpoint itself. Because without it, AI has infinite directions and no way to choose one that is yours. Cross that line and you have not augmented &mdash; you have outsourced. And once the touchpoints are gone, you are just approving output with no directional input.
          </Body>
        </div>

        <Divider />

        {/* ——— THE PRODUCT ——— */}

        <Pull>
          The same way people need a gym because machines handle physical labour, people need a mental gym because AI handles cognitive labour.
        </Pull>

        <Fade>
          <p className="text-[1.15rem] sm:text-[1.35rem] leading-relaxed text-center py-2 italic" style={{ color: 'var(--text-primary)' }}>
            Alexandria is a mental gym.
          </p>
        </Fade>

        <Fade>
          <p className="text-[0.82rem] sm:text-[0.85rem] text-center italic py-2" style={{ color: 'var(--text-muted)' }}>
            The product is not the technology. The product is the changed person.
          </p>
        </Fade>

        <div className="space-y-6 mt-8">
          <Body>
            Someone who has developed their lens holds more touchpoints across a wider surface area. They give sharper direction to their AI because they know what they want &mdash; even hazily. Their augmented output is better because the human element in it is clear and specific rather than vague and generic. They absorb the abundance instead of drowning in it. They are more capable, more competitive, and more themselves.
          </Body>

          <Fade>
            <p className="text-[0.82rem] sm:text-[0.85rem] italic py-2" style={{ color: 'var(--text-muted)' }}>
              That is what development means. Not memorising more. Not thinking harder. Maintaining and expanding the touchpoints that make augmentation yours.
            </p>
          </Fade>
        </div>

        <Divider />

        {/* ——— HOW IT WORKS ——— */}

        <div className="space-y-6">
          <Body>
            Alexandria works at two levels. At the first level, it runs quietly in the background across all your AI &mdash; whatever you use, whichever models, it does not matter. It builds a structured, living map of how you think &mdash; your values, your taste, your worldview, your blind spots &mdash; stored on your own files, not ours. We hold nothing. We cannot see it. You own it completely and can take it anywhere.
          </Body>

          <Fade>
            <p className="text-[0.95rem] sm:text-[1.05rem] leading-relaxed py-2" style={{ color: 'var(--text-primary)' }}>
              One sovereign, compounding record of your mind, across every AI you use.
            </p>
          </Fade>

          <Body>
            At the second level, for those who want it, Alexandria actively develops your mind. Tools that bring you new fragments and connections you would not have found on your own &mdash; expanding your surface area. That sharpen and deepen what you already hold &mdash; refining positions, testing edges, turning hunches into something you can articulate and use. That keep your existing touchpoints alive instead of letting them quietly fade.
          </Body>

          <Fade>
            <p className="text-[0.82rem] sm:text-[0.85rem] italic py-2" style={{ color: 'var(--text-muted)' }}>
              The brilliant connection you made last month, the perspective you were developing, the thing you knew you believed but can no longer quite put into words.
            </p>
          </Fade>

          <Body>
            The mental gym. You walk out a different person &mdash; not because someone told you what to think, but because you have more touchpoints, sharper touchpoints, and a wider surface area for your AI to work with.
          </Body>
        </div>

        <Divider />

        {/* ——— THE LIBRARY ——— */}

        <div className="space-y-6">
          <Body>
            And then there is the Library. Even with a developed lens, even with a sharpened mind &mdash; if all you do is consume, something is still missing. You cannot just take in and take in and never put anything out. The purpose of knowledge is action.
          </Body>

          <Fade>
            <p className="text-[0.95rem] sm:text-[1.05rem] leading-relaxed py-2" style={{ color: 'var(--text-primary)' }}>
              The Library is the encouragement and the place. Share what you have built. Create something that is actually from you &mdash; not generated, not curated, but authored.
            </p>
          </Fade>

          <Body>
            An essay, a perspective, a body of work. Others can access your judgment. You earn from what makes you you. Not everyone will make a living from it. But everyone can make something &mdash; and the act of making it is where meaning lives.
          </Body>
        </div>

        {/* ——— PRICE ——— */}

        <Fade>
          <p className="text-[1.05rem] sm:text-[1.2rem] leading-relaxed text-center py-12 sm:py-16" style={{ color: 'var(--text-primary)' }}>
            One dollar a month for the safety net.<br />
            Fifteen for the full experience.<br />
            Sixty seconds to start.
          </p>
        </Fade>

        <Divider />

        {/* ——— THREE SCALES ——— */}

        <div className="space-y-6">
          <Fade>
            <p className="text-[0.82rem] sm:text-[0.85rem] italic" style={{ color: 'var(--text-muted)' }}>
              This matters at three scales and they are all connected.
            </p>
          </Fade>

          <Body>
            Personally &mdash; a developed lens is what keeps you capable, competitive, and sane when everything else can be done by a machine. It is not a luxury. It is a survival strategy.
          </Body>

          <Body>
            Socially &mdash; a culture that values human authorship, that promotes developing the lens, that tips the tiebreaker toward people &mdash; that is a culture where augmented humans thrive instead of being quietly replaced. Philosophy builds that culture.
          </Body>

          <Body>
            And civilisationally &mdash; if people lose their sense of meaning and purpose, they conclude they are worthless. That conclusion is rational if nobody has given them a better frame. And people who believe they are worthless demand the state fix it for them &mdash; intervention, redistribution, control. That pressure leads to stagnation. Stagnation leads to tyranny.
          </Body>

          <Fade>
            <p className="text-[0.95rem] sm:text-[1.05rem] leading-relaxed py-2" style={{ color: 'var(--text-primary)' }}>
              Give people meaning and you protect the foundations everything else is built on. Let meaning erode and those foundations go with it.
            </p>
          </Fade>
        </div>

        {/* ——— CLOSE ——— */}

        <Fade>
          <p className="text-[1.15rem] sm:text-[1.35rem] leading-relaxed text-center py-12 sm:py-20 italic" style={{ color: 'var(--text-primary)' }}>
            Alexandria is built on two commitments: freedom and humanity. Everything follows from those two words.
          </p>
        </Fade>

      </div>
    </section>
  );
}
