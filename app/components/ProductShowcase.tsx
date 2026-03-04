'use client';

import { useState } from 'react';

// ─── Constitution Preview ────────────────────────────────────────────
// Dense, real, the kind of self-knowledge that no generic AI would surface.
// Focus: taste, contradictions, the stuff between the lines.

const DOMAINS = ['Worldview', 'Values', 'Models', 'Identity', 'Taste', 'Shadows'];

const CONSTITUTION_CONTENT: Record<string, string[]> = {
  Worldview: [
    'The twentieth century\'s great error was treating humans as rational agents who occasionally feel. The reality is the inverse — we are feeling agents who occasionally reason, and the reasoning is almost always in service of the feeling. This has implications for everything: markets, relationships, design, politics. Any model of human behaviour that begins with rationality is wrong at the root.',
    'Progress is real but not linear. It moves in lurches — decades of apparent stagnation punctuated by phase transitions that rearrange everything. We are inside one now. The people who see it are building. The people who don\'t are optimising for a world that is about to stop existing.',
    'The most important things cannot be measured. You can measure engagement but not meaning. Revenue but not taste. Citations but not insight. The unmeasurable things are precisely the things worth optimising for, which is why most optimisation produces emptiness.',
    'I believe in the sacred ordinary. The way light hits a kitchen counter at 7am. The particular silence after someone says something true. Consciousness is not a problem to be solved — it is the thing doing the solving, and it deserves to be treated with awe even when it is just making coffee.',
    'History rhymes because human nature is constant and institutional memory is short. The Medici funded art because surplus capital seeks meaning. Silicon Valley funds AI for the same reason. The pattern is: capability arrives, then the question "capability for what?" follows a generation later. We are in the capability phase. The meaning phase is next.',
  ],
  Values: [
    'Say the thing. The social cost of honesty is almost always lower than you think, and the compounding cost of habitual omission is almost always higher. I have lost relationships by saying the thing. I have never regretted it. I have regretted every silence.',
    'Make it beautiful or don\'t make it. This is not perfectionism — it is respect. For the material, for the audience, for the time everyone involved will never get back. The argument that "it doesn\'t need to be beautiful, it just needs to work" is how you get a world that works and no one wants to live in.',
    'Protect the morning. The first two hours of the day are a different cognitive instrument than the rest. Sharper, less defended, more capable of genuine thought. I guard them like a musician guards their hands. No email, no calls, no inputs. Only output.',
    'Keep promises to yourself with the same rigour you keep promises to others. Most people maintain a double standard — they would never cancel on a friend but they cancel on their own plans constantly. Self-trust is built the same way external trust is: through repeated consistency.',
    'Never optimise for legibility. The need to be understood by everyone is the enemy of doing important work. The people who matter will understand. The rest will catch up or won\'t. Both outcomes are fine.',
  ],
  Models: [
    'The Overton Window of the Self. Just as public discourse has a window of acceptable opinion, each person has a window of acceptable self-concept. Thoughts and behaviours outside the window get suppressed, rationalised, or invisible. Growth is not adding new capabilities — it is widening the window. The Editor\'s job is to make the window visible.',
    'Taste as Compressed Experience. Taste is not preference. It is the entire history of your aesthetic encounters, compressed into an instinct that fires faster than language. When I say "that\'s not right" about a sentence, a colour, a note — that judgment contains thousands of prior encounters I can no longer individually recall. This compression is what makes taste unteachable and invaluable.',
    'The Conviction-Flexibility Matrix. Most people are either high-conviction/low-flexibility (stubborn) or low-conviction/high-flexibility (agreeable). The rare and valuable quadrant is high-conviction/high-flexibility — strong views that update rapidly on evidence. I optimise for this quadrant. The test: can you state your position forcefully and then abandon it completely in the next sentence if the evidence warrants it?',
    'Accumulation vs Threshold Effects. Most valuable things in life follow threshold dynamics, not linear accumulation. You don\'t get 1% of a language by learning 1% of the vocabulary. You don\'t get 1% of a relationship by spending 1% of the time. You get zero until you cross a threshold, then you get everything at once. Patience before the threshold. Intensity after it.',
    'The Adjacent Possible. Stuart Kauffman\'s concept, applied personally: at any moment, the set of next moves available to you is constrained by where you are now. But some positions have far larger adjacent possibles than others. The meta-strategy is not to optimise any single move but to move toward positions with richer adjacent possibles. Knowledge compounds. Relationships compound. Optionality compounds.',
  ],
  Identity: [
    'I build things because the gap between what I see in my head and what exists in the world is physically uncomfortable. It is not ambition in the conventional sense — I don\'t care about scale, status, or market share. I care about the specific thing existing. The discomfort doesn\'t resolve until it does.',
    'My thinking happens in three registers: analytical (systems, structure, logic), aesthetic (beauty, rhythm, rightness), and somatic (gut feeling, physical response, intuition). The best decisions use all three. The worst use only one. I\'ve learned to distrust any conclusion that only one register endorses.',
    'I am a better writer than speaker, a better speaker than socialiser, and a better socialiser than I give myself credit for. The gradient is: I need decreasing amounts of preparation as intimacy increases. With strangers: careful, measured. With close friends: fluid, funny, occasionally reckless. The written word is where the full range is always available.',
    'Norwegian-American, 25. The hyphenation matters. Norway gave me the instinct that systems should serve people, that simplicity is a form of respect, and that silence is not emptiness. America gave me the belief that you can actually build the thing you imagine, that ambition is not embarrassing, and that the default answer to "can I?" is yes.',
    'I distrust my own nostalgia. The past always feels more coherent than it was. I catch myself narrativising — making my history into a story with an arc — and have to actively resist it. The truth is messier. Some things happened for no reason. Some formative experiences were accidents. The story I tell about myself is useful but it is not true in the way I want it to be.',
  ],
  Taste: [
    'A room should feel like a thought completed. Le Corbusier understood this. Tadao Ando understood this. The quality of light, the proportion of negative space, the way sound behaves — these are not decorative choices. They are cognitive choices. I cannot think well in an ugly room. This is not precious. It is empirical.',
    'The opening paragraph of "The Great Gatsby" is the most efficient piece of English prose ever written. Every sentence does three things simultaneously. That density — where nothing is wasted and every element is load-bearing — is what I aspire to in everything, not just writing. In code. In conversation. In how I arrange a shelf.',
    'Music I return to: the Goldberg Variations (Gould, 1981 — the slow one), Radiohead\'s "In Rainbows," Debussy\'s "Clair de Lune" but only the Arrau recording, Miles Davis "Kind of Blue," Frank Ocean\'s "Blonde." The common thread is not genre — it is that each one gets more interesting on the hundredth listen. Immediate exhaustibility is the mark of shallow work.',
    'I can tell within thirty seconds whether a piece of design was made by someone who cares. It is not about polish — some of the best design is rough. It is about intention. Did every element earn its place? Is there a governing logic? Could you remove anything without loss? The questions are the same whether it\'s a typeface, a building, or a business model.',
    'My relationship with food is Italian, not French. Italian cooking is about the ingredient. French cooking is about the technique. I want the tomato to taste like a tomato. I want the essay to sound like the person. I want the product to feel like the problem it solves. Transformation should reveal, not obscure.',
  ],
  Shadows: [
    'I intellectualise emotions to avoid feeling them. When something hurts, my first instinct is to understand why it hurts — to build a model of the pain — rather than to sit with it. This is useful for writing and terrible for intimacy. The people closest to me have learned to say "I don\'t want your analysis right now, I want you to be here," and every time they say it, they are right.',
    'I confuse being busy with being effective. Deep down I know that my best work comes from doing less, not more. Two hours of genuine thinking beats twelve hours of productive motion. But I still fill days with motion because stillness feels like laziness, even though stillness is where the real work happens.',
    'I have a pattern of starting things and not finishing them. Not because I lose interest — because the last 20% is where the work stops being creative and starts being mechanical, and I lose energy exactly at the transition. The graveyard of 80%-done projects is the most honest portrait of my limitations.',
    'I hold people to standards I would resent if applied to me. I expect clarity, reliability, and follow-through from others while giving myself generous latitude for ambiguity, inconsistency, and changing my mind. This hypocrisy is mostly invisible to me in the moment and obvious in retrospect.',
    'I am afraid that the things I build will not outlast me, and simultaneously afraid that they will and I will be misunderstood. The desire for legacy and the fear of legacy coexist without resolution. The Shadows section exists because Alexandria promises to hold contradictions rather than resolve them, and this is the contradiction I most need held.',
  ],
};

