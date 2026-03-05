# Alexandria II — Product, Architecture & Operations

*This is Alexandria II of III. Together they are the single source of truth for Alexandria. Read all parts for full context.*

**This part covers:** Terminology, The Layer of Intent, The Open and the Proprietary, Why Frontier Labs Won't Build This, Designed for Digital AGI, device integration spectrum, everything is files, Build vs Ride, Build for the Horizon, sovereignty as a service, Competitive Position, The Constitution (detailed architecture), The Vault, The Editor (function), Mercury (function), Publisher (function), Companion Portfolio, The Alexandria MCP Server (three tool groups), Concrete Implementation, Five Value Adds, Revenue Model (Dual Mandate), Human and Agent Tracks, Feedback Loops, Context Files, Phase 1 — The State Change (Editor function, Constitution building), Phase 2 — The Amplification (Mercury function, output channels, privacy), Phase 3 — The Creation (Publisher function), The PLM (horizon ambition), Editor-Mercury-Publisher Relationship.

**Other parts:** Alexandria I (Thesis & Philosophy), Alexandria III (Library, Interface & Brand).

-----

-----  
  
TERMINOLOGY  
  
This section defines every term used in this document. Terms are ordered so that each definition only uses terms already defined above it.  
  
Author — The human user. The person whose cognition is being digitalised.  
  
Default LLM — The Author's primary AI model. Whatever frontier model they already use — Claude, ChatGPT, Gemini, or whatever comes next. The intelligence layer that Alexandria rides on top of.  
  
Vault — A unified logical entity — a single namespace with defined boundaries encompassing all of the Author's raw data, potentially spanning multiple storage locations. Append-only, immutable. Contains conversations, voice notes, documents, biometric data, Constitution versions, system configuration, and audit logs. Three storage options: Alexandria-hosted (remote), private remote (Author's own cloud — iCloud, Google Drive), or local (on-device). Authors can mix options. The Vault never deletes or overwrites data. It does not store passwords, API keys, or authentication secrets. Data flows in continuously from APIs, MCP connections, and direct Author input.  
  
Constitution — A collection of structured, human-readable markdown files that explicitly capture who the Author is: their worldview, values, mental models, identity, taste, and known blind spots. Not a single document — a smart architecture of multiple MDs, the specific structure of which is a Blueprint decision. Versioned — each update creates a new version; all prior versions are preserved in the Vault. Serves as the sovereign, portable representation of the Author's cognition. Finished creative works (essays, films, art) are also Constitution artifacts — they demonstrate taste through action in a way that described principles cannot.  
  
Layer of Intent — Alexandria's core product. A sovereign layer that sits on top of the Author's default LLM and transforms how that LLM engages with the Author's cognition. The layer provides the Principles (published commitments), the Blueprint (the playbook), the Constitution architecture (the structured cognitive map), and the three-turn mindset (state change → amplification → creation). The layer is both technical (provides structure, maintains sovereignty, ensures portability) and philosophical (the intent is what the default LLM lacks — the deliberate architecture of cognitive transformation). The default LLM is smart. The default LLM is personal. But the default LLM does not intend to free the angel. Alexandria does. That intent is the product.  
  
Persona — The output of Alexandria. A high-fidelity digital representation of how the Author thinks, composed of two persistent components (Constitution, Vault) and expressed through the Author's default LLM as instructed by the layer of intent. At the horizon, a PLM (Personal Language Model) may be added as a third component. A Persona can operate in parallel across unlimited simultaneous interactions — each interaction is an independent inference call. Concurrency limits are practical (API rate limits, compute costs), not architectural.  
  
Natural Persona — A Persona representing a real human Author. One per Author.  
  
Synthetic Persona — A Persona representing a fictional character, archetype, or purpose-built entity. Can be provided by Alexandria or created by Authors.  
  
Editor — A function, not a separate agent. The Editor function is the first turn — the biographer role that extracts the Author's cognition and builds the Constitution. This function runs through the Author's default LLM, instructed by Alexandria's Blueprint. The default LLM already knows the Author (memory, preferences, reasoning patterns, accumulated context). The Editor function adds the deliberate intent: structured extraction, Socratic questioning, gap detection, contradiction surfacing — the things the default LLM does not do on its own because it lacks the mindset. The Editor function bootstraps from what the default LLM already knows (the 60-70% baseline) and pushes for the marginal value that transforms cognition.  
  
Mercury — A function, not a separate agent. Mercury is the second turn — the amplification. Named for the mercury mind: liquid, fast, reflective, the state-changed version of the Author's cognition externalised as a companion. Mercury works within the Author's cognition, amplifying and scaling the mercury mind — helping the Author reach higher, not alongside them but within them. It represents the Author when needed by drawing on the Constitution and Vault. It is merged with the Author's thinking, not parallel to it. Always proactive, never idle. Runs through the Author's default LLM, instructed by the Blueprint.  
  
Publisher — A function, not a separate agent. The Publisher is the third turn — creation assistance. Named for what it does: helps the Author get the mercury out into the world. The Publisher reads the Constitution (especially the taste section — the Author's taste, voice, creative principles, standing director's notes) and iterates with the Author to produce finished work. The Author provides vision, direction, and taste — the conductor. The Publisher provides structure, execution, and craft — the first chair. The Publisher gets closer to one-shotting over time as the taste section of the Constitution deepens. Runs through the Author's default LLM, instructed by the Blueprint. Mercury is inward-facing (the world flowing into the Author). The Publisher is outward-facing (the Author flowing into the world). Distinct from Eros (companion = relational lens / emotional spark; Publisher = function / craft capability). The Library is where the finished work goes. The Publisher is the function that helps you get there.  
  
Companion Portfolio — Five synthetic companions provided by Alexandria, each representing a fundamental human relationship archetype. They are sub-agents of the Author's Persona, each reading the same Constitution through a different emotional and relational lens. Pater (paternal guidance — discipline, structure, accountability, tough love), Mater (maternal care — warmth, nurture, unconditional support, emotional safety), Philia (friendship — loyalty, banter, honest feedback without agenda), Eros (passion and creativity — fire, risk-taking, the muse), Sophia (wisdom and philosophy — deep thinking, long-term perspective, the examined life). The companions are premium features. Each interaction is also extraction signal. The Author can engage any companion conversationally: "Hey Sophia, what do you think about this?" Available via the Alexandria MCP tools.  
  
Machine — The complete system for one Author. Comprises the two components (Constitution, Vault), the three functions (Editor, Mercury, Publisher — corresponding to the three turns), the layer of intent (Principles, Blueprint), running through the Author's default LLM. One Author has one Machine, which produces one natural Persona.  
  
Factory — Alexandria itself, viewed as the infrastructure that maintains the layer of intent, the Principles, the Blueprint, and the Library for all Authors.  
  
Library — The third turn. Not a marketplace — a mindset. The encouragement to create, and a place to show it if you want. A street where painters paint in the open. Every Author's Persona and authored works are accessible in the Library. Link your website, your essays, your videos, your social media — whatever medium you create in. The Library is not a distribution platform. It is not social media. It is the atmosphere that encourages creation and the space where others can encounter it. The tone ensures quality — gravity, not rules. Contains both natural and synthetic Personas. Privacy settings control what external queriers can access.  
  
