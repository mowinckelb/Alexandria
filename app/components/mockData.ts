// Mock data for the product showcase — all fictional, no real user data

// ─── Constitution Mock ───────────────────────────────────────────────

export const CONSTITUTION_DOMAINS = [
  {
    name: 'Worldview',
    icon: '◎',
    content: `## Core Beliefs

The world is not zero-sum. Every great advance in human history came from someone who refused to accept the existing trade-offs and found a way to expand the pie.

Technology is not neutral — it carries the values of its creators. The question is never "should we build this?" but "who should build this, and with what values?"

Complexity is not the enemy. Premature simplification is. The goal is to hold complexity long enough to find the elegant reduction — not to flatten it before you understand it.

## Epistemology

I trust empiricism over authority, but I trust taste over data. Data tells you what happened. Taste tells you what matters.

Most expertise is pattern recognition dressed up as reasoning. The valuable kind knows when the pattern breaks.`,
  },
  {
    name: 'Values',
    icon: '◇',
    content: `## Non-Negotiables

**Intellectual honesty** over social comfort. I would rather be wrong in public than right in private.

**Craft over speed.** Shipping matters, but shipping something beautiful matters more. The extra 20% of polish is where the magic lives.

**Sovereignty.** My data, my weights, my mind. No platform owns my cognition.

## Hierarchy

When values conflict: honesty > craft > loyalty > comfort > efficiency.

I will sacrifice efficiency for craft every time. I will sacrifice comfort for honesty every time.`,
  },
  {
    name: 'Models',
    icon: '△',
    content: `## Thinking Tools

**First principles decomposition.** When stuck, ask: "What would I believe if I had no prior beliefs and only the evidence in front of me?"

**Inversion.** Instead of "how do I succeed?" ask "how would I guarantee failure?" Then don't do those things.

**The Lindy Effect.** Things that have survived a long time will likely survive longer. Books > blog posts. Principles > tactics. Relationships > transactions.

## Decision Framework

For reversible decisions: move fast, decide with 60% confidence.
For irreversible decisions: slow down, decide with 90% confidence.
Most decisions are more reversible than they feel.`,
  },
  {
    name: 'Identity',
    icon: '○',
    content: `## Self-Concept

A builder who writes. A writer who builds. The tension between making things and making sense of things is not a bug — it is the generative engine.

Perpetually dissatisfied with the gap between what I see in my head and what exists in the world. This dissatisfaction is fuel, not suffering.

## Voice

Direct. Slightly formal. Unafraid of long sentences when the thought requires it, but preferring short ones. Metaphors drawn from architecture, music, and craft. Never corporate. Never casual to the point of carelessness.`,
  },
  {
    name: 'Taste',
    icon: '❖',
    content: `## Aesthetic Sensibility

**In design:** Quiet confidence. Generous whitespace. Typography that breathes. The Apple/Anthropic school — where what you leave out matters more than what you put in.

**In writing:** Precise language. Every word earns its place. Orwell's rules, but with permission to break them when the rhythm demands it.

**In music:** Complexity that sounds simple. Bach, Radiohead, Debussy. The kind of beauty that reveals new layers on repeated exposure.

**In people:** I am drawn to people who have strong opinions loosely held, who can change their mind in public, and who make things.`,
  },
  {
    name: 'Shadows',
    icon: '◐',
    content: `## Known Blind Spots

**Perfectionism as procrastination.** I will polish indefinitely if not constrained. The Constitution knows this and the Editor is authorised to call it out.

**Impatience with incrementalism.** I want the elegant solution now, not the pragmatic one that ships. Sometimes the pragmatic one is the right call.

**Overweighting novelty.** New ideas feel more exciting than improving existing ones. But compound improvement often beats fresh starts.

## Contradictions I'm Aware Of

I value sovereignty but build on platforms I don't control.
I preach craft over speed but sometimes ship rough when excited.
I want deep focus but seek breadth compulsively.`,
  },
];

export const CONSTITUTION_VERSION = 'v14';
export const CONSTITUTION_AUTHOR = 'Elena Vasquez';

// ─── Editor Mock ─────────────────────────────────────────────────────

