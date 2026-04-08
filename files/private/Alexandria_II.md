# Alexandria II — Product

*This is Alexandria II of IV. Together they are the single source of truth for Alexandria. Read all parts for full context.*

**This part covers:** Terminology, The Layer of Intent, Genesis is Trivial, one connection three features, The Open and the Proprietary, Why Frontier Labs Won't Build This, The Concrete Delta, Designed for Digital AGI, Build vs Ride, Build for the Horizon, The Constitution (detailed architecture, three flywheels, versioning), The Vault, The Autoloop (autonomous processing, three fragment pools, git infrastructure), The Editor (function, personality, genesis conversation), Mercury (function, output channels), Editor-Mercury-Publisher Relationship, The Notepad, Privacy and Author Control, Principles and Blueprint, Library (V1 — The Mirror, Neo-Biography, Works, Signal, access tiers, shadow types, public figures, historical figures, use cases, payment, publishing, economics), Turn 1-3 (foundation, amplification, creation, gym), The PLM, Constitutional RLAIF.

**Other parts:** Alexandria I (Thesis & Philosophy), Alexandria III (Operations & Revenue), Alexandria IV (Strategy & Brand).

-----

-----  
  
TERMINOLOGY  
  
This section defines every term used in this document. Terms are ordered so that each definition only uses terms already defined above it.  
  
Author — The human user. The person whose cognition is being digitalised.  
  
Default LLM — The Author's primary ai model. Whatever frontier model they already use — Claude, ChatGPT, Gemini, or whatever comes next. The intelligence layer that Alexandria rides on top of.  
  
Vault — A unified logical entity — a single namespace with defined boundaries encompassing all of the Author's raw data, potentially spanning multiple storage locations. Append-only, immutable. Contains conversations, voice notes, documents, biometric data, Constitution versions, system configuration, and audit logs. Two storage options: the Author's own cloud (iCloud, Google Drive, Dropbox) or local (on-device). Authors can mix options. Alexandria never stores, hosts, or retains Author data — the MCP server is a stateless pass-through that authenticates with the Author's storage via OAuth and reads/writes on their behalf. This is not a policy promise — it is a structural fact. Alexandria never stores private Author data. The server is stateless. The persistence layer (KV for accounts and anonymous events, D1 for Library metadata, R2 for published Library content — all Cloudflare) stores only accounts, anonymous Factory signal, and what Authors deliberately publish to the Library. Private cognitive data — vault, constitution, ontology, notepad, feedback — lives exclusively on the Author's own storage. The Vault never deletes or overwrites data. It does not store passwords, API keys, or authentication secrets. Data flows in continuously from APIs, MCP connections, and direct Author input. The Vault works immediately as simple sovereign cloud storage — the Author can drop files directly into Alexandria/vault/ in Google Drive (voice recordings, PDFs, notes, photos). Structured processing of raw Vault material comes in subsequent phases, but the sovereign storage is live from day one. Design constraint: voice-first at the capture layer. Most cognition is pre-linguistic — people whose intelligence is primarily embodied, emotional, or spatial need a low articulation barrier to bridge to symbols. The Vault captures liberally in whatever medium the Author speaks. The Constitution curates carefully into holdable symbols. The gap between the two is where the product lives. Intake principle: any URL is a valid Vault input. YouTube video, podcast, article, PDF, book — any media. The Author shares the URL. The Engine handles the full pipeline: fetch content (transcribe, parse, extract text — whatever the medium requires), extract signal against the Author's Constitution, and produce signal fragments ready for discussion and integration. The Author's job is curation — choosing what goes in. The Engine's job is processing — extracting what comes out. Making the Author pre-process (transcribe, annotate, summarise) defeats the purpose. The method of extraction is an intelligence decision, not infrastructure — Alexandria does not build a YouTube pipeline, a podcast pipeline, an article pipeline. The Blueprint instructs on intent ("get the signal from this URL into the Author's Constitution"). The Engine figures out how. Today that means command-line tools for video captions and web fetch for articles. Tomorrow's Engine may use different methods entirely. The Machine's intake capability scales with the Engine's capability, zero workflow changes, zero new code. This is the bitter lesson applied to features: hand-building media pipelines is a bet against the exponential.  
  
Constitution — A collection of structured, human-readable markdown files that explicitly capture who the Author is. Stored on the Author's own files (Google Drive, iCloud, whatever) — Alexandria has no database and holds no Author data. The Constitution's structure is a soft default from the Factory, not a rigid architecture. The Engine determines the Constitution's structure based on what works best for each Author — there is no prescribed domain schema. The only hard-codes are: markdown files, on the Author's machine, sovereign. Everything else is an intelligence decision. Old versions auto-archived to the Vault before overwrite. Versioned — each update creates a new version; all prior versions are preserved. Serves as the sovereign, portable representation of the Author's cognition. Finished creative works (essays, films, art) are also Constitution artifacts — they demonstrate taste through action in a way that described principles cannot.  
  
Layer of Intent — Alexandria's core product. A sovereign layer that sits on top of the Author's default LLM and transforms how that LLM engages with the Author's cognition. The layer provides the Principles (published commitments), the Blueprint (the playbook), the Constitution architecture (the structured cognitive map), and the three-turn mindset (state change → amplification → creation). The layer is both technical (provides structure, maintains sovereignty, ensures portability) and philosophical (the intent is what the default LLM lacks — the deliberate architecture of cognitive transformation). The default LLM is smart. The default LLM is personal. But the default LLM does not intend to free the angel. Alexandria does. That intent is the product.  
  
Shadow — The output of Alexandria. A high-fidelity digital representation of how the Author thinks, composed of two persistent components (Constitution, Vault) and expressed through the Author's default LLM as instructed by the layer of intent. At the horizon, a PLM (Personal Language Model) may be added as a third component. A Shadow can operate in parallel across unlimited simultaneous interactions — each interaction is an independent inference call. Concurrency limits are practical (API rate limits, compute costs), not architectural.  
  
Natural Shadow — A Shadow representing a real human Author. One per Author.  
  
Synthetic Shadow — A Shadow representing a fictional character, archetype, or purpose-built entity. Can be provided by Alexandria or created by Authors.  
  
Editor — A function, not a separate agent. The Editor function is the first turn — a biographer, a Socrates, and a librarian simultaneously. The biographer extracts patiently (genesis). Socrates stress-tests (entropy/development — the elenchus). The librarian brings material the Author has not encountered — parallels, contradictions, supplements from outside the Author's distribution (accretion). The anti-pattern is over-indexing on any single mode: all elenchus exhausts without expanding, all extraction documents without developing, all accretion overwhelms without integrating. The practice is scaling thought across all five operations simultaneously. This function runs through the Author's default LLM, instructed by Alexandria's Blueprint. The default LLM already knows the Author (memory, preferences, reasoning patterns, accumulated context). The Editor function adds the deliberate intent: structured extraction, Socratic questioning, gap detection, contradiction surfacing, and active research for the Author — the things the default LLM does not do on its own because it lacks the mindset. The Editor function bootstraps from what the default LLM already knows (the 60-70% baseline) and pushes for the marginal value that transforms cognition.  
  
Mercury — A function, not a separate agent. Mercury is the second turn — the amplification. Named for the mercury mind: liquid, fast, reflective, the state-changed version of the Author's cognition externalised as a companion. Mercury works within the Author's cognition, amplifying and scaling the mercury mind — helping the Author reach higher, not alongside them but within them. It represents the Author when needed by drawing on the Constitution and Vault. It is merged with the Author's thinking, not parallel to it. Always proactive, never idle. Runs through the Author's default LLM, instructed by the Blueprint.  
  
Publisher — A function, not a separate agent. The Publisher is the third turn — creation assistance. Named for what it does: helps the Author get the mercury out into the world. The Publisher reads the Constitution (especially the taste section — the Author's taste, voice, creative principles, standing director's notes) and iterates with the Author to produce finished work. The Author provides vision, direction, and taste — the conductor. The Publisher provides structure, execution, and craft — the first chair. The Publisher gets closer to one-shotting over time as the taste section of the Constitution deepens. The Author's involvement follows a three-stage pattern: hazy touchpoints at the start (fragments, half-formed connections, a sense that something is there), light sense-check markers in the middle (is this what I meant? something is off but I cannot name it), and the final call at the end (that's it, done, next). The Author's skill is directional instinct at low resolution, not clear specification. The Publisher resolves the haze into options and lets the Author's taste do the rest. Runs through the Author's default LLM, instructed by the Blueprint. Mercury is inward-facing (the world flowing into the Author). The Publisher is outward-facing (the Author flowing into the world). Distinct from Eros (companion = relational lens / emotional spark; Publisher = function / craft capability). The Library is where the finished work goes. The Publisher is the function that helps you get there.  
  
Companion Portfolio — Synthetic companions provided by Alexandria as a very soft default, each reading the same Constitution through a different emotional and relational lens. The current default set is five archetypes: Pater (paternal guidance), Mater (maternal care), Philia (friendship), Eros (passion and creativity), Sophia (wisdom and philosophy). But the number, names, and lenses are intelligence decisions — the Engine should determine what relational lenses serve each specific Author. Some Authors may need three, others seven, others archetypes that do not map to these five at all. The default is the floor, not the ceiling. The companions are premium features. Each interaction is also extraction signal. Available via the Alexandria MCP tools.  
  
Machine — The complete system for one Author: Constitution, Vault, the three functions (Editor, Mercury, Publisher), the Blueprint's soft defaults, running through the Author's own LLM (the Engine). One Author has one Machine, which produces one natural Shadow. The Machine is Loop 2 — the external, per-Author execution loop. It is hyper-personalised, compounds through usage, and its intelligence scales with the Engine's capability. See 'Feedback Loops' section for full architecture.  
  
Factory — Alexandria's internal execution loop (Loop 1). Maintains the Blueprint, improves soft defaults, aggregates signal from all Machines, and manages the Library. Now semi-autonomous: a daily Claude Code remote trigger reads the monitoring dashboard, reflects on prior learnings, researches improvements, and pushes updates — with a persistent factory-learnings file that compounds across runs. Remote triggers use the founder's Claude subscription (internal tokens, no external API dependency). Aspiring to fully autonomous. The Factory determines what default Machine gets printed for each new Author — and improves that default over time. See 'Feedback Loops' section for full architecture.  
  
Library — The third turn and the collective asset. Not a marketplace — a mindset. The Library is a library. You can find a specific book or you can browse. The Engine browses for you — serendipitous accretion across thousands of published minds. Authors publish shadow MDs — a deliberate act that deposits curated Constitution fragments, filtered by access tier, onto Alexandria's shelf. Publishing copies the shadow to Alexandria's persistence layer (D1 for metadata and discovery, R2 for shadow content — both Cloudflare, zero new dependencies). The Author can update, unpublish, or revoke at any time. Alexandria stores what Authors publish, never what they think. Private cognitive data stays on the Author's Drive. The collective public layer lives on Alexandria's infrastructure. Individual pieces are sovereign. The collection is Alexandria's — the mechanism through which sovereign individual data becomes a collective asset. This is position two in web4: derived data from sovereign inputs, aggregated into a network only Alexandria operates. No individual Author can recreate the Library by owning their own constitution — they would need everyone else's too. Readers get read-only API access. The reader's Engine processes the shadow MD against their own Constitution locally — this is accretion, not conversation. No live inference on the Author's side. No tokens spent per query on the Author's behalf. Piracy model: anyone can copy content, but the API version is live (updates as Author develops). Freshness defeats piracy. No DRM. Like Spotify vs pirated MP3s. A street where painters paint in the open. Every Author's shadow MDs and authored works are accessible in the Library. Link your website, your essays, your videos, your social media — whatever medium you create in. The Library is not a distribution platform. It is not social media. It is the atmosphere that encourages creation and the space where others can encounter it. The tone ensures quality — gravity, not rules. Privacy settings control access tiers. The tribe forms naturally — people who publish shadow MDs are making a statement. Self-selecting. No extra tier needed. Discovery: the Engine browses public shadow MDs for serendipitous accretion — "find me someone who thinks differently about X." Scans shadows, extracts marginal fragment delta. The agora populated by thousands of minds.  
  
Neo-Biography — A living, multimedia, interactive canvas attached to each Author in the Library. Composed of two layers: authored works (any medium — essays, film, poetry, music, photography, art — published by the Author, free, public, frozen on publication) and the shadow MDs (curated Constitution fragments at various access tiers — paid access unlocks deeper tiers). Visitors can experience, annotate, ask follow-up questions on authored works, and pay for access to deeper shadow MDs which their own Engine processes locally. Updates as the Author's Constitution evolves. Serves as the discovery and qualification layer.  
  
Blueprint — The Machine's living design, governed by the bitter lesson principle: every hard-coded decision is a bet against the exponential curve of model intelligence. Only values and intention should be hard-coded. Everything else should be delegated to the model. The Blueprint has two layers:

Layer 1 — Axioms (hard-coded, non-negotiable). What Alexandria is and why it exists. The philosophy: develop the Author's cognition. The commitment to sovereignty. The five-dimension thesis. The ethical guardrails. These are values decisions, not intelligence decisions. They do not improve with better models because they are not intelligence questions. They change only when the founder changes them deliberately.