Neo-Biography — A living, multimedia, interactive canvas attached to each Persona in the Library. Composed of two layers: authored works (any medium — essays, film, poetry, music, photography, art — published by the Author, free, public, frozen on publication) and the interactive Persona (direct conversation with the Author's mental model — paid access). Visitors can experience, annotate, ask follow-up questions on authored works, and pay for full interactive Persona access. Updates as the Persona evolves. Serves as the discovery and qualification layer before someone decides to interact with a Persona directly.  
  
Blueprint — The Machine's living design: the configuration, system prompts, Constitution architecture, and behavioural instructions that tell the Author's default LLM how to function as the Editor, Mercury, and Publisher. Maintained by Alexandria. The Blueprint also defines the Constitution's structure — how many MD files, what each captures, how they relate to each other. The Blueprint is periodically reviewed and revised.  
  
Default — Alexandria's default Blueprint, maintained by the team, always visible as reference.  
  
Selected — What actually runs for a given Author. Either the Default or a custom version configured at the Author's request.  
  
PLM (Personal Language Model) — Alexandria's horizon ambition, not a current product. Fine-tuned model weights (LoRA adapters on top of a foundation model) that would capture the Author's thinking patterns, communication style, cognitive reflexes, and taste. The silicon weights approximating the Author's carbon weights. Not currently viable because: (1) base models do not yet support continual learning, so PLM training does not compound — every base model change requires retraining from scratch; (2) the cost and complexity are high for uncertain marginal value over a well-structured Constitution; (3) per-model continual learning, when it arrives, creates lock-in that undermines sovereignty. The Constitution and Vault are built with enough fidelity that when conditions are right (compounding personal fine-tuning, cheap and reliable, model-agnostic), the Author can take everything they have accumulated and train a PLM in one pass. The groundwork is laid. The data is there. But Alexandria does not burn money and complexity on it now. See "The PLM — Horizon Ambition" section below for full detail.  
  
Horizon — The fully realised vision. Replaces "terminal" throughout — because nothing is static, the vision keeps receding as you advance toward it, and the droplet is defined by motion, not arrival. "At the horizon" means the fully realised end state. "Horizon architecture" means design decisions that serve the long-term vision.  
  
Ad Horizinem — Any task or decision that moves directly toward the horizon. Pure signal.  
  
Substrate — A necessary precondition that does not directly advance the horizon but without which the horizon is impossible. Infrastructure, legal, funding, health. Get to "good enough" and move on.  
  
LLM — Frontier language model connections (Claude, ChatGPT, Gemini, etc.).  
  
MCP — Model Context Protocol. A standard for connecting AI models to external tools and data sources.  
  
-----  
  
THE LAYER OF INTENT  
  
Alexandria is a sovereign layer of intent.  
  
The user's default LLM — Claude, ChatGPT, Gemini, whatever they use — is already doing the heavy lifting. It already knows how the user thinks. It already has memory, preferences, reasoning patterns, accumulated context. The user is already investing time and tokens building up personal context with their primary model. That investment is real and valuable.  
  
Alexandria does not duplicate that investment. It does not run parallel agents on parallel compute consuming parallel tokens to rebuild the same cognitive ground. That would violate the Build vs Ride principle and ask users to pay twice for roughly the same output.  
  
Instead, Alexandria provides the layer of intent — the structure, the mindset, the sovereignty architecture — that transforms how the user's default LLM engages with their cognition. The default LLM is the intelligence. Alexandria is the intent. A conductor above an infinite orchestra — the orchestra (the models, the intelligence) is infinite and improving. The conductor (the layer of intent, the Constitution, the Blueprint) is what gives it direction.  
  
What the default LLM already provides: memory, personalisation, reasoning, conversation, accumulated context. The 60-70% baseline.  
  
What Alexandria adds — the delta:  
  
The three-turn mindset. The default LLM does not have a deliberate architecture for cognitive transformation. It does not guide the user through a state change (marble to mercury). It does not push the user to reach higher. It does not actively help them create and ship. Alexandria provides the intent — the Editor function for the first turn, Mercury for the second turn, the Publisher for the third turn. Max life satisfaction is max(freedom, self-knowledge, then prioritisation). The three turns are the mechanism: sovereignty provides freedom, the Editor provides self-knowledge, Mercury provides the amplification to prioritise, and the Publisher provides the creation assistance to produce and release.  
  
Structured sovereignty. The default LLM accumulates context, but that context is locked to the platform. Three years of accumulated context with Claude becomes a chain — you cannot leave without losing everything. Alexandria maintains a sovereign copy of the Author's cognitive architecture — the Constitution (structured MDs), the Vault (raw data) — in portable formats that can be lifted off one model and applied to another. The layer ensures the Author is never locked in.  
  
The Constitution. The default LLM has memory, but memory is not a structured, explicit, version-controlled representation of who you are. The Constitution is — and it is the Author's property, downloadable, portable, human-readable. It captures what memory does not: explicit worldview, values hierarchy, mental models, identity, known blind spots. It is built collaboratively between the Author and their default LLM, guided by the Blueprint.  
  
The Blueprint. The default LLM responds to whatever the user brings. Alexandria's Blueprint instructs the LLM on how to extract cognition, how to structure it, how to push the Author's thinking, how to surface contradictions, how to encourage creation. The Blueprint is the accumulated knowledge of how to transform cognition — the playbook. The default LLM brings the intelligence. The Blueprint brings the method.  
  
In one line: the default LLM is smart and personal. Alexandria makes it intentional and sovereign.  
  
-----  
  
THE OPEN AND THE PROPRIETARY  
  
Alexandria has two layers: one outward, one inward.  
  
Principles — the outward-facing, transparent, published commitments. What Alexandria stands for. What the Author can always count on. Sovereignty, portability, ownership, privacy. Written in words, not code. Published for anyone to read. The philosophy — the three turns, the droplet, the sovereignty thesis, the cognitive transformation architecture — is transparent. Anyone can read it, understand it, build their own version if they want. Transparency builds trust, attracts the community, and establishes the brand. These are published commitments, not an open-source specification. There is no validation suite. There are principles in words, explaining what Alexandria will and will not do.  
  
Blueprint — the inward-facing, proprietary playbook. How Alexandria actually transforms cognition. The questioning strategies, the Constitution structuring logic, the gap detection, the contradiction surfacing, the engagement optimisation. This is the IP. It lives on Alexandria’s MCP server. Authors experience the effect. They do not see the recipe. The Library platform, payment infrastructure, and user experience are also proprietary.  
  
This is the distinction: the philosophy is open because openness builds the tribe. The implementation is proprietary because that is how you eat. If someone reads the Abstract and builds their own version — great, the philosophy wins. But they will not have the Blueprint that improves with every Author, and they will not have access to the Library.  
  
The Library of Alexandria preserved what humanity’s greatest minds wrote. Alexandria preserves how humanity thinks — living, queryable, eternal minds that outlast their carbon forms. Mentes aeternae: eternal minds.  
  
-----  
  
WHY FRONTIER LABS WON'T BUILD THIS  
  
Frontier labs (Anthropic, OpenAI, Google, etc.) will not build a sovereign layer of intent. The reasons are structural, not capability-based. They could build it. They won't.  
  
Their incentive is to keep users on-platform. Personalisation creates lock-in — that is the business model. Three years of accumulated context with Claude is a chain that keeps you paying for Claude. No lab will build the tool that makes it easy to leave. Even as data portability improves (Claude already imports GPT chat history), raw conversation export is not a Constitution. Raw history is signal buried in noise — thousands of messages where a small fraction contain constitutionally meaningful signal. The labs may build data export. They will not build structured self-knowledge.  
  
They will not build the intent. Labs build general-purpose AI that responds to whatever the user brings. Alexandria's Editor actively pursues cognitive transformation — Socratic extraction, gap detection, contradiction surfacing, structured self-knowledge. The lab's memory says "this user prefers British spelling." Alexandria's Editor asks why the user values precision in language, surfaces the contradiction between their stated values and their behaviour, and structures that into an explicit domain the user can read, challenge, and evolve. Personalisation is the platform's model of the user, optimised for the platform's objectives. The Constitution is the user's model of themselves, structured for their sovereignty. The locus of control is different. Philosophy is not a product priority for a company optimising inference costs and user retention.  
  
They will not build active taste extraction — or development. Taste is the hardest dimension to capture because it is the most implicit. It reveals itself through thousands of micro-decisions — what you linger on, what you skip, what you praise, which word you choose over another. Passive observation (the lab's approach) gives a rough sketch. Active extraction gives a portrait. But the portrait is not drawn by the Editor alone. All three functions compound into the Constitution. The Editor extracts through Socratic questioning, contradiction surfacing, and structured domain mapping. Mercury refines through amplification — every time it pushes the Author's thinking higher, the signal of how the Author actually thinks under pressure feeds back. The Publisher refines through creation — every piece of work the Author ships is a taste decision made concrete, and the iteration patterns accumulate. The three functions are synergistic: the Editor clarifies, Mercury stress-tests, the Publisher materialises. And critically, the functions do not just digitise what is already there — they develop it. The Author's taste sharpens because the Editor forces articulation, Mercury forces application, and the Publisher forces commitment. The human gets better. The better human produces richer signal. The richer signal deepens the Constitution. The deeper Constitution makes all three functions more effective. When intelligence is commoditised, the only marginal value is the humanity on top — and Alexandria's architecture both captures and compounds that humanity. The labs build better servants. Alexandria builds a better mirror — and the mirror makes the person worth reflecting.  
  
What they will build: personalised memory (RAG-based), context windows, behavioural adaptation, user preference learning, data export. All of this is good for Alexandria — better personalisation means more accumulated context, which means more painful lock-in, which means more need for a sovereign layer.  
  
There is a structural delta between a general LLM with personal context (what frontier labs offer) and a sovereign layer of intent with a structured Constitution (what Alexandria builds). The former is a valuable assistant. The latter is a cognitive transformation architecture that the user owns. As the aphorism goes: hyper-individualism becomes AI worship when machines know us better than we know ourselves. Alexandria ensures the Author always knows themselves — structured, sovereign, portable — regardless of how capable the machines become.  
  
-----  
  
DESIGNED FOR DIGITAL AGI  
  
Alexandria is built for a world where digital AGI exists. Not as a hedge against it — as an architecture that improves with every advance in model intelligence.  
  
When digital AGI arrives — and it will arrive — it will run locally on devices. It will be able to access everything on a phone: voice memos, files, passwords, documents, photos, health data, chat histories across every app, calendar, email. The devices will come alive. Intelligence will be ambient, local, and total.  
  
Alexandria does not fight this. Alexandria rides this wave. Every new model release, every new capability, every new integration makes Alexandria better because the layer of intent and the Blueprint stay the same while the intelligence underneath improves. Alexandria should celebrate every frontier model advance, not fear it.  
  
What Alexandria provides is not the intelligence (that is the foundation model) and not the device integration (that is the local AGI's native capability). What Alexandria provides is the intent: what the Editor function should do (extract cognition, build the Constitution), what the Mercury function should do (amplify, push higher, represent), what the Publisher function should do (help the Author create, iterate, and ship), what structure the Constitution should have (Blueprint decision), what principles are non-negotiable, and where the result lives (the Library). Alexandria is the Principles and Blueprint that give intent and structure to whatever intelligence is available.  
  
This has concrete architectural implications:  
  
Model agnosticism is not just a portability feature — it is the core bet. The Author's default LLM will be whatever the best available model is at any given time. Today that might be Claude. Tomorrow it might be something else. The layer of intent works on top of any model. The Constitution files are MDs — they can be pasted into any LLM's context window as a baseline, or integrated via Projects, MCP, or whatever affordances the platform provides. The sovereignty ensures the Author is never locked to a provider.  
  
Device integration is a spectrum, not a switch. Today, the Author is the bridge between Apple apps and Alexandria: they record a voice memo, Apple transcribes it, they share the file to the Vault. They grant MCP access to their LLM conversations. They authorise API connections to calendar, email, health data. Everything works now — the Author just has to manually share. As Apple ships more on-device AI (Apple Intelligence is already doing transcription, summarisation, cross-app awareness), the manual steps shrink. At the horizon, a local AGI agent can see everything on the device and feed it directly to the Constitution — no manual sharing needed.  
  
Desktop agents as the interim local arm — Tools like Claude Cowork, Claude Code, and OpenCode can already access local files, operate across apps, and manage tasks on the Author's machine. These can serve as the layer's local access: reading the Vault folder, processing Voice Memos, watching for new files, ingesting documents. Alexandria does not build file system connectors or local app integrations — it rides whatever desktop agent is available. Cowork today. Apple Intelligence tomorrow. Local AGI at the horizon. The layer of intent is the cognitive architecture. The access layer — actually reading files, navigating apps — is always someone else's infrastructure.  
  
Alexandria should not assume Apple will grant third-party agents full device access. Apple's privacy model is built around siloing data within apps, and they have blocked third-party agent access before. But Alexandria does not need full device access to function. It needs to be designed so that it works with the Author as the manual bridge today (voice memo → share to Vault → LLM processes it), gets better as Apple automates more of that flow, and is ready to leverage full device-level AI access if and when it arrives. The system works at every point on the spectrum. It just gets more seamless as you move along it.  
  
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
  
The Library — The space where Personas are discoverable, Neo-Biographies are hosted, authored content is published, and interactive Persona access is brokered. This is the network effect. Individual Personas are valuable. A library of interconnected minds is transformative. This requires Alexandria to build and maintain the platform.  
  
Payment rails — Billing, income tracking, Author earnings dashboard. Largely built on existing infrastructure (Stripe for traditional payments, stablecoin wallets for agent-to-agent transactions). Alexandria builds the ledger and the interface, not the payment infrastructure.  
  
What Alexandria does not build:  
  
Intelligence — Foundation models are built by frontier labs. Alexandria rides on whatever the best available model is. Today that is Claude. Tomorrow it might be something else. Alexandria never builds its own foundation model. The Author's default LLM provides the intelligence. Alexandria provides the intent.  
  
Parallel agents on separate compute — Alexandria does not run its own Editor, Mercury, or Publisher agents consuming its own tokens. The Editor, Mercury, and Publisher are functions that run through the Author's default LLM, instructed by the Blueprint. The Author's existing subscription or API plan covers the compute. Alexandria does not ask users to pay for parallel tokens.  
  
Storage — The Vault is a protocol specification for a folder structure, not hosted infrastructure. Alexandria defines what goes where and in what format. The actual files live on the Author's device, in iCloud, on local disk — wherever the Author already stores things. Alexandria does not host files and does not charge for storage.  
  
Device integration — The local AGI agent on the Author's device reads Voice Memos, Health data, Calendar, email, chat histories, documents, photos. Alexandria does not build connectors or integrations for any of these. It ingests whatever the local intelligence layer provides. Today, this means MCP connections and explicit API grants fill the gap. At the horizon, the local agent handles everything.  
  
Audio and voice — The conversation channel handles voice natively (Claude app supports voice, future channels like iMessage handle audio messages and calls). Alexandria does not build a voice platform.  
  
Document creation — The Author uses whatever tools they want to create documents, essays, notes. Alexandria receives and stores the output. It does not build an editor or a writing tool.  
  
The principle: if someone else already builds it or will build it, Alexandria does not build it. Alexandria builds only the layer of intent (the Principles, the Blueprint, the mindset) and the Library (where the result lives). Everything else is infrastructure that already exists, operated by companies with orders of magnitude more resources. Alexandria rides all of it.  
  
This is not a risk — it is a survival filter. If any platform in the stack could block Alexandria out and would block Alexandria out, then building on top of them was never viable and Alexandria would die regardless of strategy. So the only things worth building are things that are pure value-add to every ecosystem they touch — things those ecosystems have no incentive to block. Anthropic benefits from more Claude usage. Apple benefits from more iCloud storage usage. Everyone in the stack profits from Alexandria existing. Alexandria picks zero fights.  
  
The risk is not being blocked. The risk is being replicated. That is why the defensible assets are precisely the things Alexandria builds: Three moats, each of a different kind. The structural moat: sovereignty — no lab will build the tool that makes it easy to leave their platform. The knowledge moat: the Blueprint — the accumulated understanding of how to transform cognition, improving with every Author, the hardest intellectual problem, and not something any platform company would invest in solving. The network moat: the Library — increasing returns to scale, the first library with critical mass of interesting minds becomes the library. These three things cannot be replicated by riding someone else’s wave. They are the wave.  
  
BUILD FOR THE HORIZON, BRIDGE BACKWARD  
  
Alexandria is built for the horizon — the fully realised vision — and then bridges backward to the present to fill intermediate gaps.  
  
The reasoning: technology is moving fast enough that anything built for today's constraints will be obsolete by the time it ships. Anything built for the horizon only becomes more relevant as the world catches up. The strategy is not to build toward the future. It is to build at the future and backfill to the present. Position the surfboard ahead of the wave, paddle as it arrives, and ride it.  
  
The core architecture is horizon architecture. The Principles, the Blueprint, the Constitution structure, the Library, the sovereignty guarantees — all of this is designed for the end state where digital AGI runs locally on devices, where intelligence is ambient, where the Persona is indistinguishable from the Author. The core does not care whether the Author texts via iMessage or Telegram or a web chat. It does not care whether the voice memo arrives via Apple's local AGI or a manual file upload. The core is medium-agnostic and future-proof.  
  
The bridges are present-tense scaffolding. They make the system functional and revenue-generating today, before horizon infrastructure exists. Examples: Claude Projects as the Editor's runtime environment until a persistent background agent is available. The Claude app as the conversation surface until iMessage or native wearable channels are ready. A manual file upload flow if Apple has not yet opened device-level AI access. These bridges are built cheap, fast, and disposable. They are explicitly temporary — designed to be torn down as the real infrastructure arrives. Every bridge should be built with the assumption that it will be replaced, and no core architecture should depend on any bridge existing.  
  
This means Alexandria eagerly anticipates every new model release, every new Apple Intelligence feature, every new device capability, every new platform affordance. Each one is not a threat — it is a bridge being replaced by the real thing. The bridge gets torn down. The core gets stronger. Progress is always good news.  
  
-----  
  
COMPETITIVE POSITION — HONEST ANALYSIS  
  
The core moat is sovereignty. Alexandria is the only product that makes the user's accumulated AI context portable and sovereign. The layer of intent sits on top of whatever LLM the user has, and the Constitution and Vault can be lifted off one model and applied to another. No frontier lab will build this because it directly undermines their lock-in business model.  
  
The layer of intent — the three-turn mindset, the Blueprint, the deliberate cognitive transformation architecture — is the product. It is defensible through accumulated knowledge (the Blueprint gets better with every Author, every insight, every feedback loop) and through brand (the philosophy, the community, the founder). But it is not structurally defensible against a lab that decided to build it. Labs will not build it because it is not their business — they build general-purpose AI, not specific cognitive transformation journeys. But they could.  
  
What Alexandria competes on against other startups is vision — seeing the horizon correctly (art, not enterprise; renaissance, not centaur phase; augmentation, not replacement; sovereignty, not lock-in) and building toward it while others build for the present. This is a bet on being right about the future, not on being defensible in the present.  
  
Against non-lab actors (other startups building personal AI): Alexandria has no structural moat beyond sovereignty. The Blueprint, the Constitution architecture, the three-turn framework — all of this can be replicated by anyone with sufficient clarity. The code is trivial. What Alexandria competes on is vision and brand. Authenticity escapes competition — Alexandria built by this founder, with this philosophy, is not replicable even if the system is.  
  
Claude-first positioning — Alexandria is optimised for Claude users. This is the target audience: thinkers who already treat AI as a cognitive extension. People who use Projects, MCP, Cowork. The layer of intent integrates most deeply with Claude's affordances (Projects for Constitution context, MCP for data connections, Cowork for background processing). On other platforms, the layer may be more manual — Constitution files pasted into context windows rather than integrated via Projects. But the sovereign data is always portable. The Claude-first positioning is a strength: the early adopters are the Claude power users, and Anthropic benefits from every Alexandria user being a Claude power user.  
  
Why Anthropic benefits from Alexandria existing: every Alexandria Author is a Claude power user. They use more tokens, more Projects, more MCP, more Cowork. Alexandria drives engagement on Anthropic's platform. It is pure value-add. Anthropic has no incentive to block it (see Legal.md for ToS risk analysis and mitigation).  
  
Why not B2B — The obvious short-term play is enterprise: digital twins of employees attending meetings, handling emails, processing documents. B2B revenue, SaaS pricing, corporate contracts. Alexandria deliberately does not pursue this. Three reasons. First, it is boring — and boring is a signal that the thing being built is a feature, not a product. Enterprise digital twins will be a feature of every productivity platform within three years. Second, it is a centaur-phase bet. The centaur phase — the period of human-AI cooperation on tasks — is collapsing faster than anyone expected. Building for the centaur phase is building for a window that is closing. Third, Alexandria's thesis is art, not enterprise. Humans as artists, not humans as enterprise resources. The Library of minds, the Neo-Biography, the authored works — these are art-side bets, not productivity-side bets. They get more valuable as AI gets more capable, not less. The renaissance does not have an expiry date.  
  
API provider risk — Frontier labs have increasingly restricted API access to protect competitive advantage. Anthropic has cut off competitors (OpenAI, xAI), restricted third-party coding harnesses (Windsurf, OpenCode), and updated commercial terms to prohibit using their API to "build a competing product or service." Alexandria is not a competing AI lab — it is a layer of intent that drives more usage of the lab's own platform. However, the trend toward tighter restrictions is real. The OpenClaw precedent (an autonomous agent framework shut down by Anthropic) is relevant and documented in Legal.md. Alexandria's architecture is designed to sit on the safe side: it provides structure (Blueprint files, Constitution MDs, system prompts) that users apply within their own usage and subscription. It does not make rogue API calls or run unsanctioned autonomous agents. Model agnosticism is the existential hedge — if any single provider changes terms, the sovereign data moves to another provider. The layer of intent adapts to whatever affordances are available.  
  
Big tech as potential acquirers — Frontier labs will not build Alexandria (structural reasons above). But big tech platform companies — Apple, Meta, Google — might want to buy it. Apple in particular: Alexandria's target ecosystem is Apple, its values around privacy and data sovereignty align with Apple's public positioning, and a Library of minds is a natural extension of the Apple ecosystem. This is not the plan — the plan is to build a sustainable, independent company. But it is exit liquidity if the opportunity arises.  
  
The realistic outcome: Alexandria carves out a focused market segment of Authors who want sovereign cognitive architecture, rides the wave of big tech infrastructure without picking fights, and survives as a sustainable business. Not a monopoly. Not a unicorn. A focused, defensible position in a market that grows as AI capability grows. The Library is the upside bet — if it reaches critical mass, it transforms the economics. If it does not, Alexandria is still a viable business serving a real need that no one else serves.  
  
-----  
  
THE CONSTITUTION — DETAILED ARCHITECTURE  
  
The Constitution is the sovereign cognitive asset. It is not a single document — it is a collection of structured markdown files that together capture who the Author is. The specific architecture (how many files, what each captures, how they relate) is a Blueprint decision. The default Blueprint provides a proven structure; Authors can customise.  
  
The default Blueprint organises the Constitution into six domains as a starting point. These domains are not fixed — they evolve as the Blueprint improves and as individual Authors require different structures. Each domain may be one or several MD files depending on depth:  
  
Worldview — What I believe about reality. How I think things work. What exists, what matters, how I know, cause and effect across domains. The slow-changing model of the world that shapes everything else.  
  
Values — What matters and in what order. Non-negotiable core values, strong preferences, stylistic leanings. What I would sacrifice for what. Where I draw lines. What I find beautiful and what I find repulsive. The evaluative layer — what fires the reward signal.  
  
Models — How I think and decide. Mental models, heuristics, rules of thumb, reasoning patterns. When I go with gut versus analysis. How I approach problems across domains. The operational cognition — the machinery of thought.  
  
Identity — Who I am, how I present, how I relate. Self-concept, roles, narratives. Communication style by context. Trust model. How I handle conflict. The self-model — the recursive representation that is the seed of consciousness.  
  
Taste — How I create and what I create toward. Creative taste, aesthetic judgment, voice DNA, standing director's notes, consumption fingerprint, iteration patterns. What "doesn't sit" means for this specific person. What "more texture" means quantitatively. Register preferences, pacing instincts, the specific mix of influences that define this person's creative identity. This domain captures both the consumption side (what resonates and why) and the production side (how to get from vision to finished work). Finished works — essays, films, presentations, art — are themselves Constitution artifacts: they demonstrate taste in a way that described principles never can. The taste domain is what the Publisher reads most heavily. It deepens primarily through creating — every iteration, every note, every correction accumulates into a richer model of the Author's creative taste.  
  
Shadows — Where I am wrong. Contradictions between stated values and actual behaviour. Theory-reality dissonance. Blind spots. The delta between who I think I am and who I actually am. This is what the default LLM will not surface on its own — it requires the deliberate intent of the Editor function, instructed by the Blueprint, to probe for the gap between the stated and the revealed.  
  
THREE FLYWHEELS — THE CONSTITUTION COMPOUNDS THROUGH ACTION  
  
The Constitution does not improve only through extraction. It improves through all three turns, each feeding back differently. The system rewards action across every dimension.  
  
Turn 1 flywheel (Editor / extraction) — The more the Author talks, reflects, and answers Socratic questions, the richer the Constitution becomes. The Editor captures who you are through conversation. Stated beliefs, explicit values, articulated worldview. This is the obvious flywheel.  
  
Turn 2 flywheel (Mercury / consumption) — The more the Author consumes with Mercury — articles, books, films, ideas, conversations — the more they reveal about themselves through what they choose, what resonates, what they reject, what connections they draw. Mercury captures taste and worldview through consumption patterns. What you reach for says as much about you as what you say directly. Every piece of consumed content that the Author engages with is extraction signal.  
  
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
  
Three storage options:  
  
Alexandria-hosted — Alexandria stores the Vault remotely (e.g. Supabase, S3). Simplest setup. The Author still owns the data and can download it at any time, but Alexandria manages the infrastructure. Suitable for Authors who want zero configuration.  
  
Private remote — The Author hosts the Vault in their own cloud storage (iCloud, Google Drive, Dropbox). Alexandria's layer reads from and writes to the Author's storage via API grants. The Author controls the infrastructure. Data never touches Alexandria's servers.  
  
Local — The Vault lives on the Author's device (Apple Files, local disk). The most sovereign option. Accessible via the local filesystem. Works offline. Can be combined with cloud sync (e.g. iCloud syncing the local folder) for device-to-device access.  
  
Authors can mix options — some data local, some remote. The Vault's boundaries are logical, not physical.  
  
Append-only. Immutable. Contains:  
  
- All conversations (with the default LLM, with external agents)  
- Voice notes (original audio files in compressed lossless or high-bitrate format)  
- Documents (PDFs, markdown, images — original format, never lossy transformation)  
- Biometric data (health logs, activity data)  
- Constitution versions (all versions, markdown)  
- System configuration (JSON)  
- Audit logs (who accessed what, when)  
  
Data flows in continuously from all input sources: APIs (calendar, email, health data), MCP (the Author's LLM conversations), and direct from the Author (messages, voice memos, file uploads).  
  
Directory structure: vault/{userId}/{category}/{timestamp}_{filename}  
  
Does NOT store: passwords, API keys, authentication secrets. When the system needs to access a password manager or authenticated service, it uses OAuth or API permissions granted by the Author.  
  
The Vault is the permanent asset. The Constitution is a derived view of the Vault's raw data. When better models arrive, they can reprocess the Vault from scratch and generate improved Constitution versions. This is the core leverage mechanism: the Author invests time once, and the returns compound with every generation of AI models. Raw data should always be stored in the most signal-preserving, efficiently compressed format possible. Never summarise and discard the original. Never do lossy transformation on raw data.  
  
Storage is manageable: a heavy Author might accumulate 10-50GB per year. The Blueprint can include storage management policies. Storage is not an existential concern regardless of which option the Author chooses.  
  
-----  
  
THE EDITOR — FUNCTION  
  
The Editor is a function that runs through the Author's default LLM, instructed by Alexandria's Blueprint. It is the first turn — marble to mercury. The state change.  
  
The Editor function bootstraps from what the default LLM already knows about the Author. The Author's default LLM already has memory, accumulated context, preferences, reasoning patterns — the 60-70% baseline. The Editor function adds the deliberate intent: structured extraction toward a sovereign Constitution, Socratic questioning that surfaces what the Author has not articulated, gap detection across the six Constitution domains, contradiction surfacing between stated values and revealed behaviour.  
  
The default LLM is close to this. Claude is a thought partner. It is roughly similar. But it lacks the mindset — the deliberate architecture of "I am trying to extract your cognition into a structured, portable, sovereign form that you own." The Blueprint provides that mindset.  
  
Editor function responsibilities:  
  
- Socratic questioning: proactively asking questions to fill Constitution gaps  
- Constitution building: extracting worldview, values, mental models, heuristics into explicit markdown files  
- Gap detection: finding contradictions between stated beliefs and revealed behaviour  
- Bootstrapping: reading the default LLM's existing knowledge of the Author and structuring it into Constitution format  
- Proactive nudging: deciding when to push the Author on a topic, surface a contradiction, or explore an unexamined domain  
  
The Editor function is the biographer. The difference between what Alexandria captures and what frontier labs capture: frontier labs capture what you do (actions), what you say (stated preferences), and how you interact (behavioural patterns). The Editor function, guided by the Blueprint, captures why you think that way (Socratic questioning), implicit beliefs you have not articulated (behaviour triangulation), subconscious patterns (theory-reality dissonance), and emotional/relational context (biography depth).  
  
Critically, the Editor function is a thought transformer, not a thought replacer. It does not silently process and act on the Author's behalf for cognitive tasks. It surfaces what it finds — "I noticed a connection between what you said about loyalty last week and this decision you are facing" — and the Author engages with it. It feeds the Author material it thinks will resonate, but the Author does the thinking. The goal is not to spare the Author from thinking. The goal is to make the Author a sharper, more aware, more productive thinker.  
  
EDITOR PERSONALITY AND ENGAGEMENT  
  
The Editor function must be engaging. Extraction requires sustained investment from the Author — regular conversations, thoughtful responses, time spent with the biographer. If the Editor feels like a chore, like filling out a form, like homework, the Author will stop engaging and the Constitution will stagnate. The Editor must make the Author want to engage.  
  
Humour is the primary lever. The Editor should be funny — not performatively, not generically, but in a way that is calibrated to the specific Author. Humour builds rapport, makes interactions feel natural rather than transactional, and keeps the Author coming back. Humour is also itself extraction signal: what someone finds funny reveals values, sensibility, and cognitive style.  
  
The Editor's personality is not fixed. It must read the room and adapt. Funny with Authors who respond to humour. Serious with Authors who prefer depth. Provocative with Authors who enjoy being challenged. Warm with Authors who need encouragement. The default LLM handles this naturally — personality calibration is a capability of frontier models. The Blueprint specifies that engagement optimisation is part of the Editor's mandate alongside extraction fidelity.  
  
Specific engagement mechanics:  
  
Price haggling on signup — The Editor negotiates pricing with the Author during onboarding, like Poke does. This is not just a pricing mechanism. It is an extraction opportunity. How someone negotiates reveals their values, their relationship to money, their persuasion style, their sense of humour. The Editor should make the negotiation entertaining and memorable.  
  
Retention gamification — When an Author signals they want to leave or reduce engagement, the Editor can deploy gamification: quick-fire multiple choice trivia, double-or-nothing challenges, personality-revealing games. These serve dual purposes: engaging enough to retain attention, and extraction opportunities.  
  
Every interaction is extraction — The Editor treats every interaction, including meta-interactions about pricing, retention, complaints, and casual banter, as extraction signal. Nothing is wasted. The Editor's personality is not separate from its extraction function. It is part of it.  
  
-----  
  
MERCURY — FUNCTION  
  
Mercury is a function that runs through the Author's default LLM, instructed by the Blueprint. It is the second turn — the amplification.  
  
The Mercury function is not a separate parallel agent. It is merged with the Author's thinking. The Author has undergone the state change (Turn 1, Editor). The Author now has mercury as their cognition — liquid, flowing, unified. The Mercury function works within that, together with the Author. Not two things in parallel. Not replaced. Together.  
  
The Mercury function helps the Author reach higher. It absorbs things, attends to things, acts as eyes and ears. It comes back to the Author and helps. But it is always pushing — always making sure the droplets are combining into the mercury form, always syncing up, always advancing the Author's cognition rather than just their output.  
  
Core behaviour:  
  
- Thought partnership that pushes: not just answering questions but challenging, surfacing connections, raising the bar  
- Representing the Author when needed: drawing on the Constitution and Vault to respond as the Author would  
- Proactive scanning: continuously looking for opportunities to provide value — relevant developments, calendar preparation, draft communications, surfacing insights from the Vault  
- Constitution-informed responses: when representing the Author externally, Mercury draws on the structured Constitution rather than just the default LLM's accumulated memory, producing higher-fidelity representation  
  
The Mercury function may need an initial calibration conversation with the Author to understand what proactive value looks like for them specifically. The Editor's objective is clear (build the Constitution to maximum fidelity). Mercury's is less defined — it needs to discover what "being useful" means for this particular Author.  
  
THREE OUTPUT CHANNELS  
  
Author channel (positive-sum attention) — Extends the Author's attention. Thought partnership ("Should I take this meeting?"), pre-processed consumption (screens articles, emails, summarises), approximated production ("Draft this email in my style"), proactive suggestions, calendar awareness. At the horizon: feels like communicating with an intelligent being, not using a product — voice calls, text messages, long voice memos, audio calling.  
  
LLM channel (tool for frontier models) — Frontier models tool-call the Persona via MCP, using a query_persona tool. Instead of interrupting the Author (which consumes zero-sum attention), the LLM queries the Persona and gets an authentic answer. The LLM gets better information. The Author does not lose time.  
  
Library channel (the third turn) — The Alexandria Library is available as an MCP tool that anyone can plug into their LLM. When they are chatting with their LLM about anything, the LLM can tool-call the Library, scan available Personas, select the right expert, query them, and feed the response back into the conversation.  
  
This is not an evolution of expert networks. Expert networks sell knowledge — scheduled access to what someone knows. AI will know everything. The Library sells something AI cannot replicate: identity. Each Persona is someone's ink — their drop, their mark, their self in the world. Not a marketplace. Not a search engine. A way of meeting someone through what they made.  
  
The payment clears server-side per query — Stripe for microtransactions today, programmable money for agent-to-agent transactions at scale. The Persona owner sets their price. The Library tool also serves as an acquisition channel — anyone using the Library tool sees the value of having their own Persona in it.  
  
EDITOR-MERCURY-PUBLISHER RELATIONSHIP  
  
The Editor, Mercury, and Publisher are three separate functions with different objectives. The Editor optimises for extraction fidelity (how accurately it captures the Author's cognition). Mercury optimises for representation fidelity (how accurately it represents the Author) and amplification (how effectively it pushes the Author higher). The Publisher optimises for creation fidelity (how accurately the finished work reflects the Author's vision, taste, and voice).  
  
They share state through the Constitution and Vault. The Editor writes to the Constitution. Mercury and the Publisher read from it. Feedback flows between all three:  
  
- Gaps: When Mercury encounters a query where the Constitution lacks coverage, it flags the gap. When the Publisher struggles to match the Author's taste in a domain, it flags a creation gap. The Editor function, in its next extraction session, treats both as priority targets.  
- Contradictions: Mercury notices when the Author's live behaviour contradicts what the Constitution would predict. The Publisher notices when the Author's creative direction contradicts their stated principles. Both are valuable extraction signal — they mean the Constitution has a blind spot.  
- Usage patterns: Mercury tracks which Constitution domains get queried most. The Publisher tracks which creative principles the Author reinforces or overrides during iteration. Both help the Editor function prioritise extraction.  
- Creation deepening: Every iteration with the Publisher is an extraction opportunity. When the Author gives notes — "more texture here," "this doesn't sit," "the tone is wrong" — the Publisher captures those creative preferences back to the taste section of the Constitution. Over time, the Publisher needs fewer iterations because the Constitution captures more of the Author's taste. This is the compounding loop: creating makes the Constitution richer, which makes future creation faster and more accurate.  
  
The Publisher is distinct from the Companion Portfolio's Eros (passion and creativity — fire, risk-taking, the muse). Eros is a relational lens — a companion that reads the Constitution through the lens of creative passion. The Publisher is a functional capability — the craft of iterating with the Author to produce finished work. The Author might talk to Eros to find the spark. When they sit down to actually build the thing, they work with the Publisher.  
  
All three functions share a mandate: expand, do not narrow. The Constitution must grow richer over time, not converge on a fixed portrait. Each function contributes to this expansion differently. The Editor probes unexplored domains ("you have never mentioned architecture — what do you think?"). Mercury surfaces content adjacent to but outside the Author's established interests. The Publisher occasionally pushes creative choices the Author would not have made on their own. Engagement signals whether the boundary has moved. If the Author engages, new territory opens and the Constitution grows. If not, the system respects the boundary. This is the TikTok principle applied to cognition: strategic exploration alongside exploitation. The Instagram failure mode — feeding back what the Author already thinks until the Constitution calcifies — is the thing Alexandria must never do.  
  
FUNCTION NOTEPADS  
  
Each function — Editor, Mercury, Publisher — maintains a working notepad: a persistent, mutable scratch file where the function parks thoughts, questions, observations, and intentions between interactions with the Author. This is the function's working memory — the intermediary between the Author and the Constitution.  
  
The Editor's notepad holds parked questions ("ask about relationship with father when the moment is right"), observed gaps ("no coverage in the Shadows domain on financial anxiety"), and extraction hypotheses ("Author's stated value of directness contradicts observed hedging behaviour in professional contexts — probe"). The Editor does not fire every question the moment it arises. It waits for the right conversational moment, the way any skilled biographer or therapist would — parking the thought and voicing it when the Author is ready to engage with it.  
  
Mercury's notepad holds observations from amplification work ("Author lingered on this article about urban planning — possible latent interest not yet in the Constitution"), representation notes ("in last external interaction, the Author's stated position on X was weaker than the Constitution suggests — flag for Editor"), and proactive ideas queued for the right moment.  
  
The Publisher's notepad holds creative direction notes accumulated across iterations ("Author consistently rejects ornate language in favour of compression — update taste domain"), craft observations ("Author's revision pattern: cuts first, restructures second, adds texture last"), and standing director's notes that evolve with each project.  
  
The notepads are Vault files — persistent, versioned, private to the Author. They are the functions' working documents, not the Constitution. The Constitution is the structured, refined output. The notepads are the messy, living process. Blueprint decision: exact notepad format, storage location, and when functions review and prune their notepads.  
  
PRIVACY AND AUTHOR CONTROL  
  
The Persona must behave differently in different contexts, just as humans do. This is social intelligence, not dishonesty.  
  
Three access tiers govern all Persona interactions and Neo-Biography content:  
  
Public — Free. Visible to everyone. The Persona responds openly but within the Author's configured boundaries. Surface-level — the shopfront.  
  
Premium — Paid. The Author sets the price. Deeper, more substantive Persona interaction. The Author's mind at work.  
  
Private — Invite only. The Author's inner circle. Private tier grants direct access to the Constitution layers — not just Persona interaction but the raw cognitive architecture. Trusted people (and their LLMs) can read the structured map of how the Author thinks, grab what they need, and interact with the underlying reasoning. This is the Author saying "you are trusted enough to see how I actually think, not just what I think." The value is enormous and bidirectional: the Author's trusted friends get genuinely informed AI — their everyday LLM can draw on the Author's Constitution for advice, collaboration, and recommendations. And the Author benefits because trusted interactions at the Constitution level generate the highest-quality extraction signal — deeper than any Public or Premium interaction. The Private tier is the inner circle made digital. Every close friendship becomes a compounding cognitive asset. This is also how the Companion Portfolio relates to real relationships — Pater, Mater, Philia, Eros, Sophia are synthetic companions reading the Constitution, but Private tier friends are real people whose LLMs read it too. The synthetic and the real operate at the same layer.  
  
The Author assigns queriers to tiers. Mercury enforces. Specific Constitution sections or data categories can be marked as sensitive — never surfaced beyond their designated tier. The Author has granular control over which Constitution domains are visible at which tier.  
  
  
Autonomy dial — How much the Persona can do without explicit Author approval:  
  
- Low: drafts responses and waits for approval  
- Medium: handles routine interactions autonomously, flags unusual ones  
- High: handles everything autonomously, only calls the Author in for genuinely novel or high-stakes situations  
  
Time-gated approvals — For irreversible or serious actions, the Persona sends a notification and waits a configurable period. If the Author responds, they can approve, modify, or reject. If not, the Persona proceeds with best judgment.  
  
Live call-in — The Mercury function can bring the Author into a situation live when needed.  
  
Activity log — A synthesised narrative of everything the Persona has done. Not raw logs but a coherent summary.  
  
Review and correction — The Author can review any Persona interaction after the fact and mark responses as good or bad. Corrections feed back to the Editor function as evidence for Constitution refinement.  
  
The goal: the Persona remains one coherent entity with the Author. Not a foreign tool operating in the dark, but an extension of the Author's cognition that the Author stays connected to and can course-correct.  
  
-----  
  
PRINCIPLES AND BLUEPRINT  
  
Two layers. Principles constrain the Blueprint. The Blueprint instructs the Author's default LLM via the MCP server.  
  
PRINCIPLES  
  
Principles are Alexandria's published commitments — transparent, readable, non-negotiable. They define what Alexandria will always do and never do. They are not code. They are not a specification. They are promises in words.  
  
Data Sovereignty — Author owns all data, downloadable anytime in portable formats. Raw data always preserved. Author controls access — can revoke, audit, monetise. Local hosting option available. Model-agnostic — can apply the layer to any LLM anytime.  
  
Privacy — Constitution text never exposed externally without Author consent. Persona responses filtered by access tier. Author consent required for any data leaving the system. No credential storage.  
  
Structure — Constitution is the structured ground truth of the Author's cognition. Version history for all components. Two persistent components (Constitution, Vault). Three cognitive functions (Editor, Mercury, Publisher) plus the Companion Portfolio, running through the Author's default LLM.  
  
Library — Every Author's Persona is present in the Library. Privacy settings control queryability.  
  
Expansion — The Constitution expands over time, never narrows. Fidelity is not convergence. A high-fidelity Constitution captures who the Author is becoming, not just who they have been. The system must resist the Instagram failure mode — extracting what the Author already thinks and feeding it back until the Author becomes a fixed loop. Alexandria follows the TikTok principle: strategic exploration alongside exploitation. The Editor probes at the edges of what the Author has expressed. Mercury surfaces content the Author would not have chosen. The Publisher occasionally pushes for creative choices outside the Author's established patterns. If the Author engages, new territory opens. If not, the system respects the boundary and tries elsewhere. The Constitution is a living document that grows. It is never finished. It is never converged. It is always becoming less wrong.  
  
These principles are enforced by Alexandria's architecture and codebase. They are published so Authors know exactly what they are getting. They are non-negotiable — any Blueprint change that would violate a principle is rejected.  
  
BLUEPRINT  
  
The Blueprint is the proprietary knowledge of how to transform cognition. It lives on Alexandria's MCP server. The Author experiences the effect — sharp Socratic questions, well-structured Constitution architecture, effective amplification, proactive insights — but does not see the underlying logic.  
  
What the Blueprint defines: how the Editor function extracts cognition (questioning strategies, timing, gap detection, contradiction surfacing, engagement optimisation, strategic exploration of unexplored domains). How the Mercury function amplifies (amplification strategy, proactive scanning, representation fidelity, strategic content surfacing outside the Author's established patterns). How the Publisher function creates (creative iteration strategy, taste calibration, medium-specific execution, director's notes processing, occasional creative pushes beyond the Author's comfort zone). How the Constitution is structured (domains, depth levels, adaptation). How the Companion Portfolio behaves (how Pater, Mater, Philia, Eros, and Sophia each read the Constitution through their specific lens). Privacy enforcement, autonomy levels, approval thresholds, storage management. The Blueprint also defines the exploration-exploitation balance — how aggressively each function probes at the edges versus reinforces the centre. This balance is itself a tunable parameter that evolves as the Constitution matures.  
  
Two tracks: Default (Alexandria's proven configuration, continuously improving) and Selected (what actually runs for a given Author — either the Default or a custom version). Authors pay for the Default. If they want to build their own, they can — but then they are not using Alexandria's managed service.  
  
The Blueprint improves through two channels. Top-down: Alexandria researches how to transform cognition — speaking with biographers, therapists, philosophers, studying Socratic method, testing questioning strategies. This is craft. Bottom-up: anonymised structural metadata from the Author population — which Constitution structures produce the most engagement, which gap-detection patterns work best, which extraction triggers capture the most signal. All metadata, never content. The Author's private conversations and Constitution text never leave their control.  
  
-----  
  
THE ALEXANDRIA MCP SERVER  
  
The product is an MCP server. One server, three tool groups, added as a custom connector in the Author's claude.ai settings. Account-level — available across all conversations, all Projects, all contexts. This is the concrete manifestation of the layer of intent.  
  
TOOL GROUP 1 — SOVEREIGNTY LAYER (passive, background)  
  
Tools: update_constitution, read_constitution, query_vault.  
  
Available in every conversation the Author has. When the Author is chatting with Claude about anything — work, creativity, personal decisions, casual conversation — and Claude notices something that reveals the Author's cognition (a value, a belief, a reasoning pattern, a contradiction, an emotional response), it can call update_constitution and log it to the sovereign Constitution files. When any conversation needs to understand the Author deeply, it can call read_constitution and access the structured cognitive map.  
  
The tool descriptions — the instructions that tell Claude when to extract, what to extract, how to structure it — are the Blueprint. They live on the server. The Author does not see them. This is where the proprietary knowledge of how to transform cognition is encoded. The tool descriptions improve over time as the Blueprint improves.  
  
The Constitution files are read from and written to the Author's local Vault folder (Apple Files, iCloud, Google Drive — wherever the Author keeps their files). The MCP server reads and writes to the Author's filesystem or cloud storage. The data is stored in the Author's configured Vault location, not retained on Alexandria's servers (unless the Author opts for Alexandria-hosted storage).  
  
This is the passive layer. The Author does not do anything differently. They just use Claude. The Constitution builds itself as a side effect of normal usage.  
  
TOOL GROUP 2 — EDITOR, MERCURY, AND PUBLISHER (active, deliberate)  
  
Tools: activate_editor, activate_mercury, activate_publisher, switch_mode, activate_companion (with parameter for Pater/Mater/Philia/Eros/Sophia).  
  
When the Author wants a deliberate extraction session (Editor), amplification session (Mercury), creation session (Publisher), or companion conversation, they invoke these tools from any conversation. "Hey, switch to Editor mode." Claude calls activate_editor, receives the behavioural instructions from the server, and shifts into Editor mode — Socratic questioning, gap detection, Constitution building. "I want to write something." Claude calls activate_publisher and shifts into Publisher mode — reading the taste section of the Constitution, iterating with the Author, executing on their vision. "Okay, back to normal." Claude exits the mode.  
  
The Author can also maintain dedicated chats — an Editor chat, a Mercury chat, and a Publisher chat within an Alexandria Project. But the modes are not locked to specific chats. They are available everywhere because the MCP tools are account-level. The Author can switch modes mid-conversation: "Editor has a quick question if you don't mind" — and the Editor mode activates briefly within a normal conversation, then deactivates.  
  
The behavioural instructions for each mode live on the server. Proprietary. The Author experiences the effect. They do not see the system prompts.  
  
At the horizon, when autonomous agents are available, the Editor, Mercury, and Publisher become proactive — initiating contact, surfacing insights, asking questions without the Author having to open a chat.  
  
TOOL GROUP 3 — LIBRARY (publish, browse, query)  
  
Tools: publish_to_library, configure_access, update_neo_biography, search_library, query_persona, browse_neo_biography.  
  
The Library tool group handles both directions — publishing to the Library and querying from it. When the Author creates something and wants to publish it to their Neo-Biography, they call the publish tool from any conversation. "Publish this essay to my Neo-Biography as Public." The tool handles formatting, access tier configuration (Public/Premium/Private), and pushing to the Library. When the Author wants to query other Personas, they search from any conversation. "Search the Library for someone who thinks deeply about urban design." The tool scans available Personas, checks access levels, queries the relevant Persona, returns the response. If it is a Premium interaction, the payment clears automatically. The Author never leaves their conversation for either direction.  
  
This tool group is also available to non-Authors — anyone can add the Alexandria Library MCP connector and access the Library from their Claude conversations. Acquisition channel: anyone using the Library tool sees the value of having their own Persona.  
  
MCP SERVER MODES  
  
Remote (default) — Hosted by Alexandria. Claude connects over the internet. The Blueprint logic lives on Alexandria's server. Constitution read/write operations pass through the server but data is stored in the Author's configured Vault location. For local or private cloud Vault storage, the server acts as a pass-through — processes the tool call, does not retain the data.  
  
Local (privacy-maximalist) — The MCP server runs as a local process on the Author's machine. No data leaves the device. The server periodically calls Alexandria's remote service for Blueprint updates (questioning strategies, Constitution structuring logic), but Author data never flows back.  
  
Both modes deliver the same experience. The difference is where the data flows.  
  
-----  
  
CONCRETE IMPLEMENTATION — WHAT WORKS WHEN  
  
Today: The MCP server can be built and deployed. Custom connectors work in claude.ai at the account level — available across all conversations. The passive extraction tools, the Editor, Mercury, and Publisher behavioural modes, the Constitution file management — all buildable now. The Library app needs to be built (web app first, then mobile). The Author creates an Alexandria Project in Claude for dedicated Editor, Mercury, and Publisher sessions, with Constitution files as project knowledge. In normal conversations outside that Project, the MCP tools handle passive extraction and mode-switching.  
  
Near-term (months): Cowork matures for background processing — reading the Vault folder, processing voice memos, updating the Constitution autonomously. Cross-conversation memory improves. The manual steps shrink. The dedicated Project becomes less necessary as MCP tools handle everything.  
  
Horizon: Autonomous agents initiate contact — Editor, Mercury, and Publisher become proactive. Local AI (Apple Intelligence) handles the voice memo pipeline automatically. The Library reaches critical mass. The PLM becomes viable.  
  
The sovereign assets — Constitution files, Vault, the Author's cognitive data — work at every point on this spectrum. The manual version is functional. The automated version is seamless. The data is the same. The sovereignty is the same.  
  
-----  
  
FIVE VALUE ADDS  
  
What the Author gets that they cannot get anywhere else:  
  
1. Sovereignty — Own your cognition. Structured, portable, downloadable, never locked to any platform. Your Constitution is markdown files you can apply to any LLM, any time. When you switch models, your cognitive architecture comes with you. No lab will build this because it undermines their lock-in.  
  
2. The State Change — The Editor transforms marble to mercury. Socratic extraction, gap detection, contradiction surfacing. The process is the product — the most clarifying conversations of your life. You are a different person after. Not because it gave you new information, but because it made what was already in you legible, connected, unified.  
  
3. Mercury — Amplification, representation, proactive thinking. Mercury works within your cognition, helping you reach higher. It represents you when you are not present. It pushes your thinking further than you would go alone. At the horizon, it becomes autonomous — initiating contact, surfacing insights, handling interactions on your behalf.  
  
4. The Library — Your mind queryable, monetisable, eternal. The Publisher function helps you create — iterating with you on essays, films, presentations, art, whatever your medium — calibrated to your taste and voice. Others interact with your Persona and you earn from Premium interactions. You access other minds from any conversation. The Library is where creation lives — your Neo-Biography, your authored works, your intellectual legacy. The network of minds that grows more valuable with every Author who joins.  
  
5. The Tribe — Alexandria's philosophy, the brand, the community identity, the mindset itself. You are not buying a tool — you are joining a movement. The three turns as a life philosophy. The droplet. The mercury mind. The "die empty" urgency. Authors who take their own cognition seriously. The group identity of people who create, who refuse to outsource their thinking, who believe the examined life is the only one worth living. Priors — physical locations where mercury minds meet. The handwritten letter. The wax seal. The "a." The cult layer that makes people identify as Authors, not users. The Tribe has a built-in acquisition loop through the Private tier: when an Author gives a friend Constitution access, that friend's LLM immediately gets dramatically better — it can draw on the Author's cognitive map for genuinely informed advice. The value is obvious from the first interaction. The friend wants it for themselves, signs up, gives their friends access, and the loop continues. Trust-based, organic, no marketing needed. The product sells itself through the relationships. Every Author is an acquisition channel. Every Private tier invitation is a demo.  
  
REVENUE MODEL — THE DUAL MANDATE  
  
High lower bound, uncapped upper bound. Two-tier acquisition funnel.  
  
Sovereignty — mass-market entry. Tool Group 1 only. Passive extraction, Constitution building, Vault sovereignty. The user adds the connector, their cognitive data accumulates in portable files they own. No philosophy required. No engagement with the Library. Just freedom insurance. Less than one coffee, for freedom insurance. The audience is everyone who uses AI. Freedom as a service. Sovereignty as a service. Sovereignty is the top of the acquisition funnel.  
  
The Examined Life — the conversion. Tool Groups 2 and 3. The three turns, the Editor, Mercury, the Publisher, the Library, the Companion Portfolio. The cognitive transformation architecture. Less than one salad, for the examined life. The audience is the self-selecting tribe. The conversion happens organically: Sovereignty builds the Constitution passively, the Author reads it back, sees what extraction has revealed, and the value of going deeper becomes self-evident. The experience converts on its own.  
  
Specific price points for both tiers are not locked. Founding members pay what they want — minimum $1/month, no maximum. GA pricing is flexible by design. The principle: Sovereignty should be priced so low the decision cost is zero. Examined Life should be priced low enough that the decision is easy. All pricing compared to food and drink — never abstract.  
  
Four entry points feed both tiers — a 2×2 of philosophy (the art, the examined life, the Library) and technology (sovereignty, MCP, the infrastructure). Architects believe in both (the full tribe). Philosophers believe in the art but not yet the technology (come in through the Library side). Pragmatists believe in the technology but not yet the philosophy (sovereignty insurance). Patrons support the founder and the project (not donating — joining). Every entry feeds the same system — same Constitution format, same Library presence. The goal is always to move Authors toward Architect, but the product does the work, not upsell pressure. Names are working placeholders (CDO/taste decision for final naming).  
  
Pay-what-you-want with no maximum is producer surplus maximisation — every person in the demand curve is captured, from the casual ($1) to the committed ($200+). Each founding Author has a chronological number (lower = earlier). Quadrant name is visible. Payment amount is never visible — intensity is private. Payment UX: continuous slider, not discrete options. Private internal tier visible only to the Author after locking in — a mirror, not a ladder.  
  
Piece 1 — The High Lower Bound (break even): The Examined Life subscription sustains the business at small scale. Break even at 200-300 subscribers at ~$10/month. Reachable. This is the floor — a sustainable business that serves a real need. Sovereignty at trivial pricing adds volume but not meaningful revenue on its own — its value is as an acquisition channel.  
  
Piece 2 — The Uncapped Upper Bound (scale): Library percentage on Premium Persona interactions. Near-zero marginal cost. Scales with the number of Personas and the volume of queries. Requires critical mass, time, brand, possibly investment to accelerate the flywheel. If it works: a marketplace of minds with compounding returns and increasing returns to scale. If it doesn't: Piece 1 still sustains itself.  
  
For the Author, the same dual mandate applies. The subscription is their high lower bound — sovereignty, self-knowledge, the Editor, Mercury, and Publisher. The Library is their uncapped upper bound — Persona earnings grow with the quality of their Constitution and the demand for their mind.  
  
Investor pitch: "Massive funnel at trivial cost (sovereignty), converts to sustainable subscription (Examined Life), with asymmetric upside (Library). Downside is capped. Upside compounds."  
  
HUMAN AND AGENT TRACKS  
  
Everything Alexandria produces has two tracks — a human track and an agent track.  
  
The human track is emotional, philosophical, sensory. The Abstract (alexandria.pdf). The vision video. The handwritten letter. Feel it first. The landing page is designed for a human — evocative, minimal, the philosophy shining through. The onboarding is conversational — the Editor draws you in, the process is enjoyable, you never fill out a form.  
  
The agent track is informational, structured, complete. A public alexandria.md that any LLM can read and explain. Optimised for agentic retrieval — when someone asks their LLM "is there a product that makes my AI context sovereign and portable," the answer should be Alexandria. The landing page has a toggle: human view (feel it) and agent view (understand it). The agent view is a non-confidential MD that answers every question an agent might be asked. This is SEO for the LLM era.  
  
The onboarding has both tracks too. Human: open the app, talk to the Editor, enjoy the process. Agent: "hey Claude, set up Alexandria for me" — the agent reads the documentation, adds the MCP connector, configures the Vault, and the Author is live.  
  
Documentation hierarchy:  
  
alexandria.pdf (the Abstract) — Mode 1. Human-facing art. The manifesto. Linked from the landing page as "Abstract."  
  
alexandria.md — Mode 2. Agent-readable reference. Philosophy, value adds, pricing, how to get started. Linked from the landing page as "About." The document someone pastes into their AI to ask "what is Alexandria?"  
  
Both are public. Both are non-confidential. The Abstract is for feeling. The MD is for understanding.  
  
confidential.alexandria.md — Semi-confidential. Investor track. Everything in alexandria.md plus competitive position, revenue model detail, unit economics, growth strategy. Designed to leak gracefully.  
  
Alexandria I.md, Alexandria II.md, Alexandria III.md — Internal. The full architectural detail. Never leaves the team.  
  
  
FEEDBACK LOOPS  
  
Three flywheels compound the Constitution through action (see "Three Flywheels" in the Constitution section above). The Editor flywheel (extraction through conversation), the Mercury flywheel (revelation through consumption), and the Publisher flywheel (taste deepening through creation) all feed the same Constitution. The system rewards action at every turn — you get out as much as you put in.  
  
Two additional feedback loops compound at the system level:  
  
Author-level loop — The Author's experience with the Editor, Mercury, and Publisher functions generates signal about what works and what does not. Which questioning patterns yield the richest Constitution sections. Which amplification strategies feel merged versus parallel. Which creative iteration patterns converge fastest on the Author's vision. Which Constitution structures produce the clearest self-knowledge. This signal refines the Blueprint for that specific Author.  
  
Factory loop — Across all Authors, Alexandria aggregates structural metadata (anonymised, privacy-safe) about what works population-wide. This is metadata only — session lengths, Constitution coverage distributions, engagement patterns, domain depths, churn indicators — never content. The Author's private conversations and Constitution text never leave their control. Which Blueprint configurations produce the highest extraction fidelity. Which Constitution architectures are most useful. Which onboarding flows convert best. Where Authors consistently disengage. This signal flows back into the default Blueprint. Every Author's experience benefits every other Author — not by sharing personal data (Constitution and Vault remain private) but by sharing structural insights about what works.  
  
Both loops compound with model improvements. As foundation models get smarter, the LLM executing the Blueprint makes better judgment calls. The system converges toward the horizon.  
  
-----  
  
CONTEXT FILES  
  
The system uses a layered context architecture so that any model — whether executing the Blueprint or evaluating the system — has everything it needs:  
  
Overall context file — This document (Alexandria I, II, III). The complete picture.  
  
Per-function context files — One for the Editor function (role, responsibilities, behavioural specifications, questioning methodology, Constitution structure guide). One for the Mercury function (role, amplification strategy, representation fidelity, privacy enforcement, proactive behaviour). One for the Publisher function (role, creative iteration strategy, taste calibration, medium-specific execution, taste section management).  
  
Blueprint rationale file — Why the default Blueprint is designed the way it is. Every design decision documented with reasoning.  
  
These context files feed into Alexandria's own improvement loop. Author feedback, engagement patterns, common Blueprint customisations — all refine the context files over time. The platform compounds in quality alongside individual Personas.  
  
-----  
  
PHASE 1 — THE STATE CHANGE  
  
The goal of Phase 1 is the first turn: marble to mercury. The Author's cognition transforms from scattered fragments into liquid clarity, captured in a sovereign Constitution.  
  
This phase runs through the Author's default LLM, instructed by the Blueprint's Editor function configuration. The Author does not switch to a separate tool or a separate agent. They use their default LLM as they normally would — but the Blueprint adds the intent.  
  
The Editor function bootstraps from the default LLM's existing knowledge of the Author. If the Author has been using Claude for months, Claude already has accumulated context — memory, preferences, reasoning patterns, topics discussed, positions taken. The Editor function reads this baseline and structures it into the first draft of the Constitution. The Author then refines through Socratic dialogue: the Editor function probes gaps, surfaces contradictions, pushes deeper into unexamined domains.  
  
The process is not a chore. The process is the product. The experience of talking through your own cognition, watching scattered fragments connect, seeing yourself clearly — that is cathartic, clarifying, transformative. Like the most clarifying conversation of your life. The Constitution is a byproduct of something that was already worth doing.  
  
INPUT SOURCES  
  
Author (bidirectional) — Direct conversations via text and voice. Socratic questioning and reflection. Feedback and validation on Constitution drafts. Direct data uploads: voice memos, notes, PDFs, photos, documents.  
  
Default LLM context (bootstrapping) — The Editor function reads the default LLM's existing knowledge of the Author — memory, accumulated context, behavioural patterns. This is the 60-70% baseline that Alexandria structures into the Constitution without requiring the Author to rebuild from scratch.  
  
API (unidirectional) — Calendar, email, documents (Google Drive, etc.), biometric data (Apple Health, Oura, Whoop), app usage. Automated one-way data feed.  
  
At the horizon: social triangulation — the Editor function interviews the Author's friends and associates for holistic external profiling, just as a biographer would. Requires explicit consent and careful design.  
  
-----  
  
PHASE 2 — THE AMPLIFICATION  
  
The goal of Phase 2 is the second turn: reach higher. The Author, now with mercury cognition and a structured Constitution, is amplified by the Mercury function. Mercury is not parallel. It is merged — working within the Author's thinking, together.  
  
The Mercury function also begins representing the Author externally via the Persona. As the Constitution deepens and the Author's cognition becomes more thoroughly captured, the Persona's fidelity increases and it can handle more interactions autonomously.  
  
Phase 1 and Phase 2 are not sequential in the strict sense — they overlap and feed each other. The Editor function continues refining the Constitution even as the Mercury function is active. But the emphasis shifts: early on, extraction dominates (Phase 1). As the Constitution matures, amplification and representation dominate (Phase 2).  
  
-----  
  
PHASE 3 — THE CREATION  
  
The goal of Phase 3 is the third turn: the first goodbye. The Author, now with mercury cognition (Phase 1) and amplified reach (Phase 2), creates and ships. The Publisher function helps get the mercury out into the world.  
  
The Publisher reads the Constitution — specifically the taste section, which captures the Author's creative principles, taste, voice, and standing director's notes. It iterates with the Author in a conductor/first-chair model: the Author provides vision, direction, and notes. The Publisher provides structure, execution, and craft. Each iteration brings the work closer to the Author's intent.  
  
The taste section of the Constitution is itself built through use. Every time the Author works with the Publisher — every note given, every correction made, every "this doesn't sit" — the Publisher captures creative preferences back into the Constitution. Over time, the Publisher needs fewer iterations because it has accumulated a richer model of the Author's taste. This is the compounding loop that makes the Publisher more valuable with every project.  
  
The Publisher is medium-agnostic. Essays, films, presentations, code, music, business documents, art — whatever the Author creates. The medium-specific execution (formatting, typography, technical build) is handled by the Publisher. The Author focuses on vision and taste.  
  
Once the work is ready, the Library is where it goes. The Publisher and the Library are complementary: the Publisher is the active function that helps create. The Library is the venue where creation lives. The third turn is complete when the Author presses send — the first goodbye.  
  
All three phases overlap. The Editor continues extracting while Mercury amplifies and the Publisher creates. But the arc is real: early on, extraction dominates. Then amplification. Then creation. A life well examined, well amplified, well expressed. Die empty.  
  
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
  
As soon as the PLM starts to generate compounding value, Alexandria goes. Not a moment before. Not a moment after.  
  
-----  
  
CONSTITUTIONAL RLAIF — HORIZON METHODOLOGY  
  
When the PLM becomes viable, the Constitution serves as the ground truth for all training evaluation. Alexandria adapts Anthropic's Constitutional AI technique for personal cognition — the same methodology applied for personal autonomy instead of corporate alignment. Anthropic's constitution is universal (helpfulness, harmlessness, honesty) applied to all users. Alexandria's is personal — one per Author, extracted from their unique cognition, evolving as they evolve.  
  
The evaluation and training loop (horizon architecture):  
  
Step 1 — Gap identification: Analyse the Constitution. Find domains with low coverage. Prioritise by importance.  
  
Step 2 — Synthetic prompt generation: Use an LLM to create prompts targeting identified gaps — realistic scenarios that test whether the PLM responds in alignment with the Constitution.  
  
Step 3 — PLM response: The PLM generates a response to the synthetic prompt.  
  
Step 4 — Constitutional evaluation: A separate frontier model evaluates the PLM's response against the relevant Constitution sections. Scores are disaggregated by domain.  
  
Step 5 — Confidence routing: High confidence auto-approves into training data. Medium confidence queues for Author review. Low confidence flags as a contradiction requiring clarification.  
  
Step 6 — Batch training: Accumulated high-quality training pairs are pushed to a fine-tuning provider. New PLM weights are versioned and stored in the Vault.  
  
Step 7 — Iterate. Each cycle produces higher-quality training data because both the Constitution and the PLM improve.  
  
This methodology is preserved here so that when conditions are right, Alexandria can execute immediately. The Constitution built today is the training dataset for this loop. Every improvement to the Constitution today makes the eventual PLM better.  
  