function ConstitutionPreview() {
  const [domain, setDomain] = useState('Taste');
  const entries = CONSTITUTION_CONTENT[domain];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <span className="text-[0.8rem] tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Constitution
        </span>
        <span className="text-[0.6rem]" style={{ color: 'var(--text-whisper)' }}>
          v31 &middot; 6 domains &middot; 142 entries &middot; Daniel Larsson
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {DOMAINS.map((d) => (
          <button
            key={d}
            onClick={() => setDomain(d)}
            className="px-2 py-0.5 text-[0.65rem] bg-transparent border rounded-full cursor-pointer transition-all"
            style={{
              color: domain === d ? 'var(--text-primary)' : 'var(--text-ghost)',
              borderColor: domain === d ? 'var(--border-dashed)' : 'var(--border-light)',
            }}
          >
            {d}
          </button>
        ))}
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
      >
        <div className="p-5 space-y-4 max-h-[380px] overflow-hidden relative">
          {entries.map((entry, i) => (
            <p
              key={i}
              className="text-[0.78rem] leading-[1.7]"
              style={{
                color: i < 3 ? 'var(--text-secondary)' : 'var(--text-muted)',
                opacity: i >= 4 ? 0.6 : 1,
              }}
            >
              {entry}
            </p>
          ))}
          <div
            className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
            style={{ background: 'linear-gradient(transparent, var(--bg-secondary))' }}
          />
        </div>
        <div
          className="px-5 py-2 flex flex-col sm:flex-row items-center justify-between text-[0.6rem] gap-0.5"
          style={{ color: 'var(--text-whisper)', borderTop: '1px solid var(--border-light)' }}
        >
          <span>{entries.length} of 24 entries in {domain}</span>
          <span className="italic">sovereign &middot; versioned &middot; portable</span>
        </div>
      </div>
    </div>
  );
}