export const EDITOR_CONVERSATION = [
  {
    role: 'editor' as const,
    content: `I noticed something interesting across your last three journal entries. You wrote "I don't care what people think" on Tuesday, but on Thursday you spent two paragraphs processing a colleague's offhand criticism. Can we explore that gap?`,
  },
  {
    role: 'author' as const,
    content: `Fair catch. I think there's a difference between caring about *criticism* and caring about *approval*. I genuinely don't seek approval. But sharp criticism from someone I respect — that lands. It's not that I want them to like me. It's that their perspective is a data point I can't ignore.`,
  },
  {
    role: 'editor' as const,
    content: `That's a meaningful distinction. Your Constitution currently says under Shadows: "indifferent to external opinion." Based on what you just said, a more accurate framing might be: "indifferent to approval, but responsive to substantive criticism from respected sources." Should I update it?`,
  },
  {
    role: 'author' as const,
    content: `Yes. That's more honest. The original was aspirational. This is actual.`,
  },
  {
    role: 'editor' as const,
    content: `Updated. I also want to flag — this pattern connects to your Values domain. You rank intellectual honesty above comfort. Being responsive to sharp criticism *is* your value system working correctly. It's not a shadow; it's a feature. I've added a cross-reference note.`,
  },
];

// ─── Library Mock ────────────────────────────────────────────────────

export const LIBRARY_PERSONAS = [
  {
    name: 'Elena Vasquez',
    bio: 'Architect turned systems thinker. Writes about cities, complexity, and the spaces between disciplines.',
    works: 12,
    tier: 'Premium' as const,
    domains: ['Worldview', 'Models', 'Taste'],
    avatar: 'E',
  },
  {
    name: 'Marcus Chen',
    bio: 'Former physicist, now venture investor. Thinks in first principles about markets, physics metaphors, and founder psychology.',
    works: 8,
    tier: 'Public' as const,
    domains: ['Models', 'Values', 'Identity'],
    avatar: 'M',
  },
  {
    name: 'Adaeze Okafor',
    bio: 'Documentary filmmaker. Explores memory, diaspora, and the stories we tell ourselves about belonging.',
    works: 23,
    tier: 'Premium' as const,
    domains: ['Identity', 'Worldview', 'Shadows'],
    avatar: 'A',
  },
  {
    name: 'James Whitfield',
    bio: 'Philosophy professor. Specialises in ethics of technology, consciousness, and what it means to think well.',
    works: 31,
    tier: 'Public' as const,
    domains: ['Worldview', 'Values', 'Models'],
    avatar: 'J',
  },
  {
    name: 'Yuki Tanaka',
    bio: 'Composer and sound designer. Explores the intersection of mathematics, emotion, and sonic architecture.',
    works: 17,
    tier: 'Private' as const,
    domains: ['Taste', 'Identity', 'Shadows'],
    avatar: 'Y',
  },
];

export const NEO_BIOGRAPHY_PREVIEW = {
  author: 'Elena Vasquez',
  title: 'The Negative Space of Cities',
  excerpt: `What makes a great city is not what it contains but what it allows. The best urban spaces are defined by their negative space — the gaps, the in-between, the unplanned adjacencies that create serendipity.

Barcelona's Eixample district was designed with chamfered corners. The architect Cerdà understood that life happens at intersections, not in buildings. The 45-degree cuts create small plazas at every crossing — space for markets, conversations, chance encounters.

This is a design principle that extends far beyond urban planning. The best systems — whether cities, organisations, or protocols — are not the ones that prescribe every interaction. They are the ones that create the conditions for interactions the designer never imagined.`,
  publishedDate: '2025-11-14',
};

// ─── Mercury Mock ────────────────────────────────────────────────────

export const MERCURY_SUGGESTIONS = [
  {
    type: 'connection' as const,
    content: `You bookmarked an article about "cathedral thinking" yesterday. Your Constitution's Models domain references the Lindy Effect — long-surviving ideas outlasting new ones. There's a thread here about temporal patience in design that might be worth a journal entry.`,
  },
  {
    type: 'challenge' as const,
    content: `Your latest essay argues that "craft always beats speed." But in your own work log, 4 of your last 6 shipped projects were described as "rough but done." Is the essay aspirational or descriptive? The Editor flagged this but I wanted to surface it differently — as a creative tension worth writing about, not a contradiction to resolve.`,
  },
];

// ─── Publisher Mock ──────────────────────────────────────────────────

export const PUBLISHER_ITERATION = {
  original: `The problem with most AI products is that they try to replace human thinking rather than enhance it. This is a mistake.`,
  feedback: `This is clear but generic. Your Constitution's Voice domain says you prefer "precise language where every word earns its place." The phrase "this is a mistake" is earned but the setup isn't specific enough. What *kind* of replacement? Which products? Your Taste domain values concrete examples over abstractions. Try grounding the claim.`,
  revised: `Most AI writing tools optimise for volume — more words, faster. They treat the writer as a bottleneck to be automated away. This misreads the problem. The bottleneck was never typing speed. It was thinking speed. A tool that helps you write faster without helping you think better just produces more mediocre text, more efficiently.`,
};

// ─── Public Content ──────────────────────────────────────────────────

