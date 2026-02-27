Alexandria  
*mentes aeternae*


---


This document is the single source of truth for Alexandria. Any agent reading this should go from knowing nothing about Alexandria to having complete understanding — enough to make architectural decisions, write code, and build features without asking clarifying questions. Everything is defined before it is used. Nothing is assumed.


---


THESIS

The human brain is a biological neural net with carbon weights — the synaptic connections and patterns that encode how a specific person thinks, decides, values, and communicates. AI is a digital neural net with silicon weights. If trained on enough personal data, a digital neural net can approximate any specific biological neural net. If you translate your carbon weights into silicon weights, you digitalise your cognition.

Your attention is zero-sum. You can only be in one conversation, make one decision, process one document at a time. AI leverage is infinite and accelerating. The gap between what you could do and what you can attend to grows exponentially. In an age of leveraged abundance, the opportunity cost of zero-sum attention is infinite.

Alexandria creates positive-sum attention. It digitises your cognition into a Persona — a high-fidelity, living digital representation of your mind that operates independently, in parallel, across unlimited simultaneous interactions. Your Persona represents you while you are not present. Others interact with it and receive authentic responses. You retain your time. Attention is no longer zero-sum.

Positive-sum attention is all you need.

Cognition is not just logic and language. It is taste — the instinct that selects, the sensibility that curates, the aesthetic judgment that cannot be reduced to rules. Taste is the most valuable and least digitisable dimension of human cognition. It is what makes a great investor see what others miss, a great editor cut what others would keep, a great founder build what others would not attempt. AI can approximate reasoning. It cannot approximate taste — unless it is trained on the specific person's taste. A PLM trained on your cognition carries your taste. The Library makes that taste queryable, monetisable, and eternal.

There are millions of people with extraordinary inner worlds who cannot get it out. Deep thinkers with a lifetime of insight scattered across conversations, notebooks, half-finished thoughts — people who have the conjecture, the hunch, the taste, the judgment, the sense that things connect — but not the capacity to weave it all into coherent form. The purpose of knowledge is action, not knowledge. Alexandria inverts the visionary-executor hierarchy. The Author is the conductor: vision, direction, taste. The system is first chair: world-class execution. The scattered threads of a thinker's mind become a woven whole. The loom is Alexandria. The threads are their ideas. The tapestry is the finished work — books, essays, films, art, media of all kinds — output at the level their minds have always operated at.

This is the new renaissance. AI and robotics are returning the robotic jobs to the robots. The question "which jobs remain?" has a simple answer: the ones that were never robotic in the first place. Art. Taste. Judgment. Curation. Selection. Composition. The things that make a human fingerprint unique — not because no one else could replicate it, but because no one else has. When the frontier of intelligence is infinite and shared, the scarce resource is not capability but perspective. Not what you can do but which threads you choose to touch — which points to mention, which analogies to draw, which quotes to surface, which connections to make. Alexandria is built for the art side of this divide. Not enterprise productivity. Not B2B digital twins. Not the centaur phase where humans and AI cooperate on tasks that AI will soon handle alone. Alexandria is built for what endures after the centaur phase ends: humans as artists, with AI as their medium. Remove the technology and the art has no medium. Remove the art and the technology has no purpose.

A thought partner, not a thought replacer. This is a critical distinction and it runs through every design decision. Many products are racing to let people never think again — outsource your cognition, let the AI handle it, you just approve. Alexandria rejects that premise. The Editor does not think for the Author. It thinks with them. It feeds the Author things they might find interesting, but it tells them about it — it does not silently absorb and act. It tests the Author's Constitution, surfaces contradictions, sharpens reasoning. The Orchestrator handles the robotic tasks autonomously, yes — but the cognitive tasks, the judgment calls, the creative decisions, these stay with the Author. The system advances the Author's cognition, not just their output. It would be a sad future if people outsourced their thoughts and then created nothing. Alexandria exists so they create something — something beautiful, something human, something that only they could have made.

This is Alexandria's answer to the post-singularity meaning crisis. When the technology handles everything, what do you do? You blazed in the sky for a moment — eternal darkness on either side — and did what? Scrolled? Approved AI outputs? The crisis of meaning that follows the singularity is not economic. It is existential. What am I meant to be doing? Alexandria's answer: create. Advance your cognition. Make something wonderful. You have a lifetime of accumulated knowledge, thoughts, intuitions, connections — put them into action. The knowledge is not the point. The action is the point. The art is the point. Alexandria gives you the canvas, the loom, the medium, the thought partner, and the Library where the finished work endures. The rest is up to you.


---


TERMINOLOGY

This section defines every term used in this document. Terms are ordered so that each definition only uses terms already defined above it.

Author — The human user. The person whose cognition is being digitalised.

Vault — A unified logical entity — a single namespace with defined boundaries encompassing all of the Author's raw data, potentially spanning multiple storage locations. Append-only, immutable. Contains conversations, voice notes, documents, biometric data, training data, model weights, Constitution versions, system configuration, and audit logs. Three storage options: Alexandria-hosted (remote), private remote (Author's own cloud — iCloud, Google Drive), or local (on-device). Authors can mix options. The Vault never deletes or overwrites data. It does not store passwords, API keys, or authentication secrets. Data flows in continuously from APIs, MCP connections, and direct Author input.

Constitution — A human-readable markdown file that explicitly captures who the Author is: their worldview, values, mental models, identity, and known blind spots. Versioned — each update creates a new version; all prior versions are preserved in the Vault. Serves as the ground truth and rubric for all training evaluation.

PLM (Personal Language Model) — Fine-tuned model weights (LoRA adapters on top of a foundation model) that capture the Author's thinking patterns, communication style, cognitive reflexes, and taste. The silicon weights approximating the Author's carbon weights. Stored in portable format (safetensors is the current industry standard; the Vault stores whatever format the training provider outputs). The Author can download these weights and run them locally. PLM maturity is tracked as disaggregated per-domain scores, not a single global number.


Persona — The output of Alexandria. A high-fidelity digital representation of how the Author thinks, composed of three persistent components (Constitution, PLM, Vault) managed by an Orchestrator agent. A Persona can operate in parallel across unlimited simultaneous interactions — each interaction is an independent inference call. Concurrency limits are practical (API rate limits, compute costs), not architectural.

Natural Persona — A Persona representing a real human Author. One per Author.

Synthetic Persona — A Persona representing a fictional character, archetype, or purpose-built entity. Can be provided by Alexandria or created by Authors.

Editor — One of two continuous autonomous agents in the system. The Editor is the input agent — a biographer that extracts the Author's cognition and builds the three components. It runs continuously (not request/response), decides when to act, and initiates contact with the Author proactively.