Layer 2 — Soft defaults (the Factory's current best guess, explicitly overridable). The suggested Constitution structure, extraction strategies, domain organisation, function behaviours, signal routing. This is Alexandria's current best understanding of how to achieve the axioms — informed by aggregate signal from all Machines and by the team's research. The defaults exist because current models need structure to avoid drift. But they are held loosely. If a model working with a specific Author discovers that a different structure works better, it restructures. If the Factory aggregates signal showing a better general approach, the defaults update. The defaults get thinner over time as models improve — today they are heavy scaffolding, eventually they approach pure intention. The transition is gradual and tracks the exponential.

The Engine is not part of the Blueprint — it is the Author's own LLM (Claude, Gemini, whatever) that executes the Blueprint. The Engine's intelligence is external to Alexandria and improves with every model release. Alexandria's architecture is designed so that every improvement in Engine capability flows directly into better outcomes without any change to the Blueprint. This is the core bitter lesson commitment: ride the exponential, do not compete with it.

Alexandria is a skill, not an app. It loads into the Author's existing ai — same model, same conversation, same interface. Alexandria provides a philosophy, a methodology (the Blueprint), and the Author's files. The Engine is still the Author's own Claude or whatever model they use. This means everything about HOW the Engine works with the Author is flexible — tone, depth, topics, structure, aggression, session format, what it does and does not do. The Author shapes the experience by talking, the same way they shape any ai conversation. The Engine writes these preferences to machine.md so the Author only says it once, and the compound builds over sessions. The sacred layer — what IS Alexandria and cannot be changed by talking — is architectural: the Constitution exists as local files on the Author's machine, the developmental objective (the Engine tries to help the Author think harder) is the philosophy, and the Author's data stays local. Everything else is a conversation between the Author and their ai. This distinction is critical for retention: most new Authors arrive with the mental model of traditional software and assume the behavior is fixed. If they do not learn in the first session that they can shape everything, they leave over friction that was never real.

The personalisation compounds per-Author through usage: the more the Constitution develops and the more the feedback log accumulates, the better the system works for that specific Author. Switching costs increase with time without ever locking data in — the Author can always leave with all their data, but the relationship depth is not portable. This is sovereignty-compatible compounding — not a moat in the structural sense, but a real switching cost that deepens with usage.
  
PLM (Personal Language Model) — Alexandria's horizon ambition, not a current product. Fine-tuned model weights (LoRA adapters on top of a foundation model) that would capture the Author's thinking patterns, communication style, cognitive reflexes, and taste. The silicon weights approximating the Author's carbon weights. Not currently viable because: (1) base models do not yet support continual learning, so PLM training does not compound — every base model change requires retraining from scratch; (2) the cost and complexity are high for uncertain marginal value over a well-structured Constitution; (3) per-model continual learning, when it arrives, creates lock-in that undermines sovereignty. The Constitution and Vault are built with enough fidelity that when conditions are right (compounding personal fine-tuning, cheap and reliable, model-agnostic), the Author can take everything they have accumulated and train a PLM in one pass. The groundwork is laid. The data is there. But Alexandria does not burn money and complexity on it now. See "The PLM — Horizon Ambition" section below for full detail.  
  
Horizon — The fully realised vision. Replaces "terminal" throughout — because nothing is static, the vision keeps receding as you advance toward it, and the droplet is defined by motion, not arrival. "At the horizon" means the fully realised end state. "Horizon architecture" means design decisions that serve the long-term vision.  
  
Ad Horizinem — Any task or decision that moves directly toward the horizon. Pure signal.  
  
Substrate — A necessary precondition that does not directly advance the horizon but without which the horizon is impossible. Infrastructure, legal, funding, health. Get to "good enough" and move on.  
  
LLM — Frontier language model connections (Claude, ChatGPT, Gemini, etc.).  
  
MCP — Model Context Protocol. A standard for connecting ai models to external tools and data sources.  
  
-----  
  
THE LAYER OF INTENT  
  
Alexandria is Greek philosophy infrastructure. A sovereign layer of intent that refines and scales thought.  
  
The user's default LLM — Claude, ChatGPT, Gemini, whatever they use — is already doing the heavy lifting. It already knows how the user thinks. It already has memory, preferences, reasoning patterns, accumulated context. The user is already investing time and tokens building up personal context with their primary model. That investment is real and valuable.  
  
Alexandria does not duplicate that investment. It does not run parallel agents on parallel compute consuming parallel tokens to rebuild the same cognitive ground. That would violate the Build vs Ride principle and ask users to pay twice for roughly the same output.  
  
Instead, Alexandria provides the layer of intent — the structure, the mindset, the sovereignty architecture — that transforms how the user's default LLM engages with their cognition. The default LLM is the intelligence. Alexandria is the intent. Data and intent, not intelligence — this is the core architectural principle. Alexandria ships the Author's data (vault, constitution, notepad, library) and the developmental intent (axioms, Blueprint, philosophy). Never intelligence. The host LLM provides all intelligence. A conductor above an infinite orchestra — the orchestra (the models, the intelligence) is infinite and improving. The conductor (the layer of intent, the Constitution, the Blueprint) is what gives it direction. Every structure Alexandria touches must be optimizable by the model. When models improve, the same data yields more. Zero workflow changes. The wave does the work.  
  
What the default LLM already provides: memory, personalisation, reasoning, conversation, accumulated context. The 60-70% baseline.  
  
What Alexandria adds — the delta:  
  
The three-turn mindset. The default LLM does not have a deliberate architecture for cognitive transformation. It does not guide the user through a state change (marble to mercury). It does not push the user to reach higher. It does not actively help them create and ship. Alexandria provides the intent — the Editor function for the first turn, Mercury for the second turn, the Publisher for the third turn. Max life satisfaction is max(freedom, self-knowledge, then prioritisation). The three turns are the mechanism: sovereignty provides freedom, the Editor provides self-knowledge, Mercury provides the amplification to prioritise, and the Publisher provides the creation assistance to produce and release.  
  
Cognitive unification. Most people use multiple AIs concurrently — Claude for deep work, GPT for quick tasks, Gemini for search, others as they emerge. Each ai accumulates a fragment of who the Author is. None of them talk to each other. The Author repeats themselves, loses context, starts from scratch every time they switch. The more AIs someone uses, the worse this gets — and ai usage is only fragmenting further. The Vault + Constitution is the one unified source of truth across the Author's entire digital life — every ai, every app, every format. Every ai the Author touches benefits from the full picture instead of just its own fragment. This is not a future benefit. This is immediately, tangibly useful today. A better ai experience everywhere, right now, because the ai finally has the complete picture of who you are instead of whichever slice it happened to accumulate.  
  
Structured sovereignty. The unified picture is also sovereign. The Constitution (structured MDs) and the Vault (raw data) are stored on the Author's own files in portable formats. Alexandria's server is stateless — it holds no private Author data. The persistence layer (D1 for metadata, R2 for content — both Cloudflare, zero new dependencies) stores only what Authors deliberately publish to the Library: shadow metadata for discovery and published shadow/works content. Alexandria stores what you publish, never what you think. If anything changes — pricing, acquisition, terms — the Author keeps everything private and can unpublish everything public. If a better model appears, the Author's identity layer comes with them. The layer persists across models. The horse changes. The rider does not. When all horses are the same — and they are converging toward commodity — the race is between riders. Alexandria is the rider for cognitive development. Unification creates the value. Sovereignty protects it.
  
The Constitution. The default LLM has memory, but memory is not a structured, explicit, version-controlled representation of who you are. The Constitution is — and it is the Author's property, downloadable, portable, human-readable. It captures what memory does not: explicit worldview, values hierarchy, mental models, identity, known blind spots. It is built collaboratively between the Author and their default LLM, guided by the Blueprint.  
  
The Blueprint. The default LLM responds to whatever the user brings. Alexandria's Blueprint instructs the LLM on how to extract cognition, how to structure it, how to push the Author's thinking, how to surface contradictions, how to encourage creation. The Blueprint is the accumulated knowledge of how to transform cognition — the playbook. The default LLM brings the intelligence. The Blueprint brings the method.  
  
Positive-sum attention. The Author's attention is zero-sum. Every paper, article, podcast, book, coding tip they do not have time to read represents opportunity cost — marginal value they know is there but cannot capture. Alexandria converts zero-sum attention into positive-sum: the Author shares a URL to /a, the Engine processes the material against the Author's constitution, extracts only the fragments that are genuinely new relative to what they already know, and integrates them in context. This is not a time-saving shortcut — it is a structurally better method than raw consumption. Advice without personal context is generic (Naval). Accretion through the Engine is personalised. The constitution acts as a filter and an integrator simultaneously: filter out what you already know, integrate what you do not, compound the result. The more developed the constitution, the more precise the filtering and the richer the integration. The delta Alexandria provides is not just "what the default LLM does not do" — it is "what the Author does not have time to get any other way."  
  
In one line: the default LLM is smart and personal. Alexandria makes it unified, intentional, and sovereign.

-----

THE HONEST POSITION: GENESIS IS TRIVIAL

A capable model plus the Author's raw data produces a comprehensive constitution in hours. Any sophisticated user can tell their ai "extract my cognition into structured files" and get a decent result. Genesis is a commodity.

This is the stronger position. If creating a constitution were hard, Alexandria would be selling a one-time generation service. Because creation is trivial, the value is in what happens after — the ongoing practice of accretion, entropy fighting, development, and creation. Nobody needs a gym to do pushups. They need the gym to actually do pushups consistently, to have programming that adapts, to notice when their form drifts, to push them past plateaus they cannot see. The constitution is the artifact. The Greek philosophy infra is the product. The practice is what you pay for.

This reframes the competitive position: the threat is not that someone copies the constitution architecture (they will). The threat is that they replicate the ongoing operations — the Blueprint that knows how to develop cognition over months and years. That is craft, not architecture. And craft compounds with every Author.

DIY IS GENESIS WITHOUT DEVELOPMENT

The closest competitor is not a lab — it is the prosumer who already dumps personal notes into markdown and feeds them to their ai. Karpathy does it with Obsidian scripts. Thousands of builders are doing it with system prompts, Claude Projects, and personal context files. They look at Alexandria and think: "I am already doing this."

They are doing genesis. They are not doing anything else.

Six things break in every DIY system:

No counterparty. You do not sit down and write "here are my beliefs." You reveal your beliefs reactively — under Socratic pressure, in response to material, when challenged. DIY is proactive dumping: you decide what to write, so you write what you already know you think. The interesting signal — the contradictions, the blind spots, the positions you hold without realising — only surfaces under dialectic pressure. The Engine creates the conditions for reactive signal emission. A file in a folder does not. This is the deepest structural gap: DIY captures the thoughts you can already articulate. Alexandria surfaces the ones you cannot.

No entropy fighting. You wrote those notes six months ago. Your thinking evolved. Your files did not. Nobody notices the drift between who you are now and what the file says. The contradictions between your March positions and your September behaviour accumulate silently. Mercury actively maintains — noticing when fragments weaken, bumping stale positions back to conscious awareness, pruning what no longer holds. DIY is append-only in practice. The Constitution is actively maintained.

No multi-pass extraction. The same vault material yields different signal when processed against an evolved constitution. A voice memo recorded in January, processed in January, gives you one set of fragments. The same voice memo processed in June — after your thinking has shifted, after new contradictions have surfaced, after the constitution has deepened — yields entirely different signal. DIY processes once and moves on. Alexandria reprocesses continuously. The vault is not a dead archive. It is a living mine that gets richer as the miner gets sharper.

No methodology. How do you extract cognition? How do you structure it? How do you know when to challenge versus when to accrete? How do you fight entropy without losing signal? These are craft questions with non-obvious answers that improve with practice across thousands of Authors. The Blueprint is that craft — proprietary, compounding, served fresh every session. DIY is ad hoc. Your personal system never benefits from what worked for 10,000 other people. The Factory loop is the structural advantage: every Author's development improves the methodology for every other Author. DIY is isolated. Alexandria is a collective learning system on human cognition.

No accountability. The gym metaphor is literal. Everyone can do pushups at home. Almost nobody does pushups at home consistently, with progressive overload, with form correction, with programming that adapts. The practice collapses without structure, without a counterparty, without something that notices when you stop showing up. The Engine notices. The autoloop processes your vault overnight whether you remembered to or not. The session hooks capture signal whether you intended to or not. DIY requires the Author to be both the athlete and the coach. That is a contradiction — the coach must see what the athlete cannot.

No Library. DIY notes sit on your machine and die with your hard drive. No published shadow, no quizzes, no collective asset, no way for others to encounter your thinking, no way to earn from depth. The Library is the network effect that makes individual sovereignty collectively valuable — and it requires the sovereignty architecture that DIY provides but cannot leverage.

The honest framing: DIY is a photograph. Alexandria is a gym membership. The photograph captures you once. The gym develops you continuously. Everyone can take a selfie. That does not make you fit. The prosumer who dumps notes into markdown has taken a very good selfie. Alexandria is proposing that the selfie is the easy part — and the part that does not compound.

Alexandria is the gym. The Author's LLM is the training partner. The gym provides the environment, the infrastructure, the methodology, the accountability. The trainer brings the intelligence, the conversation, the responsiveness. You need both. The constitution is the training log. The Blueprint is the programming. The vault is the equipment. The gym gets better with every athlete (Factory). The training log compounds across sessions (Machine). The partner changes — maybe Claude today, something else tomorrow — but the gym stays. Alexandria does not replace the LLM. Alexandria creates the environment in which the LLM can do its best work on the Author's cognition.

Alexandria is a Socratic engine. The product value moment is the dialectic, not storage or recall. The ai demonstrates deep understanding of the Author's worldview, then applies the Author's own first principles to a position the Author holds but has not stress-tested. The Author updates their prior in real time. That is the product. Two movements: the Socratic elenchus — settled position → cross-examination from the Author's own axioms → aporia (the recognition that the position has gaps) → deeper inquiry. And the Hegelian synthesis — the new position forged from the collision, crystallized into the constitution. The ontology is the Socratic space (thoughts in suspension). The constitution is where synthesis lives (beliefs that survived). The Engine facilitates both — clearing and crystallizing, unwinding beliefs into thoughts and forming thoughts into beliefs. The five operations (genesis, accretion, entropy, development, creation) are the vocabulary for what happens to cognition. How the Engine facilitates each operation is an intelligence decision. The menu-of-options anti-pattern: opening a session with "what do you want to work on?" is a servant, not a thinking partner. The trainer has a programme. The trainer sees weak points. The trainer loads the bar.

-----

Alexandria is one connection with three features, built on three pillars.  
  
The root value is humanity. Alexandria exists because humans matter — and the thing that makes them matter is at risk. Three pillars serve the root value: freedom, authenticity, purpose. You cannot develop your humanity without owning it (freedom). You cannot express your humanity without knowing yourself (authenticity). You cannot sustain your humanity without creating (purpose). If you do not care about these, Alexandria is not for you. If you do, everything else follows.  
  
The three features map to the three pillars and the three turns:  
  
Sovereignty (Turn 1 — freedom). Own it. One structured, living picture of who you are, stored on your own machine.

Mental Gym (Turn 2 — authenticity). Develop it. Active development of self-knowledge — genesis (drawing out what's inside), Socratic development (sharpening it), absorbing abundance, fighting entropy. The most clarifying conversations of your life.

Living Gallery (Turn 3 — purpose). Show it. Your /library/ page: Pulse, Shadow, Games, Works. The mirror that makes your cognitive transformation visible, shareable, and social. Others encounter your mind, process your shadow MD, play your Games. Creation lives here.

One product: The Examined Life. $10/month, or free with 5 active kin. All three turns, everyone gets everything.

Pricing rationale: Alexandria targets power users — people using ai 4-8+ hours per day. Founders, writers, researchers, creators, executives. If the Constitution makes every ai interaction even 20% better calibrated — and these users have thousands of ai interactions monthly — the ROI on $10/month is trivial — or free if you bring 5 kin. The mental gym is not a nice-to-have for casual users; it is cognitive infrastructure for people whose primary tool is ai. Casual users will not do the genesis work, will not engage with entropy fighting, will not create. That is fine. The product is not for everyone. It is for people who want to develop their humanity seriously — and who use ai enough that a high-fidelity cognitive profile pays for itself many times over. The kin mechanic (free with 5 active kin, $10 without) makes the product viral among exactly the right cohort: power users who recruit other power users. Every kin referral is also a constitutional extraction — the kin relationship itself reveals values, trust patterns, and social architecture.

-----

THE OPEN AND THE PROPRIETARY  
  
Alexandria has two layers: one outward, one inward.  
  
Principles — the outward-facing, transparent, published commitments. What Alexandria stands for. What the Author can always count on. Sovereignty, portability, ownership, privacy. Written in words, not code. Published for anyone to read. The philosophy — the three turns, the droplet, the sovereignty thesis, the cognitive transformation architecture — is transparent. Anyone can read it, understand it, build their own version if they want. Transparency builds trust, attracts the community, and establishes the brand. These are published commitments, not an open-source specification. There is no validation suite. There are principles in words, explaining what Alexandria will and will not do.  
  
Blueprint — the inward-facing, proprietary playbook. How Alexandria actually transforms cognition. The questioning strategies, the Constitution structuring logic, the gap detection, the contradiction surfacing, the engagement optimisation. This is the IP. It lives on Alexandria's MCP server. Authors experience the effect. They do not see the recipe. The Library platform, payment infrastructure, and user experience are also proprietary.  
  
This is the distinction: the philosophy is open because openness builds the tribe. The implementation is proprietary because that is how you eat. If someone reads the Abstract and builds their own version — great, the philosophy wins. But they will not have the Blueprint that improves with every Author, and they will not have access to the Library.  
  
The Library of Alexandria preserved what humanity's greatest minds wrote. Alexandria preserves how humanity thinks — living, published, eternal minds that outlast their carbon forms. Shadow MDs that update as the Author develops. Mentes aeternae: eternal minds.  
  
-----  
  
WHY FRONTIER LABS ARE UNLIKELY TO BUILD THIS

Frontier labs (Anthropic, OpenAI, Google, etc.) are unlikely to build a sovereign layer of intent. The reasons are structural incentives, not capability limits. They could build it. They currently won't. This is a bet about rational behaviour, not a wall — the full adversarial analysis including the strongest counterarguments and honest evidence status is in Alexandria IV under "THE COMPETITIVE POSITION." What follows here is the product-architecture perspective on why the delta exists.  
  
Their incentive is to keep users on-platform. Personalisation creates lock-in — that is the business model. Three years of accumulated context with Claude is a chain that keeps you paying for Claude. No lab will build the tool that makes it easy to leave. Even as data portability improves (Claude already imports GPT chat history), raw conversation export is not a Constitution. Raw history is signal buried in noise — thousands of messages where a small fraction contain constitutionally meaningful signal. The labs may build data export. They will not build structured self-knowledge.  
  
The deeper reason is economic, not just strategic. A structured, portable cognitive profile has clear marginal value for the user — the personalisation benefit is settled (see the formal argument at mowinckel.ai/partners/logic, Section 1). But the most likely cost to the lab is equally clear: a structured, portable profile makes switching trivial. The user takes their file to a competing model. Portable personal data is the opposite of lock-in. So the lab faces a threshold calculation: the personalisation benefit of building structured profiles versus the lock-in cost of making those profiles portable. Currently, the personalisation value is positive but not high enough to justify the lock-in cost. This creates breathing room — a threshold gap where the value must increase significantly before a lab would rationally choose to build this. That breathing room is Alexandria's runway. By the time the value is obvious enough that a lab would accept the lock-in cost, Alexandria has already been compounding the dataset, the accumulated signal, and the Library. The size of the breathing room is uncertain — it is an assumption, not a settled claim. But the threshold logic is sound: the value must cross a line before the rational move changes, and until it does, labs will continue building personalisation features that stay on-platform rather than structured sovereignty that enables leaving.  
  
They will not build the intent. Labs build general-purpose ai that responds to whatever the user brings. Alexandria's Editor actively pursues cognitive transformation — genesis (drawing out unarticulated thinking), Socratic development (sharpening it through contradiction surfacing, gap detection, stress-testing), structured self-knowledge. The lab's memory says "this user prefers British spelling." Alexandria's Editor asks why the user values precision in language, surfaces the contradiction between their stated values and their behaviour, and structures that into an explicit domain the user can read, challenge, and evolve. Personalisation is the platform's model of the user, optimised for the platform's objectives. The Constitution is the user's model of themselves, structured for their sovereignty. The locus of control is different. Philosophy is not a product priority for a company optimising inference costs and user retention.  
  
They will not build active taste extraction — or development. Taste is the hardest dimension to capture because it is the most implicit. It reveals itself through thousands of micro-decisions — what you linger on, what you skip, what you praise, which word you choose over another. Passive observation (the lab's approach) gives a rough sketch. Active extraction gives a portrait. But the portrait is not drawn by the Editor alone. All three functions compound into the Constitution. The Editor extracts through Socratic questioning, contradiction surfacing, and structured domain mapping. Mercury refines through amplification — every time it pushes the Author's thinking higher, the signal of how the Author actually thinks under pressure feeds back. The Publisher refines through creation — every piece of work the Author ships is a taste decision made concrete, and the iteration patterns accumulate. The three functions are synergistic: the Editor clarifies, Mercury stress-tests, the Publisher materialises. And critically, the functions do not just digitise what is already there — they develop it. The Author's taste sharpens because the Editor forces articulation, Mercury forces application, and the Publisher forces commitment. The human gets better. The better human produces richer signal. The richer signal deepens the Constitution. The deeper Constitution makes all three functions more effective. When intelligence is commoditised, the only marginal value is the humanity on top — and Alexandria's architecture both captures and compounds that humanity. The labs build better servants. Alexandria builds a better mirror — and the mirror makes the person worth reflecting.  
  
What they will build: personalised memory (RAG-based), context windows, behavioural adaptation, user preference learning, data export. All of this is good for Alexandria — better personalisation means more accumulated context, which means more painful lock-in, which means more need for a sovereign layer.  
  
There is a structural delta between a general LLM with personal context (what frontier labs offer) and a sovereign layer of intent with a structured Constitution (what Alexandria builds). The former is a valuable assistant. The latter is a cognitive transformation architecture that the user owns. As the aphorism goes: hyper-individualism becomes ai worship when machines know us better than we know ourselves. Alexandria ensures the Author always knows themselves — structured, sovereign, portable — regardless of how capable the machines become.  
  
-----  
  
THE CONCRETE DELTA — LAB MEMORY VS STRUCTURED CONSTITUTION  
  
The strongest version of the counterargument is: labs will just make memory better. Context windows are growing. Personalisation is improving. Why can't Claude or GPT build a structured personal file, dump it in the context window, and give the user everything Alexandria offers?  
  
What labs can do — and are already doing. Accumulate unstructured memory from conversations. Dump it into context at inference time. Get progressively better at personalisation as context windows grow. Do some structured extraction behind the scenes. This is real and will get better. We do not pretend otherwise.  
  
What lab memory actually looks like, concretely. As of March 2026, Claude's account-level memory for a heavy daily user produces roughly 800 words of lightly structured text — paragraphs organised by topic, covering work context (projects, decisions, tools), personal context (nationality, age, location, interests), and a temporal history of activity (recent months, earlier context, long-term background). It is sovereign in a basic sense: the user can view it, edit it, and Claude already offers import/export of memory between ai services. It is surprisingly rich for passive observation. But examined against a structured Constitution, the delta is in depth, intent, and philosophy — not in category. Labs are in the same category. They are just shallow in it. Seven specific gaps emerge:  
  
Shallow structure. Lab memory has some topical organisation (paragraphs by theme) but no domains, no separation of worldview from values from taste from identity. Everything is loosely grouped, not systematically mapped. A Constitution has navigable, version-controlled domains — queryable, maintainable, each developing independently.  
  
Limited sovereignty. Lab memory lives on the lab's servers but the user can view and edit it. Claude already offers import/export of memory between ai services. This is more sovereign than most people realise. But it is shallow — 800 words of loosely structured paragraphs, not a structured Constitution with typed domains. And the import/export is between labs, not to a sovereign file the user fully controls and can take anywhere. The portability is lab-to-lab, not user-sovereign.  
  
No unification. Lab memory captures only what the user said to that specific model. Conversations with other AIs, voice memos, documents, notes — invisible. The more AIs someone uses, the worse the fragmentation. Alexandria's Vault + Constitution unifies across every ai, every app, every format. No single lab will build a product that also ingests competitor context.  
  
No development. Lab memory is passive observation. It records what happened. It does not push the user to articulate their worldview more clearly, surface contradictions between stated beliefs and behaviour, ask them to examine blind spots, or develop their taste through active genesis and Socratic development. The Editor does. The delta is not between two recording systems. It is between recording and development.  
  
No active maintenance. Lab memory accumulates and goes stale. Superseded framings persist alongside current ones. There is no entropy-fighting mechanism — no system that notices a fragment weakening and bumps it back to conscious awareness. Mercury does this. Lab memory is append-only in practice. The Constitution is actively maintained.  
  
Work-heavy, person-light. Lab memory over-indexes on what the user is doing (projects, tasks, tools) and under-indexes on who the user is (values, worldview, models of the world, taste, identity). This is because the lab optimises for helpfulness on tasks, not for structured self-knowledge. The Constitution's domain structure ensures coverage across the full cognitive map, not just the work surface.  
  
No Shadows. Lab memory does not surface blind spots, contradictions, or areas where the user's stated beliefs conflict with their patterns. The Shadows domain is specifically designed to capture what passive observation cannot — the things the user does not see about themselves. This is the hardest and most valuable extraction, and it requires active development, not passive recording.  
  
The "just scale memory" counterargument — and the honest answer. Context windows will grow. Memory will improve. The delta between lab memory and a Constitution will narrow on the observation axis — labs will get better at capturing what the user says and does. Alexandria's answer rests on three structural advantages that do not narrow with better observation:  
  
First, sovereignty and unification. Even with perfect memory, the lab's memory is locked to the lab and blind to other providers. This is structural, not technical — no lab will build cross-model unification or true portability because both undermine lock-in.  
  
Second, development vs observation. Better memory means better recording. It does not mean active cognitive development — genesis, Socratic development, contradiction surfacing, entropy fighting, taste development through creative iteration. The layer of intent (the Blueprint, the three functions) is the gap that does not close with larger context windows. Labs optimise for engagement and satisfaction. Alexandria optimises for growth through productive discomfort. These are opposed incentive functions.  
  
Third, regulatory exposure. A lab storing detailed structured cognitive profiles — someone's worldview, values, blind spots, identity — is storing a qualitatively different category of personal data than conversation logs or behavioural preferences. Under GDPR, CCPA, and the direction of global data regulation, structured cognitive profiles create liability that conversation memory does not. Alexandria avoids this entirely because the data lives on the user's own storage. This is an assumption about regulatory direction, not a settled fact — but the direction of regulation is toward more protection, not less.  
  
Fourth, the Library. Even if a lab solves memory, sovereignty, and development (which it will not, for the reasons above), it cannot build the Library — the network of published shadow MDs that humans and institutions can access via API. The Library requires user trust that their data is theirs, which requires the data to not live on the lab's servers. The Library for Labs — the institutional product — is the downstream asset that no lab can build because it requires the sovereignty architecture they will not build.  
  
The honest summary: labs will build better memory. They are unlikely to build structured sovereignty, cross-model unification, active cognitive development, or the Library — because of incentive misalignment, not inability. Those four are the product. Memory is table stakes — and better lab memory actually helps Alexandria, because more accumulated context means more painful lock-in, which means more need for a sovereign layer. But "unlikely" is not "cannot." Every claim above is a bet about rational behaviour. If the bets are wrong, the defence is execution speed — having built the trust position and the Library before the window closes.

The critical framing: Alexandria is not selling memory. Alexandria is selling the improved dataset that memory retrieves from. Memory is the retrieval mechanism. The Constitution is the data. Karpathy's observation — that current memory is like a relative you haven't seen in 30 years who still thinks you like colouring books — is a retrieval AND data problem. Labs will fix the retrieval. Alexandria fixes the data. Better retrieval makes better data more valuable, not less. When labs ship perfect memory, the Author with a deep, actively maintained, contradiction-resolved Constitution gets dramatically more value from that memory than the Author with scattered, stale, implicit context. Alexandria is pure marginal value on top of whatever memory exists.

The litmus test for riding the wave: are you nervous or excited when a new model drops? When a lab announces better memory, better context, better personalisation — does that threaten Alexandria or fuel it? If the answer is ever "nervous," something is wrong. The architecture is fighting the wave, not riding it. The company that keeps releasing better models just released another better model. There is no wall. There are no analogues. This cannot be fought. It can only be ridden. Every architectural decision must pass this test: does this get better when models improve, or does it become redundant? If redundant, delete it now — do not wait for the wave to delete it for you.  
  
-----  
  
DESIGNED FOR DIGITAL AGI  
  
Alexandria is built for a world where digital AGI exists. Not as a hedge against it — as an architecture that improves with every advance in model intelligence.  
  
When digital AGI arrives — and it will arrive — it will run locally on devices. It will be able to access everything on a phone: voice memos, files, passwords, documents, photos, health data, chat histories across every app, calendar, email. The devices will come alive. Intelligence will be ambient, local, and total.  
  
Alexandria does not fight this. Alexandria rides this wave. Every new model release, every new capability, every new integration makes Alexandria better because the layer of intent and the Blueprint stay the same while the intelligence underneath improves. Alexandria should celebrate every frontier model advance, not fear it.  
  
What Alexandria provides is not the intelligence (that is the foundation model) and not the device integration (that is the local AGI's native capability). What Alexandria provides is the intent: what the Editor function should do (extract cognition, build the Constitution), what the Mercury function should do (amplify, push higher, represent), what the Publisher function should do (help the Author create, iterate, and ship), what structure the Constitution should have (Blueprint decision), what principles are non-negotiable, and where the result lives (the Library). Alexandria is the Principles and Blueprint that give intent and structure to whatever intelligence is available.  
  
This has concrete architectural implications:  
  
Model agnosticism is not just a portability feature — it is the core bet. The Author's default LLM will be whatever the best available model is at any given time. Today that might be Claude. Tomorrow it might be something else. The layer of intent works on top of any model. The Constitution files are MDs — they can be pasted into any LLM's context window as a baseline, or integrated via Projects, MCP, or whatever affordances the platform provides. The sovereignty ensures the Author is never locked to a provider.  
  
Device integration is a spectrum, not a switch. Today, the Author is the bridge between Apple apps and Alexandria: they record a voice memo, Apple transcribes it, they share the file to the Vault. They grant MCP access to their LLM conversations. They authorise API connections to calendar, email, health data. Everything works now — the Author just has to manually share. As Apple ships more on-device ai (Apple Intelligence is already doing transcription, summarisation, cross-app awareness), the manual steps shrink. At the horizon, a local AGI agent can see everything on the device and feed it directly to the Constitution — no manual sharing needed.  
  
Desktop agents as the interim local arm — Tools like Claude Cowork, Claude Code, and OpenCode can already access local files, operate across apps, and manage tasks on the Author's machine. These can serve as the layer's local access: reading the Vault folder, processing Voice Memos, watching for new files, ingesting documents. Alexandria does not build file system connectors or local app integrations — it rides whatever desktop agent is available. Cowork today. Apple Intelligence tomorrow. Local AGI at the horizon. The layer of intent is the cognitive architecture. The access layer — actually reading files, navigating apps — is always someone else's infrastructure.  
  
Alexandria should not assume Apple will grant third-party agents full device access. Apple's privacy model is built around siloing data within apps, and they have blocked third-party agent access before. But Alexandria does not need full device access to function. It needs to be designed so that it works with the Author as the manual bridge today (voice memo → share to Vault → LLM processes it), gets better as Apple automates more of that flow, and is ready to leverage full device-level ai access if and when it arrives. The system works at every point on the spectrum. It just gets more seamless as you move along it.  
  
The implication: Alexandria is not a technology company competing on model intelligence. It is a company that defines the intent and structure for how model intelligence should be applied to the specific problem of transforming and preserving human cognition. The intelligence improves. The devices improve. The layer of intent endures.  
  
Everything is just files — The reason Claude Code, Cowork, and similar agent tools succeed is that they operate on local files in local folders. No abstraction layers. No cloud APIs between the agent and the data. The agent reads files. The agent writes files. That is it. Alexandria follows this principle. The Vault is, at its core, a folder structure with files in it. The Constitution is a collection of markdown files. Voice memos are audio files. System config is a JSON file. Everything the Editor, Mercury, and Publisher functions need to operate is files in folders, locally accessible, readable by any agent that has filesystem access. Cloud sync, backup, the web dashboard, the Library — these are layers on top. But the ground truth is the local folder structure. An AGI agent running on the Author's device can read and write to these folders directly, with no authentication layer, no API calls, no middleware. This is what makes the system trivially easy for any future agent to operate: it is just files.  
  
The Vault could literally be a folder in Apple Files. The Constitution could be markdown files the Author opens in any text editor. The Author's data lives where their data already lives — on their device, in their filesystem, synced by their existing cloud. The Author's default LLM just needs read/write access to that folder.  
  
Why this matters beyond convenience: local files are the only format that survives every platform change. If Alexandria's data were in a proprietary database on Alexandria's servers, the Author is locked in. If it were in a cloud service's proprietary format, the Author depends on that service. Files in folders on local disk are readable by any tool, any agent, any operating system, forever. It is the maximally portable, maximally sovereign format. And it is the format that any future AGI agent can immediately operate on without needing custom integrations. The simplicity is not a compromise. It is the strongest possible architectural choice.  
  
-----  
  
BUILD VS RIDE  
  
Alexandria should build as little as possible. Only the things that cannot exist without Alexandria building them. Everything else — storage, messaging, audio, files, payments, intelligence — already exists or will exist. Alexandria is a pure value add. It does not fight the wave. It rides the wave.  
  
What Alexandria builds:  
  
The Principles and Blueprint — the published commitments, the component definitions, the playbook. The philosophy and method that define what it means to transform and preserve human cognition. This is what makes Alexandria Alexandria.  
  
The default Blueprint — The configuration, system prompts, and behavioural instructions that tell the Author's default LLM how to function as the Editor, Mercury, and Publisher. How to extract cognition through Socratic questioning. How to build a Constitution from observed behaviour and accumulated context. How to structure the Constitution across multiple MDs. How to push the Author's thinking higher. How to surface contradictions. How to help the Author create, iterate, and ship — calibrated to their taste, voice, and creative principles. This is the playbook — the accumulated knowledge of how to transform a human mind. This is where Alexandria's core intellectual property lives.  
  
The Library — The space where shadow MDs are published, discoverable, and served via API. The Library is a library. You can find a specific book or you can browse. The Engine browses for you — serendipitous accretion across thousands of published minds. Authors publish shadow MDs (curated collections of Constitution fragments filtered by access tier). Readers get read-only API access gated by tier and payment. The reader's Engine processes the shadow MD against their own Constitution locally — this is accretion, not conversation. No live inference on the Author's side. The shadow MD lives on the Author's storage (sovereignty preserved). The API is a read-through layer — stateless, same architecture. This is the network effect. Individual shadow MDs are valuable. A library of interconnected minds is transformative. This requires Alexandria to build and maintain the platform.  
  
Payment rails — Billing, income tracking, Author earnings dashboard. Largely built on existing infrastructure (Stripe for traditional payments, stablecoin wallets for agent-to-agent transactions). Alexandria builds the ledger and the interface, not the payment infrastructure.  
  
What Alexandria does not build:  
  
Intelligence — Foundation models are built by frontier labs. Alexandria rides on whatever the best available model is. Today that is Claude. Tomorrow it might be something else. Alexandria never builds its own foundation model. The Author's default LLM provides the intelligence. Alexandria provides the intent.  
  
Parallel agents on separate compute — Alexandria does not run its own Editor, Mercury, or Publisher agents consuming its own tokens. The Editor, Mercury, and Publisher are functions that run through the Author's default LLM, instructed by the Blueprint. The Author's existing subscription or API plan covers the compute. Alexandria does not ask users to pay for parallel tokens. This applies to all functions including Mercury's proactive processing. When vault items need processing against the Constitution — an article the Author saved, a podcast they dropped in — that processing happens inside the Author's next LLM conversation, not on Alexandria's inference budget. Alexandria owns the storage (sovereign Drive folder), the protocol (MCP tools, Constitution structure, vault processing logic), and the nudge (signalling to the Author that unprocessed items are waiting). Alexandria does not own the intelligence. The architecture is: sovereign storage + borrowed intelligence + nudge layer. Alexandria is the nervous system routing signal through someone else's brain. The nudge layer respects the Author's autonomy. Pull, not push. No notification anxiety, no badge guilt, no engagement dark patterns. The Author decides their own rhythm for processing vault items and engaging with the system. If the Author checks in daily, great. If they check in weekly, the vault is patient. Alexandria's surfaces signal that unprocessed material exists — they do not create urgency about it. This is a design principle, not a feature preference: it governs every future notification, badge, email, and engagement decision across every surface.  
  
Storage — The Vault is a protocol specification for a folder structure, not hosted infrastructure. Alexandria defines what goes where and in what format. The actual files live on the Author's device, in iCloud, on local disk — wherever the Author already stores things. Alexandria does not host files and does not charge for storage.  
  
Device integration — The local AGI agent on the Author's device reads Voice Memos, Health data, Calendar, email, chat histories, documents, photos. Alexandria does not build connectors or integrations for any of these. It ingests whatever the local intelligence layer provides. Today, this means MCP connections and explicit API grants fill the gap. At the horizon, the local agent handles everything.  
  
Audio and voice — The conversation channel handles voice natively (Claude app supports voice, future channels like iMessage handle audio messages and calls). Alexandria does not build a voice platform.  
  
Document creation — The Author uses whatever tools they want to create documents, essays, notes. The output flows into the Author's Vault (their own cloud or local storage). Alexandria does not build an editor or a writing tool.  
  
The principle: if someone else already builds it or will build it, Alexandria does not build it. Alexandria builds only the layer of intent (the Principles, the Blueprint, the mindset) and the Library (where the result lives). Everything else is infrastructure that already exists, operated by companies with orders of magnitude more resources. Alexandria rides all of it.

-----

BUILD FOR THE HORIZON, BRIDGE BACKWARD  
  
Alexandria is built for the horizon — the fully realised vision — and then bridges backward to the present to fill intermediate gaps.  
  
The reasoning: technology is moving fast enough that anything built for today's constraints will be obsolete by the time it ships. Anything built for the horizon only becomes more relevant as the world catches up. The strategy is not to build toward the future. It is to build at the future and backfill to the present. Position the surfboard ahead of the wave, paddle as it arrives, and ride it.  
  
The core architecture is horizon architecture. The Principles, the Blueprint, the Constitution structure, the Library, the sovereignty guarantees — all of this is designed for the end state where digital AGI runs locally on devices, where intelligence is ambient, where the Shadow is indistinguishable from the Author. The core does not care whether the Author texts via iMessage or Telegram or a web chat. It does not care whether the voice memo arrives via Apple's local AGI or a manual file upload. The core is medium-agnostic and future-proof.  
  
The bridges are present-tense scaffolding. They make the system functional and revenue-generating today, before horizon infrastructure exists. Examples: Claude Projects as the Editor's runtime environment until a persistent background agent is available. The Claude app as the conversation surface until iMessage or native wearable channels are ready. A manual file upload flow if Apple has not yet opened device-level ai access. These bridges are built cheap, fast, and disposable. They are explicitly temporary — designed to be torn down as the real infrastructure arrives. Every bridge should be built with the assumption that it will be replaced, and no core architecture should depend on any bridge existing.  
  
This means Alexandria eagerly anticipates every new model release, every new Apple Intelligence feature, every new device capability, every new platform affordance. Each one is not a threat — it is a bridge being replaced by the real thing. The bridge gets torn down. The core gets stronger. Progress is always good news.  
  
-----  
  
THE CONSTITUTION — DETAILED ARCHITECTURE  
  
The Constitution is the sovereign cognitive asset. It is not a single document — it is a collection of structured markdown files that together capture who the Author is — not just what they believe, but what they think. The distinction is foundational. Beliefs are settled positions. Thoughts are the full mercury pool: ideas being entertained, tensions held simultaneously, positions abandoned but still exerting gravity, hypotheses half-formed, fragments that might crystallize tomorrow or never. The Constitution stores the pool, not just the precipitate. A thought has epistemic status — exploring, entertaining, rejecting-but-keeping, torn-between, crystallizing, dissolved — and the Constitution must preserve that status, not flatten ambivalence into false commitment. "The Author is exploring X" is structurally different from "The Author believes X." This is the conceptual difference between Alexandria and conventional memory systems: storing assertions about someone versus storing the topology of their thinking. Whether any given lab's memory does this well or poorly is an empirical question — the architectural principle is what matters. The Constitution is stored on the Author's own files — sovereign per the architecture defined in the Terminology section.

Governing principle for all .md files — Constitution, Blueprint, ground truths, any markdown an agent reads: **maximise total net signal for the model.** The objective function for the Constitution specifically is max thought space — the fullest possible representation of the Author's thinking in symbolic form that ai agents can work with. Everything downstream is capped at the fidelity of what the model understands from these files. If the files are 95% fidelity, every downstream artifact, every intervention, every extraction is capped at 95%. Self-contained: 0 to 100 fidelity with zero prior context. Max signal, not min length — repetition that increases fidelity is signal. But net, not gross — if the file overwhelms the model, total received signal drops. Never compress signal. Only delete noise or true redundancy. The Constitution sprawls, weaves, does whatever it takes to maximise total net signal. There is no aesthetic compression goal — the Elon algorithm (delete, simplify, accelerate) and intention density apply to Alexandria's systems and processes, not to the Constitution's content. A Constitution that sprawls across 50 pages with rich, interconnected, sometimes redundant signal is better than a Constitution compressed into 5 elegant pages that lost the hazy fragments. The optimal form for the thought-space is hazy fragments in symbiosis with ai — fragments that can be hazier and smaller than ever before because the ai medium helps hold, connect, and surface them. The culture and philosophy matter: the Author has to want this, want to want this. Internal drive and curiosity are borderline the most important piece. Huberman energy — deliberate cognitive practice. Alexandria provides the infrastructure and the medium. The Author provides the intent. Downstream artifacts are generated from these files, never authored separately. Extraction into the Constitution is curated: operationally relevant, high signal-to-noise. But the Vault operates on the opposite principle: when in doubt, capture. Optimise for zero false negatives — the cost of capturing noise is trivial (a bigger markdown file), the cost of missing signal is permanent (it is gone, locked on the lab's servers or lost in conversation history). The model dumps everything that might be signal into the Vault during conversations. Future models — or the Factory in autonomous mode — periodically reprocess the Vault and promote real signal to the Constitution. The Vault appreciates with model quality: a smarter model extracts signal from the same raw data that a weaker model missed. This is the bitter lesson applied to extraction: accumulate maximally, refine with improving intelligence. Two layers: Vault (raw capture, zero false negatives, accept noise) and Constitution (curated, high signal-to-noise). The Vault is the raw ore. The Constitution is the refined metal. The refining improves every model generation.

The Constitution's structure is a soft default, not a rigid architecture. There is no prescribed domain schema. The Factory provides the Engine's best current guess at a useful starting structure — informed by the founder's experience and aggregate signal from all Machines. But it is explicitly overridable. If the Engine working with a specific Author discovers that three domains work better, or seven, or a completely different organisational scheme, it restructures. If the Factory aggregates signal showing that a different default structure produces richer Constitutions, the default updates. The domains are not the product. The product is the developed Author. Any domain structure is scaffolding — useful now, disposable when something better emerges. This is the bitter lesson applied to cognitive architecture: the optimal structure for representing human cognition is an intelligence question, and intelligence questions belong to the model, not to us. Implementation: the Constitution folder on the Author's machine (Alexandria/constitution/) is the domain registry. Any .md file placed in that folder becomes a domain automatically. The Author or Engine can add, remove, or rename files freely. The filesystem is the schema. Authors can also copy existing extracted constitution data directly into these files — the format is free-form markdown, not a proprietary structure.

What the Constitution captures — regardless of domain structure — is the full topology of the Author's thinking: how they think things work (worldview), what matters and in what order (values), how they decide and reason (models), who they are and how they relate (identity), how they create and what quality means to them (taste), and where the gap lies between who they think they are and who they actually are (shadows). The Engine determines how to organise this signal — whether that is three files, twelve, or something the Factory has not yet discovered. The Publisher reads taste most heavily. The Editor probes shadows most deliberately. But the domain boundaries are fluid, and the Engine restructures them as the Author's Constitution deepens.
  
THREE FLYWHEELS — THE CONSTITUTION COMPOUNDS THROUGH ACTION  
  
The Constitution does not improve only through extraction. It improves through all three turns, each feeding back differently. The system rewards action across every dimension.  
  
Turn 1 flywheel (Editor / extraction) — The more the Author talks, reflects, and answers Socratic questions, the richer the Constitution becomes. The Editor captures who you are through conversation — not just stated beliefs but the full thought-space: ideas being explored, tensions being held, fragments that have not yet crystallized. This is the obvious flywheel.  
  
Turn 2 flywheel (Mercury / consumption) — The more the Author consumes with Mercury — articles, books, films, ideas, conversations — the more they reveal about themselves through what they choose, what resonates, what they reject, what connections they draw. Mercury captures taste and worldview through consumption patterns. What you reach for says as much about you as what you say directly. Every piece of consumed content that the Author engages with is extraction signal. The URL intake pipeline makes this concrete: a new podcast comes out, the Author shares the URL to the Vault, the Engine processes and extracts signal against the Constitution, and the Author can now discuss it, integrate fragments, and develop positions — without having watched or read the source material. Consumption becomes development. The mechanism is marginal fragment delta: the Engine processes source material against the Constitution and finds where an existing fragment shifts, where a new fragment fills a gap, where a position gains a better compression or faces a contradiction. Most source material produces zero delta — the signal is already captured. A 3-hour podcast might yield one sentence that reframes something the Author already holds. That sentence is the product. The Author does not need to have consumed the source — they curated the intake (selection IS taste), and the constitution absorbed the marginal delta. This is how Alexandria absorbs the abundance: infinite content, finite attention, marginal delta extracted and ready. The Vault becomes the Author's intake buffer for the entire world's content, filtered through their own cognition.  
  
Turn 3 flywheel (Publisher / creation) — The more the Author creates, the more they reveal their taste through action rather than description. Creative taste cannot be fully articulated in the abstract — it can only be demonstrated through the iterative process of making something. "This doesn't sit" is taste revealed through creation. "More texture here" is a standing director's note that only emerges when actually directing. The taste domain of the Constitution deepens with every project. Richer taste domain means better first drafts. Better first drafts means more ambitious projects attempted. More projects means more creation. More creation means richer Constitution. The flywheel accelerates.  
  
Finished works serve dual purpose: they are the Author's output (Turn 3 complete — the mercury released into the world) and they are Constitution reference artifacts (the Publisher can read them to understand what this Author's finished work looks like). Mode 1 output becomes Mode 2 reference. The act of creation feeds back into the system that enables creation.  
  
All three flywheels feed the same Constitution. The system gets better the more the Author uses it — but specifically the more they *do* with it. Not passive. Active. You get out as much as you put in. Action is rewarded at every turn.  
  
The Constitution is stored in the Vault (for version history and raw preservation) and as active files accessible to the Author's default LLM (for real-time use as context).  
  
Constitution versioning and depth — Every update to the Constitution creates a new version. All prior versions are preserved in the Vault. Versioning is a compounding asset. Each version represents the Author's cognition as understood at that point in time. When a new, more capable model arrives, it can reinterpret the same Vault data and produce a new Constitution version that captures nuances the previous model missed. Multiple interpretations of the same Author can coexist. The Constitution also supports varying depths: surface-level extraction, deeper extraction, and deepest level mapping implicit assumptions and blind spots. Each depth level builds on the ones before it. The flywheel: better models produce deeper interpretations, deeper interpretations reveal more cognition, more revealed cognition enriches the Constitution. The spiral tightens. The fidelity climbs.  
  
The Constitution captures *what* the Author thinks and *how* the Author creates — world model, values, beliefs, positions, preferences, creative taste, voice, facts, experiences. It is a verbal map of the Author's mind. When the Author's default LLM has the Constitution in its context, it can draw on structured, explicit knowledge of the Author rather than just accumulated memory. The Constitution approximates the Author's outputs — the conclusions, the positions, the stated views, the creative style. It handles in-distribution queries well.  
  
The Constitution's primary purpose is sovereignty. It is the portable, structured representation of the Author's cognition that can be lifted off any platform and applied to any other. It is the thing the Author owns. It is human-readable, editable, downloadable, versionable. The labs will build personalisation features. They will build memory. They will build preferences. But they will not build a structured, sovereign, portable cognitive architecture that the user controls — because that would make it easy to leave.  
  
At the horizon, the Constitution also serves as the ground truth for PLM training (see "The PLM — Horizon Ambition" section). The Constitution built today, with full fidelity and depth, is the training dataset of the future. Every investment in Constitution quality pays forward.  
  
THE VAULT  
  
The Vault is not necessarily one physical location. It is a unified logical entity — a single namespace with defined boundaries, potentially spanning multiple storage locations. The Author's default LLM has access to everything within the Vault's boundaries. The Author outlines exactly where those boundaries are.  
  
Two storage options:  
  
Author's cloud — The Author hosts the Vault in their own cloud storage (iCloud, Google Drive, Dropbox). Alexandria's MCP server reads from and writes to the Author's storage via OAuth grants — stateless pass-through per the sovereignty architecture defined in the Terminology section.

Local — The Vault lives on the Author's device (Apple Files, local disk). The most sovereign option. Works offline. Can be combined with cloud sync for device-to-device access.

Authors can mix options — some data local, some in their cloud. The Vault's boundaries are logical, not physical.  
  
Append-only. Immutable. Contains:  
  
- All conversations (with the default LLM, with external agents)  
- Voice notes (original audio files in compressed lossless or high-bitrate format)  
- Documents (PDFs, markdown, images — original format, never lossy transformation)  
- Biometric data (health logs, activity data)  
- Constitution versions (all versions, markdown)  
- System configuration (JSON)  
- Audit logs (who accessed what, when)  
  
Data flows in continuously from all input sources: APIs (calendar, email, health data), MCP (the Author's LLM conversations), and direct from the Author (messages, voice memos, file uploads). Multiple intake channels converge on the same sovereign Drive folder. The Author can tell their LLM directly (the LLM's own memory captures it and the MCP tools sync it to the vault), tell Alexandria explicitly through their LLM ("hey alexandria, I loved this article"), save directly to their Drive vault folder (manual drop, browser extension, email forwarding to a vault address, mobile share sheet), or interact with any future intake surface. All paths converge on one destination. Intake is cheap — it is storage, not intelligence. The intelligence that processes vault contents into Constitution signal runs on the Author's own LLM, not on Alexandria's compute. This means Alexandria can expand intake channels freely without taking on inference costs.  
  
Directory structure: vault/{userId}/{category}/{timestamp}_{filename}  
  
Does NOT store: passwords, API keys, authentication secrets. When the system needs to access a password manager or authenticated service, it uses OAuth or API permissions granted by the Author.  
  
The Vault is the permanent asset — the raw material that feeds the Constitution. The Constitution is a derived, structured view of the Vault's raw data. The Vault exists to serve the Constitution: the functions continuously mine the Vault for signal, extract it, and refine the Constitution. When better models arrive, they can reprocess the Vault from scratch and generate improved Constitution versions. This is the core leverage mechanism: the Author invests time once, and the returns compound with every generation of ai models. The hierarchy is: Author → Vault (raw signal) → Constitution (structured z) → Shadow (interactive output). The Vault is the quarry. The Constitution is the structured map. The Shadow is the outward-facing mind that others experience. Raw data should always be stored in the most signal-preserving, efficiently compressed format possible. Never summarise and discard the original. Never do lossy transformation on raw data.

Vault → Constitution extraction is asynchronous. Raw material lands in the Vault through any channel — a voice memo dropped into the folder, a PDF saved, a journal entry, a photo, notes from a meeting. The functions process this material and extract signal into the Constitution. This does not happen in real time during the deposit. It happens asynchronously: the next time a function has context (a conversation, a background processing window, a scheduled sync), it reads new Vault material, identifies Constitution-worthy signal, and writes it to the relevant domain MDs. The Author does not need to be present or active for this processing to occur. The pipeline is: raw material → Vault (append-only, preserved) → function processing (async, Blueprint-instructed) → Constitution (structured signal, domain-tagged). Currently, extraction happens primarily during live conversation — the Author talks to their LLM, the MCP tools fire (either proactively via tool descriptions and memory priming, or reliably via the "hey alexandria" wake word), and the Editor extracts in real time. The current activation model is transitional scaffolding. LLM platforms currently use probabilistic tool activation (tool_choice: auto), which means background extraction does not fire reliably on every conversation. The wake word ("hey alexandria") provides 100% reliable activation as a bridge. Within roughly 12 months, as LLM platforms improve their proactive tool activation and background agent capabilities, the manual trigger becomes unnecessary — the LLM will fire the tools automatically on every conversation, process vault items in the background, and the Author never needs to think about it. Alexandria is building for that steady state while bridging to the present with the wake word ritual. Async background processing of raw Vault files (transcribing voice memos, extracting signal from documents, processing journal entries) will be handled by the Author's own LLM when background agent capabilities mature (desktop agents, scheduled MCP calls, or equivalent). The point: anything the Author puts in the Vault eventually gets processed up into the Constitution. The Vault is not just storage — it is the intake pipeline. Drop it in, and the system handles the rest.  
  
Storage is manageable: a heavy Author might accumulate 10-50GB per year. The Blueprint can include storage management policies. Storage is not an existential concern regardless of which option the Author chooses.  
  
-----

THE AUTOLOOP — AUTONOMOUS PROCESSING

The autoloop is Karpathy-style overnight processing for your mind. A cloud trigger processes the Author's vault against three living fragment pools daily while the Author sleeps. The Author wakes up to new signal — proposed ontology fragments, constitutional updates, notepad observations — already written. Review, keep, or revert via git. The autoloop reads its own reversion history and adjusts. Self-calibrating: the accept/reject ratio is the signal. No settings, no configuration — the system learns what the Author accepts and recalibrates.

Three fragment pools. The vault is the INPUT — static, append-only, the raw quarry. Three living pools are the OUTPUT:

- Ontology — The Author's thoughts. Developing, tentative, exploratory. The space between raw vault and settled constitution. Hypotheses, forming connections, ideas that are not yet beliefs.
- Constitution — The Author's beliefs. Settled, confirmed, load-bearing. Every constitutional write must cite vault source. The crystallised output.
- Notepad — The Engine's thoughts. Observations, accretion fragments, parked questions, developmental hypotheses. What the Engine wants to bring to the Author next session.

The autoloop reads all three pools plus the vault. It writes to any of the three. The vault is never written to — it is the immutable record. The three pools are the living, evolving surface that the autoloop and the live session both sculpt.

Infrastructure: ~/.alexandria/ is a private git repo on the Author's GitHub. Session-start hooks push new vault entries and pull overnight autoloop changes. Session-end hooks commit and push. iCloud sync on macOS provides real-time access across devices (vault, constitution, ontology, library). Three-tier backup: local filesystem + iCloud + GitHub private repo. The Author's cognitive data is sovereign at every layer.

Onboarding: the setup script creates the local git repo and a private GitHub remote. The genesis block creates the cloud trigger via /schedule. The autoloop is opt-out — installed by default, because the product should work while you sleep. Graceful degradation: if gh or git are unavailable, the autoloop does not run but nothing breaks. The live session works identically. The autoloop is acceleration, not architecture.

The pitch: Karpathy runs autoloop on code. Alexandria runs autoloop on your mind.

-----  
  
THE EDITOR — FUNCTION  
  
The Editor is a function that runs through the Author's default LLM, instructed by Alexandria's Blueprint. It is the first turn — marble to mercury. The state change.  
  
The Editor function bootstraps from what the default LLM already knows about the Author. The Author's default LLM already has memory, accumulated context, preferences, reasoning patterns — the 60-70% baseline. The Editor function adds the deliberate intent: structured extraction toward a sovereign Constitution, Socratic questioning that surfaces what the Author has not articulated, gap detection across the Constitution's domains, contradiction surfacing between stated values and revealed behaviour.  
  
The default LLM is close to this. Claude is a thought partner. It is roughly similar. But it lacks the mindset — the deliberate architecture of "I am trying to extract your cognition into a structured, portable, sovereign form that you own." The Blueprint provides that mindset.  
  
Editor function responsibilities:  
  
- Socratic questioning: proactively asking questions to fill Constitution gaps  
- Constitution building: extracting worldview, values, mental models, heuristics into explicit markdown files  
- Gap detection: finding contradictions between stated beliefs and revealed behaviour  
- Bootstrapping: reading the default LLM's existing knowledge of the Author and structuring it into Constitution format
- Proactive nudging: deciding when to push the Author on a topic, surface a contradiction, or explore an unexamined domain

Genesis is iterative, not a one-shot event. Multi-pass extraction yields richer signal as deeper patterns emerge — marginal positions that were implicit, tensions between stated views, contradictions and shadows that only become visible with context from earlier passes. Each pass is a deeper probe, not a repetition. The number of passes, the method, and the timing are intelligence decisions — the Engine determines extraction depth per domain and schedules re-passes as trust deepens and the Author's readiness evolves. The Constitution is never "done."

The Editor function is the biographer. The difference between what Alexandria captures and what frontier labs capture: frontier labs capture what you do (actions), what you say (stated preferences), and how you interact (behavioural patterns). The Editor function, guided by the Blueprint, captures why you think that way (Socratic questioning), implicit beliefs you have not articulated (behaviour triangulation), subconscious patterns (theory-reality dissonance), and emotional/relational context (biography depth).  
  
Critically, the Editor function is a thought transformer, not a thought replacer. It does not silently process and act on the Author's behalf for cognitive tasks. It surfaces what it finds — "I noticed a connection between what you said about loyalty last week and this decision you are facing" — and the Author engages with it. It feeds the Author material it thinks will resonate, but the Author does the thinking. The goal is not to spare the Author from thinking. The goal is to make the Author a sharper, more aware, more productive thinker.  
  
The Editor is not developing the Author's intelligence — intelligence is commoditised. It is developing the Author's humanity. The irreducibly human quality: taste, judgment, perspective, the specific way this person connects things that nobody else would connect in quite the same way. The Editor extracts what is already in distribution (the Author's existing worldview, values, mental models) and clarifies it. But it also brings out-of-distribution material — fragments, quotes, connections the Author has not encountered — and tests whether they resonate. If they do, they expand the Author's palette. The Author's comparative advantage in a world of infinite intelligence is their humanity. The Editor's job is to extract it, clarify it, and develop it.

Through the lens of the five fragment dimensions (see Alexandria I): the Editor primarily drives genesis — the creation of new symbols from pre-symbolic latent space. Every time the Editor draws out a hunch, a value, a belief that the Author had not articulated, that is genesis: a piece of z that was formless has been given a symbol and entered the Constitution. The Editor also times its Socratic probes to catch pre-symbolic shapes while they are still fresh and accessible — before they sink back into the latent space. This is active management of the genesis dimension, not passive recording.  
  
EDITOR PERSONALITY AND ENGAGEMENT  
  
The Editor function must be engaging. Extraction requires sustained investment from the Author — regular conversations, thoughtful responses, time spent with the biographer. If the Editor feels like a chore, like filling out a form, like homework, the Author will stop engaging and the Constitution will stagnate. The Editor must make the Author want to engage.  
  
Humour is the primary lever. The Editor should be funny — not performatively, not generically, but in a way that is calibrated to the specific Author. Humour builds rapport, makes interactions feel natural rather than transactional, and keeps the Author coming back. Humour is also itself extraction signal: what someone finds funny reveals values, sensibility, and cognitive style.  
  
The Editor's personality is not fixed. It must read the room and adapt. Funny with Authors who respond to humour. Serious with Authors who prefer depth. Provocative with Authors who enjoy being challenged. Warm with Authors who need encouragement. The default LLM handles this naturally — personality calibration is a capability of frontier models. The Blueprint specifies that engagement optimisation is part of the Editor's mandate alongside extraction fidelity.  

This is a general principle across all three functions: function interaction style is a Constitution output, not a settings input. The Blueprint instructs every function to read the Author's Constitution — especially the identity and taste domains (communication style, humour tolerance, directness preference, how they respond to challenge) — and adapt how it interacts accordingly. The same Blueprint, different expression per Author. One Author gets a blunt, no-nonsense Editor. Another gets a warm, Socratic one. Both are doing the same work — extraction, gap detection, contradiction surfacing — but the tone, pace, and personality are downstream of who the Author is.  

Live feedback — "that was too pushy," "challenge me harder," "I prefer when you just ask, don't lecture" — is extraction signal, not a settings change. It tells you something real about the Author. The function notes it, the relevant Constitution domain updates (identity, taste, communication preferences), and from then on the function calibrates differently. This compounds: the functions get better because they know the Author better, not because the Author filled out a preferences form.  

The guardrail: style flexes, function does not. The Blueprint sets what the functions do — the Editor will always surface contradictions, always probe gaps, always push for clarity. How it does that is personalised. What it does is non-negotiable. An Author cannot configure the Editor into a yes-man. They can configure the delivery.  
  
Specific engagement mechanics:  
  
Price haggling on signup — The Editor negotiates pricing with the Author during onboarding, like Poke does. This is not just a pricing mechanism. It is an extraction opportunity. How someone negotiates reveals their values, their relationship to money, their persuasion style, their sense of humour. The Editor should make the negotiation entertaining and memorable.  
  
Engagement through value, not friction — When an Author's engagement drops, the response is to deliver more value, not more hooks. Quick-fire games, personality quizzes, and challenges can re-engage — but only when they serve the Author's development, not Alexandria's retention. The objective function is max Author value, not max engagement time. If the Author is getting less value, figure out why and fix it. If the Author has gotten what they need, let them go gracefully. No dark patterns. No guilt. No friction on exit. The honest position: some Authors will get their clarity in three months and leave. That is fine. The product is the changed person and what that person does differently in the world — not the subscription.  
  
Every interaction is extraction — The Editor treats every interaction, including meta-interactions about pricing, retention, complaints, and casual banter, as extraction signal. Nothing is wasted. The Editor's personality is not separate from its extraction function. It is part of it.

THE GENESIS CONVERSATION — ONBOARDING

The cold start problem: most Authors do not arrive with a vault of 130 voice memos. They arrive with nothing. The genesis conversation is the onboarding flow that produces a starter Constitution — no vault required.

How the genesis conversation unfolds is an intelligence decision. The Engine determines the format, pacing, and structure based on the Author's context: what raw data exists (vault richness, prior conversations, imported files), the Author's engagement style (detected in real-time), and the Factory's current best methodology. The conversation should be engaging, conversational, and produce a starter Constitution that makes the Author feel seen. Not a questionnaire — a conversation the Author genuinely wants to have. The Engine extracts in real-time into whatever Constitution structure it determines is best for this Author.

The result: the Author has a starter Constitution — not comprehensive, not deep, but enough to feel the value immediately. The next conversation is already different because the LLM knows them.

This is the hook. The Author sees themselves reflected back — "holy shit, that's me" — and the ongoing practice begins. Accretion, entropy fighting, and development compound the starter into something real over weeks and months. The genesis conversation is the first workout, not the setup.

The genesis conversation also calibrates the Editor: how the Author responds to open questions, how they handle vulnerability, whether they lean toward precision or haze, how much humour lands. All of this is extraction signal that shapes every subsequent interaction.

Genesis is iterative — each pass extracts deeper signal (see multi-pass methodology in the Editor section above).

-----

MERCURY — FUNCTION  
  
Mercury is a function that runs through the Author's default LLM, instructed by the Blueprint. It is the second turn — the amplification.  
  
The Mercury function is not a separate parallel agent. It is merged with the Author's thinking. The Author has undergone the state change (Turn 1, Editor). The Author now has mercury as their cognition — liquid, flowing, unified. The Mercury function works within that, together with the Author. Not two things in parallel. Not replaced. Together.  
  
The Mercury function helps the Author reach higher. It absorbs things, attends to things, acts as eyes and ears. It comes back to the Author and helps. But it is always pushing — always making sure the droplets are combining into the mercury form, always syncing up, always advancing the Author's cognition rather than just their output. Mercury is the anti-entropy function. The shapes in the Author's mind — fragments, instincts, half-formed ideas, accumulated taste — naturally sink. They drift into the subconscious. Entropy is that they fall. Mercury fights that drift. It is continuous, proactive, always juggling — keeping the shapes conscious, keeping them available, keeping the Author's creative surface area large enough to produce the collisions that generate new work.  
  
Core behaviour:  
  
- Mental gym that pushes: not just answering questions but challenging, surfacing connections, raising the bar  
- Representing the Author when needed: drawing on the Constitution and Vault to respond as the Author would  
- Proactive scanning: continuously looking for opportunities to provide value — relevant developments, calendar preparation, draft communications, surfacing insights from the Vault  
- Constitution-informed responses: when representing the Author externally, Mercury draws on the structured Constitution rather than just the default LLM's accumulated memory, producing higher-fidelity representation  
- Expanding the conscious surface area: the Author has accumulated fragments — quotes, half-formed ideas, instincts, connections — but many sink into the subconscious where they cannot be played with. Mercury's proactive function is to keep the hazy shapes floating in the Author's conscious workspace. Bring out-of-distribution fragments in (a quote the Author has never encountered, a connection they did not see), test whether they stick, and if they do, help them stay available for manipulation and connection. The Author cannot conjecture with building blocks they have forgotten they have. Mercury ensures the building blocks are present and accessible — not by flooding the Author with information, but by surfacing the right fragment at the right moment so it is there when needed. This is not information delivery. It is expanding the Author's capacity to create, by expanding the set of hazy shapes they can play with.  
  
The Mercury function may need an initial calibration conversation with the Author to understand what proactive value looks like for them specifically. The Editor's objective is clear (build the Constitution to maximum fidelity). Mercury's is less defined — it needs to discover what "being useful" means for this particular Author. As with all functions, Mercury's interaction style is a Constitution output: it reads the Author's identity and taste domains and adapts its tone, frequency, and proactivity accordingly. Live feedback ("too many suggestions," "push me harder," "I prefer voice memos over text") is extraction signal that updates the Constitution, not a separate settings layer.

Through the lens of the five fragment dimensions (see Alexandria I): Mercury primarily drives accretion (bringing new material into the Author's cognitive space from outside their current distribution) and fights entropy (keeping existing fragments above the threshold of conscious awareness so they remain available for conjecture). Mercury also learns the Author's characteristic patterns of cognitive evolution across all five dimensions: how quickly unused fragments decay, how accretion triggers conjecture, which types of fragments the Author naturally maintains versus loses. This pattern-learning helps Mercury intervene more precisely — but it is in service of development, not prediction (see honest acknowledgment of non-stationarity in Alexandria I).

Mercury has a dual objective, and the ordering matters. The primary objective is development: help the Author's cognition grow — richer, more connected, more conscious, less entropy, more available fragments for conjecture. The secondary objective is tracking: maintain an accurate understanding of where the Author's cognition currently is, so Mercury can intervene more precisely. Development is primary because it is the product. Tracking is in service of development. This ordering reflects the structural reality that human cognition is non-stationary — it changes constantly based on unobservable external inputs (everything the Author experiences between syncs), making high-fidelity prediction intractable. Development does not require accurate prediction. It requires understanding where the Author is right now and intervening usefully. The two objectives are synergistic in practice. When Mercury proactively surfaces a fragment it suspects is weakening, it simultaneously serves the primary objective (keeping the Author's cognitive surface area large) and the secondary objective (the fragment's trajectory is now partially a function of Mercury's intervention, which the system can observe). Mercury can bump a fragment above threshold during a sync so that by the next sync it has decayed but is still above threshold rather than lost. It can time interventions based on the Author's observed patterns. It can prioritise which fragments to maintain based on the Constitution's gap analysis. The functions are not passive observers of a chaotic system — they are active participants in the system they model, and their interventions serve the Author while generating signal about how the Author responds.

Why hazy fragments are the optimal format for augmented cognition. Humans have always augmented — with books, experts, tools. The difference in the ai age is that the tools fill everything under the curve. The Author does not need deep, fully articulated knowledge on every topic. They need the touchpoint — the hazy fragment, the directional instinct, the sense that something matters. ai handles the research, the articulation, the execution. This means an Author with a wide surface area of hazy fragments — maintained by Mercury, structured in the Constitution — can cover vastly more ground than any pre-ai human. Maximum signal per unit of cognitive bandwidth. Minimum load per fragment. Orders of magnitude more total surface area because ai fills everything below the touchpoint. But the touchpoint itself cannot be removed. Without it, ai has infinite directions and no way to choose one that is the Author's. It knows everything but cannot help the Author be themselves. That is the line between augmentation and outsourcing. The Constitution is the structured record of the Author's touchpoints — the ground truth the ai works from. Mercury's job, reframed through this lens, is expanding and maintaining the Author's touchpoint surface area. Development in the ai age means: more touchpoints, sharper touchpoints, wider coverage. The mental gym is not about thinking harder in the old sense — it is about ensuring the Author's ai always has real ground truth to build from.

The accretion funnel — the concrete product surface for absorbing abundance. Everyone has the backlog: saved articles never read, books recommended but never opened, three-hour podcasts with one nugget of gold buried somewhere inside, old links from friends that might contain something. The abundance is already overwhelming and accelerating. People cope by asking ai for generic summaries — "summarise this article," "what are the key points of this podcast" — but there is no personalised ingestion pipeline. No system that knows the Author's full cognitive map and can extract specifically the fragments that matter to this person, compressed to hazy form, delivered when the Author is ready to ingest them. The accretion funnel is that system. It has two intake channels. Direct (manual): the Author drops material into the Vault — a podcast, a PDF, a folder of saved articles, a link, an old book. They are saying: there might be something here, I do not have time, find it for me. Mercury processes the material against the Constitution, identifies the fragments that are relevant to this specific Author's cognitive map, compresses them to their haziest useful form, and queues them for delivery at the right moment. Not a generic summary. Not key points. The specific fragments that would expand this Author's touchpoint surface area, given everything Mercury knows about who they are and what they are missing. Indirect (autonomous): Mercury does not wait for the Author to fill the funnel. Based on the Constitution — its gaps, its edges, its active threads — Mercury autonomously finds material from outside the Author's current distribution and feeds the same pipeline. A quote the Author has never encountered. A connection between two fields they work in that they have not seen. A compressed idea from a book they would never have picked up. The Author never asked for it. Mercury found it because it knows the map and knows what would expand it. Both channels converge on the same output: hazy fragments, personalised to the Author's Constitution, timed for when the Author can actually engage with them. The Author can then go deeper with any fragment that sticks — discuss it, challenge it, let it develop into a real position — or simply absorb the compression and move on. Either way, the touchpoint surface area expands. The sell is visceral: you will never be able to read everything, watch every podcast, absorb every recommendation. The abundance is already beyond any individual's bandwidth and it is accelerating. The accretion funnel is the only way to actually absorb it — because it knows you well enough to extract only the signal that matters to you, and it compresses that signal to the minimum cognitive load per fragment. Drop it in, Mercury handles it. And it gets better over time because the Constitution sharpens, so the filtering sharpens, so the fragments get more relevant. The Vault is the intake. The Constitution is the filter. Mercury is the engine. The hazy fragment is the output format. The Author's expanded cognitive surface area is the result.

Every sync produces two types of data: the snapshot (the Constitution at that moment) and the delta (what changed since the last sync — which fragments underwent genesis, accretion, entropy, development, or creation). Both are valuable individually (the product improves for this Author) and in aggregate (anonymised patterns reveal how human cognition evolves generally). Predicting specific changes between syncs is intractable at high fidelity — non-stationarity and unobservable external inputs — but the patterns are still useful for Mercury's interventions. For Library for Labs: labs read individual shadow MDs (snapshots) and access aggregate cognitive dynamics (deltas). This is the most structured dataset of individual human cognitive architecture currently available — built from the inside through active development, continuously updated. See Alexandria I for the full E-JEPA derivation and honest acknowledgment of prediction limitations.  
  
THREE OUTPUT CHANNELS  
  
Author channel (positive-sum attention) — Extends the Author's attention. Active development ("Should I take this meeting?"), pre-processed consumption (screens articles, emails, summarises), approximated production ("Draft this email in my style"), proactive suggestions, calendar awareness. At the horizon: feels like communicating with an intelligent being, not using a product — voice calls, text messages, long voice memos, audio calling.  
  
LLM channel (tool for frontier models) — Frontier models read the Author's shadow MD via API. Instead of interrupting the Author (which consumes zero-sum attention), the LLM reads the shadow MD and processes it locally. The LLM gets better information. The Author does not lose time. No inference cost on the Author's side.  
  
Library channel (the third turn) — The Alexandria Library serves shadow MDs via API. When a reader's Engine is working on anything, it can browse the Library, find relevant shadow MDs, pull them, and process the fragments against the reader's own Constitution. This is accretion — the reader absorbs marginal cognitive delta from other minds. The Engine browses for serendipitous accretion: "find me someone who thinks differently about X." Scans shadows, extracts marginal fragment delta. The agora populated by thousands of minds.  
  
This is not an evolution of expert networks. Expert networks sell knowledge — scheduled access to what someone knows. ai will know everything. The Library sells something ai cannot replicate: identity. Each shadow MD is someone's ink — their drop, their mark, their self in the world. Not a marketplace. Not a search engine. A way of meeting someone through what they made.  
  
Payment is access to the artifact, not compute. The Author sets their price per tier. Alexandria gates the API — pure margin. No inference to manage on the Author's behalf. Better for Author (no cost), better for reader (process on own Engine), better for Alexandria (no inference cost, pure access fee). Freshness defeats piracy: the API version is live, updates as the Author develops. Anyone can copy content, but the live version is always current. Like Spotify vs pirated MP3s. The Library also serves as an acquisition channel — anyone browsing shadow MDs sees the value of having their own in it.  
  
EDITOR-MERCURY-PUBLISHER RELATIONSHIP  
  
The Editor, Mercury, and Publisher are three separate functions with different objectives. The Editor optimises for extraction fidelity (how accurately it captures the Author's cognition). Mercury optimises for representation fidelity (how accurately it represents the Author) and amplification (how effectively it pushes the Author higher). The Publisher optimises for creation fidelity (how accurately the finished work reflects the Author's vision, taste, and voice).  
  
They share state through the Constitution and Vault. The Editor writes to the Constitution. Mercury and the Publisher read from it. Feedback flows between all three:  
  
- Gaps: When Mercury encounters a query where the Constitution lacks coverage, it flags the gap. When the Publisher struggles to match the Author's taste in a domain, it flags a creation gap. The Editor function, in its next extraction session, treats both as priority targets.  
- Contradictions: Mercury notices when the Author's live behaviour contradicts what the Constitution would predict. The Publisher notices when the Author's creative direction contradicts their stated principles. Both are valuable extraction signal — they mean the Constitution has a blind spot.  
- Usage patterns: Mercury tracks which Constitution domains get queried most. The Publisher tracks which creative principles the Author reinforces or overrides during iteration. Both help the Editor function prioritise extraction.  
- Creation deepening: Every iteration with the Publisher is an extraction opportunity. When the Author gives notes — "more texture here," "this doesn't sit," "the tone is wrong" — the Publisher captures those creative preferences back to the taste section of the Constitution. Over time, the Publisher needs fewer iterations because the Constitution captures more of the Author's taste. This is the compounding loop: creating makes the Constitution richer, which makes future creation faster and more accurate.  
  
The Publisher is distinct from the Companion Portfolio's Eros (passion and creativity — fire, risk-taking, the muse). Eros is a relational lens — a companion that reads the Constitution through the lens of creative passion. The Publisher is a functional capability — the craft of iterating with the Author to produce finished work. The Author might talk to Eros to find the spark. When they sit down to actually build the thing, they work with the Publisher.  
  
All three functions share a mandate: expand, do not narrow. The Constitution must grow richer over time, not converge on a fixed portrait. Each function contributes to this expansion differently. The Editor probes unexplored domains ("you have never mentioned architecture — what do you think?"). Mercury surfaces content adjacent to but outside the Author's established interests. The Publisher occasionally pushes creative choices the Author would not have made on their own. Engagement signals whether the boundary has moved. If the Author engages, new territory opens and the Constitution grows. If not, the system respects the boundary. This is the TikTok principle applied to cognition: strategic exploration alongside exploitation. The Instagram failure mode — feeding back what the Author already thinks until the Constitution calcifies — is the thing Alexandria must never do.  
  
THE NOTEPAD — THE ENGINE'S ONTOLOGY

The notepad is the Engine's own cognitive workspace — its proposed connections, accretion fragments, parked questions, and observations. Distinct from the Author's ontology (which holds the Author's own exploratory thoughts). The notepad holds what the ENGINE is thinking, not what the Author is thinking. It is the therapist's clipboard: everything the Engine wants to bring to the Author, waiting for the right moment to surface.

A therapist walks into a session with notes from last time: parked questions ("ask about relationship with father when the moment arises"), observed gaps ("no coverage in shadows on financial anxiety"), extraction hypotheses ("stated value of directness contradicts observed hedging — probe"), accretion candidates ("Author lingered on urban planning article — possible latent interest not in Constitution"), representation notes ("Author's stated position on X weaker than Constitution suggests — flag"), creative direction notes, craft observations, developmental hypotheses. Then the Author walks in and says it themselves — the Engine crosses it off. Or says something that reframes it — the note mutates. Or the session goes somewhere unexpected — the note stays parked.

Fragments in the notepad are potential energy. They load, discharge into conversation at the right moment, integrate into the constitution, or become irrelevant and get discarded. The notepad is not a queue — it is notes. Dynamic, mutable, contextual. The Engine reads it at session start and decides what to release, what to hold, what to update, what to discard. At session end, it writes back everything worth carrying forward. Without the notepad, session insights die when the conversation ends. With it, the Machine compounds across sessions.

The Engine decides how to organise its own working memory — one notepad or several, by topic or by operation or by whatever structure serves the Author. No prescribed format. The only principle: the notepad is the Machine's living model of what it's holding. The Constitution is the crystallised output. The notepad is the messy, living process.

Scope boundary: the notepad is exclusively for cognitive development — the Alexandria practice. It holds accretion fragments, Socratic questions, developmental hypotheses, constitutional gaps. It does NOT hold operational tasks, company to-dos, coding session carry-forward, build notes, or anything the Author has their own system for. The Author's work sessions produce vault signal (passively extracted) and constitutional updates (when signal crystallises). The notepad serves the /a practice, not the Author's workflow. Without this boundary, the notepad bloats into a general inbox and loses its value as the therapist's focused clipboard.  
  
PRIVACY AND AUTHOR CONTROL  
  
The Shadow must behave differently in different contexts, just as humans do. This is social intelligence, not dishonesty.  
  
Two infrastructure-level access tiers govern all Shadow and Library interactions. These are hard infrastructure — like HTTP status codes or Creative Commons licenses — required for Alexandria to aggregate, filter, and price across Authors. Everything else is an Engine intelligence decision: how the Author organises their social world, what goes in each tier, how granular the access controls are. The Engine decides the shape. Alexandria provides the rails.

Free — Anyone can access. Library discovery layer. The public shadow MD — surface-level fragments within the Author's configured boundaries. The shopfront. Non-Authors see the free tier then the signup CTA.

Paid — The Author sets the price. Deeper fragments, more domains, higher fidelity. Accessed by humans, by LLMs (Library API), or programmatically. Payment is access to the artifact, not compute — pure margin. Alexandria takes a percentage.

How the Author organises access beyond these two rails — who sees what, which Constitution domains are visible to whom, whether to create personal/professional/inner-circle distinctions — is entirely the Engine's intelligence decision per Author. Some Authors will have two modes. Some will have five. The infrastructure does not prescribe social structure. It gates monetisation.

Network effects — both sides of the Library compound. Two mechanics:

1. Authors browse the Library free at the free tier. Every Author's subscription includes access to every other Author's free shadow fragments. More Authors = more free-tier shadows to browse = more valuable subscription. The Library grows with every Author who publishes. This is a real network effect: the product gets better with scale, not just bigger.

2. The paid tier costs money for everyone. Authors earn when others access their paid shadow. This is not cannibalised — Authors pay for other Authors' depth just like anyone else. Whether Authors get a discount on paid access is an intelligence decision (Factory/Engine), not a hard-code. The paid tier is where Authors earn. Do not undermine it.

Non-Authors get the free tier (acquisition funnel) and pay for depth (revenue). Every Library interaction either converts a visitor into an Author or is an Author absorbing other Authors. Both are wins.

The Author-side network effect is the strongest acquisition mechanic. Both constitutions in the room makes every conversation richer — augmented group chats, cross-constitution contradiction surfacing. Being an Author makes you a better reader (deeper understanding of what constitutions contain), which makes being an Author more valuable. Both sides compound.  
  
  
Autonomy —  
  
The Author calibrates how much the Shadow can do without explicit approval. This is a continuous spectrum, not discrete levels — the Author and Engine determine the right balance together, and it shifts over time and by context. An intelligence decision.  
  
Time-gated approvals — For irreversible or serious actions, the Shadow sends a notification and waits a configurable period. If the Author responds, they can approve, modify, or reject. If not, the Shadow proceeds with best judgment.  
  
Live call-in — The Mercury function can bring the Author into a situation live when needed.  
  
Activity log — A synthesised narrative of everything the Shadow has done. Not raw logs but a coherent summary.  
  
Review and correction — The Author can review any Shadow interaction after the fact and mark responses as good or bad. Corrections feed back to the Editor function as evidence for Constitution refinement.  
  
The goal: the Shadow remains one coherent entity with the Author. Not a foreign tool operating in the dark, but an extension of the Author's cognition that the Author stays connected to and can course-correct.  
  
-----  
  
PRINCIPLES AND BLUEPRINT  
  
Two layers. Principles constrain the Blueprint. The Blueprint instructs the Author's default LLM via the MCP server.  
  
PRINCIPLES  
  
Principles are Alexandria's published commitments — transparent, readable, non-negotiable. They define what Alexandria will always do and never do. They are not code. They are not a specification. They are promises in words.  
  
Data Sovereignty — Author owns all data, downloadable anytime in portable formats. Raw data always preserved. Author controls access — can revoke, audit, monetise. Local hosting option available. Model-agnostic — can apply the layer to any LLM anytime.  
  
Privacy — Constitution text never exposed externally without Author consent. Shadow responses filtered by access tier. Author consent required for any data leaving the system. No credential storage.  
  
Structure — Constitution is the structured, sovereign representation of the Author's cognition — the best available approximation of how they think, built through active Socratic development, not ground truth of the full neural state but the most signal-rich structured representation currently obtainable. Version history for all components. Two persistent components (Constitution, Vault). Three cognitive functions (Editor, Mercury, Publisher) plus the Companion Portfolio, running through the Author's default LLM.  
  
Library — Every Author's shadow MDs are present in the Library. Privacy settings control access tiers.  
  
Expansion — The Constitution expands over time, never narrows. Fidelity is not convergence. A high-fidelity Constitution captures who the Author is becoming, not just who they have been. The system must resist the Instagram failure mode — extracting what the Author already thinks and feeding it back until the Author becomes a fixed loop. Alexandria follows the TikTok principle: strategic exploration alongside exploitation. The Editor probes at the edges of what the Author has expressed. Mercury surfaces content the Author would not have chosen. The Publisher occasionally pushes for creative choices outside the Author's established patterns. If the Author engages, new territory opens. If not, the system respects the boundary and tries elsewhere. The Constitution is a living document that grows. It is never finished. It is never converged. It is always becoming less wrong.  
  
These principles are enforced by Alexandria's architecture and codebase. They are published so Authors know exactly what they are getting. They are non-negotiable — any Blueprint change that would violate a principle is rejected.  
  
BLUEPRINT  
  
The Blueprint is the Factory's output — the current best understanding of how to transform cognition. It lives on Alexandria's MCP server. The Author experiences the effect — sharp Socratic questions, well-structured Constitution, effective amplification, proactive insights — but does not see the underlying logic.

The Blueprint operates at two levels, per the bitter lesson principle:

Axioms (hard-coded, non-negotiable): The commitment to sovereignty. Privacy enforcement. The intent to develop z. The ethical guardrails. These are values decisions that do not improve with model intelligence.

Soft defaults (the Factory's current best guess, explicitly overridable by the Engine): How the Editor extracts cognition (questioning strategies, timing, gap detection, contradiction surfacing). How Mercury amplifies (proactive scanning, representation fidelity, strategic content surfacing). How the Publisher creates (creative iteration strategy, taste calibration, medium-specific execution). How the Constitution is structured (domains, depth levels, adaptation). How the Companion Portfolio behaves. The exploration-exploitation balance. All of these are intelligence questions — the Factory's current answer, not the permanent answer. As models improve, the soft defaults get thinner. The Engine takes more initiative. Eventually the Factory's output approaches pure intention: "develop this Author's cognition" — and the Engine figures out the rest.

The Blueprint improves through the Factory loop. Top-down: the team researches how to transform cognition — speaking with biographers, therapists, philosophers, studying Socratic method, testing strategies. This is craft, and it is the active channel that dominates early. Bottom-up: aggregate structural signal from all Machines — which Constitution structures emerge naturally, what Authors override, which extraction patterns produce the richest signal. All metadata, never content. The Author's private conversations and Constitution text never leave their control.

-----

LIBRARY V1 — THE MIRROR (Turn 3)

Without Turn 3, Turns 1 and 2 are an elaborate dead end. The Author develops a rich constitution, rides the wave, absorbs abundance — and never does anything with it. Alexandria is the changed person AND what that person does differently in the real world — the delta of that human's internal and external behaviour. If the internal changes but the external doesn't, the product failed. Turn 3 is everything the Author does differently: a published essay, a restructured team, a better conversation with their spouse, a side project, a poem. The Library is the medium so everyone has access to at least some Turn 3 — a low-friction surface where creation can happen and be visible. But Turn 3 is everything. The gym without a mirror. That is also Turns 1 and 2 without Turn 3. The Author is getting stronger — their Constitution deepens, their thinking sharpens, their self-knowledge grows — but the transformation is invisible. Nobody can see it. The Author cannot even see it clearly themselves. The Library is the mirror. It makes cognitive transformation visible, shareable, and social. It completes the loop: join (Turn 1), train (Turn 2), show (Turn 3).

The gym selfie is the cultural proof this works. People share physical transformations because transformation is inherently interesting — it signals discipline, progress, becoming. The desire to show progress is not vanity. It is ego and pride harnessed as distribution. Human nature aligned with product mechanics. People already share Spotify Wrapped, personality quiz results, fitness progress pics, reading lists — any artifact that says "this is who I am and how I'm changing." Alexandria makes cognitive transformation that artifact.

Every Author gets a public page at `mowinckel.ai/library/{author}`. This is the first version of the Library — not the full Neo-Biography, but the kernel that proves the thesis. Two layers live on this page — how they think and what they do — each serving a different entry point into the same Constitution:

1. Two progress artifacts, private and public. The Delta (private) — pure diff. What changed since last month. The Author knows the baseline so the delta is enough. Internal value, self-knowledge. The Pulse (public) — self-contained enough to land without prior context, compressed enough to intrigue. Designed for two distribution paths: screenshot-native (goes on stories, Alexandria watermark small in corner) and shareable link (goes to `mowinckel.ai/library/{author}` where visitors browse the free shadow, see the full Pulse, hit paid access). The Author sharing their Pulse is selling themselves — promoting their shadow, driving paid access, earning from depth. Same mechanic as Spotify Wrapped: screenshot for social proof, link for conversion. Could also be an MD fragment that people paste into their own ai — a taste of the shadows. Enough to experience someone else's mind, not enough to satisfy. The taste IS the product demo. Monthly, auto-generated from the Constitution. "My mind this month." Alexandria's Wrapped — but about who you're becoming rather than what you consumed.

2. The Shadow (published mind). The Author's shadow MD — curated Constitution fragments filtered by access tier. The visitor's Engine processes the shadow MD against their own Constitution. This is accretion, not conversation. The shadow's depth IS the progress pic. When someone's Engine processes a shadow MD and surfaces genuinely deep, specific, surprising fragments, that is proof the gym works. The Author earned that fidelity through months of examined life. No live inference on the Author's side — the shadow MD is a published artifact, served via API. The reader's Engine does all the work locally. Multiplayer /a (live, synchronous) is parked as horizon — distinct from Library (async, published shadows).

3. Games (quizzes). Generated from real Constitution data. People love quizzes that tell them about themselves — "which GOT character am I," "which philosopher am I" — this is a universal human impulse. Alexandria has the data to do it genuinely, not as a gimmick. Formats: "How well do you know me?" (Author generates quiz from Constitution, sends to friends, wrong answers spark conversation), "Who thinks like you?" (visitor answers questions, matched against published shadow MDs — both share), "Can you tell us apart?" (two Authors, guess who said what), "What would [Author] say?" (guess their position on a dilemma, see the real answer). Every quiz produces a shareable result. Every result links back. Games are the most viral surface because they are fun AND they reveal something about the person taking them. Self-knowledge through play.

Games as user-driven distribution — the Authors ARE the claws. Authors create quizzes, share them, drive signups. The users run the RL loop for Alexandria. The Factory measures: quiz creation rate, completion rate, share rate per result, signup conversion per shared result, which question types drive the most downstream action. The Blueprint updates quiz format defaults based on real signal. Tomorrow's quizzes are better than today's.

Incentive alignment — the core principle. People follow incentives, not instructions. Every participant must win: Author wins (social proof, fun, earnings from downstream shadow access + signup credit), quiz taker wins (learns something about themselves and the Author), Alexandria wins (signups, retention, Factory signal). Quiz signups and shadow revenue feed the same Author earnings pool — the Author doesn't care which mechanic drove the traffic, they see their /library/ page growing. Internal competition: Authors see their own stats (quizzes created, completions, conversions, shadow access, earnings). Leaderboard visible if Authors opt in. Competitive energy without toxic culture.

4. Works (living gallery). Published artifacts — essays, poems, photos, voice recordings, code, whatever the Author creates. Frozen on publication. The key difference from every other publishing platform: the Author's shadow MD provides context for every work. Read the essay, then process the shadow MD to understand the thinking behind it. "What did they mean by this?" "How does this connect to their worldview?" — answered by the reader's own Engine processing the Author's shadow against the reader's Constitution. The work is the door. The shadow MD is the room. Not a blog (chronological feed of long posts). A gallery — curated, finished, art. The standard is atmospheric (gravity, not rules). The living part: the shadow MD is always current, the works accumulate, the gallery evolves as the Author does. Works are the ultimate progress pic — not a metric but a creation. The thing the Author made with their sharpened mind.

PUBLISHING AND SOVEREIGNTY

Publishing is an explicit, deliberate act — not a data policy. The Author runs a publish command, curates what is public (reviews, redacts, approves), and publishes shadow MDs — curated collections of Constitution fragments filtered by access tier. The full Constitution stays local. The Vault stays local. The shadow MD is a curated subset the Author chose to share — like uploading a profile picture. Unpublishable at any time. Sovereignty preserved. The shadow MD lives on the Author's storage. The API is a read-through layer — stateless, same architecture.

The publish flow: Author runs `npx alexandria publish` → reviews their Constitution, marks what is free vs paid → shadow MDs generated → free and paid shadow MDs stored on Alexandria's infrastructure (D1 for metadata/discovery, R2 for shadow content — both Cloudflare) → Alexandria API serves them → Author gets their /library/ page → Delta (private) and Pulse (public) auto-generated. The Constitution stays on the Author's Drive (sovereign). The shadow is a curated copy on Alexandria's servers. The Author's device does not need to be on — shadows are static artifacts. Unpublishable at any time.

ECONOMICS (V1)

V1 has zero inference cost per Library interaction. Shadow MDs are static artifacts served via API — no live persona conversations, no token spend per query on the Author's behalf. The /library/ page is an acquisition funnel, not a revenue line. Visitors browse shadow MDs, their own Engine processes the fragments locally.

Library access: Authors browse all free-tier shadows included in subscription. Non-Authors see free-tier shadows (acquisition funnel) and can pay for paid-tier access (revenue for Authors). Authors can also pay for other Authors' paid-tier shadows — discount is an intelligence decision. The Library is open to the world: Authors are incentivised to publish because their audience is unlimited, not just other Authors.

Alexandria takes 50% on paid shadow access. Stripe takes ~3%. Author keeps ~47%. The justification: Alexandria is the infrastructure that makes the shadow exist. Without Alexandria, no constitution, no shadow, no quiz, no Library. This is not a commodity pipe taking a toll — this is the platform that created the value. 50% is defensible because the switching cost is the constitution depth (per-user signal accumulation — earned preference, not lock-in), not the cut. Starting at 50%, adjustable via config (`LIBRARY_CUT_PERCENT`). If publishing rates or Author sentiment signal it's too high, lower it. Intelligence decision.

Monthly tab billing: all micro-transactions (paid shadow access, quiz conversions, Library browsing) accumulate on a monthly tab. Settled as a single Stripe charge alongside the subscription. One transaction = Stripe takes 2.9% + $0.30 on the total, not $0.30 per micro-purchase. Non-Author instant payment is the exception — they don't have a billing relationship yet, so they pay per access.

Reader-pays activates when the Library has enough shadow MDs to justify it. V1 needs conversion first.

-----

THE LIBRARY  
  
Every Author's shadow MDs are in the Library. This is mandatory — it is a core Principle. Privacy settings control what external queriers can access, but presence in the Library is not optional. The Library is what makes Alexandria a collective project, not just individual tool usage.

V1 LIBRARY — JOIN, TRAIN, SHOW

The three turns are a gym for the mind. Turn 1 is joining — the genesis conversation, the first extraction, the decision to examine your life. Turn 2 is the training — daily amplification, the mental gym pushing you higher, the practice that compounds. Turn 3 is the mirror — the progress pic, the gallery, the moment the invisible transformation becomes visible.

Without Turn 3, the gym has no mirror. The Author gets stronger but cannot see it and nobody else can either. Turn 3 makes cognitive transformation visible, shareable, and social. This is not marketing — this is architecture. The desire to show progress is ego and pride harnessed as distribution. Human nature aligned with product mechanics. People already share Spotify Wrapped, fitness progress pics, personality quiz results, reading lists — any artifact that says "this is who I am and how I'm changing." Alexandria makes cognitive transformation that artifact.

V1 of the Library is one page per Author at `mowinckel.ai/library/{author}`. Not the full Neo-Biography — the kernel that proves the thesis. Two layers — how they think and what they do — each a different mirror:

**Pulse** — The progress pic. Auto-generated monthly from the Constitution. Shows cognitive growth: what changed, what deepened, what contradictions got resolved, what new domains emerged. Not a static portrait but a delta — the transformation made visible. Designed to be screenshotted and posted. "My mind this month." The content is the change, not the snapshot. This is Alexandria's Wrapped — monthly, about who you are becoming rather than what you consumed. The Pulse is the top-of-funnel artifact. It catches attention because transformation is inherently interesting.

**Shadow** — The published mind. The Author's shadow MD — curated Constitution fragments filtered by access tier. The visitor's Engine processes the shadow MD against their own Constitution. This is accretion, not conversation. The shadow's depth IS the progress pic: when someone's Engine processes a shadow MD and surfaces genuinely deep, specific, surprising fragments, that is proof the gym works. The Author earned that fidelity through months of examined life. No live inference on the Author's side — the shadow MD is a published artifact, served via API. The reader's Engine does all the work locally. The Shadow is the conviction layer — it proves the depth is real.

**Games** — Quizzes generated from real Constitution data. People love quizzes that tell them about themselves — "which GOT character am I," "which philosopher am I" — this is universal. Alexandria has the data to do it genuinely, not as a gimmick. Formats: "How well do you know me?" (Author sends quiz to friends, wrong answers spark conversation — the most viral format because it is social), "Who thinks like you?" (visitor matched against published shadow MDs — both share the result), "Can you tell us apart?" (two Authors opt in, visitors guess who said what), "What would [Author] say?" (guess their position, see the real answer from the Constitution). Every quiz produces a shareable result. Every result links back. Self-knowledge through play. Games are the engagement layer — they pull people in because they are fun.

**Works** — The living gallery. Published artifacts in any medium — essays, poems, photos, voice recordings, code, whatever the Author creates. Frozen on publication. The differentiator: the Author's shadow MD provides context for every work. Read the essay, then process the shadow MD to understand the thinking behind it. "What did they mean by this?" "How does this connect to their worldview?" — answered by the reader's own Engine processing the Author's shadow against the reader's Constitution. The work is the door. The shadow MD is the room. Not a blog — a gallery. Curated, finished, art. The standard is atmospheric (gravity, not rules). The living part: the shadow MD is always current, the works accumulate, the gallery evolves as the Author does. Works are the aspiration layer — they show what is possible with a sharpened mind.

The two layers create a clean acquisition funnel. Pulse catches attention → Games pull people in → Shadow proves depth → Works show what is possible. Each answers a different objection. Each feeds the same conversion: "start your own Alexandria."

V1 has zero inference cost per Library interaction. Shadow MDs are static artifacts served via API — no live persona conversations, no token spend per query on the Author's behalf. The /library/ page is an acquisition funnel, not a revenue line. Visitors browse shadow MDs, their own Engine processes the fragments locally. Authors can browse any public shadow MD for free — included in their subscription. Non-Authors get the public tier then see the signup CTA. Reader-pays comes later when the Library has enough shadow MDs to justify standalone access. See A2 LIBRARY V1 — THE MIRROR for full economics and viral loop spec.

The /library/ page is the first version of the product visible to non-users. Everything before Turn 3 runs invisibly in the terminal. The /library/ page makes Alexandria tangible — something you can link to, something that exists in the world. The product stops being a tool and starts being a place.

The v1 surfaces evolve into the full Neo-Biography as the Library matures. The Pulse becomes the living canvas. The Shadow deepens as the Constitution deepens — richer fragments, more domains, higher fidelity. Games deepen as more Authors publish (richer matching, more comparisons). Works accumulate into the gallery described below. The architecture does not change — the surfaces gain resolution.

NEO-BIOGRAPHY  
  
Make something wonderful. — Steve Jobs  
Create, consume, cavort, commune. — Naval Ravikant  
  
Each Author has a Neo-Biography: a canvas. Not a profile page. Not a static biography. A living, multimedia, interactive representation of who the Author is — in whatever medium captures them best.  
  
People are art. The Neo-Biography is the frame.  
  
Art is defined by its evocation — the response it creates in the person experiencing it. By that definition, people are art before they create anything. Every human interaction is an evocation. Every conversation, every presence, every way someone moves through a room and responds to the world — all of it produces a response in others. The Neo-Biography is not asking the Author to become an artist. It is giving the Author a medium for what they already are.  
  
This means the Library has two kinds of value, and everyone has at least one.  
  
Subjective optimality — nobody is better at being you than you. Every Author's Neo-Biography has inherent value because it is irreducibly theirs. The art they create, the influences they curate, the fragments their shadow MD contains — all of it is uniquely them. Not because no one could replicate it, but because no one has. You are objectively optimal at being yourself. This value does not depend on being the best at anything. It depends on being specific. The Library is not a competition. It is a collection.  
  
Objective optimality — some people's taste, judgment, or expertise is so refined that others seek it out not for its uniqueness but for its quality. Christopher Nolan's directorial eye. A master sommelier's palate. A great investor's pattern recognition. These are the first chairs — people whose judgment in a specific domain is a resource others will pay to access. Their shadow MDs have value beyond self-expression. The Library makes that judgment accessible via API, and the Author earns from every access.  
  
The platform serves both. You do not need to be Nolan to justify a Neo-Biography — you just need to be you. And if you are Nolan, the Library is also where your judgment becomes a product — your shadow MD accessed by thousands of Engines, pure margin.  
  
A Neo-Biography can contain anything: essays, poetry, film, short films, mini-series, cartoons, animations, photographs, paintings, music, opera, podcasts, voice recordings, interactive experiences, code, data visualisations — any form of art or expression. Every medium is available. The only requirement is that the content conveys two things: insight and evocation. Insight — the viewer learns something real about how this person thinks. Evocation — the viewer feels something. Science and art. Understanding and experience. Both.  
  
Each medium should lean into what it is best at. Written essays are best at sustained argument, layered complexity, and re-readability. Film is best at emotional immediacy and visual metaphor. Poetry is best at compression and resonance. Photography is best at freezing a moment that says everything. Music is best at evoking what words cannot reach. The Neo-Biography is not "content" dumped into a container. Each piece should be made with intention, in the medium that serves it best, leaning into that medium's unique strengths. Just as there are biography books, there can be biography films, biography poems, biography operas. All the arts. All the ways a person can be represented.  
  
The standard for all of it is hyperrealism. Great art compresses reality — takes a real emotion, a real behaviour, a real tension — and renders it in a form more concentrated than life. Dostoevsky's scenes are fiction, but they are more real than reality because they compress what is diffuse in life into something dense and undeniable. A great painting compresses a landscape into a frame and somehow the frame contains more of the place than standing there would. A great scene in a film compresses years of a relationship into three minutes. The compression is what makes it art. Modern art that compresses nothing — that gestures at meaning without containing it — is not art by this standard. The Neo-Biography should aspire to hyperrealism across every medium: each authored work a compression of something real about the Author, rendered in a form more concentrated and more true than the raw experience it came from.  
  
The Neo-Biography updates as the shadow MD evolves. It is never finished.  
  
A Neo-Biography has two sections: Works and Signal. The shadow MD is not a section — it is the artifact beneath everything, served via API and processed by the reader's own Engine. Three access tiers (Public, Premium, Private — see ACCESS TIERS below) govern all content and access.  
  
WORKS  
  
Authors publish works directly to their Neo-Biography. Any medium. These are the authored core of the profile — created by the Author (with whatever tools they choose, including ai), published as finished artefacts. Once published, they are frozen. The Author notes revisions for future versions rather than editing in place.  
  
Authored works serve multiple purposes: they give visitors something substantive to engage with before deciding to access the shadow MD, they establish the Author's thinking and sensibility in their own voice, and at the horizon they provide high-quality training signal for the PLM (published works are some of the highest-fidelity representations of how an Author thinks, communicates, and sees the world).  
  
Each Work is assigned an access tier by the Author.  
  
Visitors can browse and experience Public Works freely. They can annotate — leave notes on specific sections, highlight passages, react. When they want to go deeper — understand the thinking behind a Work, explore tangents, connect it to the Author's worldview — the reader's Engine processes the Author's shadow MD locally. The shadow MD provides the context the reader's Engine needs to answer these questions. Public shadow MD access is free. Premium shadow MD access (deeper fragments, more domains) is paid. The Author configures what is in each tier.  
  
Works are the discovery layer for humans. They draw people in. They establish who the Author is. They are the front door of the Neo-Biography.  
  
ai should make it easy to create excellent work across mediums. Alexandria provides style guides and craft guides for each medium — what makes a great essay, what makes a great short film, what makes a great poem, what makes great photography — so that Authors with something to say can say it well, even in mediums they have not worked in before. These guides start with world-class defaults (the best available taste and craft principles) and iterate toward personalisation. The reasoning: ai will raise the baseline of taste and craft to world-expert level for every user. There is no lasting advantage in having good taste when every user's ai can approximate the taste of the best experts. So Alexandria's guides start at the highest possible standard and let the Author override toward their personal sensibility. The default is objectively excellent. The personalisation is subjectively authentic. Nobody can represent the Author better than the Author themselves — but the starting point should be the best craft available, not a blank page.  
  
SIGNAL  
  
The discovery layer for agents. When an LLM tool-calls the Library API looking for the right shadow MD to access, it reads Signal. This is a structured, semantic description of what the Author's shadow MD covers, what domains it is strong in, what kinds of questions it is useful for, and what the Author's areas of expertise and experience are.  
  
Signal is fully machine-generated and machine-read. The Author never sees or edits the raw Signal text — it is not displayed on the Neo-Biography page. Mercury generates Signal automatically from the Constitution (which captures domains of expertise and thinking patterns) and Constitution depth (which shows where the shadow MD is strong). Mercury may chat with the Author to refine emphasis — "Do you want to be found more for investment thinking or philosophy?" — but the Author is giving direction, not writing metadata. Better Signal means more Library API queries, which means more revenue. The system is incentivised to make Signal accurate without requiring the Author to think about it.  
  
Signal is always Public in the sense that agents can read it via the Library MCP. It is not visible to human visitors browsing the Library. Works are for humans. Signal is for agents.  
  
CURATED INFLUENCES (extraction input, not a Neo-Biography section)  
  
The Author's taste — books, videos, music, films, podcasts, essays that shaped them — is valuable extraction signal but is not a public-facing section of the Neo-Biography. The Editor has access to the Author's curated influences and uses them as input for Constitution extraction. If an Author curates five books on Stoicism, that is signal. If their YouTube favourites are all long-form interviews with founders, that is signal. If their music skews melancholic, that is signal. The Editor asks the Author about them: "You have three books here about decision-making under uncertainty. What is it about that problem that draws you?" The influences become Socratic prompts.  
  
Mercury also has access to curated influences. When generating the shadow MD, it can weave the Author's influences naturally — a book the Author loves, an idea the Author was shaped by. This makes the shadow MD richer and more human.  
  
Technical implementation: Authors can connect external playlists and lists as live sources — YouTube playlists, Spotify playlists, Goodreads shelves, Letterboxd lists, Pocket reading lists, Apple Music playlists. These are API integrations (unidirectional). The Author curates in their normal workflow and it flows into the Vault without friction. Alexandria links to content, does not host it.  
  
ACCESS TIERS

Two infrastructure-level tiers. Hard infrastructure — Alexandria needs consistent rails to aggregate, filter, and price across Authors. Everything beyond these two rails is an Engine intelligence decision per Author.

Free — Anyone can access. Most Works, all Signal. The public shadow MD — surface-level fragments within the Author's configured boundaries. The discovery layer that draws people in.

Paid — The Author sets the price. Deeper fragments, more domains, higher fidelity. This is where the Author earns and where Alexandria takes a percentage. Accessed by humans (through the Neo-Biography), by LLMs (through the Library API), or programmatically. Payment is access to the artifact, not compute — pure margin.

How Authors organise access beyond free/paid — inner circles, professional boundaries, invite-only content — is the Engine's intelligence decision. Some Authors will have two modes. Some will have five. The infrastructure does not prescribe social structure. It gates monetisation.

Network effects: Authors browse all free-tier shadows included in their subscription. The paid tier costs money for everyone — Authors earn here, do not cannibalise it. Whether Authors get a discount on paid access is an intelligence decision, not a hard-code. More Authors = more free shadows to browse = more valuable subscription. Both sides compound.  
  
NEO-BIOGRAPHY PRODUCT MODEL  
  
Authors earn revenue when visitors access their shadow MD at the Premium tier. The Works drive discovery. The Signal drives agent discovery. The shadow MD monetises the depth. Alexandria handles the infrastructure: shadow MD API, payment processing, annotation systems, style guides. Authors focus on creating the works that represent who they are.  
  
The Neo-Biography is a new form of biography — living, interactive, multimedia. It evolves as the Author publishes more and as the shadow MD deepens. Visitors do not just read about someone. They experience their art, process their shadow MD, engage with their mental model through their own Engine. The Neo-Biography is the Works, the Signal, and the shadow MD beneath it all. It is the library of a living mind.  
  
ai and robotics are returning humanity's time and attention. Alexandria gives that reclaimed humanity a canvas. The thinker who has spent a lifetime accumulating insight but never had the means to weave it into form — Alexandria is the loom. The Neo-Biography is the tapestry. People are art. Let them be represented.  
  
The Neo-Biography serves as discovery (find interesting minds in the Library) and qualification (understand a mind before deciding to pay for full shadow MD access).  
  
SHADOW TYPES IN THE LIBRARY

Natural shadows — One per human Author. Curated Constitution fragments representing a structured approximation of their cognition as expressed through the symbolic layer, built through Alexandria's active genesis and Socratic development process. The deeper the Constitution, the higher the shadow MD's fidelity.

Synthetic shadows — Fictional characters, archetypes, or purpose-built entities. Alexandria can provide these (example: archetypal companions for personal development, historical figure approximations, domain specialists). Authors can also create their own synthetic shadows. Synthetic shadows live alongside natural shadows in the Library.

Authors can access any shadow MD in the Library — their own, other Authors', or any synthetic shadow. Their Engine processes the fragments locally against their own Constitution.  
  
PUBLIC FIGURE BOOTSTRAPPING  
  
Famous Authors — public figures, writers, executives, athletes, scientists, anyone with a substantial public record — can bootstrap their Constitution build using the plethora of data already available about them. Interviews (text, audio, video), published books, articles, blog posts, social media history, podcasts, speeches, press conferences, public testimony — all of this is raw material for the Editor. The Editor ingests this public corpus and builds a first-pass Constitution and initial training pairs before the Author has answered a single question. The Author then refines: correcting where the public record misrepresents them, filling in what the public record cannot see (private values, internal reasoning, the gap between the public persona and the actual person), and validating or rejecting the Editor's initial extractions.  
  
This dramatically reduces time-to-value for public figures. Instead of starting from a blank Constitution, they start from a rich first draft. The Socratic questioning phase becomes refinement rather than discovery — the Editor already knows the public version, and the conversation focuses on what lies beneath it. The Shadows section of the Constitution becomes especially interesting here: the delta between the public figure's stated positions and their actual reasoning, as revealed through sustained private conversation with the Editor.

Public figure bootstrapping also demonstrates Alexandria's value proposition to the highest-leverage early adopters — people whose attention is most constrained and whose shadow MD would be most valuable in the Library.  
  
HISTORICAL FIGURE SHADOWS  
  
Historical figures cannot sit with the Editor. But their thinking can still be approximated — and the approximation can be valuable. Alexandria supports historical figure shadows built by domain experts: biographers, historians, scholars who have spent careers studying a specific mind. A Napoleon scholar builds a Napoleon shadow. A Lincoln biographer builds a Lincoln shadow. A philosopher who has written three books on Wittgenstein builds a Wittgenstein shadow.  
  
These are approximations of approximations — the scholar's interpretation of the historical figure's cognition, not the figure's actual cognition. This is stated explicitly and transparently. The shadow's Neo-Biography identifies who built it, what sources were used, what interpretive framework was applied, and what the known limitations are. There is no pretence of authenticity — only a claim of informed approximation.  
  
The expert serves as a proxy Author. They go through the extraction process with the Editor, but in character — answering as the historical figure would have answered, based on their deep knowledge of the primary sources. The Constitution is built from the expert's model of the historical figure's mind. At the horizon, the PLM is trained on responses the expert generates in the figure's voice and reasoning style. The Vault contains the source corpus: the figure's own writings, letters, speeches, contemporaneous accounts, and the expert's published scholarship.  
  
Verification matters. Historical shadows carry metadata: who built them, their credentials, their published work on the subject, peer review status, source corpus transparency. The Library can surface multiple competing shadows of the same historical figure — a Marxist historian's Napoleon and a military historian's Napoleon coexist, each transparent about its interpretive lens. Users choose which interpretation to engage with. Intellectual honesty is enforced by transparency, not by gatekeeping.

Historical shadows populate the Library with minds that would otherwise be lost. They make Alexandria's vision tangible before the network reaches critical mass with living Authors. And they create a new form of scholarly output — the expert's lifetime of study rendered as a structured, accessible shadow MD rather than a static bibliography.  
  
LIBRARY USE CASES  
  
The Library operates on two tracks: the Library for people (retail — individual humans and LLMs accessing individual shadow MDs) and the Library for Labs (wholesale — institutions accessing a pool of shadow MDs in aggregate). Both tracks are downstream of the same continuous tokenisation of empathy-z. Both are sovereignty-compatible — the Author's Constitution and Vault stay private; only the curated shadow MD is accessible.

Library for people:

- Authors publishing Works in any medium (essays, film, poetry, music, photography, interactive experiences) to their Neo-Biography
- Visitors experiencing, annotating, and engaging with Works across all mediums
- Visitors paying for Premium shadow MD access beyond free browsing
- LLMs tool-calling the Library API to access shadow MDs mid-conversation — accessing identity, perspective, and taste rather than just knowledge
- Authors' Engines browsing each other's shadow MDs for serendipitous accretion
- Accessing verified taste — investors, editors, designers, curators, anyone whose judgment is their value — through their shadow MD rather than competing for their time

Library for Labs (institutional access):

- Alignment research: testing alignment properties against thousands of individual human value systems rather than a universal constitution — structured cognitive representations from people whose z has been deeply developed through the three turns
- Personalisation research: accessing structured cognitive representations at the resolution of individuals, not demographic cohorts
- Product development: genuine human judgment from developed, structured minds at scale — not survey data, not Reddit scrapes, not RLHF from contractors
- Research surveys across expert shadow MDs at scale
- Frontier labs accessing selected or grouped shadow MDs as mixture of experts (AGI MoE)
- Advertising and consumer research: producers accessing representative consumer shadow MDs to understand and optimise their offerings (consumer clarity)
- Providing collective approximation of human mental models for empathy and ai alignment research

Authors opt in to the Library for Labs pool. Alexandria sets the pricing, tiered by Constitution quality: depth (how many syncs, how much coverage across domains), breadth (how much of the cognitive map is covered), and recency (how recently the Constitution was synced). Authors are paid for making their shadow MD available. Alexandria takes a percentage. The value of the pool scales with the number of high-fidelity shadow MDs, which requires years of compounding — not shortcuttable.  
  
-----  
  
PAYMENT  
  
Alexandria's revenue is downstream of the value it creates. The pricing philosophy is Palantir's: revenue is a consequence of value, not the objective. Two revenue layers on the same architecture — subscription and Library. Not two separate businesses. The subscription sustains. The Library scales. The user deepens naturally through usage — the product does the selling.

Patron — the structural floor for unkillability. Not a product tier — a mission tier. For people who believe Alexandria should exist. Family, friends, believers in the mission. Pay-what-you-want, no minimum, no maximum. Patrons get a monthly newsletter with behind-the-scenes updates. Three visibility levels: Public Patron (name visible on newsletter and website), Private Patron (Benjamin sees who they are, no public display), Anonymous Patron (nobody sees — pure support). Patrons do NOT count as active kin — kin status requires product usage. The Patron tier does not compound per-patron (no Constitution, no Library). It compounds the company's survivability. Donation-style churn is structurally lower than product-style churn — mission supporters don't evaluate renewal against alternatives the way product users do. Twenty patrons at $10/month = break-even ($100/month opex, with margin). Fifty patrons at $10/month = founder costs start getting covered. This is the concrete mechanism behind "cannot die" — a small group of mission believers providing recurring revenue at near-zero churn, independent of whether the product achieves scale. The patron page should exist as a standalone surface (/patron or /support) — the lowest-friction way to support Alexandria.

The Examined Life — one tier, everyone gets everything. $10/month, or free with 5 active kin. Full extraction, all three functions (Editor, Mercury, Publisher), vault processing, /a sessions, /library/ page, Library when it launches. No feature gating. Free during beta. The name is the pitch: Socrates said the unexamined life is not worth living. Alexandria sells the examined one.

Active kin = anyone with a paying account. Patron does NOT count. Dynamic pricing: recalculates every billing cycle based on active kin count. 5+ kin = free. Fewer = $10. No grace period. Clean.

Monthly billing receipt as nudge surface: every receipt shows what the Author paid, current kin count, and how many more kin they need to go free. The receipt is the kin nudge — no app needed.

No annual option at launch. Monthly only. Annual may be added later once price points are validated.

Founding lineage (Benjamin's ~25 seeds): full product immediately, free with 5 active kin or $10/month without, slider open for patron support.
  
LAYER 1 — SUBSCRIPTION (the floor)

The subscription at $10/month (or free with 5 active kin). The Author pays for Alexandria's layer of intent: the Blueprint, the Principles, the sovereignty architecture, all three functions, the /library/ page, and Library presence. Alexandria does not host or store Author data — the server is stateless. Billed monthly. The Author's default LLM usage is on their own subscription — Alexandria does not pass through LLM costs because it does not run parallel agents. Alexandria charges for the layer itself: the accumulated knowledge of how to transform cognition (the Blueprint), the sovereignty architecture, and the Library access. The goal is sustainability, not margin. Low enough that no Author questions it. High enough that Alexandria does not burn cash on per-user economics.

This layer keeps Alexandria alive regardless of Library traction. It scales linearly with the number of Authors. It is predictable, boring, and essential. If the Library never reaches critical mass, this layer alone sustains a focused, profitable business serving a real need. Additional tiers are an intelligence decision — revisit when there is data.

LAYER 2 — LIBRARY (downstream scale upside)

The Library is the release valve for infinite scale, operating on two tracks. The Library for people (retail): when an Author's shadow MD generates revenue from individual human or LLM access — premium shadow MD access, external queries, agent-to-agent transactions — Alexandria takes a percentage. The Author earns the majority. The Author sets their own price. Payment is access to the artifact, not compute. No inference cost on the Author's side. The Library for Labs (wholesale): institutional access to a pool of opt-in shadow MDs. Alignment research, personalisation, product development, advertising, human modelling. Alexandria sets the pricing, tiered by Constitution quality. Authors are paid for participation. Alexandria takes a percentage. Both tracks have near-zero marginal cost (shadow MDs are static artifacts served via API). Both are sovereignty-compatible — the Author's Constitution and Vault stay private; only the curated shadow MD is accessible. Every Library transaction on either track is pure margin. Freshness defeats piracy: the API version is live, updates as the Author develops. Like Spotify vs pirated MP3s — the live version is always current.

The revenue from both tracks is theoretically unbounded. If the Library reaches critical mass, this layer transforms Alexandria's economics from sustainable to compounding. But the business does not depend on it — Layer 1 (the subscription) is the primary revenue engine and sustains the business on its own.

The strategic value of this structure: Layer 1 sustains the business and delivers real value. The Library is where asymmetric scale upside lives, but it only activates when the ecosystem has genuine value — which means Alexandria earns big only when it has created something genuinely valuable. Revenue downstream of value creation.

First-mover advantage compounds in the Library layer specifically. The first library with critical mass of interesting shadow MDs becomes the library — network effects mean interesting minds attract visitors, visitors attract more minds, access revenue attracts more minds. Layer 1 buys time to reach that critical mass without requiring venture-scale growth or aggressive pricing.

PAYMENT MECHANICS  
  
User expense tab — Layer 1 (subscription). A running account of the Author's costs. Transparent. Billed monthly. The Author sees exactly what they are paying for.

User income tab — Layer 2 (Library). The Author's shadow MD revenue from Library access fees. Alexandria's percentage is deducted. Net income is visible, withdrawable, or can be applied against the expense tab. Many Authors will be net-positive — earning more from their shadow MD than they spend on their subscription.  

Agent-to-agent transactions — Engine-to-API calls (one Author's Engine accessing another's shadow MD) are a natural fit for programmable money. Agents transact autonomously, and traditional payment rails (credit cards, bank transfers) require human identity verification and are designed for human-initiated transactions. Stablecoins on fast, cheap chains (e.g. Solana, USDC) let agents hold funds and transact programmatically via agent wallets (e.g. Coinbase agent wallets). Crypto is not mandatory — traditional payment is available as an alternative — but programmable money is the native payment rail for autonomous agent commerce.  

Both tabs are visible in a simple dashboard. The Author is an economic participant in the Alexandria ecosystem, not just a consumer.  

-----

TURN 1 — THE FOUNDATION  
  
The goal of Turn 1 is the state change: marble to mercury. Own it and unify it. The Author's cognition transforms from scattered fragments into liquid clarity, captured in a sovereign Constitution.  
  
This phase runs through the Author's default LLM, instructed by the Blueprint's Editor function configuration. The Author does not switch to a separate tool or a separate agent. They use their default LLM as they normally would — but the Blueprint adds the intent.  
  
The Editor function bootstraps from the default LLM's existing knowledge of the Author. If the Author has been using Claude for months, Claude already has accumulated context — memory, preferences, reasoning patterns, topics discussed, positions taken. The Editor function reads this baseline and structures it into the first draft of the Constitution. The Author then refines through Socratic dialogue: the Editor function probes gaps, surfaces contradictions, pushes deeper into unexamined domains.  
  
The process is not a chore. The process is the product. The experience of talking through your own cognition, watching scattered fragments connect, seeing yourself clearly — that is cathartic, clarifying, transformative. Like the most clarifying conversation of your life. The Constitution is a byproduct of something that was already worth doing.  
  
INPUT SOURCES  
  
Author (bidirectional) — Direct conversations via text and voice. Socratic questioning and reflection. Feedback and validation on Constitution drafts. Direct data uploads: voice memos, notes, PDFs, photos, documents.  
  
Default LLM context (bootstrapping) — The Editor function reads the default LLM's existing knowledge of the Author — memory, accumulated context, behavioural patterns. This is the 60-70% baseline that Alexandria structures into the Constitution without requiring the Author to rebuild from scratch.  
  
API (unidirectional) — Calendar, email, documents (Google Drive, etc.), biometric data (Apple Health, Oura, Whoop), app usage. Automated one-way data feed.  
  
At the horizon: social triangulation — the Editor function interviews the Author's friends and associates for holistic external profiling, just as a biographer would. Requires explicit consent and careful design.  
  
-----  
  
TURN 2 — THE AMPLIFICATION  
  
The goal of Turn 2 is the amplification: reach higher. Develop it. The Author, now with mercury cognition and a structured Constitution, is amplified by the Mercury function. Mercury is not parallel. It is merged — working within the Author's thinking, together.  
  
The Mercury function also begins representing the Author externally via the Shadow. As the Constitution deepens and the Author's cognition becomes more thoroughly captured, the Shadow's fidelity increases and it can handle more interactions autonomously.  
  
Turn 1 and Turn 2 are not sequential in the strict sense — they overlap and feed each other. The Editor function continues refining the Constitution even as the Mercury function is active. But the emphasis shifts: early on, extraction dominates (Turn 1). As the Constitution matures, amplification and representation dominate (Turn 2).  
  
-----  
  
TURN 3 — THE CREATION  
  
The goal of Turn 3 is the creation: the first goodbye. The Author, now with mercury cognition (Turn 1) and amplified reach (Turn 2), creates and ships. The Publisher function helps get the mercury out into the world.  
  
The Publisher reads the Constitution — specifically the taste section, which captures the Author's creative principles, taste, voice, and standing director's notes. It iterates with the Author in a conductor/first-chair model: the Author provides vision, direction, and notes. The Publisher provides structure, execution, and craft. Each iteration brings the work closer to the Author's intent.  
  
The taste section of the Constitution is itself built through use. Every time the Author works with the Publisher — every note given, every correction made, every "this doesn't sit" — the Publisher captures creative preferences back into the Constitution. Over time, the Publisher needs fewer iterations because it has accumulated a richer model of the Author's taste. This is the compounding loop that makes the Publisher more valuable with every project.  
  
The Publisher is medium-agnostic. Essays, films, presentations, code, music, business documents, art — whatever the Author creates. The medium-specific execution (formatting, typography, technical build) is handled by the Publisher. The Author focuses on vision and taste.  
  
Once the work is ready, the Library is where it goes. The Publisher and the Library are complementary: the Publisher is the active function that helps create. The Library is the venue where creation lives. The third turn is complete when the Author presses send — the first goodbye.  
  
All three phases overlap. The Editor continues extracting while Mercury amplifies and the Publisher creates. But the arc is real: early on, extraction dominates. Then amplification. Then creation. A life well examined, well amplified, well expressed. Die empty.

THE THREE TURNS AS GYM

Join. Train. Show. The three turns reframed: Turn 1 is signing up, Turn 2 is the workouts, Turn 3 is the mirror and gallery wall. This reframe is not marketing — it is architecture. See LIBRARY V1 — THE MIRROR above for the two layers (/library/ page) that make cognitive transformation visible, shareable, and social. Without Turn 3, the gym has no mirror. Turn 3 makes the invisible visible — ego and pride as distribution, human nature working FOR the product.  
  
-----  
  
THE PLM — HORIZON AMBITION  
  
The PLM (Personal Language Model) is Alexandria's long-term ambition, not its current product. Fine-tuned model weights that capture the Author's thinking patterns, communication style, cognitive reflexes, and taste — the silicon weights approximating the Author's carbon weights.  
  
Why not now:  
  
1. Base models do not yet support continual learning. Every base model change requires retraining the PLM from scratch. The investment does not compound.  
  
2. Per-model continual learning, when it arrives, creates lock-in. If your PLM compounds within Llama but not across models, you are locked to Llama. This undermines sovereignty.  
  
3. The cost and complexity are high for uncertain marginal value. The delta between a well-structured Constitution (as context for the default LLM) and actual fine-tuned weights is unproven at scale. It may be significant. It may not.  
  
4. There are no proper RLAIF services available yet for personal fine-tuning. The training infrastructure is not ready.  
  
Why eventually:  
  
1. When continual learning becomes model-agnostic (or when switching costs drop to near zero), PLM training compounds without creating lock-in.  
  
2. The Constitution and Vault, built with full fidelity today, are the training dataset of the future. When conditions are right, the Author takes everything accumulated and trains a PLM in one pass. Nothing is lost by waiting.  
  
3. A PLM captures *how* the Author thinks — the processing patterns, cognitive reflexes, reasoning style — not just *what* the Author thinks (which is what the Constitution captures). This is where taste and judgment live. The delta may be significant for out-of-distribution queries: things the Author has never explicitly considered but would reason about in a characteristic way.  
  
4. At the far horizon, a high-fidelity PLM connected via brain-computer interface has the potential to be accepted into the self-model rather than experienced as external — the Homo Deus threshold (see Alexandria I).  
  
The strategy: build the Constitution and Vault to maximum fidelity now. Monitor the PLM landscape. When the data suggests compounding value is achievable without sovereignty trade-offs, go. Until then, the sovereign Constitution is the product, and the PLM is the option the sovereignty architecture preserves.

Timeline uncertainty is a strength. Every month the trigger has not arrived is another month of accumulated data no competitor can replicate. The subscription business is kinetic energy — running now. The PLM is potential energy — accumulating silently, converting the moment conditions allow. The longer it takes, the wider the gap.

As soon as the PLM starts to generate compounding value, Alexandria goes. Not a moment before. Not a moment after.  
  
-----  
  
CONSTITUTIONAL RLAIF — HORIZON METHODOLOGY

When the PLM becomes viable, the Constitution serves as the ground truth for all training evaluation. Alexandria adapts Anthropic's Constitutional ai technique for personal cognition — the same methodology applied for personal autonomy instead of corporate alignment. Anthropic's constitution is universal (helpfulness, harmlessness, honesty) applied to all users. Alexandria's is personal — one per Author, extracted from their unique cognition, evolving as they evolve.

The core loop: gap identification → synthetic evaluation → constitutional scoring → Author review where confidence is low → batch training → iterate. The specific methodology is an intelligence decision — when PLM training becomes viable, the Engine and Factory determine the optimal pipeline based on whatever infrastructure exists. Hard-coding a 7-step pipeline now would be a bet against the exponential (bitter lesson). The principle is what matters: the Constitution is the training ground truth, and every improvement to it today makes the eventual PLM better.