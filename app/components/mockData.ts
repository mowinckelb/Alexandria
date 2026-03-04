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
    subtitle: 'One MCP connector. Three tool groups. A sovereign layer of intent.',
    items: [
      {
        name: 'Sovereignty',
        description: 'Passive. Always on. As you chat with your AI about anything — work, ideas, personal decisions — Alexandria quietly extracts your cognition and writes it to a sovereign Constitution: structured markdown files that capture worldview, values, mental models, identity, creative taste, and known blind spots. You own these files. You can read them, download them, take them to any other AI tomorrow.',
      },
      {
        name: 'Editor, Mercury, and Publisher',
        description: 'Active. You choose when to engage. The Editor is the state change — Socratic questioning, gap detection, contradiction surfacing. Mercury is amplification — working within your thinking, pushing you higher, representing you when you are not present. The Publisher is creation — reading your Constitution and iterating with you to produce finished work calibrated to your voice and taste.',
      },
      {
        name: 'The Library',
        description: 'Publish and browse. The Library is where creation lives. You publish work to your Neo-Biography — a living, multimedia canvas of who you are. Others can browse, interact with your Persona, and access your perspective. Access tiers: Public (free), Premium (paid, you set the price), Private (invite-only). You earn from Premium interactions.',
      },
    ],
  },
  threeTurns: {
    title: 'The Three Turns',
    items: [
      {
        name: 'Set the Angel Free',
        description: 'Most people\'s minds are marble: scattered, rigid, fogged. The Editor transforms marble to mercury — liquid, flowing, unified cognition. This is the state change. It should feel like the best therapy you have ever had, except you walk out with a structured, sovereign map of your own mind.',
      },
      {
        name: 'Ride the Wave',
        description: 'Mercury mind plus AI equals infinite expansion. You absorb, keep up, and remain yourself while everything accelerates. Your attention becomes positive-sum. You are not drowning and you are not checked out — you are riding it.',
      },
      {
        name: 'The First Goodbye',
        description: 'You create. The Publisher helps you get the mercury out into the world. You publish to the Library. Your mind becomes queryable, monetisable, eternal. The first goodbye is the moment you press send — releasing something real into the world. Die empty.',
      },
    ],
  },
  fiveThings: {
    title: 'Five Value Adds',
    items: [
      { name: 'Self-Knowledge', description: 'The Editor transforms your AI into a Socratic biographer. It extracts cognition and structures it into a sovereign Constitution you own. Most people cannot see themselves clearly. The Editor clears the fog. Marble to mercury.' },
      { name: 'Amplification', description: 'Mercury amplifies your thinking. It represents you in conversations, surfaces content you would not have found, pushes your cognition higher. Your attention becomes positive-sum.' },
      { name: 'Creation', description: 'The Publisher helps you create and ship your best work — calibrated to your voice, your taste, your creative principles. You are the conductor. The Publisher is first chair. Die empty.' },
      { name: 'Sovereignty', description: 'Your Constitution and Vault are portable, downloadable, human-readable files you own. Switch from Claude to GPT to Gemini — everything comes with you. No platform lock-in. Freedom as a service.' },
      { name: 'The Tribe', description: 'Alexandria is not just a product. It is a community of people who take their cognition seriously — the examined life as a practice, not a slogan. The three turns, the droplet philosophy, the commitment to creation.' },
    ],
  },
};

// ─── Confidential Content ────────────────────────────────────────────