// ─── Library Preview ─────────────────────────────────────────────────
// One evocative Neo-Biography excerpt + surrounding context

function LibraryPreview() {
  const [view, setView] = useState<'biography' | 'browse'>('biography');

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[0.8rem] tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Library
        </span>
        <div className="flex gap-3">
          {(['biography', 'browse'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="text-[0.6rem] tracking-wider bg-transparent border-none cursor-pointer transition-opacity capitalize"
              style={{ color: 'var(--text-primary)', opacity: view === v ? 0.5 : 0.2 }}
            >
              {v === 'biography' ? 'neo-biography' : 'browse'}
            </button>
          ))}
        </div>
      </div>

      {view === 'biography' ? (
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
        >
          {/* Author header */}
          <div className="px-5 pt-5 pb-3 flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-[0.9rem] shrink-0"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-ghost)' }}
            >
              D
            </div>
            <div>
              <div className="text-[0.9rem]" style={{ color: 'var(--text-primary)' }}>Daniel Larsson</div>
              <div className="text-[0.65rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Writer, builder. Systems thinking through the lens of architecture and sound.
              </div>
              <div className="flex gap-3 mt-1.5 text-[0.55rem]" style={{ color: 'var(--text-ghost)' }}>
                <span>14 works</span>
                <span>v31</span>
                <span
                  className="px-1.5 py-0.5 rounded-full"
                  style={{ border: '1px solid var(--border-light)' }}
                >
                  Premium
                </span>
              </div>
            </div>
          </div>

          {/* Published work */}
          <div className="px-5 pb-5">
            <div className="pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-[0.85rem]" style={{ color: 'var(--text-primary)' }}>
                  The Weight of Pencils
                </span>
                <span className="text-[0.55rem]" style={{ color: 'var(--text-whisper)' }}>
                  Feb 2026
                </span>
              </div>
              <div
                className="text-[0.78rem] leading-[1.75] space-y-3 max-h-[260px] overflow-hidden relative"
                style={{ color: 'var(--text-secondary)' }}
              >
                <p>
                  My grandfather drew buildings for forty years with the same brand of pencil. Staedtler Mars Lumograph, 2B. When he retired, he had eleven unused boxes in his desk drawer — not hoarded, just accumulated. He bought them in pairs whenever he visited the art supply store, the way other men of his generation kept a spare tyre in the garage. Preparedness against a future that, for pencils, never arrived.
                </p>
                <p>
                  I think about those pencils when I consider what it means to digitise a mind. Not the technical question — that is merely engineering on a sufficient timeline — but the experiential one. What is the pencil-weight equivalent of cognition? What are the textures that no specification would think to capture but that constitute, in aggregate, the irreducible particularity of a person?
                </p>
                <p>
                  He held the pencil overhand — not the way you were taught in school, pinched between thumb and forefinger, but palmed, almost like a knife, with the graphite meeting the paper at a low angle. This produced a specific quality of line: broader, softer, with a grain that followed the direction of his wrist rather than his fingers. Every architect who trained under him could identify his drawings at a glance, not by the buildings but by the lines themselves. His line quality was a cognitive fingerprint — the physical expression of how he saw.
                </p>
                <p>
                  A sufficiently advanced model could learn to replicate that line. Given enough drawings, it could produce new ones that even his students might mistake for his. But the model would not know that the overhand grip began as a workaround for a broken index finger in 1962, never corrected because by the time it healed, the new grip had become his own. It would not know that the low angle was an accident that became a preference that became an identity. The line quality is the output. The story is the input. The gap between them is where personhood lives.
                </p>
                <div
                  className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                  style={{ background: 'linear-gradient(transparent, var(--bg-secondary))' }}
                />
              </div>
            </div>
          </div>

          <div
            className="px-5 py-2 flex flex-col sm:flex-row items-center justify-between text-[0.55rem] gap-0.5"
            style={{ color: 'var(--text-whisper)', borderTop: '1px solid var(--border-light)' }}
          >
            <span>13 more works &middot; interact with this mind</span>
            <span className="italic">free to read &middot; premium to converse</span>
          </div>
        </div>
      ) : (
        /* Browse view — grid of minds */
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
        >
          <div className="p-4 space-y-3">
            {[
              { i: 'D', name: 'Daniel Larsson', line: 'Systems, architecture, sound. 14 works.', tier: 'Premium' },
              { i: 'R', name: 'Rachel Adeyemi', line: 'Neuroscience, perception, West African philosophy. 22 works.', tier: 'Public' },
              { i: 'T', name: 'Thomas Engel', line: 'Venture, founder psychology, institutional design. 9 works.', tier: 'Premium' },
              { i: 'M', name: 'Maya Ishikawa', line: 'Composition, mathematics, synaesthesia. 31 works.', tier: 'Public' },
              { i: 'C', name: 'Carlos Restrepo', line: 'Documentary, memory, post-conflict narrative. 18 works.', tier: 'Premium' },
              { i: 'E', name: 'Elena Bowen', line: 'Poetry, translation, the limits of language. 44 works.', tier: 'Public' },
            ].map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-3 py-2 cursor-pointer transition-opacity hover:opacity-70"
                style={{ borderBottom: '1px solid var(--border-light)' }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[0.65rem] shrink-0"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-ghost)' }}
                >
                  {p.i}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.75rem]" style={{ color: 'var(--text-primary)' }}>{p.name}</div>
                  <div className="text-[0.65rem] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{p.line}</div>
                </div>
                <span
                  className="text-[0.45rem] tracking-wider uppercase px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ color: 'var(--text-ghost)', border: '1px solid var(--border-light)' }}
                >
                  {p.tier}
                </span>
              </div>
            ))}
          </div>
          <div
            className="px-4 py-2 text-[0.55rem]"
            style={{ color: 'var(--text-whisper)', borderTop: '1px solid var(--border-light)' }}
          >
            <span className="italic">138 minds in the Library &middot; browse, read, interact</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────

export default function ProductShowcase() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-8 overflow-x-hidden">
      <div className="max-w-2xl mx-auto space-y-20 overflow-hidden break-words">
        <ConstitutionPreview />
        <LibraryPreview />
      </div>
    </section>
  );
}