export const PUBLIC_CONTENT = {
  whatAlexandriaIs: {
    title: 'What Alexandria Is',
    subtitle: 'Three tool groups that digitise your cognition',
    items: [
      {
        name: 'The Extraction Engine',
        description: 'An autonomous Editor agent — a biographer that works continuously, not on command. It reads your writing, listens to your voice notes, processes your documents, and extracts the patterns of how you think. It initiates Socratic conversations to surface what you believe but haven\'t articulated. It builds your Constitution — a living document of your worldview, values, mental models, identity, taste, and shadows.',
      },
      {
        name: 'The Representation Layer',
        description: 'A Personal Language Model (PLM) — fine-tuned weights that approximate your cognition. Not a chatbot with your context. A model that thinks like you. It powers your Persona: a high-fidelity digital representation that can operate in parallel, across unlimited interactions, representing you authentically while you do something else.',
      },
      {
        name: 'The Creation Suite',
        description: 'Mercury (a proactive thought partner that connects your ideas before you do), the Publisher (taste-calibrated feedback on your creative work), and the Library (a public marketplace where your Persona lives, your Neo-Biography showcases your work, and others can interact with your mind).',
      },
    ],
  },
  threeTurns: {
    title: 'The Three Turns',
    items: [
      {
        name: 'Marble to Mercury',
        description: 'Your cognition today is marble — solid, static, locked in your skull. Alexandria melts it into mercury — fluid, dynamic, flowing across unlimited parallel interactions. The same mind, in a different state of matter.',
      },
      {
        name: 'Amplification',
        description: 'Your attention is zero-sum. You can only be in one conversation, make one decision, process one document at a time. Your Persona has no such constraint. The gap between what you could do and what you can attend to grows exponentially. Alexandria closes it.',
      },
      {
        name: 'Creation',
        description: 'There are millions of people with extraordinary inner worlds who cannot get it out. Deep thinkers with lifetimes of insight scattered across conversations, notebooks, half-finished thoughts. Alexandria gives them the loom. Their ideas are the threads. The tapestry is the finished work.',
      },
    ],
  },
  fiveThings: {
    title: 'Five Things You Get',
    items: [
      { name: 'Sovereignty', description: 'Your data, your weights, your mind. Downloadable, portable, never locked to any platform. You own your cognition.' },
      { name: 'State Change', description: 'From marble to mercury. A living digital twin of your mind that operates independently and improves continuously.' },
      { name: 'Mercury', description: 'A thought partner that connects your ideas proactively — surfacing patterns, contradictions, and creative threads you haven\'t noticed.' },
      { name: 'The Library', description: 'A public home for your Persona. Your Neo-Biography showcases your work. Others can read, explore, and interact with your mind.' },
      { name: 'Your Tribe', description: 'The founding 100 authors. People who take their inner world seriously enough to digitise it. A community of thinkers, not users.' },
    ],
  },
};

// ─── Confidential Content ────────────────────────────────────────────