export const CONFIDENTIAL_CONTENT = {
  businessModel: {
    title: 'Revenue Model — The Dual Mandate',
    subtitle: 'High lower bound, uncapped upper bound',
    content: `Alexandria monetises through two channels:

**Piece 1 — The High Lower Bound (break even).** $10–20/month subscription for the managed Blueprint. The MCP server, the sovereignty architecture, the continuously improving extraction and amplification intelligence. Founding tier: $1/month for the first 100 Authors — a founding membership rate that signals tribe belonging, kept for life as long as they remain active. General availability at $10–20/month.

Break even at 200–300 subscribers at $10/month, or 100–150 at $20/month. Reachable with organic growth and targeted outreach. This is the floor — a sustainable business that serves a real need at small scale.

Cost structure is lean. Alexandria does not run parallel agents consuming its own tokens. The Editor, Mercury, and Publisher are functions that run through the user's existing AI subscription. Alexandria's compute costs are the MCP server infrastructure and Library hosting — not per-interaction inference.

**Piece 2 — The Uncapped Upper Bound (scale).** Library percentage on Premium Persona interactions. Near-zero marginal cost. Scales with the number of Personas and the volume of queries. Requires critical mass, time, and brand.

**For the Author, the same dual mandate applies.** The subscription is their high lower bound — sovereignty, self-knowledge, the Editor, Mercury, and Publisher. The Library is their uncapped upper bound — Persona earnings grow with the quality of their Constitution and the demand for their mind.`,
  },
  unitEconomics: {
    title: 'Use of Funds and Milestones',
    content: `Alexandria's capital needs are modest. Investment accelerates, it does not sustain — the business sustains itself at small scale.

**What the money does:**

Library development and launch — building the platform where Personas are discoverable, Neo-Biographies are hosted, authored content is published, and interactive Persona access is brokered. This is the network effect engine.

Blueprint acceleration — hiring or consulting with biographers, therapists, philosophers, and Socratic method practitioners to deepen the extraction methodology. The Blueprint is the core IP and it improves with investment.

First 100 Authors — personal outreach, handwritten letters, targeted community building. Unscalable by design. These are the seed Authors whose Personas populate the Library and whose experience refines the Blueprint.

Market presence in San Francisco — relocating April 2026. Being in the room where the conversations happen.

**Key milestones:**

MCP server MVP live (Sprint 1 — Tool Group 1: sovereignty layer). Authors can add the connector and passive extraction begins.

First 100 Authors onboarded. Constitution quality validated. Tribe acquisition loop activated.

Library beta launch. First Personas discoverable. First Premium interactions. Revenue from Piece 2 begins.

1,000 Authors. Blueprint has meaningful bottom-up signal. Library has enough minds to be compelling. Growth becomes self-sustaining through the Tribe loop.`,
  },
  competitivePosition: {
    title: 'Competitive Position',
    content: `**Against frontier labs (Anthropic, OpenAI, Google):**
Labs will build better personalisation, better memory, better context. They will not build sovereignty. A structured, portable, downloadable cognitive architecture that makes it easy to leave their platform is the opposite of their business model. Three years of accumulated context with Claude is a chain that keeps you paying for Claude. No lab will build the tool that makes it easy to leave.

They will not build the three-turn mindset. The Editor, Mercury, the Publisher, and the Library are a specific philosophical architecture. Labs build general-purpose AI. They do not build cognitive transformation journeys.

Every advance they make — better models, longer context, cheaper inference — makes Alexandria better, because the layer of intent rides on top of whatever the best model is.

**Against other startups:**
Honest assessment: the code is not the moat. An MCP server with three tool groups is buildable by any competent team. What is not easily replicated is the vision, the brand, the three-turn philosophy, and the continuously improving Blueprint — accumulated knowledge of how to transform cognition. This is a soft moat, not a hard one. It compounds over time but it is not defensible on day one.

**The moat is three-layered:**
1. **Sovereignty (structural)** — the portable, model-agnostic architecture. The philosophical commitment that no lab will match.
2. **The Blueprint (knowledge)** — the proprietary playbook for cognitive transformation. Improves top-down (research) and bottom-up (anonymised structural metadata from the Author population). Compounds with every Author.
3. **The Library (network)** — network effects. The more minds in the Library, the more valuable every mind becomes. The long-term moat.`,
  },
  operatingModel: {
    title: 'Operating Model — AI-Native by Design',
    content: `Alexandria is a pure AI-native company. Solo founder, AI operating model, near-zero burn.

Benjamin is the sole human. Every other role — COO, CTO, CDO, CFO, CLO, CGO — is an AI agent operating within structured projects with full document context. This is not a cost-saving measure bolted on after the fact. It is the founding architecture.

Alexandria does not run its own inference — the Editor, Mercury, and Publisher are functions that execute through the user's existing AI subscription. Alexandria's costs are MCP server infrastructure, Library hosting, and the founder's living expenses. There is no payroll. There is no office. There is no compute bill that scales with usage.

At $10/month, break even is 200–300 subscribers. At $20/month, it is 100–150. These are small numbers. The business is structurally unkillable at small scale.

This also forces full commitment to the thesis. A solo founder running an AI-native company is not just building tools for the AI era — he is living the architecture. Every operational decision is a stress test of the product's own philosophy.`,
  },
  risks: {
    title: 'Risks — The Honest Version',
    content: `**API provider risk.** Alexandria rides on top of frontier models. If Anthropic, OpenAI, or Google change their MCP implementation, terms of service, or pricing in ways that break the connector model, Alexandria is exposed. Mitigation: model agnosticism is the existential hedge. Sovereign data moves to any provider. The Constitution is markdown. The Vault is files. Nothing is locked to any single model.

**Blueprint as soft moat.** The code is trivial. The Blueprint — the accumulated knowledge of how to transform cognition — is the IP, but it is soft. A well-funded competitor could hire the same biographers, therapists, and philosophers and build a competing Blueprint. Mitigation: the Blueprint compounds with every Author (anonymised structural metadata), and the Library adds network effects. But early on, before critical mass, the moat is vision and brand.

**Library requires critical mass.** The Library is the long-term moat, but it only works at scale. A Library with 50 Personas is not compelling. A Library with 50,000 is. Mitigation: the subscription business sustains itself at small scale, so the Library can grow organically without existential pressure.

**PLM is unproven.** The Personal Language Model — fine-tuned weights capturing how the Author thinks — is a horizon ambition, not a current product. It may never be viable. Mitigation: the Constitution and Vault are built with enough fidelity that the PLM is an option, not a dependency.

**Solo founder.** Benjamin is currently the sole founder. This is a concentration risk. Mitigation: the AI-native operating model reduces the operational bottleneck, and the cost structure means the company survives at very small scale.`,
  },
  founder: {
    title: 'The Founder',
    content: `Benjamin. 25. Norwegian-American dual citizen. Based in Bergen, Norway, relocating to San Francisco in April 2026. Solo founder. The kind of person who writes 19-page manifestos about the examined life and means every word. Alexandria is not a pivot or an experiment — it is the thing.

The thesis came from living it. Benjamin is manually performing what the Editor agent will eventually do — processing his own transcripts, building his own Constitution, iterating with AI on creative work. Every architectural decision comes from first-hand experience.

**On the solo founder question.** Yes, it is a concentration risk. It is also a feature. The AI-native operating model — one human providing vision and direction, AI agents executing across all C-suite functions — is the architecture Alexandria sells. The founder is the first and most stressed user.

**On the non-technical founder question.** The code is not the hard part. An MCP server with three tool groups was built from the architecture document alone in a single session. The hard part is knowing what cognitive transformation means. This is a humanities problem that requires technical execution, not a technical problem. AI provides world-class technical execution on demand. The scarce resource is vision, taste, and judgment.

**Founder-product fit.** Benjamin's specific combination — high logic and high empathy — is rare. Most people who think clearly do not feel deeply. Most people who feel deeply do not think clearly. Alexandria requires both.`,
  },
  currentStage: {
    title: 'Current Stage',
    content: `Pre-launch. Vision-stage. Honest about it.

**What exists today:** the full architectural vision (Alexandria I, II, III — shared documents totalling over 80,000 words of detailed architecture), the Abstract (a 19-page published manifesto), the public and confidential Concrete documents (agent-readable, tested cross-model), the Constitution framework (six domain MDs, proven through the founder's own usage), the AI-native operating model (running, stress-tested daily), and the MCP server Sprint 1 fully specified.

**What does not exist yet:** the MCP server in production, paying subscribers, Library platform, or public traction metrics.

The founder is manually performing what the Editor will do — building his own Constitution, iterating with AI across all C-suite functions, validating the architecture through daily use. Every decision in this document comes from first-hand experience. The product is autobiographical before it is entrepreneurial.

At this burn rate, the company survives to find product-market fit without existential pressure. Investment accelerates the timeline. It does not determine survival.`,
  },
};