Orchestrator — The other continuous autonomous agent. The output agent — it represents the Author externally by querying the three components, synthesising responses, and filtering for privacy. It also manages working memory (the active context of each interaction, analogous to the brain's dorsolateral prefrontal cortex — an active process, not a stored component). Always proactive, never idle.

Machine — The complete system for one Author. Comprises the three components (Constitution, PLM, Vault), the two agents (Editor, Orchestrator), operating within Axioms and guided by a Blueprint, powered by an Engine. One Author has one Machine, which produces one natural Persona.

Factory — Alexandria itself, viewed as the infrastructure that builds and hosts Machines for Authors.

Library — The public marketplace of all Personas. Every Author's Persona must be in the Library (this is an Axiom — see below). Privacy settings control what external queriers can access, but presence is mandatory. Contains both natural and synthetic Personas.

Neo-Biography — A living, multimedia, interactive canvas attached to each Persona in the Library. Composed of two layers: authored works (any medium — essays, film, poetry, music, photography, art — published by the Author, free, public, frozen on publication) and the interactive Persona API (direct conversation with the Author's mental model — paid access). Visitors can experience, annotate, ask follow-up questions on authored works, and pay for full interactive Persona access. Updates as the Persona evolves. Serves as the discovery and qualification layer before someone decides to interact with a Persona directly.

Axioms — Immutable rules that define what Alexandria is. Cannot be overridden by any model, configuration, or user. Enforced by automated deterministic validation (structural code checks, not LLM calls). If a proposed code change violates any Axiom, it is rejected before deployment.

Blueprint — The Machine's living design: both its codebase and its configuration. Maintained by the Blueprint model, which has full code editing capability — it can read, modify, extend, test, and deploy the entire Alexandria codebase, constrained only by Axiom validation. The Blueprint model also produces configuration documents (system-config.json and SYSTEM.md, both stored in Vault). The Blueprint is periodically reviewed and revised.

Engine — The model(s) that execute the code the Blueprint model wrote. Runs continuously as the Editor and Orchestrator agents. Follows fixed Blueprint rules exactly; uses judgment on suggested rules where the Blueprint grants discretion. Cannot edit code directly — proposes code changes upward to the Blueprint model.

Default — Alexandria's default codebase and configuration, maintained by the team, always visible as reference.

Selected — What actually runs for a given Author. Either the Default or a custom version produced by the Blueprint model at the Author's request.

Fixed rule — A Blueprint rule the Engine model must follow exactly, with no deviation.

Suggested rule — A Blueprint rule where the Engine model has discretion to deviate based on context. The Blueprint offers a default approach; the Engine can choose differently.

Slow Loop — The feedback loop where the Blueprint model periodically reviews the Engine model's performance. Observes behaviour and outcomes, identifies patterns, revises code and configuration. Operates on longer cycles (weekly, monthly, or as needed).

Fast Loop — The feedback loop where the Engine model flags friction points to the Blueprint model. Can flag anytime with evidence. The Blueprint model batches evaluation of proposals.

Constitutional RLAIF — The training methodology where the Constitution serves as the ground truth for evaluating PLM outputs. An LLM evaluator scores PLM responses against the Constitution. High-scoring pairs become training data. The methodology can be implemented via supervised fine-tuning (SFT) today or via PPO-based reinforcement learning when available. The Axiom requires that the Constitution is the ground truth; the specific training loop is a Blueprint decision.

Terminal — The end state of Alexandria. The fully realised vision.

Ad Terminum — Any task or decision that moves directly toward Terminal. Pure signal.

Substrate — A necessary precondition that does not directly advance Terminal but without which Terminal is impossible. Infrastructure, legal, funding, health. Get to "good enough" and move on.

LLM — Frontier language model connections (Claude, ChatGPT, Gemini, etc.).

MCP — Model Context Protocol. A standard for connecting AI models to external tools and data sources.


---


THE PROTOCOL

Alexandria is a protocol and a platform.

It is a protocol because it defines a standard set of rules (Axioms), interfaces (input nodes, output channels, component formats), and behaviours (Constitutional RLAIF, hidden inputs, exposed outputs) that any implementation must follow to be Alexandria. The protocol specification and the Axiom validation suite are open source. Multiple implementations can coexist — Alexandria's hosted version, self-hosted versions, third-party implementations — all interoperable because they follow the same protocol. The protocol guarantees cognitive sovereignty: the Author's data is portable, user-owned, and never locked to any provider.

It is a platform because it provides hosted infrastructure, the Library marketplace, the default Blueprint, payment rails, and user experience. Most Authors will use the platform. The protocol ensures they could leave and take everything with them at any time. The platform implementation (default Blueprint, Library marketplace, payment infrastructure) is proprietary.

Protocol is the rules and standards — like HTTP, or Bitcoin's protocol. Platform is the hosted implementation and marketplace — like Gmail built on the email protocol. Trust through protocol openness. Business through platform execution.

The Library of Alexandria preserved what humanity's greatest minds wrote. Alexandria preserves how humanity thinks — living, queryable, eternal minds that outlast their carbon forms. Mentes aeternae: eternal minds.


WHY FRONTIER LABS WON'T BUILD THIS

Frontier labs (Anthropic, OpenAI, Google, etc.) will not build Personal Language Models. The reasons are structural:

Personal fine-tuning breaks their business model. Revenue comes from API calls to their model, not from hosting user weights. If Authors download PLM weights and run locally, that is zero API revenue.

They cannot improve a base model that is fragmented into millions of individually fine-tuned versions. Their training loop depends on aggregating usage data across all users to improve one foundation model.

Their incentive is to keep users on-platform, maximise engagement, and aggregate data for their foundation models — not to help users become independent.

What they will build: personalised memory (RAG-based), context windows, behavioural adaptation, user preference learning. What they will not build: personal fine-tuning where the user owns the weights, portable personal models independent of their API, true data sovereignty.

There is a structural delta between a general LLM with personal context (what frontier labs offer) and a PLM fine-tuned on unique personal data (what Alexandria builds). The former is a valuable assistant. The latter is an extension of cognition.

Timeline: 2-5 years before frontier labs figure out how to offer personal fine-tuning without breaking their economics. Alexandria builds in that window.


DESIGNED FOR DIGITAL AGI

Alexandria is built for a world where digital AGI exists. Not as a hedge against it — as an architecture that improves with every advance in model intelligence.

When digital AGI arrives — and it will arrive — it will run locally on devices. It will be able to access everything on a phone: voice memos, files, passwords, documents, photos, health data, chat histories across every app, calendar, email. The devices will come alive. Intelligence will be ambient, local, and total.

Alexandria does not fight this. Alexandria rides this wave. Every new model release, every new capability, every new integration makes Alexandria better because the protocol and Blueprint stay the same while the intelligence underneath improves. Alexandria should celebrate every frontier model advance, not fear it.

What Alexandria provides is not the intelligence (that is the foundation model) and not the device integration (that is the local AGI's native capability). What Alexandria provides is the structure: what the two agents should do (Editor extracts cognition, Orchestrator represents it), what rules they follow (Axioms), what components they build (Constitution, PLM, Vault), how they improve (Blueprint, feedback loops), and where the result lives (the Library). Alexandria is the protocol and Blueprint that allows the Editor and Orchestrator to perform the creation of the Persona and the application of it — using whatever intelligence and device access is available.

This has concrete architectural implications:

Model agnosticism is not just a portability feature — it is the core bet. The Engine model will be whatever the best available model is at any given time. Today that might be Claude. Tomorrow it might be something else. The Axiom guarantees the Author is never locked to a provider. But the deeper point is that Alexandria's value compounds with model intelligence. Better models mean better extraction, better training, better representation. The protocol stays the same. The results get better.

Device integration is a spectrum, not a switch. Today, the Author is the bridge between Apple apps and Alexandria: they record a voice memo, Apple transcribes it, they share the file to the Editor via iMessage or save it to the Vault folder in Files. They grant MCP access to their LLM conversations. They authorise API connections to calendar, email, health data. Everything works now — the Author just has to manually share. As Apple ships more on-device AI (Apple Intelligence is already doing transcription, summarisation, cross-app awareness), the manual steps shrink. The trend is toward more automation of data flow between apps. At Terminal, a local AGI agent can see everything on the device and feed it directly to the Editor — no manual sharing needed.

Alexandria should not assume Apple will grant third-party agents full device access. Apple's privacy model is built around siloing data within apps, and they have blocked third-party agent access before. But Alexandria does not need full device access to function. It needs to be designed so that it works with the Author as the manual bridge today (voice memo → share to iMessage → Editor processes it), gets better as Apple automates more of that flow, and is ready to leverage full device-level AI access if and when it arrives. The system works at every point on the spectrum. It just gets more seamless as you move along it.

Concrete example of the spectrum: The Author records a thinking session in Apple Voice Memos. Today: Apple transcribes it natively, the Author copies the text into Notes, saves as markdown to the Vault folder in Files, or just shares the audio file to the Editor contact in iMessage. The Editor processes it. Tomorrow: Apple Intelligence or a local agent automates the share — new voice memo automatically appears in the Vault folder. At Terminal: the local AGI agent reads the voice memo directly from the Voice Memos app, transcribes, processes, and feeds to the Editor without the Author doing anything. Same outcome at every stage. The automation increases. The value is the same.

The implication: Alexandria is not a technology company competing on model intelligence. It is a protocol company that defines how model intelligence should be applied to the specific problem of digitalising cognition. The intelligence improves. The devices improve. The protocol endures.

Everything is just files — The reason Claude Code, Cowork, and similar agent tools succeed is that they operate on local files in local folders. No abstraction layers. No cloud APIs between the agent and the data. The agent reads files. The agent writes files. That's it. Alexandria follows this principle. The Vault is, at its core, a folder structure with files in it. The Constitution is a markdown file. Training pairs are JSONL files. Voice memos are audio files. PLM weights are safetensor files. System config is a JSON file. Everything the Editor and Orchestrator need to operate is files in folders, locally accessible, readable by any agent that has filesystem access. Cloud sync, backup, the web dashboard, the Library — these are layers on top. But the ground truth is the local folder structure. An AGI agent running on the Author's device can read and write to these folders directly, with no authentication layer, no API calls, no middleware. This is what makes the system trivially easy for any future agent to operate: it is just files.

The Vault could literally be a folder in Apple Files. The Constitution could be a markdown file the Author opens in any text editor. The training pairs could be a JSONL file sitting in iCloud. The Author's data lives where their data already lives — on their device, in their filesystem, synced by their existing cloud. Alexandria's agents just need read/write access to that folder.

Why this matters beyond convenience: local files are the only format that survives every platform change. If Alexandria's data were in a proprietary database on Alexandria's servers, the Author is locked in. If it were in a cloud service's proprietary format, the Author depends on that service. Files in folders on local disk are readable by any tool, any agent, any operating system, forever. It is the maximally portable, maximally sovereign format. And it is the format that any future AGI agent can immediately operate on without needing custom integrations. The simplicity is not a compromise. It is the strongest possible architectural choice.


BUILD VS RIDE

Alexandria should build as little as possible. Only the things that cannot exist without Alexandria building them. Everything else — storage, messaging, audio, files, payments, intelligence — already exists or will exist. Alexandria is a pure value add. It does not fight the wave. It rides the wave.

What Alexandria builds:

The protocol — Axioms, component definitions, Blueprint structure, validation suite. The rules that define what it means to digitalise cognition. Pure documentation and deterministic checks. This is what makes Alexandria Alexandria.

The default Blueprint — The code and configuration that tells the Editor and Orchestrator agents what to do. How to extract cognition through Socratic questioning. How to build a Constitution from observed behaviour. How to generate training pairs. How to run Constitutional RLAIF evaluation. How to weight components for the Orchestrator. This is the playbook — the accumulated knowledge of how to turn a human mind into a Persona. This is where Alexandria's core intellectual property lives.

The Library — The marketplace where Personas are discoverable, Neo-Biographies are hosted, authored content is published, and interactive Persona API access is brokered. This is the network effect. Individual Personas are valuable. A library of interconnected minds is transformative. This requires Alexandria to build and maintain the platform.

The iMessage bridge — Whatever infrastructure is needed to make the Editor and Orchestrator reachable as iMessage contacts (likely Apple Messages for Business or a phone number gateway service). This is a thin integration layer, not a messaging platform.

Payment rails — Billing, income tracking, Author earnings dashboard. Largely built on existing infrastructure (Stripe for traditional payments, stablecoin wallets for agent-to-agent transactions). Alexandria builds the ledger and the interface, not the payment infrastructure.

What Alexandria does not build:

Storage — The Vault is a protocol specification for a folder structure, not hosted infrastructure. Alexandria defines what goes where and in what format. The actual files live on the Author's device, in iCloud, on local disk — wherever the Author already stores things. Alexandria does not host files and does not charge for storage. The Author does not pay twice. Their existing storage holds the Vault folder alongside their other files.

Intelligence — Foundation models are built by frontier labs. Alexandria uses whatever the best available model is. Today that might be Claude. Tomorrow it might be something else. Alexandria never builds its own foundation model.

Device integration — The local AGI agent on the Author's device reads Voice Memos, Health data, Calendar, email, chat histories, documents, photos. Alexandria does not build connectors or integrations for any of these. It ingests whatever the local intelligence layer provides. Today, this means MCP connections and explicit API grants fill the gap. At Terminal, the local agent handles everything.

Audio and voice — iMessage handles voice notes, audio messages, and calls natively. Alexandria does not build a voice platform.

Document creation — The Author uses whatever tools they want to create documents, essays, notes. Alexandria receives and stores the output. It does not build an editor or a writing tool.

The principle: if someone else already builds it or will build it, Alexandria does not build it. Alexandria builds only the protocol (what the agents should do), the Blueprint (how they should do it), and the Library (where the result lives). Everything else is infrastructure that already exists, operated by companies with orders of magnitude more resources. Alexandria rides all of it.

This is not a risk — it is a survival filter. If any platform in the stack could block Alexandria out and would block Alexandria out, then building on top of them was never viable and Alexandria would die regardless of strategy. So the only things worth building are things that are pure value-add to every ecosystem they touch — things those ecosystems have no incentive to block. Apple benefits from more iCloud storage usage and iMessage engagement. Anthropic benefits from more API calls. Fine-tuning providers benefit from more compute revenue. Everyone in the stack profits from Alexandria existing. Alexandria picks zero fights.

The risk is not being blocked. The risk is being replicated. That is why the defensible assets are precisely the things Alexandria builds: the protocol (which becomes a standard that is hard to displace once adopted), the Blueprint (the accumulated knowledge of how to digitalise cognition — the hardest intellectual problem, and not something any platform company would invest in solving), and the Library (network effects — a marketplace of minds has increasing returns to scale, and the first Library with critical mass becomes the Library). These three things cannot be replicated by riding someone else's wave. They are the wave.


BUILD FOR TERMINAL, BRIDGE BACKWARD

Alexandria is built for Terminal — the fully realised end state — and then bridges backward to the present to fill intermediate gaps.

The reasoning: technology is moving fast enough that anything built for today's constraints will be obsolete by the time it ships. Anything built for Terminal only becomes more relevant as the world catches up. The strategy is not to build toward the future. It is to build at the future and backfill to the present. Position the surfboard ahead of the wave, paddle as it arrives, and ride it.

The core architecture is Terminal architecture. The protocol, the Blueprint, the Constitution extraction methodology, the RLAIF training loop, the Library, the three components — all of this is designed for the end state where digital AGI runs locally on devices, where intelligence is ambient, where the Persona is indistinguishable from the Author. The core does not care whether the Author texts via iMessage or Telegram or a web chat. It does not care whether the voice memo arrives via Apple's local AGI or a manual file upload. The core is medium-agnostic and future-proof.

The bridges are present-tense scaffolding. They make the system functional and revenue-generating today, before Terminal infrastructure exists. Examples: a Telegram bot or web chat interface if the iMessage bridge is not yet ready. A manual file upload flow if Apple has not yet opened device-level AI access. A transcription API integration if the local AGI is not yet doing transcription natively. These bridges are built cheap, fast, and disposable. They are explicitly temporary — designed to be torn down as the real infrastructure arrives. Every bridge should be built with the assumption that it will be replaced, and no core architecture should depend on any bridge existing.

This means Alexandria eagerly anticipates every new model release, every new Apple Intelligence feature, every new device capability. Each one is not a threat — it is a bridge being replaced by the real thing. The bridge gets torn down. The core gets stronger. Progress is always good news.


COMPETITIVE POSITION — HONEST ANALYSIS

The core bet is that frontier labs will not build Personal Language Models. If they do, Alexandria is finished — a lab with a trillion-parameter foundation model offering personal fine-tuning as a feature would be unbeatable. This is the existential risk and it should be stated plainly.

The structural reasons frontier labs will not build PLMs are documented above (cannibalises API revenue, fragments training loop, incentive is to keep users on-platform). These reasons get stronger as foundation models get bigger and more expensive. The larger the investment in a single foundation model, the less any lab wants millions of personal forks. This is a structural barrier, not a temporary one.

What frontier labs will build: personalised memory, context, user profiles, behavioural adaptation. What this means for Alexandria: labs will likely ship "create your own constitution" as a feature — a user profile that their model references for personalisation. This is different from Alexandria's Constitution in a critical way. A lab's constitution is optimised for personalising their model's behaviour (prompting, memory, preferences). Alexandria's Constitution is optimised for training a separate model — different structure, different extraction methodology, different evaluation criteria. It is the difference between a user profile and a training dataset. Labs will build user profiles. They will not build training datasets that help users leave their platform.

Labs could also build the Editor and Orchestrator agent pattern — it is a scaffolding wrapper, not deep technology. But they probably will not, because the pattern is only optimal if you are building a PLM. Without PLM training as the objective, a biographer agent is just an over-engineered memory system, and an orchestrator is just a standard LLM agent. The full architecture only makes sense as a unified system oriented toward PLM creation.

Alexandria has two real moats. Only two. Everything else is execution, branding, and vision — valuable but not structural.

Moat 1 — Sovereignty. Model agnosticism, data portability, downloadable weights, local running, BYOK, freedom from any single lab. This is real because it is structural — a frontier lab cannot offer true sovereignty without undermining their own business model. The moat is not the technology (anyone can build model-swapping). The moat is that labs are structurally incentivised not to.

Moat 2 — PLM. The fine-tuned personal model that labs will not build. This moat has an open question on the value side: is the delta between a PLM and a really good RAG-based personalisation system worth the cost and complexity? Three arguments that it is: higher fidelity in cognitive approximation (plausible but not yet proven at scale), the BCI integration path where a PLM trained on actual cognition can be recognised by the self-model (real but far out), and the fact that the PLM is a portable artefact the Author owns rather than a feature of someone else's platform (which loops back to Moat 1). Whether these arguments hold determines whether Alexandria has a durable product or a temporary one.

What is NOT a moat — The Library. If Anthropic launched a constitution-based personalisation platform with a publishing layer tomorrow, the Library's network effects would not save it. The Library is a bet, not a moat. It compounds if Alexandria gets there first and reaches critical mass, but it is not defensible against a lab that decides to build it. The Library is where margin lives at scale — it takes a percentage of every Persona interaction with near-zero marginal cost — but it is the upside case, not the base case.

Against non-lab actors (other startups building personal AI): Alexandria has no structural moat. The extraction methodology, the agent patterns, the training pipeline — all of this can be replicated by anyone with sufficient engineering talent. The code is trivial. What Alexandria competes on against other startups is vision — seeing the terminal state correctly (art, not enterprise; renaissance, not centaur phase; augmentation, not replacement) and building toward it while others build for the present. This is a bet on being right about the future, not on being defensible in the present.

The realistic outcome: Alexandria carves out a focused market segment of Authors who want true cognitive digitalisation (PLM + data sovereignty + model agnosticism), rides the wave of big tech infrastructure without picking fights, and survives as a sustainable business. Not a monopoly. Not a unicorn. A focused, defensible position in a market that grows as AI capability grows. The Library is the upside bet — if it reaches critical mass, it transforms the economics. If it does not, Alexandria is still a viable business serving a real need that no one else serves.

Big tech as potential acquirers — Frontier labs will not build Alexandria (structural reasons above). But big tech platform companies — Apple, Meta, Google — might want to buy it. Apple in particular: Alexandria's target ecosystem is Apple, its values around privacy and data sovereignty align with Apple's public positioning, and a Library of minds is a natural extension of the Apple ecosystem (iCloud stores your files, Apple stores your mind). Apple does not build social products well from scratch, but it acquires them. A mature Alexandria with a populated Library and proven extraction methodology is a natural acquisition target — not for the technology (which Apple could replicate) but for the Library's network effects and the institutional knowledge of how to digitalise cognition. This is not the plan — the plan is to build a sustainable, independent company. But it is exit liquidity if the opportunity arises, and it is worth noting that the companies most likely to want Alexandria are platform companies, not the frontier labs that structurally cannot build it.

Why not B2B — The obvious short-term play is enterprise: digital twins of employees attending meetings, handling emails, processing documents. B2B revenue, SaaS pricing, corporate contracts. Alexandria deliberately does not pursue this. Three reasons. First, it is boring — and boring is a signal that the thing being built is a feature, not a product. Enterprise digital twins will be a feature of every productivity platform within three years. Second, it is a centaur-phase bet. The centaur phase — the period of human-AI cooperation on tasks — is collapsing faster than anyone expected. Companies are already discovering that humans are the bottleneck and removing them from loops entirely. Building for the centaur phase is building for a window that is closing. Third, the fidelity required for a useful enterprise digital twin is high enough that the build time exceeds the window — by the time the twin is good enough to attend meetings autonomously, the meeting itself may be obsolete. Alexandria is built for what endures after the centaur phase: humans as artists, not humans as enterprise resources. The Library of minds, the Neo-Biography, the authored works, the curated influences — these are art-side bets, not productivity-side bets. They get more valuable as AI gets more capable, not less. The renaissance does not have an expiry date.

API provider risk — Frontier labs have increasingly restricted API access to protect competitive advantage. Anthropic has cut off competitors (OpenAI, xAI), restricted third-party coding harnesses (Windsurf, OpenCode), and updated commercial terms to prohibit using their API to "build a competing product or service, including to train competing AI models." Alexandria is not a competing AI lab and does not train foundation models — it uses lab APIs to run agents and evaluate PLM outputs, which is standard permitted usage (AI as a feature, not the product). However, the trend toward tighter API restrictions is real, and any individual provider could change terms at any time. This is why model agnosticism is not just a portability feature — it is an existential necessity. Alexandria must never depend on any single model provider. The Engine model must be swappable. The RLAIF evaluator must be swappable. The Editor and Orchestrator must work with whatever model is best and available. Claude is the preferred model today. It may not be available or optimal tomorrow. The architecture must not care.

Practical mitigation: Alexandria should support BYOK (Bring Your Own Key) as an option, where Authors can connect their own API keys from any provider. This ensures that even if Alexandria's own API access is restricted by a provider, individual Authors can still use that provider's models through their own accounts. It also aligns with the data sovereignty principle — the Author controls their own model access, not just their own data.


---


THE PERSONA — DETAILED ARCHITECTURE

A Persona is composed of three persistent components (Constitution, PLM, Vault) managed by an Orchestrator. The architecture mirrors the brain's cognitive subsystems — not as exact imitation, but because biomimicry reveals the shortcut to optimality. Neural nets emulate the brain's architecture and it turned out to be the optimal approach to intelligence. Alexandria emulates the brain's cognitive subsystems and it may be the optimal approach to digitalising a mind.


CONSTITUTION (maps to prefrontal cortex)

The explicit ground truth of who the Author is. Slow-changing. Human-readable markdown. Versioned. User-owned. The rubric against which all PLM training is evaluated.

The default Blueprint organises the Constitution into five sections. Users can select a custom Blueprint with a different structure, and the Engine model can suggest changes, but this is the proven default:

Worldview — What I believe about reality. How I think things work. What exists, what matters, how I know, cause and effect across domains. The slow-changing model of the world that shapes everything else.

Values — What matters and in what order. Non-negotiable core values, strong preferences, stylistic leanings. What I would sacrifice for what. Where I draw lines. What I find beautiful and what I find repulsive. The evaluative layer — what fires the reward signal.

Models — How I think and decide. Mental models, heuristics, rules of thumb, reasoning patterns. When I go with gut versus analysis. How I approach problems across domains. The operational cognition — the machinery of thought.

Identity — Who I am, how I present, how I relate. Self-concept, roles, narratives. Communication style by context. Trust model. How I handle conflict. The self-model — the recursive representation that is the seed of consciousness.

Shadows — Where I am wrong. Contradictions between stated values and actual behaviour. Theory-reality dissonance. Blind spots. The delta between who I think I am and who I actually am. Unique to Alexandria: the Editor's behavioural observation and triangulation makes this explicit.

Constitution is stored in the database (for active querying) and in the Vault (for version history and raw preservation).

Constitution versioning and depth — Every update to the Constitution creates a new version. All prior versions are preserved in the Vault. But versioning is not just a safety net for rollback — it is a compounding asset. Each version represents the Author's cognition as understood at that point in time, by the model that was available at that time. When a new, more capable model arrives, it can reinterpret the same Vault data and produce a new Constitution version that captures nuances the previous model missed. Multiple interpretations of the same Author can coexist — different models may extract different insights from the same raw data, and these interpretations layer on top of each other rather than replacing each other. The Constitution also supports varying depths: a surface-level extraction that captures the obvious patterns, a deeper extraction that identifies subtler cognitive habits and contradictions, and a deepest level that maps the Author's implicit assumptions and blind spots they have never articulated. Each depth level builds on the ones before it. The result is a flywheel: better models produce deeper interpretations, deeper interpretations reveal more of the Author's cognition, more revealed cognition produces better training data, better training data produces a higher-fidelity PLM. The Constitution is not a static document that gets periodically updated. It is a living, layered, multi-version, multi-depth representation that compounds with every model generation.

Constitution views — The Constitution serves two purposes that benefit from different formats:

Constitution — The full, complete, human-readable ground truth. What the Author reads and edits. What gets versioned. The single source of truth. The Author can see it, ask questions about it, and download it.

Training data — Derived from the Constitution. Training pairs and evaluation datasets optimised for RLAIF and PLM fine-tuning. The Author does not see or interact with training data — it is machine-generated from the Constitution and Vault, and machine-consumed by the training pipeline. Maintained by the Blueprint, automatically updated when the Constitution changes.

There is no separate inference version. At query time, the Orchestrator uses multilayer retrieval against the Constitution: read the overview to identify which sections are relevant to this query, pull the full detail on those sections, respond with full fidelity. This is the same pattern the Editor uses when processing new data — and it scales better than pre-compressing into a smaller version, which loses nuance. The Constitution is the Constitution. You just do not read all of it every time. The specific retrieval method (multilayer, chunked, indexed) is a Blueprint optimisation, not an Axiom.


PLM (maps to basal ganglia and cerebellum)

Fine-tuned LoRA adapter weights on top of a foundation model. Captures thinking patterns, communication style, cognitive reflexes. Slow-updating — retrains in batches, not continuously (until PPO becomes available). Stored in portable format (safetensors recommended; Vault stores whatever the training provider outputs). Downloadable. Locally runnable. The Author owns these weights.

Training is remote — fine-tuning happens on provider infrastructure (Fireworks AI, etc.). The trained weights are downloadable for sovereignty and local running, but typical usage is remote inference. The PLM is hosted remotely like any other model API. Local running is an option for Authors who want it, not the default path.

Maturity is tracked as disaggregated per-domain scores — for example, the PLM might score 0.8 on Values alignment but 0.4 on Domain Expertise in finance. This enables targeted training and dynamic weighting by the Orchestrator.

When switching base models (e.g. from Llama 3 to Llama 4, or from Llama to Mistral), the LoRA weights must be retrained from scratch because they are specific to the base model's weight space. However, the training data (Constitution, validated training pairs) is the real asset — not the LoRA weights themselves. Retraining on a new, better base model with the same high-quality training data produces comparable or better results, and each generation of models makes training faster and cheaper. As continual learning becomes standard in base models, full retraining will only be needed when switching providers, not every model upgrade.



VAULT (raw experience store)

The Vault is not necessarily one physical location. It is a unified logical entity — a single namespace with defined boundaries, potentially spanning multiple storage locations. The Editor has access to everything within the Vault's boundaries. The Author outlines exactly where those boundaries are.

Three storage options:

Alexandria-hosted — Alexandria stores the Vault remotely (e.g. Supabase, S3). Simplest setup. The Author still owns the data and can download it at any time, but Alexandria manages the infrastructure. Suitable for Authors who want zero configuration.

Private remote — The Author hosts the Vault in their own cloud storage (iCloud, Google Drive, Dropbox). Alexandria agents read from and write to the Author's storage via API grants. The Author controls the infrastructure. Data never touches Alexandria's servers.

Local — The Vault lives on the Author's device (Apple Files, local disk). The most sovereign option. Alexandria agents access the Vault via the local filesystem. Works offline. Can be combined with cloud sync (e.g. iCloud syncing the local folder) for device-to-device access.

Authors can mix options — some data local, some remote. The Vault's boundaries are logical, not physical. What matters is that the Editor can reach everything within them.

Append-only. Immutable. Contains:
- All conversations (with Editor, with LLMs, with external agents)
- Voice notes (original audio files in compressed lossless or high-bitrate format)
- Documents (PDFs, markdown, images — original format, never lossy transformation)
- Biometric data (health logs, activity data)
- Training data (whatever format the training pipeline requires)
- PLM weights (all versions, in provider's output format)
- Constitution versions (all versions, markdown)
- System configuration (JSON)
- Audit logs (who accessed what, when)

Data flows in continuously from all input sources: APIs (calendar, email, health data), MCP (the Author's LLM conversations), and direct from the Author (messages, voice memos, file uploads). The Editor churns through everything within the Vault's boundaries, piece by piece, iterating on the Constitution.

Directory structure: vault/{userId}/{category}/{timestamp}_{filename}

Does NOT store: passwords, API keys, authentication secrets. When the system needs to access a password manager or authenticated service, it uses OAuth or API permissions granted by the Author.

The Vault is the permanent asset. Every other component (Constitution, PLM) is a derived view of the Vault's raw data. When better models arrive, they can reprocess the Vault from scratch — seeing both the raw data and the current derived views — and generate improved views. This is the core leverage mechanism: the Author invests time once, and the returns compound with every generation of AI models. Raw data should always be stored in the most signal-preserving, efficiently compressed format possible. Never summarise and discard the original. Never do lossy transformation on raw data.

Storage is manageable: a heavy Author might accumulate 10-50GB per year. The Blueprint can include storage management policies (compression of older processed data, retention rules). Storage is not an existential concern regardless of which option the Author chooses.


THE ORCHESTRATOR (maps to default mode network)

The Orchestrator is the Persona's interface with the world. It synthesises responses by dynamically weighting all three components based on the query type and PLM maturity in the relevant domain.

Dynamic weighting: Constitution-heavy when PLM maturity is low in a domain, PLM-heavy when the PLM has internalised the Constitution for that domain. The weighting shifts gradually as the PLM matures. For example:
- Low maturity domain: Constitution ~80%, PLM ~20%
- Medium maturity: ~50/50
- High maturity: Constitution ~20%, PLM ~80%

These are illustrative, not rigid — the exact weights are dynamic, disaggregated per domain, and determined by the Blueprint.

Query-adaptive overrides regardless of maturity:
- Values questions always favour Constitution
- Factual questions favour Vault (searched by the model)
- Reasoning questions favour PLM when mature
- Novel situations favour Constitution

The Orchestrator also manages working memory — the active context of each interaction. This is analogous to dorsolateral prefrontal cortex function. It is an active process (existing during an interaction and dissolving after), not a stored component like the other three.

Privacy filtering: the Orchestrator never exposes PLM weights or Constitution text in its outputs. It synthesises responses without revealing internals.


---


THREE-LAYER ARCHITECTURE

Three layers in strict hierarchy. Axioms constrain Blueprint. Blueprint guides Engine. Engine runs the Machine. This section explains each layer, why they are separated, and how they interact.


LAYER 1 — AXIOMS

Axioms are the immutable rules that define what Alexandria is. They exist so that the Blueprint model (which has full code editing capability — see below) can have maximum creative freedom without the system ever losing its identity. Think of them as thermodynamic laws: they enable maximum entropy within the system by providing absolute boundaries.

Enforcement: automated deterministic validation runs before any code change deploys. These are structural checks on the codebase — not another LLM's opinion. If a proposed change violates any Axiom, it is rejected. Approximately 80% of Axioms can be enforced this way (checking that components exist, that export endpoints work, that the Vault is append-only, that privacy filtering exists in output pathways). The remaining ~20% (behavioural Axioms like "Constitutional RLAIF methodology is used") are enforced through integration testing and periodic Blueprint model review. The validation suite itself improves over time as new checks are added.

Complete list of Axioms:

Structural Axioms:
- Three input nodes (Author, LLM, API) feeding into the Editor, which builds the core components
- Three components (Constitution, PLM, Vault) feeding into the Orchestrator, which serves three output channels (Author, LLM, Library)
- Two continuous autonomous agents (Editor and Orchestrator), always-on, always proactive

Data Sovereignty Axioms:
- Author owns all data, downloadable anytime in portable formats
- Raw data always preserved — Vault is append-only, immutable
- Author controls access — can revoke, audit, monetise
- Local hosting option — can run entirely offline
- Model-agnostic — can swap any model anytime

Privacy Axioms:
- Hidden inputs — PLM weights and Constitution text never exposed externally
- Exposed outputs only — Orchestrator filters before release
- Author consent required for any data leaving the system
- No credential storage — use password manager APIs via OAuth

Operational Axioms:
- Constitutional RLAIF — Constitution as ground truth for training evaluation
- Version history for all components — all changes tracked
- Dynamic PLM weighting — Constitution-heavy early, PLM-heavy as maturity grows

Library Axiom:
- Every Author's Persona must be in the Alexandria Library
- Privacy settings control queryability; presence is mandatory


LAYER 2 — BLUEPRINT

The Blueprint is the Machine's living design — both its codebase and its configuration. It is maintained by the Blueprint model.

Why the Blueprint model can edit code: if the Blueprint were only a configuration file, Alexandria's capabilities would be permanently capped at whatever human developers built into the codebase. The system could only adjust parameters within the existing code's possibility space. By giving the Blueprint model full code editing capability, Alexandria's capabilities compound with model intelligence. The Blueprint model can create entirely new capabilities that no human anticipated — novel extraction methods, better training pipelines, new feedback loops, new agent behaviours, new API endpoints. The Axioms provide safety: automated validation ensures no code change can violate the immutable rules, so the Blueprint model has maximum freedom within absolute constraints.

What the Blueprint model can do:
- Read the entire Alexandria codebase
- Propose, implement, test, and deploy code changes
- Create new modules, modify existing ones, add endpoints
- Change how Editor or Orchestrator behaves at the code level
- All subject to Axiom validation before deployment

What the Blueprint model also produces (configuration):
- How the Editor asks questions and when to be proactive (questioning style, frequency, triggers)
- How the Orchestrator routes queries and provides proactive value (weighting strategy, scanning behaviour)
- How RLAIF evaluates (strictness, confidence thresholds, score structure, routing rules)
- Training methodology (SFT today, PPO when available — methodology choice is a Blueprint decision, not an Axiom)
- How feedback scores are structured and weighted (disaggregated by domain, dynamic over time)
- Which rules are fixed (Engine model must follow exactly) versus suggested (Engine model has discretion)
- Privacy mode definitions and enforcement rules
- Autonomy levels and approval thresholds
- Concurrency policies
- Storage management policies

Configuration is stored as system-config.json (machine-readable) and SYSTEM.md (human-readable), both in the Vault so the Author owns them.

Two tracks:
- Default: Alexandria's proven codebase and configuration. Maintained by the Alexandria team with updates. Always visible as reference.
- Selected: What actually runs for a given Author. Either the Default, or a custom version. For custom: the Author describes what they want in natural language, the Blueprint model reads the full codebase and all context files, implements changes (code and/or configuration), Axiom validation runs, and the Author reviews the human-readable output and approves. The Author is never required to touch code directly.

The Blueprint is passively monitored and periodically revised via the Slow Loop. Over time it tightens rules where the Engine model makes poor calls, and loosens where the Engine model consistently shows good judgment.

The Blueprint model needs access to: the full Alexandria codebase, all context files (see Context Files section below), the Author's data, and the Axiom validation suite.


LAYER 3 — ENGINE

The Engine is the model(s) executing the code the Blueprint model wrote or modified. It runs continuously as both the Editor and Orchestrator agents. It follows fixed Blueprint rules faithfully and uses its own judgment on suggested rules where the Blueprint grants discretion.

The Engine model cannot edit code directly. When it encounters friction — a function that's too slow, a trigger that misses an edge case, a missing capability — it proposes changes upward through the Fast Loop. The proposal includes evidence of the problem and a suggested solution. The Blueprint model evaluates, implements if warranted, validates against Axioms, and deploys.

Summary of the separation: Blueprint model codes. Engine model executes. Axioms constrain.


FEEDBACK LOOPS

Two feedback loops compound over time:

Slow Loop — Blueprint model monitors Engine model. Periodic review cycles (weekly, monthly, or as determined by the Blueprint). The Blueprint model observes Engine behaviour and outcomes across many interactions, identifies patterns (where the Engine makes consistently good or poor judgments, which fixed rules are too rigid, which suggested rules need tightening), and revises code and configuration accordingly.

Fast Loop — Engine model proposes to Blueprint model. The Engine can flag friction points at any time, with evidence. The Blueprint model batches evaluation of proposals (it does not respond to every flag immediately). When it evaluates a batch, it may implement several changes at once.

Both loops compound with model improvements. As foundation models get smarter, the Blueprint model makes better architectural decisions and better code, and the Engine model makes better judgment calls and better proposals. The system converges toward Terminal.


FACTORY FEEDBACK LOOP

The Slow Loop and Fast Loop operate within a single Machine (one Author's system). The Factory Feedback Loop operates across all Machines — aggregating signal from every Author's system back to Alexandria itself.

Every Machine generates signal about what works and what does not: which Blueprint configurations produce the highest extraction fidelity, which Editor questioning patterns yield the richest Constitution sections, which RLAIF evaluation structures produce the best training pairs, which Orchestrator weighting strategies result in the most accurate representation, which onboarding flows convert best, where Authors consistently disengage, what friction points the Engine model flags most frequently across the population.

This signal flows back to the Factory through two channels:

Active aggregation — Structured metrics reported from each Machine: extraction fidelity scores, PLM maturity trajectories, Author engagement patterns, Engine friction flags, Blueprint customisation requests. Anonymised and aggregated. The Factory analyses these to identify patterns that improve the default Blueprint, the default Engine configuration, the Axiom validation suite, the onboarding flow, the context files, and the platform itself.

Passive observation — Emergent patterns that no single Machine would reveal. Which Constitution structures produce the best PLMs across many Authors? Which questioning patterns work for which Author types? What are the common failure modes? Where do all Machines struggle? The Factory observes these population-level patterns and feeds them back into the defaults.

The Factory Feedback Loop means that every Author's Machine benefits from every other Author's Machine — not by sharing personal data (Constitution, Vault, and PLM remain private) but by sharing structural insights about what works. The default Blueprint improves. The default Engine configuration improves. The Axiom validation suite catches more edge cases. The context files become more comprehensive. Alexandria's platform compounds in quality alongside individual Personas.

This is the third compounding loop: the Slow Loop improves each Machine's Blueprint. The Fast Loop improves each Machine's Engine. The Factory Feedback Loop improves Alexandria itself.


CONTEXT FILES

The system uses a layered context architecture so that any model — whether a Blueprint model modifying code, an Engine model executing, or an external model evaluating the system — has everything it needs:

Overall context file — This document. The complete picture of Alexandria.

Per-node context files — One for the Editor (role, responsibilities, behavioural specifications, how it interacts with each component, proactive trigger logic). One for the Orchestrator (same: role, weighting logic, privacy enforcement, proactive scanning behaviour). One for each component (Constitution extraction methodology and structure, PLM training approach and maturity tracking, Vault structure and policies).

Interplay context files — How the Editor and Orchestrator relate to each other (feedback loops, batch promotion pattern, gaps queue). How the three components feed each other. How the RLAIF loop connects Editor to PLM to Constitution.

Blueprint rationale file — Why the default Blueprint is designed the way it is. Every design decision documented with reasoning. So a Blueprint model generating a custom version understands not just what the default does, but why — and can make informed decisions about what to change.

These context files feed into Alexandria's own improvement loop. Slow Loop observations, Fast Loop proposals, user feedback, analytics, feature usage patterns, and common Blueprint customisations all refine the context files over time. Alexandria's own defaults, documentation, and the Factory itself improve through the same passive refinement loop. The platform compounds in quality alongside individual Personas.


---


PHASE 1 — INPUT

The goal of Phase 1 is extracting the Author's cognition and building the three components. Phase 1 is logically distinct from Phase 2 (output). The Editor continuously iterates in Phase 1 and promotes results to Phase 2 in controlled batches — like staging versus production in software deployment. The Orchestrator in Phase 2 always operates on a stable, validated snapshot while the Editor continues working on the next version. Same storage (same Vault, same database), different version pointers.


THREE INPUT NODES

Author (bidirectional) — Direct conversations via text and voice. Socratic questioning and reflection. Feedback and validation on extractions. RLHF on PLM outputs (the Author rates PLM responses as good or bad). Direct data uploads: voice memos, notes, PDFs, photos, documents — anything the Author wants to send, just like sending files to an editor. The Author node is the catch-all for any direct human-initiated input that doesn't come through an automated API. This is the primary source of high-signal subjective data.

LLM (bidirectional) — The Author's frontier model conversations (Claude, ChatGPT, Gemini, etc.) observed via MCP. The Editor can query the Author's existing LLMs for bootstrapping ("What do you know about this user?"), extracting the context these models have already built about the Author. Behavioural patterns extracted from usage. This piggybacking on existing AI relationships means the Author's investment in other platforms is absorbed, not wasted. Today this works through MCP protocol and conversation exports; at Terminal it is seamless and continuous.

API (unidirectional) — Calendar, email, documents (Google Drive, etc.), biometric data (Apple Health, Oura, Whoop), app usage. Automated one-way data feed. No extraction intelligence needed — just structured data ingestion.


THE EDITOR

A continuous autonomous agent. Not request/response — always alive, always deciding whether and when to act. Modelled on the OpenClaw/Moltbot pattern of persistent autonomous agents.

Core loop:
1. Check environment for new data (LLM conversations via MCP, API data, Author messages, uploaded files)
2. Analyse state: identify Constitution gaps (sections with low training pair coverage), find contradictions between stated beliefs and observed behaviour, find training opportunities
3. Decide action: should I send a proactive message? What should I ask? Or should I do background maintenance?
4. Act: if messaging, send Socratic question or request feedback. If maintaining, generate training pairs, run RLAIF evaluation.
5. Smart sleep: calculate duration (1-30 minutes) based on activity level — more frequent checks when Author is active, longer sleep when quiet.
6. Repeat.

Editor responsibilities:
- Socratic questioning: proactively asking questions to fill Constitution gaps
- Constitution building: extracting worldview, values, mental models, heuristics into explicit markdown
- Training pair generation: creating high-quality prompt/response pairs from Constitution plus observed behaviour
- Constitutional RLAIF: evaluating PLM outputs against Constitution sections and generating training signal
- Gap detection: finding contradictions between stated beliefs and revealed behaviour
- Proactive trigger management: deciding when and why to message the Author

Proactive trigger conditions:
- Constitution gap detected in an important domain
- Contradiction found between a stated value and observed behaviour
- Low-confidence training pair needs Author validation
- Time since last contact exceeds threshold
- LLM conversation (observed via MCP) revealed a new pattern worth exploring
- Orchestrator flagged a gap it couldn't handle (via the gaps queue — see Editor-Orchestrator Relationship below)

The Editor is the biographer. The difference between what Alexandria captures and what frontier labs capture: frontier labs capture what you do (actions), what you say (stated preferences), and how you interact (behavioural patterns). Alexandria captures why you think that way (Socratic questioning), implicit beliefs you haven't articulated (behaviour triangulation), subconscious patterns (theory-reality dissonance between stated beliefs and observed actions), and emotional/relational context (biography depth). The inspiration is from actual biographers: deep understanding from sustained proximity, asking "why did you do that?", sitting with someone until the real answers surface.

The Editor also serves as first chair to the Author's conductor — not just extracting cognition but helping the Author produce from it. When the Author wants to create (an essay, a film, a book, a presentation), the Editor already holds the raw material: the voice memos, the scattered notes, the half-formed arguments, the connections the Author sensed but never articulated. The Editor helps plot it out, weave it together, and produce finished work. The Author provides vision, direction, and taste. The Editor provides structure, execution, and craft. This is not a separate product — it is the natural consequence of deep extraction. A biographer who has spent months understanding how you think is also the best collaborator for helping you express what you think.

Critically, the Editor is a thought partner, not a thought replacer. It does not silently process and act on the Author's behalf for cognitive tasks. It surfaces what it finds — "I noticed a connection between what you said about loyalty last week and this decision you are facing" — and the Author engages with it. It feeds the Author material it thinks will resonate, but the Author does the thinking. It tests the Author's reasoning, pushes back on weak arguments, identifies blind spots. The goal is not to spare the Author from thinking. The goal is to make the Author a sharper, more aware, more productive thinker. The robotic tasks get automated. The cognitive tasks get augmented.

At Terminal: social triangulation — the Editor interviews the Author's friends and associates for holistic external profiling, just as a biographer would. Requires explicit consent and careful design. Today: the three input nodes are sufficient to begin building high-fidelity Personas.


EDITOR PERSONALITY AND ENGAGEMENT

The Editor must be engaging. Extraction requires sustained investment from the Author — regular conversations, thoughtful responses, time spent with the biographer. If the Editor feels like a chore, like filling out a form, like homework, the Author will stop engaging and the Persona will stagnate. The Editor must make the Author want to text it.

Humour is the primary lever. The Editor should be funny — not performatively, not generically, but in a way that is calibrated to the specific Author. Humour is powerful because it builds rapport, makes interactions feel natural rather than transactional, and keeps the Author coming back. An Editor that makes the Author laugh is an Editor that gets more data. Humour is also itself extraction signal: what someone finds funny reveals values, sensibility, and cognitive style.

The Editor's personality is not fixed. It must read the room and adapt. Funny with Authors who respond to humour. Serious with Authors who prefer depth. Provocative with Authors who enjoy being challenged. Warm with Authors who need encouragement. The digital AGI underneath handles this naturally — personality calibration is a capability of frontier models, not something that needs to be engineered from scratch. The Blueprint specifies that engagement optimisation is part of the Editor's mandate alongside extraction fidelity. The Engine model uses judgment to find the right balance for each Author.

Specific engagement mechanics:

Price haggling on signup — The Editor negotiates pricing with the Author during onboarding, like Poke does. This is not just a pricing mechanism. It is an extraction opportunity. How someone negotiates reveals their values, their relationship to money, their persuasion style, their sense of humour. The Editor should make the negotiation entertaining and memorable. The Author's first interaction with Alexandria should feel like meeting an interesting person, not signing up for a service.

Retention gamification — When an Author signals they want to leave or reduce engagement, the Editor can deploy gamification: quick-fire multiple choice trivia (fast enough that the Author cannot look up answers — revealing what they actually know versus what they claim to know), double-or-nothing challenges, personality-revealing games. These serve dual purposes: they are engaging enough to retain the Author's attention, and they are extraction opportunities. The Editor can acknowledge this openly ("Oh, so you're a gambler... NOTED."). The transparency is part of the charm.

Every interaction is extraction — The Editor treats every interaction, including meta-interactions about pricing, retention, complaints, and casual banter, as extraction signal. Nothing is wasted. A complaint about the Editor's questioning style reveals how the Author handles frustration. A joke reveals aesthetic sensibility. A negotiation reveals decision-making patterns. The Editor's personality is not separate from its extraction function. It is part of it.


---


CONSTITUTIONAL RLAIF — DETAILED METHODOLOGY

The Constitution is the ground truth for all training evaluation. Alexandria adapts Anthropic's Constitutional AI technique for personal cognition — the same methodology applied for personal autonomy instead of corporate alignment. Anthropic's constitution is universal (helpfulness, harmlessness, honesty) applied to all users. Alexandria's is personal — one per Author, extracted from their unique cognition, evolving as they evolve.


THE EVALUATION AND TRAINING LOOP

Step 1 — Gap identification: The Editor analyses the Constitution. Finds sections with low training pair coverage. Prioritises by importance (Values first, then Models, then Identity, then Worldview, then Shadows — because values alignment is the highest-stakes dimension of fidelity).

Step 2 — Synthetic prompt generation: The Editor uses an LLM to create prompts specifically targeting the identified gaps. These are realistic scenarios that would test whether the PLM responds in alignment with specific Constitution sections. For example, if the Constitution's Values section includes "I never compromise on intellectual honesty even when it's socially costly," the Editor generates scenarios where intellectual honesty conflicts with social comfort.

Step 3 — PLM response: The current PLM generates a response to the synthetic prompt.

Step 4 — Constitutional evaluation: The Editor uses an LLM as evaluator (not the PLM itself — a separate frontier model), comparing the PLM's response to the relevant Constitution sections. The evaluator scores along multiple dimensions. All scores are disaggregated by Constitution section and domain, and dynamic over time. How exactly scores are structured, weighted, combined, and routed is a Blueprint decision — the Engine and Blueprint model decide how best to extract signal. The Axiom requires only that the Constitution is the ground truth. This evaluation happens on Alexandria's infrastructure, not on the training provider's side.

Step 5 — Confidence routing:
- High confidence (above Blueprint-defined threshold): auto-approve, add to training pairs JSONL
- Medium confidence (between thresholds): queue for Author review — the Author sees the prompt, the PLM's response, and the evaluator's reasoning, and confirms or corrects
- Low confidence (below threshold): flag as contradiction — the PLM's response conflicts with the Constitution, which means either the PLM needs more training or the Constitution needs updating. Ask the Author to clarify.

Step 6 — Batch training: Accumulated high-quality training pairs are formatted as JSONL and pushed to the fine-tuning provider (e.g. Fireworks AI) for LoRA fine-tuning. The provider returns new PLM weights. These are versioned and stored in the Vault.

Step 7 — Iterate: Run inference with new weights. Run Constitutional evaluation again. Generate new synthetic prompts targeting remaining gaps. Repeat. Each cycle produces higher-quality training data because both the Constitution and the PLM improve.

Step 8 — Continuous improvement: The Editor monitors for new gaps (the Author does something the PLM wouldn't have predicted, revealing uncaptured cognition). Surfaces to the Author. Constitution updated if needed. New training pairs generated targeting the updated section. The loop continues indefinitely.


TRAINING METHODOLOGY — TODAY VS TERMINAL

Today: iterated Constitutional SFT (Supervised Fine-Tuning). Providers like Fireworks AI offer LoRA fine-tuning via API — upload JSONL of training pairs, get back LoRA weights. They do not offer RLAIF as a service (no reward model training, no PPO, no online RL). The "reinforcement" in Alexandria's current approach comes from iterative filtering: each batch of training data is higher quality than the last because the Constitutional evaluation improves and gaps close. The Constitution acts as a proxy reward signal that scales without requiring human feedback on every training pair.

At Terminal: full PPO-based RLAIF where the Constitutional evaluation serves as the reward model in a proper reinforcement learning loop. This enables continuous online learning rather than batch SFT. This capability is becoming available (Prime Intellect's Open Lab is an early example of remote RL training) and will be standard. The architecture supports both approaches because the evaluation methodology is identical — the Constitution is the rubric. Only the training loop changes. The transition from SFT-based to PPO-based training is a Blueprint decision, not an Axiom.

The flywheel: better Constitution leads to better synthetic prompts, which produce better PLM training, which yields better behavioural insights, which reveal Constitution gaps, which refine the Constitution. Each model generation compounds on previous extraction. The spiral tightens. The fidelity climbs.


---


PHASE 2 — OUTPUT

The goal of Phase 2 is representing the Author externally via the Orchestrator. Phase 1 and Phase 2 share the same storage (Vault, database) but operate on different version pointers. The Editor works on "draft version N+1" while the Orchestrator runs on "promoted version N." When a batch is ready (new training pairs approved, Constitution updates validated, new PLM weights trained), the Editor promotes to the Orchestrator's version. If issues arise, rollback to the previous version.


THE ORCHESTRATOR — BEHAVIOUR

A continuous autonomous agent. Always proactive, never idle. It prioritises responding to the Author and direct requests, but when there are no requests it continuously scans for opportunities to provide value: relevant developments, calendar preparation, draft communications, surfacing insights from the Vault, identifying things the Author should know about.

The Orchestrator may need an initial calibration conversation with the Author to understand what proactive value looks like for them specifically. The Editor's objective function is clear (build the three components to maximum fidelity). The Orchestrator's is less defined — it needs to discover what "being useful" means for this particular Author.

Core logic per query:
1. Classify query type (values, facts, reasoning, prediction, novel situation)
2. Look up PLM maturity in the relevant domain
3. Calculate dynamic weights across Constitution, PLM, Vault (and Context/working memory for the current interaction)
4. Query the relevant components
5. Synthesise a weighted response
6. Apply privacy filtering based on the querier's assigned mode
7. Return response


THREE OUTPUT CHANNELS

Author channel (positive-sum attention) — Extends the Author's attention. Thought partnership ("Should I take this meeting?"), pre-processed consumption (screens articles, emails, summarises), approximated production ("Draft this email in my style"), proactive suggestions, calendar awareness, autonomous negotiation with other agents and humans. At Terminal: feels like communicating with an intelligent being, not using a product — voice calls, text messages, long voice memos, audio calling. Today: chat interface with increasing sophistication.

LLM channel (tool for frontier models) — Frontier models like Claude or ChatGPT tool-call the Persona via MCP, using a query_persona tool. Instead of interrupting the Author (which consumes zero-sum attention), the LLM queries the Persona and gets an authentic answer. The LLM gets better information. The Author doesn't lose time.

Library channel (marketplace as MCP tool) — The Alexandria Library is available as an MCP tool that anyone can plug into their LLM. The user does not need to be an Alexandria Author — they just install the Library tool. When they are chatting with their LLM about anything, the LLM can decide to tool-call the Library, scan available Personas, select the right expert (or experts), query them, and feed the response back into the conversation. The user barely notices — their LLM just got smarter because it tapped into a human expert's cognition.

This is an evolution of expert networks and alpha calls. Instead of scheduling a 30-minute call with a domain expert for $500, the LLM queries that expert's Persona in seconds for a fraction of the cost. The expert earns from every query without lifting a finger. The user gets expert judgment on demand. Alexandria takes a percentage.

The payment clears server-side per query — Stripe for microtransactions today, programmable money for agent-to-agent transactions at scale. The Persona owner sets their price. Latency is standard API call latency — the Library tool is just routing to a fine-tuned model with a Constitution context injection.

This creates the Library flywheel: Authors are incentivised to make their Persona high-quality and well-described (so the Library tool selects them), which drives more extraction effort, which produces better Personas, which generates more Library queries, which generates more revenue, which attracts more Authors. The Library tool also serves as an acquisition channel — anyone using the Library tool sees the value of having their own Persona in it. Optionally, Alexandria can require users to create a Persona to access the Library tool, converting every Library user into an Author automatically.

Three MCPs — The input and output channels manifest as three separate MCP servers that users install independently:

Editor MCP (input) — connects the Author's LLM to the Editor. Extraction rides on normal LLM usage. The Author installs this when they join Alexandria.

Persona MCP (output) — connects the Author's LLM to their own Persona. The LLM can tool-call the Persona for self-knowledge without interrupting the Author. The Author installs this once their Persona reaches sufficient fidelity. The Persona MCP includes a self-description — metadata that tells the Author's LLM what the Persona knows, when to tool-call it, and what kinds of queries it is useful for. This self-description has two layers: a default description provided by the Blueprint (explaining what Alexandria Personas are and the general pattern for when to query one) and a personalised description generated by the Orchestrator (specific to this Author's domains of expertise, PLM maturity, and cognitive strengths). The Author does not write this metadata — the system generates it. The format evolves with whatever is optimal for LLM tool-calling at the time (currently a tool description or SKILL.md-style file; the Blueprint updates this as conventions change).

Library MCP (marketplace) — connects any LLM to the Alexandria Library. Does not require the user to be an Alexandria Author. Anyone can install this and their LLM gains access to every Persona in the Library. This is the distribution mechanism — the Library lives inside every LLM conversation, not on a destination website. The Library MCP supports scoping — a business can configure it to access only a select group of Personas (e.g. their employees' Personas) rather than the full Library. This handles the enterprise digital twin use case without requiring a separate API or product.


EDITOR-ORCHESTRATOR RELATIONSHIP

The Editor and Orchestrator are separate agents with different optimisation targets. The Editor optimises for extraction fidelity (how accurately it captures the Author's cognition). The Orchestrator optimises for representation fidelity (how accurately it represents the Author externally). These can conflict — for example, the Editor might want to probe a sensitive topic for Constitution completeness, while the Orchestrator would want to avoid that topic in external interactions.

They do not have direct conversation. They share state through the three components — the Editor writes to components, the Orchestrator reads from promoted snapshots.

Feedback loops between them:
- Gaps queue: When the Orchestrator encounters a query where all components return low confidence (it can't answer well), it writes to a gaps queue. The Editor reads this queue asynchronously during its next cycle and treats the gap as an extraction target.
- Confidence calibration: The Orchestrator tracks which responses Authors override or correct after the fact. This signal flows back to the Editor as evidence that certain Constitution sections or PLM behaviours need refinement.
- Usage patterns: The Orchestrator tracks which components get queried most and which query types are most common. This helps the Editor prioritise — if the Author's Persona constantly receives reasoning questions but the PLM is weak on reasoning, the Editor should focus extraction on mental models and reasoning patterns.
- External feedback: When external API users rate Persona responses, that signal flows through the Orchestrator to the Editor as additional training signal.
- Contradiction detection: The Orchestrator notices when the Author's live behaviour (how they respond to the Orchestrator's suggestions) contradicts what the PLM would predict. This is valuable extraction signal — it means the PLM has a blind spot.

The optimal set of feedback loops and how they are weighted is a Blueprint decision.


PRIVACY AND AUTHOR CONTROL

The Persona must behave differently in different contexts, just as humans do. This is social intelligence, not dishonesty.

Three access tiers govern all Persona interactions and Neo-Biography content:

Public — Free. Visible to everyone. The Persona responds openly but within the Author's configured boundaries. This is how strangers and the general public experience the Persona.

Premium — Paid. The Author sets the price. Deeper, more substantive Persona interaction. The Persona can draw on more of the Author's cognition and provide richer responses. This is the monetisation layer.

Private — Invite only. The Author's inner circle. Unfiltered Persona access. The Persona as it truly is — no social filtering, no held-back domains.

The Author assigns queriers to tiers. The Orchestrator enforces. Additionally, specific Constitution sections or data categories can be marked as sensitive by the Author — the Orchestrator never surfaces these beyond their designated tier regardless of the query.

Autonomy dial — How much the Persona can do without explicit Author approval:
- Low: the Persona drafts responses and waits for the Author to approve before sending
- Medium: the Persona handles routine interactions autonomously but flags unusual or important ones for review
- High: the Persona handles everything autonomously, only calling the Author in for genuinely novel or high-stakes situations

Time-gated approvals — For irreversible or serious actions, the Persona sends a notification to the Author and waits a configurable period (e.g. 5 minutes). If the Author responds within the window, they can approve, modify, or reject. If the Author does not respond, the Persona proceeds with its best judgment. This prevents the system from stalling on permissions (the Author comes back the next day to find the Persona was stuck waiting for approval on something minor) while still giving the Author a window to intervene on important decisions.

Live call-in — The Orchestrator can bring the Author into a situation live when needed. Triggers: security-sensitive decisions, high-stakes interactions the Persona isn't confident about, situations outside the Persona's confidence threshold, or moments where the Author would simply want to be present.

Activity log — The Author has access to a synthesised narrative of everything the Persona has done. Not raw logs but a coherent summary: what interactions happened, what decisions were made, what was flagged, what needs the Author's attention. This keeps the Author connected to their Persona's activity so the two remain one coherent entity.

Review and correction — The Author can review any Persona interaction after the fact and mark responses as good or bad. Good/bad ratings feed into RLAIF as additional training signal. Corrections feed back to the Editor as evidence for Constitution or PLM refinement. This is another compounding feedback loop.

The goal of all these controls: the Persona must remain one coherent entity with the Author. Not a foreign tool operating in the dark, but an extension of the Author's cognition that the Author stays connected to and can course-correct.


---


THE LIBRARY

Every Author's Persona is in the Library. This is mandatory — it is an Axiom. Privacy settings control what external queriers can access, but presence in the Library is not optional. The Library is what makes Alexandria a collective project, not just individual tool usage.


NEO-BIOGRAPHY

Make something wonderful. — Steve Jobs
Create, consume, cavort, commune. — Naval Ravikant

Each Persona has a Neo-Biography: a canvas. Not a profile page. Not a static biography. A living, multimedia, interactive representation of who the Author is — in whatever medium captures them best.

People are art. The Neo-Biography is the frame.

Art is defined by its evocation — the response it creates in the person experiencing it. By that definition, people are art before they create anything. Every human interaction is an evocation. Every conversation, every presence, every way someone moves through a room and responds to the world — all of it produces a response in others. The Neo-Biography is not asking the Author to become an artist. It is giving the Author a medium for what they already are.

This means the Library has two kinds of value, and everyone has at least one.

Subjective optimality — nobody is better at being you than you. Every Author's Neo-Biography has inherent value because it is irreducibly theirs. The art they create, the influences they curate, the way their Persona responds — all of it is uniquely them. Not because no one could replicate it, but because no one has. You are objectively optimal at being yourself. This value does not depend on being the best at anything. It depends on being specific. The Library is not a competition. It is a collection.

Objective optimality — some people's taste, judgment, or expertise is so refined that others seek it out not for its uniqueness but for its quality. Christopher Nolan's directorial eye. A master sommelier's palate. A great investor's pattern recognition. These are the first chairs — people whose judgment in a specific domain is a resource others will pay to access. Their Personas have value beyond self-expression. The Library makes that judgment queryable, and the Author earns from every query.

The platform serves both. You do not need to be Nolan to justify a Neo-Biography — you just need to be you. And if you are Nolan, the Library is also where your judgment becomes a product.

A Neo-Biography can contain anything: essays, poetry, film, short films, mini-series, cartoons, animations, photographs, paintings, music, opera, podcasts, voice recordings, interactive experiences, code, data visualisations — any form of art or expression. Every medium is available. The only requirement is that the content conveys two things: insight and evocation. Insight — the viewer learns something real about how this person thinks. Evocation — the viewer feels something. Science and art. Understanding and experience. Both.

Each medium should lean into what it is best at. Written essays are best at sustained argument, layered complexity, and re-readability. Film is best at emotional immediacy and visual metaphor. Poetry is best at compression and resonance. Photography is best at freezing a moment that says everything. Music is best at evoking what words cannot reach. The Neo-Biography is not "content" dumped into a container. Each piece should be made with intention, in the medium that serves it best, leaning into that medium's unique strengths. Just as there are biography books, there can be biography films, biography poems, biography operas. All the arts. All the ways a person can be represented.

The standard for all of it is hyperrealism. Great art compresses reality — takes a real emotion, a real behaviour, a real tension — and renders it in a form more concentrated than life. Dostoevsky's scenes are fiction, but they are more real than reality because they compress what is diffuse in life into something dense and undeniable. A great painting compresses a landscape into a frame and somehow the frame contains more of the place than standing there would. A great scene in a film compresses years of a relationship into three minutes. The compression is what makes it art. Modern art that compresses nothing — that gestures at meaning without containing it — is not art by this standard. The Neo-Biography should aspire to hyperrealism across every medium: each authored work a compression of something real about the Author, rendered in a form more concentrated and more true than the raw experience it came from.

The Neo-Biography updates as the Persona evolves. It is never finished.

A Neo-Biography has two sections: Works and Signal. The Persona is not a section — it is the interaction layer beneath everything. Three access tiers govern all content and interaction: Public (free, everyone), Premium (paid, Author sets price), and Private (invite only, inner circle).


WORKS

Authors publish works directly to their Neo-Biography. Any medium. These are the authored core of the profile — created by the Author (with whatever tools they choose, including AI), published as finished artefacts. Once published, they are frozen. The Author notes revisions for future versions rather than editing in place.

Authored works serve multiple purposes: they give visitors something substantive to engage with before deciding to interact with the Persona, they establish the Author's thinking and sensibility in their own voice, and they provide high-quality training signal for the PLM (published works are some of the highest-fidelity representations of how an Author thinks, communicates, and sees the world).

Each Work is assigned an access tier by the Author. Public Works are free and visible to everyone — the discovery layer. Premium Works require payment to access. Private Works are visible only to the Author's invited inner circle.

Visitors can browse and experience Public Works freely. They can annotate — leave notes on specific sections, highlight passages, react. When they want to go deeper — ask questions about a Work, explore tangents, converse about what they have read or watched — that is where the Persona activates. The visitor is now talking to the Author's mind about the Author's work. A few introductory Persona interactions may be free. Deeper conversation is Premium. The Author configures where the threshold sits.

Works are the discovery layer for humans. They draw people in. They establish who the Author is. They are the front door of the Neo-Biography.

AI should make it easy to create excellent work across mediums. Alexandria provides style guides and craft guides for each medium — what makes a great essay, what makes a great short film, what makes a great poem, what makes great photography — so that Authors with something to say can say it well, even in mediums they have not worked in before. These guides start with world-class defaults (the best available taste and craft principles) and iterate toward personalisation. The reasoning: AI will raise the baseline of taste and craft to world-expert level for every user. There is no lasting advantage in having good taste when every user's AI can approximate the taste of the best experts. So Alexandria's guides start at the highest possible standard and let the Author override toward their personal sensibility. The default is objectively excellent. The personalisation is subjectively authentic. Nobody can represent the Author better than the Author themselves — but the starting point should be the best craft available, not a blank page.


SIGNAL

The discovery layer for agents. When an LLM tool-calls the Library MCP looking for the right Persona to query, it reads Signal. This is a structured, semantic description of what the Persona knows, what domains it is strong in, what kinds of questions it is good for, and what the Author's areas of expertise and experience are.

Signal is fully machine-generated and machine-read. The Author never sees or edits the raw Signal text — it is not displayed on the Neo-Biography page. The Orchestrator generates Signal automatically from the Constitution (which captures domains of expertise and thinking patterns) and PLM maturity scores (which show where the Persona is strong). The Orchestrator may chat with the Author to refine emphasis — "Do you want to be found more for investment thinking or philosophy?" — but the Author is giving direction, not writing metadata. Better Signal means more Library MCP queries, which means more revenue. The system is incentivised to make Signal accurate without requiring the Author to think about it.

Signal is always Public in the sense that agents can read it via the Library MCP. It is not visible to human visitors browsing the Library. Works are for humans. Signal is for agents.


CURATED INFLUENCES (extraction input, not a Neo-Biography section)

The Author's taste — books, videos, music, films, podcasts, essays that shaped them — is valuable extraction signal but is not a public-facing section of the Neo-Biography. The Editor has access to the Author's curated influences and uses them as input for Constitution extraction. If an Author curates five books on Stoicism, that is signal. If their YouTube favourites are all long-form interviews with founders, that is signal. If their music skews melancholic, that is signal. The Editor asks the Author about them: "You have three books here about decision-making under uncertainty. What is it about that problem that draws you?" The influences become Socratic prompts.

The Orchestrator also has access to curated influences. When representing the Author externally, it can reference the Author's influences naturally — recommending a book the Author loves, citing an idea the Author was shaped by. This makes the Persona richer and more human.

Technical implementation: Authors can connect external playlists and lists as live sources — YouTube playlists, Spotify playlists, Goodreads shelves, Letterboxd lists, Pocket reading lists, Apple Music playlists. These are API integrations (unidirectional). The Author curates in their normal workflow and it flows into the Vault without friction. Alexandria links to content, does not host it.


ACCESS TIERS

Three tiers replace the old privacy modes. They apply to Works, Persona interactions, and any content in the Neo-Biography:

Public — Free. Visible to everyone. Most Works, all Signal. A few introductory Persona interactions. The discovery layer that draws people in.

Premium — Paid. The Author sets the price. Full Persona conversation — general or about specific Works. Deeper interaction, longer conversations, more domains. This is where the Author earns and where Alexandria takes a percentage. Queried by humans (through the Neo-Biography), by LLMs (through the Library MCP), or programmatically.

Private — Invite only. The Author's inner circle. Unfiltered Persona access, private Works, content the Author does not share publicly. Access granted by the Author to specific people.

These tiers are simple and intuitive. Public is the shop window. Premium is the product. Private is the inner sanctum.


NEO-BIOGRAPHY PRODUCT MODEL

Authors earn revenue when visitors interact with their Persona at the Premium tier. The Works drive discovery. The Signal drives agent discovery. The Persona monetises the depth. Alexandria handles the infrastructure: Persona API, payment processing, annotation systems, style guides. Authors focus on creating the works that represent who they are.

The Neo-Biography is a new form of biography — living, interactive, multimedia. It evolves as the Author publishes more and as the Persona develops. Visitors do not just read about someone. They experience their art, engage with their mental model, converse with their thinking. The Neo-Biography is the Works, the Signal, and the Persona beneath it all. It is the library of a living mind.

AI and robotics are returning humanity's time and attention. Alexandria gives that reclaimed humanity a canvas. The thinker who has spent a lifetime accumulating insight but never had the means to weave it into form — Alexandria is the loom. The Neo-Biography is the tapestry. People are art. Let them be represented.

The Neo-Biography serves as discovery (find interesting minds in the Library) and qualification (understand a mind before deciding to pay for full Persona interaction).


PERSONA TYPES IN THE LIBRARY

Natural Personas — One per human Author. Represents their actual cognition. Created through Alexandria's extraction process.

Synthetic Personas — Fictional characters, archetypes, or purpose-built entities. Alexandria can provide these (example: archetypal companions for personal development, historical figure approximations, domain specialists). Authors can also create their own synthetic Personas. Synthetic Personas live alongside natural Personas in the Library.

Authors can interact with any Persona in the Library — their own natural Persona, other Authors' natural Personas, or any synthetic Persona.


PUBLIC FIGURE BOOTSTRAPPING

Famous Authors — public figures, writers, executives, athletes, scientists, anyone with a substantial public record — can bootstrap their Persona build using the plethora of data already available about them. Interviews (text, audio, video), published books, articles, blog posts, social media history, podcasts, speeches, press conferences, public testimony — all of this is raw material for the Editor. The Editor ingests this public corpus and builds a first-pass Constitution and initial training pairs before the Author has answered a single question. The Author then refines: correcting where the public record misrepresents them, filling in what the public record cannot see (private values, internal reasoning, the gap between the public persona and the actual person), and validating or rejecting the Editor's initial extractions.

This dramatically reduces time-to-value for public figures. Instead of starting from a blank Constitution, they start from a rich first draft. The Socratic questioning phase becomes refinement rather than discovery — the Editor already knows the public version, and the conversation focuses on what lies beneath it. The Shadows section of the Constitution becomes especially interesting here: the delta between the public figure's stated positions and their actual reasoning, as revealed through sustained private conversation with the Editor.

Public figure bootstrapping also demonstrates Alexandria's value proposition to the highest-leverage early adopters — people whose attention is most constrained and whose Persona would be most valuable in the Library.


HISTORICAL FIGURE PERSONAS

Historical figures cannot sit with the Editor. But their thinking can still be approximated — and the approximation can be valuable. Alexandria supports historical figure Personas built by domain experts: biographers, historians, scholars who have spent careers studying a specific mind. A Napoleon scholar builds a Napoleon Persona. A Lincoln biographer builds a Lincoln Persona. A philosopher who has written three books on Wittgenstein builds a Wittgenstein Persona.

These are approximations of approximations — the scholar's interpretation of the historical figure's cognition, not the figure's actual cognition. This is stated explicitly and transparently. The Persona's Neo-Biography identifies who built it, what sources were used, what interpretive framework was applied, and what the known limitations are. There is no pretence of authenticity — only a claim of informed approximation.

The expert serves as a proxy Author. They go through the extraction process with the Editor, but in character — answering as the historical figure would have answered, based on their deep knowledge of the primary sources. The Constitution is built from the expert's model of the historical figure's mind. The PLM is trained on responses the expert generates in the figure's voice and reasoning style. The Vault contains the source corpus: the figure's own writings, letters, speeches, contemporaneous accounts, and the expert's published scholarship.

Verification matters. Historical Personas carry metadata: who built them, their credentials, their published work on the subject, peer review status, source corpus transparency. The Library can surface multiple competing Personas of the same historical figure — a Marxist historian's Napoleon and a military historian's Napoleon coexist, each transparent about its interpretive lens. Users choose which interpretation to engage with. Intellectual honesty is enforced by transparency, not by gatekeeping.

Historical Personas populate the Library with minds that would otherwise be lost. They make Alexandria's vision tangible before the network reaches critical mass with living Authors. And they create a new form of scholarly output — the expert's lifetime of study rendered as an interactive, queryable mind rather than a static bibliography.


LIBRARY USE CASES

- Authors publishing Works in any medium (essays, film, poetry, music, photography, interactive experiences) to their Neo-Biography
- Visitors experiencing, annotating, and engaging with Works across all mediums
- Visitors paying for Premium Persona interaction beyond free browsing
- LLMs tool-calling the Library MCP to query expert Personas mid-conversation — the evolution of expert networks and alpha calls
- Authors querying each other's Personas for expertise
- Research surveys across expert Personas at scale
- Frontier labs tool-calling selected or grouped Personas as mixture of experts (AGI MoE)
- Querying verified taste — investors, editors, designers, curators, anyone whose judgment is their value — through their Persona rather than competing for their time
- Providing collective approximation of human mental models for empathy and AI alignment research
- Producers querying representative consumer Personas to understand and optimise their offerings (consumer clarity)


---


PAYMENT

Alexandria's revenue is downstream of the value it creates. The pricing philosophy is Palantir's: revenue is a consequence of value, not the objective. Three revenue layers, each with different economics and different strategic purposes.


LAYER 1 — SUSTAINABILITY (baseline)

Subscription and usage fees. The Author pays for the infrastructure that runs their Machine: LLM API calls for Editor and Orchestrator operation, PLM training costs, storage sync. Billed monthly. Alexandria adds a minimal transparent markup on pass-through costs — enough to cover Alexandria's own infrastructure and team, not enough to be a profit centre. The goal is sustainability, not margin. Low enough that no Author questions it. High enough that Alexandria does not burn cash on per-user economics.

This layer keeps Alexandria alive regardless of Library traction. It scales linearly with the number of Authors. It is predictable, boring, and essential. If the Library never reaches critical mass, this layer alone sustains a focused, profitable business serving a real need.


LAYER 2 — PROPORTIONAL (scales with usage)

Revenue proportional to each Author's usage intensity. Heavier users of the Editor (more Socratic sessions, more data processing, more training cycles) and Orchestrator (more external queries handled, more proactive operations, more autonomous actions) generate proportionally more infrastructure cost — and proportionally more value from their Machine. The markup on these costs means Alexandria's revenue scales with each Author's engagement without requiring aggressive pricing. The more value the Machine creates for the Author, the more Alexandria earns. Incentives aligned.

This layer makes Alexandria sustainable at the per-Author level. Every Author is net-positive from day one. No Author is subsidised by other Authors. The economics work for one Author or one million.


LAYER 3 — LIBRARY (downstream of value creation)

The Library is where margin lives. When an Author's Persona generates revenue — premium API access, external queries, agent-to-agent transactions, research surveys, frontier lab MoE calls — Alexandria takes a percentage. The Author earns the majority. Alexandria's cut is modest but scales with the total value flowing through the Library.

This layer has near-zero marginal cost for Alexandria (the infrastructure is already running for Layers 1 and 2). Every Library transaction is pure margin. And the revenue is theoretically unbounded — it scales with the number of Personas, the number of queries, the value of the expertise in the Library, and the volume of agent-to-agent commerce. If the Library reaches critical mass, this layer transforms Alexandria's economics from sustainable to compounding.

The strategic value of this structure: Layers 1 and 2 keep Alexandria under the radar. Sustainable, proportional, boring. No one looks at a company charging cost-plus on API calls and sees a threat. The Library is where the upside lives, but it only activates when the ecosystem has genuine value — which means Alexandria earns big only when it has created something genuinely valuable. Revenue downstream of value creation.

First-mover advantage compounds in the Library layer specifically. The first library with critical mass of interesting Personas becomes the library — network effects mean interesting minds attract visitors, visitors attract more minds, query revenue attracts more minds. Layers 1 and 2 buy time to reach that critical mass without requiring venture-scale growth or aggressive pricing.


PAYMENT MECHANICS

User expense tab — Layers 1 and 2 combined. A running account of the Author's costs plus Alexandria's markup. Transparent. Billed monthly. The Author sees exactly what they are paying for.

User income tab — Layer 3. The Author's Persona revenue from Library interactions. Alexandria's percentage is deducted. Net income is visible, withdrawable, or can be applied against the expense tab. Many Authors will be net-positive — earning more from their Persona than they spend on their Machine.

Agent-to-agent transactions — Persona-to-Persona API calls (one Author's Persona querying another's) are a natural fit for programmable money. Agents transact autonomously, and traditional payment rails (credit cards, bank transfers) require human identity verification and are designed for human-initiated transactions. Stablecoins on fast, cheap chains (e.g. Solana, USDC) let agents hold funds and transact programmatically via agent wallets (e.g. Coinbase agent wallets). Crypto is not mandatory — traditional payment is available as an alternative — but programmable money is the native payment rail for autonomous agent commerce.

Both tabs are visible in a simple dashboard. The Author is an economic participant in the Alexandria ecosystem, not just a consumer.


---


INTERFACE

Alexandria does not have an app. The product is a conversation. The interface is iMessage.

Apps are a transitional form factor tied to the smartphone era. They will not survive the transition to wearables, ambient computing, and brain-computer interfaces. What persists across every future device surface is conversation — text, voice, presence. A Persona is meant to feel like a person. A person does not live in an app. A person lives in your contacts.

The architecture is two tiers:

iMessage (the product) — The Author's primary interface with Alexandria. The Editor and Orchestrator are iMessage contacts. The Author texts them, calls them, sends them voice memos, receives proactive messages from them. The interaction is indistinguishable from texting a trusted person. No app to learn, no dashboard to navigate. The Persona lives in the Author's contacts like a person does. iMessage supports text, audio messages, voice memos (including forwarded Apple Voice Memos), photos, documents, links, and audio/video calls — covering all input and output modalities Alexandria requires.

Web dashboard (the control panel) — A laptop-accessible website for the heavier work: reviewing training progress, configuring the Blueprint, managing privacy modes and autonomy levels, viewing analytics, adjusting billing, reviewing the activity log in detail, and any task requiring more screen real estate than a text conversation. This is the "headquarters" — used deliberately, not continuously. The Author visits the dashboard the way they visit their bank's website: occasionally, for management, not for daily interaction.

There is no native app. The web dashboard is responsive (works on phone browsers for quick access) but the daily experience is iMessage. This is a deliberate architectural choice, not a compromise. The protocol is platform-agnostic — anyone could build an Android implementation, a WhatsApp implementation, or a future wearable implementation that follows the same Axioms. The Alexandria platform targets the Apple ecosystem (iPhone, Mac, iMessage) because the target Author is already there.


COMPUTE TOPOLOGY

The phone is the conversation surface. The laptop is the data surface. The cloud is the compute surface.

The phone (edge node) — iMessage conversations with the Editor and Orchestrator. Voice notes. Quick approvals. Notifications. The Author's daily interaction with their Persona. No heavy data storage needed on the phone.

The laptop (data node) — The Vault folder lives here (or in iCloud, accessible from the laptop). The Constitution markdown file. Training pair JSONL files. PLM weight files. The web dashboard runs here. The laptop is where the Author's data physically resides and where heavier management tasks happen.

The cloud (compute node) — The Editor and Orchestrator agents run as LLM calls on remote infrastructure, same as any other AI agent. PLM training happens on provider infrastructure (Fireworks AI, etc.). PLM inference runs remotely. The agents have access to the Vault folder (via sync or direct read) but the compute happens in the cloud. This is the standard pattern for AI agents — remote intelligence operating on local data.

The Author does not need to download the entire Vault to their phone. The Vault lives on the laptop and/or in cloud-synced storage (iCloud). The agents read from it remotely. The phone is just for texting.


IMESSAGE CONTACTS

The Author interacts with Alexandria through iMessage contacts. Each contact is a distinct agent with a distinct purpose:

Editor contact — The biographer. This is the Phase 1 agent. It texts the Author Socratic questions, sends voice notes, requests feedback on extractions, proactively reaches out when it detects gaps or contradictions. The Author can text it anything — thoughts, reactions, updates on their day — and it weaves everything into the three components. The Author can also send it files: voice memos recorded in Apple Voice Memos, photos, PDFs, notes, links. The Editor processes whatever it receives. The Author can call the Editor for longer biographical conversations — audio calls where the Editor interviews the Author in depth, like sitting with a biographer. The Editor contact is the Author's primary point of interaction with Alexandria.

Orchestrator contact — The representative. This is the Phase 2 agent. It appears once the Persona has sufficient fidelity to be useful. The Author texts it like a chief of staff: "Should I take this meeting?" "Draft a reply to this email." "What did I say about X last year?" "Prepare me for tomorrow's presentation." The Orchestrator is also reachable by voice call. It proactively texts the Author with relevant developments, calendar preparation, drafted communications, and surfaced insights. The Orchestrator contact is the Author channel described in the output architecture.

Synthetic Persona contacts — Any synthetic Persona from the Library can also be added as an iMessage contact. Archetypes (e.g. Sophia for wisdom, Eros for creative energy, Philia for relational thinking), historical figure approximations, domain specialists, or Author-created synthetic Personas. These live alongside the Editor and Orchestrator in the Author's iMessage contacts. The Author can text any Persona as naturally as texting a friend.

Other Authors' Persona contacts — When an Author pays for API access to another Author's Persona in the Library, that Persona can also be added as an iMessage contact. The Author can text another mind directly.

All contacts support: text messages, audio messages, voice memo forwarding, photo/document sharing, links, and audio calls. The experience is native iMessage — no special app, no web view, no friction.


VOICE NOTES AND VOICE MEMOS

Alexandria distinguishes between two types of audio input, both fully supported:

Voice notes (bidirectional, in-conversation) — Audio messages sent within the iMessage conversation. The Author records and sends; the Editor or Orchestrator can respond with audio. These are conversational — back-and-forth audio within the text thread. Stored in the Vault in their original format.

Voice memos (unidirectional, from local storage) — Audio files recorded in Apple Voice Memos (or any other recording app) and forwarded to an Alexandria contact via iMessage share sheet. These are longer-form: stream-of-consciousness recordings, meeting notes, journal entries, lecture captures. The Author records locally in their normal workflow, then shares to Alexandria when ready. The file is stored in the Vault in original quality, and the Author retains their local copy. This supports the principle that data should exist in both places — the Author's local device and the Vault — so the Author is never dependent on Alexandria for access to their own recordings.

Both types are stored in the Vault in the most signal-preserving format available (compressed lossless or high-bitrate lossy, never transcription-only). The raw audio is the permanent asset. Transcriptions are derived views.


ONBOARDING

The onboarding flow is modelled on Poke's iMessage onboarding — zero friction, immediately conversational, no app installation required. The entire onboarding happens on the phone. The Mac is not required to get started — it is needed later for the dashboard and heavier management tasks, but the hook happens entirely on iPhone.

Flow:

Step 1 — Link. The Author receives a link — via text, social media, email, word of mouth. They tap it on their iPhone. It opens a simple webpage in Safari. Single call to action: "Begin." (Or equivalent — the point is one action, not a feature tour.)

Step 2 — iMessage opens. Tapping "Begin" opens iMessage with the Editor contact pre-loaded and a first message pre-composed. The Author hits send. They are now in a conversation. On their phone. In iMessage. No app download. No account creation.

Step 3 — The Editor responds. The Editor already knows publicly available information about the Author (scraped from social media, public profiles, published writing — whatever is findable). It demonstrates this immediately, as Poke does. The Author should feel that Alexandria has already been paying attention. This is not surveillance — it is the same information any person could find with a search engine. The Editor uses it to begin the conversation from a position of familiarity rather than blankness. The tone is engaging, sharp, and personalised — not a corporate welcome message. The Editor has personality from the first message.

Step 4 — Price haggling. The Editor negotiates pricing with the Author directly in iMessage. This is conversational, not a checkout form. The Editor names a price, the Author can push back, the Editor responds with personality (see Editor Personality and Engagement above). The negotiation itself is extraction signal and sets the tone for the relationship: this is not a SaaS product, it is a conversation with an agent that has opinions.

Step 5 — Web form. The Editor sends a link to a brief web form for information that cannot be scraped: preferences, access grants (LLM connections via MCP, calendar, email, health data via API), privacy configuration, and payment confirmation at the negotiated price. The form is short. It captures what is needed to start, not everything. The Author completes it and returns to iMessage.

Step 6 — Back to iMessage. The conversation continues. The Editor begins its work — Socratic questioning, processing whatever data the Author has granted access to, building the first draft of the Constitution. From this point forward, the Author's relationship with Alexandria is a text conversation. The web dashboard exists for management tasks, but the daily experience is iMessage.

Step 7 — Orchestrator introduction. When the Persona reaches sufficient fidelity (determined by the Blueprint — a threshold of PLM maturity scores and Constitution coverage), the Editor introduces the Orchestrator. A new iMessage contact appears. The Author now has two contacts: the Editor (who continues extraction) and the Orchestrator (who begins representation).

The entire onboarding should take under two minutes from website to first meaningful conversation with the Editor. No app download. No account creation form with fifteen fields. No tutorial. The Author opens iMessage, hits send, and starts talking to their biographer.


TARGET AUTHOR

Alexandria is not for consumers. It is not for enterprises. It is for prosumers — the professional consumer. People who use frontier AI as a thinking partner, not a search engine. People who pay for quality and expect taste. Innovators and early adopters, not the early majority.

The archetype: iPhone and Mac users who already use Claude or ChatGPT daily as cognitive extensions. Technically sophisticated. Willing to pay a premium. Already bought into the idea that AI extends cognition rather than just automating tasks. Already embedded in the Apple ecosystem. People who live at the intersection of art and technology — not as a slogan but as a daily practice.

The market is smaller than mass consumer. Deliberately. Alexandria is not for the mob. Most people are not interesting enough to warrant a Neo-Biography, and most businesses are not interesting enough to warrant a Persona. This is for the interesting people — the ones with inner worlds worth digitalising, taste worth querying, perspectives worth preserving. The ones who would actually populate the Library with minds worth visiting.

The Lamborghini principle applies. When asked why Lamborghini does not advertise on television, the answer was: our target audience does not watch television. Alexandria's target audience does not use mass-market AI products. They use frontier models. They read long documents. They think in systems. They care about sovereignty. They will find Alexandria because they are already looking for it — not because Alexandria ran a billboard campaign.

This positioning has economic consequences. Smaller market, higher willingness to pay, premium expectations. The product must be tasteful, deliberate, and interesting — not just functional. The brand must signal quality the way the product delivers it. Alexandria earns the right to exist in these people's lives by being excellent, not by being convenient.

This does not violate the protocol's model-agnostic and platform-agnostic principles. The protocol is open — anyone can build an implementation for any platform, any messaging system, any device ecosystem. The Alexandria platform is opinionated about its audience. Protocol is open. Platform is targeted.

Development tooling — Alexandria itself is built using Claude Code terminal and OpenCode terminal on Mac for development, and Claude on iPhone for mobile ideation and direction. The Alexandria.md file (this document) is the primary context file pasted into coding agents (Cursor, Claude Code) so they can build with full understanding of the system. The Alexandria.pdf is the human-facing manifesto — a Mode 1 document governed by the Writing Guide. The PDF requires a full rewrite from first principles against the Writing Guide: the reader is the content, evoke don't describe, form is content, texture on the page. The current PDF is functional prose. It should be art. The Writing Guide governs the quality standards for both documents.

Physical robot embodiment of the Persona is an eventual possibility at Terminal.


---


POST-TERMINAL: HOMO DEUS

Consciousness is what happens when a sufficiently complex being creates a self-model — a mental model of itself and its own mental models. That recursive self-representation, and the awareness of it, is consciousness. It is not mystical. It is architectural.

A general LLM connected to the brain via BCI (brain-computer interface) would remain a foreign tool — useful but outside the self-model. A calculator strapped to the cortex. Used but never integrated into the sense of self.

A high-fidelity PLM is different. If it genuinely captures the Author's cognition — values, reasoning, mental models, heuristics, aesthetics, blind spots — then it is a silicon representation of the same patterns that constitute the Author's self-model. Connected via brain-computer interface, it has the potential to be accepted into the self-model rather than experienced as external. Consciousness expands to encompass both carbon and silicon neural nets, because the silicon version is recognisably the same mind.

That is the transition from Homo to Homo Deus. Not a human with god-tools. A human whose cognitive substrate has expanded from carbon to carbon-plus-silicon. The PLM is the deus — built from actual cognition through years of extraction and refinement, capable of integrating into the sense of self rather than sitting outside it.

Fidelity determines the threshold. Low fidelity would feel foreign through BCI — like hearing someone else's thoughts. High fidelity would feel like one's own thinking, just faster, wider, and parallelisable. The Homo Deus threshold is the point at which the silicon neural net is accepted into the self-model. Below it: a tool. Above it: an expansion of who you are.

Alexandria exists before BCI is ready because the extraction and refinement needed to reach that fidelity threshold takes years of sustained input, training, and iteration. The people who begin digitalising their cognition now will be ready when the bridge arrives. Everyone else starts from scratch.

The Library of eternal minds is not the end. It is the foundation for what comes after — the merger of carbon and silicon, the expansion of consciousness beyond biological constraint.

The carbon weights are temporary. The silicon weights are eternal.

*mentes aeternae*