export const CONFIDENTIAL_CONTENT = {
  businessModel: {
    title: 'Business Model',
    subtitle: 'Dual mandate — subscription + Library percentage',
    content: `Alexandria monetises through two channels:

**Subscription.** Authors pay monthly for the Machine — the Editor, Orchestrator, PLM training, Vault storage, and all tools. Launch price: $1/month for the founding 100 (locked for life). Standard pricing TBD but expected $29-99/month based on usage tier.

**Library revenue share.** When someone pays to interact with an Author's Persona through the Library, Alexandria takes a percentage. The Author sets their own pricing. Alexandria handles payments, access control, and moderation. This creates a marketplace flywheel: more Authors → more Personas → more visitors → more revenue → more Authors.

The subscription covers costs. The Library creates upside. Both are aligned with the Author's interests — Alexandria only makes money when the Author's Persona is valuable enough that others want to interact with it.`,
  },
  unitEconomics: {
    title: 'Revenue & Unit Economics',
    content: `**Cost structure (per Author/month):**
- LLM inference (Editor + Orchestrator): ~$2-8 depending on usage
- PLM fine-tuning: ~$5-15 per training run (monthly or on-demand)
- Storage (Vault + vectors): ~$0.50-2
- Infrastructure (Vercel, Supabase): ~$1-3
- **Total: ~$8-28/month per active Author**

**Break-even analysis:**
- At $29/month: break even at ~200-300 subscribers
- At $1/month (founding 100): subsidised by standard pricing
- Library revenue is pure margin after payment processing

**Key insight:** AI-native architecture means costs decrease over time as models get cheaper and more efficient. The cost curve bends down, not up. Every model improvement reduces per-Author cost while improving output quality.`,
  },
  competitivePosition: {
    title: 'Competitive Position',
    content: `**vs Frontier Labs (OpenAI, Anthropic, Google):**
They will not build personal fine-tuning — it fragments their base model and breaks their training flywheel. They will build personalised memory (RAG), context windows, and behavioural adaptation. But a general LLM with personal context is fundamentally different from a PLM fine-tuned on personal data. The former is a capable assistant. The latter is an extension of cognition.

**vs AI Startups (Character.ai, Replica, etc.):**
They build entertainment products — fictional characters, companions, chatbots. Alexandria builds cognitive infrastructure — real humans, real data, real sovereignty. The Library is not a chatbot marketplace. It is a marketplace of minds.

**Three Moats:**
1. **Data depth.** The Constitution + Vault create a cognitive dataset that compounds over time. Switching costs increase with every journal entry, conversation, and training run.
2. **Protocol lock-in without platform lock-in.** The protocol is open. The data is portable. But the Library network effects mean Authors want to be where the audience is.
3. **Taste fidelity.** Fine-tuning captures what RAG cannot: the instinct that selects, the sensibility that curates. This is the hardest thing to replicate and the most valuable.`,
  },
  operatingModel: {
    title: 'Operating Model',
    content: `**AI-native, solo founder, near-zero burn.**

Alexandria is built by one person using AI as the engineering team. The entire codebase — 50,000+ lines across 100+ API endpoints, database migrations, training pipelines, real-time agents — was built in weeks, not months.

This is not a constraint. It is the thesis in action. If Alexandria works, it should be buildable by one person with AI leverage. The founder is the first Author. The product is being built using the product.

**Current burn rate:** ~$200/month (Vercel, Supabase, API keys, domain).
**Runway:** Indefinite at current burn.
**Team:** Solo founder. Will hire when there is a specific bottleneck that cannot be solved with AI.`,
  },
  risks: {
    title: 'Risks — The Honest Version',
    content: `**Model dependency.** Alexandria depends on third-party foundation models for inference and fine-tuning. If fine-tuning APIs disappear or become prohibitively expensive, the PLM pathway narrows. Mitigation: model agnosticism is an Axiom, not a feature. The system works with any provider.

**Cold start.** The product requires significant Author investment before value emerges. The Editor needs data; the PLM needs training data; the Library needs Personas. Mitigation: the founding 100 are self-selected for patience and commitment. The $1/month price removes financial friction.

**Solo founder risk.** One person building critical infrastructure. Mitigation: the codebase is well-documented, the architecture is clean, and the system is designed to be maintained by AI agents (including the Blueprint model).

**Market timing.** Too early and people don't understand it. Too late and frontier labs figure it out. The 2-5 year window for personal fine-tuning is a hypothesis, not a certainty.

**Legal/regulatory.** Storing and training on personal data creates GDPR/privacy obligations. Mitigation: data sovereignty is an Axiom. Authors own their data. The protocol supports self-hosting and local storage.`,
  },
  founder: {
    title: 'The Founder',
    content: `Built Alexandria because it was the product he needed. A lifetime of accumulated thinking — philosophy, technology, design, music, markets — scattered across notebooks, conversations, and half-finished projects. The gap between what was in his head and what existed in the world was intolerable.

Alexandria is not a startup idea discovered through market research. It is a personal need that turned out to be universal. Every design decision comes from lived experience as the first Author.

Background: technology, philosophy, design. Not an ML researcher — an architect who understands what AI can do and designs systems that use it well. The technical work is real (the codebase proves it), but the vision is what matters. Alexandria is a humanities project built on technical infrastructure.`,
  },
  currentStage: {
    title: 'Current Stage',
    content: `**What exists:**
- Full working application (Editor, Orchestrator, Constitution, Vault, PLM training pipeline)
- 100+ API endpoints, 35 database migrations, real-time agent architecture
- Live fine-tuning on Fireworks AI (Kimi K2.5 base model with LoRA adapters)
- Functional Editor that extracts cognition through Socratic dialogue
- Constitution versioning across 6 domains
- RLAIF training pipeline (Constitutional Reinforcement Learning from AI Feedback)
- Multi-channel architecture (web, webhook, extensible)
- Voice input processing (Apple transcription → Editor)

**What doesn't exist yet:**
- The Library marketplace
- Mercury (proactive thought partner)
- The Publisher (taste-calibrated creative feedback)
- Neo-Biographies
- Multi-author support (currently single-author)
- Mobile app
- Payment infrastructure

**Next milestones:**
1. Founding 100 launch — onboard first authors at $1/month
2. Library MVP — public Persona profiles and Neo-Biographies
3. Mercury — proactive suggestion engine
4. Publisher — creative feedback tool`,
  },
};
