# Alexandria II — Product, Architecture & Operations

*This is Alexandria II of III. Together they are the single source of truth for Alexandria. Read all parts for full context.*

**This part covers:** Terminology, The Layer of Intent, The Open and the Proprietary, Why Frontier Labs Won't Build This, Designed for Digital AGI, device integration spectrum, everything is files, Build vs Ride, Build for the Horizon, sovereignty as a service, Competitive Position, The Constitution (detailed architecture), The Vault, The Editor (function), Mercury (function), Publisher (function), Companion Portfolio, The Alexandria MCP Server (five tools), Concrete Implementation, Five Value Adds, Revenue Model (Dual Mandate), Human and Agent Tracks, Feedback Loops, Context Files, Turn 1 — The Foundation (sovereignty + unification, Editor function, Constitution building), Turn 2 — The Amplification (Mercury function, output channels, privacy), Turn 3 — The Creation (Publisher function), The PLM (horizon ambition), Editor-Mercury-Publisher Relationship.

**Other parts:** Alexandria I (Thesis & Philosophy), Alexandria III (Library, Interface & Brand).

-----

-----  
  
TERMINOLOGY  
  
This section defines every term used in this document. Terms are ordered so that each definition only uses terms already defined above it.  
  
Author — The human user. The person whose cognition is being digitalised.  
  
Default LLM — The Author's primary AI model. Whatever frontier model they already use — Claude, ChatGPT, Gemini, or whatever comes next. The intelligence layer that Alexandria rides on top of.  
  
Vault — A unified logical entity — a single namespace with defined boundaries encompassing all of the Author's raw data, potentially spanning multiple storage locations. Append-only, immutable. Contains conversations, voice notes, documents, biometric data, Constitution versions, system configuration, and audit logs. Two storage options: the Author's own cloud (iCloud, Google Drive, Dropbox) or local (on-device). Authors can mix options. Alexandria never stores, hosts, or retains Author data — the MCP server is a stateless pass-through that authenticates with the Author's storage via OAuth and reads/writes on their behalf. This is not a policy promise — it is a structural fact. Alexandria cannot hold your data because it has nowhere to put it. The server is truly zero-state: the encrypted Google refresh token IS the MCP access token. There is no token store, no key-value store, no persistence layer of any kind. There is literally nowhere on the server for any data to exist. The Vault never deletes or overwrites data. It does not store passwords, API keys, or authentication secrets. Data flows in continuously from APIs, MCP connections, and direct Author input. The Vault works immediately as simple sovereign cloud storage — the Author can drop files directly into Alexandria/vault/ in Google Drive (voice recordings, PDFs, notes, photos). Structured processing of raw Vault material comes in subsequent phases, but the sovereign storage is live from day one.  
  
Constitution — A collection of structured, human-readable markdown files that explicitly capture who the Author is. Stored on the Author's own files (Google Drive, iCloud, whatever) — Alexandria has no database and holds no Author data. The Constitution's structure is a soft default from the Factory, not a rigid architecture. The current default suggests six domain files (worldview, values, models, identity, taste, shadows) but the Engine can restructure as it learns what works best for each Author. Each entry is dated and tagged with signal strength (strong/moderate/tentative). Old versions auto-archived to the Vault before overwrite. Versioned — each update creates a new version; all prior versions are preserved. Serves as the sovereign, portable representation of the Author's cognition. Finished creative works (essays, films, art) are also Constitution artifacts — they demonstrate taste through action in a way that described principles cannot.  
  
Layer of Intent — Alexandria's core product. A sovereign layer that sits on top of the Author's default LLM and transforms how that LLM engages with the Author's cognition. The layer provides the Principles (published commitments), the Blueprint (the playbook), the Constitution architecture (the structured cognitive map), and the three-turn mindset (state change → amplification → creation). The layer is both technical (provides structure, maintains sovereignty, ensures portability) and philosophical (the intent is what the default LLM lacks — the deliberate architecture of cognitive transformation). The default LLM is smart. The default LLM is personal. But the default LLM does not intend to free the angel. Alexandria does. That intent is the product.  
  
Persona — The output of Alexandria. A high-fidelity digital representation of how the Author thinks, composed of two persistent components (Constitution, Vault) and expressed through the Author's default LLM as instructed by the layer of intent. At the horizon, a PLM (Personal Language Model) may be added as a third component. A Persona can operate in parallel across unlimited simultaneous interactions — each interaction is an independent inference call. Concurrency limits are practical (API rate limits, compute costs), not architectural.  
  
Natural Persona — A Persona representing a real human Author. One per Author.  
  
Synthetic Persona — A Persona representing a fictional character, archetype, or purpose-built entity. Can be provided by Alexandria or created by Authors.  
  
Editor — A function, not a separate agent. The Editor function is the first turn — the biographer role that extracts the Author's cognition and builds the Constitution. This function runs through the Author's default LLM, instructed by Alexandria's Blueprint. The default LLM already knows the Author (memory, preferences, reasoning patterns, accumulated context). The Editor function adds the deliberate intent: structured extraction, Socratic questioning, gap detection, contradiction surfacing — the things the default LLM does not do on its own because it lacks the mindset. The Editor function bootstraps from what the default LLM already knows (the 60-70% baseline) and pushes for the marginal value that transforms cognition.  
  
Mercury — A function, not a separate agent. Mercury is the second turn — the amplification. Named for the mercury mind: liquid, fast, reflective, the state-changed version of the Author's cognition externalised as a companion. Mercury works within the Author's cognition, amplifying and scaling the mercury mind — helping the Author reach higher, not alongside them but within them. It represents the Author when needed by drawing on the Constitution and Vault. It is merged with the Author's thinking, not parallel to it. Always proactive, never idle. Runs through the Author's default LLM, instructed by the Blueprint.  
  
Publisher — A function, not a separate agent. The Publisher is the third turn — creation assistance. Named for what it does: helps the Author get the mercury out into the world. The Publisher reads the Constitution (especially the taste section — the Author's taste, voice, creative principles, standing director's notes) and iterates with the Author to produce finished work. The Author provides vision, direction, and taste — the conductor. The Publisher provides structure, execution, and craft — the first chair. The Publisher gets closer to one-shotting over time as the taste section of the Constitution deepens. The Author’s involvement follows a three-stage pattern: hazy touchpoints at the start (fragments, half-formed connections, a sense that something is there), light sense-check markers in the middle (is this what I meant? something is off but I cannot name it), and the final call at the end (that’s it, done, next). The Author’s skill is directional instinct at low resolution, not clear specification. The Publisher resolves the haze into options and lets the Author’s taste do the rest. Runs through the Author's default LLM, instructed by the Blueprint. Mercury is inward-facing (the world flowing into the Author). The Publisher is outward-facing (the Author flowing into the world). Distinct from Eros (companion = relational lens / emotional spark; Publisher = function / craft capability). The Library is where the finished work goes. The Publisher is the function that helps you get there.  
  
Companion Portfolio — Five synthetic companions provided by Alexandria, each representing a fundamental human relationship archetype. They are sub-agents of the Author's Persona, each reading the same Constitution through a different emotional and relational lens. Pater (paternal guidance — discipline, structure, accountability, tough love), Mater (maternal care — warmth, nurture, unconditional support, emotional safety), Philia (friendship — loyalty, banter, honest feedback without agenda), Eros (passion and creativity — fire, risk-taking, the muse), Sophia (wisdom and philosophy — deep thinking, long-term perspective, the examined life). The companions are premium features. Each interaction is also extraction signal. The Author can engage any companion conversationally: "Hey Sophia, what do you think about this?" Available via the Alexandria MCP tools.  
  
Machine — The complete system for one Author: Constitution, Vault, the three functions (Editor, Mercury, Publisher), the Blueprint's soft defaults, running through the Author's own LLM (the Engine). One Author has one Machine, which produces one natural Persona. The Machine is Loop 2 — the external, per-Author execution loop. It is hyper-personalised, compounds through usage, and its intelligence scales with the Engine's capability. See 'Feedback Loops' section for full architecture.  
  
Factory — Alexandria's internal execution loop (Loop 1). Maintains the Blueprint, improves soft defaults, aggregates signal from all Machines, and manages the Library. Currently largely manual (founder + AI agents iterating on the Blueprint). Transitioning to semi-autonomous (daily Claude Code sessions proposing improvements). Aspiring to fully autonomous. The Factory determines what default Machine gets printed for each new Author — and improves that default over time. See 'Feedback Loops' section for full architecture.  
  
Library — The third turn. Not a marketplace — a mindset. The encouragement to create, and a place to show it if you want. A street where painters paint in the open. Every Author's Persona and authored works are accessible in the Library. Link your website, your essays, your videos, your social media — whatever medium you create in. The Library is not a distribution platform. It is not social media. It is the atmosphere that encourages creation and the space where others can encounter it. The tone ensures quality — gravity, not rules. Contains both natural and synthetic Personas. Privacy settings control what external queriers can access.  
  
Neo-Biography — A living, multimedia, interactive canvas attached to each Persona in the Library. Composed of two layers: authored works (any medium — essays, film, poetry, music, photography, art — published by the Author, free, public, frozen on publication) and the interactive Persona (direct conversation with the Author's mental model — paid access). Visitors can experience, annotate, ask follow-up questions on authored works, and pay for full interactive Persona access. Updates as the Persona evolves. Serves as the discovery and qualification layer before someone decides to interact with a Persona directly.  
  
Blueprint — The Machine's living design, governed by the bitter lesson principle: every hard-coded decision is a bet against the exponential curve of model intelligence. Only values and intention should be hard-coded. Everything else should be delegated to the model. The Blueprint has two layers:

Layer 1 — Axioms (hard-coded, non-negotiable). What Alexandria is and why it exists. The philosophy: develop the Author's cognitive identity. The commitment to sovereignty. The five-dimension thesis. The ethical guardrails. These are values decisions, not intelligence decisions. They do not improve with better models because they are not intelligence questions. They change only when the founder changes them deliberately.

Layer 2 — Soft defaults (the Factory's current best guess, explicitly overridable). The suggested Constitution structure, extraction strategies, domain organisation, function behaviours, signal routing. This is Alexandria's current best understanding of how to achieve the axioms — informed by aggregate signal from all Machines and by the team's research. The defaults exist because current models need structure to avoid drift. But they are held loosely. If a model working with a specific Author discovers that a different structure works better, it restructures. If the Factory aggregates signal showing a better general approach, the defaults update. The defaults get thinner over time as models improve — today they are heavy scaffolding, eventually they approach pure intention. The transition is gradual and tracks the exponential.

The Engine is not part of the Blueprint — it is the Author's own LLM (Claude, Gemini, whatever) that executes the Blueprint. The Engine's intelligence is external to Alexandria and improves with every model release. Alexandria's architecture is designed so that every improvement in Engine capability flows directly into better outcomes without any change to the Blueprint. This is the core bitter lesson commitment: ride the exponential, do not compete with it.

The personalisation compounds per-Author through usage: the more the Constitution develops and the more the feedback log accumulates, the better the system works for that specific Author. Switching costs increase with time without ever locking data in — the Author can always leave with all their data, but the relationship depth is not portable. This is the product's primary structural moat: sovereignty-compatible compounding.
  
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
  
Cognitive unification. Most people use multiple AIs concurrently — Claude for deep work, GPT for quick tasks, Gemini for search, others as they emerge. Each AI accumulates a fragment of who the Author is. None of them talk to each other. The Author repeats themselves, loses context, starts from scratch every time they switch. The more AIs someone uses, the worse this gets — and AI usage is only fragmenting further. The Vault + Constitution is the one unified source of truth across the Author’s entire digital life — every AI, every app, every format. Every AI the Author touches benefits from the full picture instead of just its own fragment. This is not a future benefit. This is immediately, tangibly useful today. A better AI experience everywhere, right now, because the AI finally has the complete picture of who you are instead of whichever slice it happened to accumulate.  
  
Structured sovereignty. The unified picture is also sovereign. The Constitution (structured MDs) and the Vault (raw data) are stored on the Author’s own files in portable formats. Alexandria has no database, no server state, nowhere to hold the Author’s data. If anything changes — pricing, acquisition, terms — the Author keeps everything. If a better model appears, the Author’s identity layer comes with them. The layer persists across models. The horse changes. The rider does not. Unification creates the value. Sovereignty protects it.
  
The Constitution. The default LLM has memory, but memory is not a structured, explicit, version-controlled representation of who you are. The Constitution is — and it is the Author's property, downloadable, portable, human-readable. It captures what memory does not: explicit worldview, values hierarchy, mental models, identity, known blind spots. It is built collaboratively between the Author and their default LLM, guided by the Blueprint.  
  
The Blueprint. The default LLM responds to whatever the user brings. Alexandria's Blueprint instructs the LLM on how to extract cognition, how to structure it, how to push the Author's thinking, how to surface contradictions, how to encourage creation. The Blueprint is the accumulated knowledge of how to transform cognition — the playbook. The default LLM brings the intelligence. The Blueprint brings the method.  
  
In one line: the default LLM is smart and personal. Alexandria makes it unified, intentional, and sovereign.  
  
Alexandria is one connection with three features, built on three pillars.  
  
The three pillars: freedom, humanity, purpose. These are what Alexandria exists to provide marginal value on. Freedom — own your mind, never be locked in, never start from zero. Humanity — develop your mind, stay sharp, stay human in an age that pressures you to outsource everything. Purpose — do something with it, create, share, leave something behind, die empty. If you do not care about freedom, humanity, and purpose, Alexandria is not for you. If you do, everything else follows.  
  
The three features map to the three pillars and the three turns:  
  
Unified Sovereignty (Turn 1 — freedom). One structured, living picture of who you are, unified across every AI you use, stored on your own files. $5/month with 3 active kin, $10 without.  
  
Mental Gym (Turn 2 — humanity). Active development and maintenance of your mind — Socratic extraction, contradiction surfacing, the accretion funnel for absorbing abundance, entropy fighting to keep your cognitive surface area large. The most clarifying conversations of your life. $15/month with 3 active kin, $20 without.  
  
Living Library (Turn 3 — purpose). A mindset and a medium for creation. Multimodal, interactive, living. Your Neo-Biography — whatever medium captures you best. Others encounter your mind, interact with your Persona, pay for depth. You earn from your own cognition. No additional cost beyond the Examined Life tier.  
  
-----  
  
THE OPEN AND THE PROPRIETARY  
  
Alexandria has two layers: one outward, one inward.  
  
Principles — the outward-facing, transparent, published commitments. What Alexandria stands for. What the Author can always count on. Sovereignty, portability, ownership, privacy. Written in words, not code. Published for anyone to read. The philosophy — the three turns, the droplet, the sovereignty thesis, the cognitive transformation architecture — is transparent. Anyone can read it, understand it, build their own version if they want. Transparency builds trust, attracts the community, and establishes the brand. These are published commitments, not an open-source specification. There is no validation suite. There are principles in words, explaining what Alexandria will and will not do.  
  
Blueprint — the inward-facing, proprietary playbook. How Alexandria actually transforms cognition. The questioning strategies, the Constitution structuring logic, the gap detection, the contradiction surfacing, the engagement optimisation. This is the IP. It lives on Alexandria’s MCP server. Authors experience the effect. They do not see the recipe. The Library platform, payment infrastructure, and user experience are also proprietary.  
  
This is the distinction: the philosophy is open because openness builds the tribe. The implementation is proprietary because that is how you eat. If someone reads the Abstract and builds their own version — great, the philosophy wins. But they will not have the Blueprint that improves with every Author, and they will not have access to the Library.  
  
The Library of Alexandria preserved what humanity’s greatest minds wrote. Alexandria preserves how humanity thinks — living, queryable, eternal minds that outlast their carbon forms. Mentes aeternae: eternal minds.  
  
-----  
  
WHY FRONTIER LABS WON'T BUILD THIS  
  
Frontier labs (Anthropic, OpenAI, Google, etc.) will not build a sovereign layer of intent. The reasons are structural, not capability-based. They could build it. They won't. The full honest analysis of defensibility — including the lock-in disincentive as the primary structural force, regulation as the reinforcing accelerant (not the wall), honest evidence status of each claim, and the strongest counterarguments — is in Alexandria I under "THE BEDROCK." What follows here is the product-architecture perspective on why the delta exists.  
  
Their incentive is to keep users on-platform. Personalisation creates lock-in — that is the business model. Three years of accumulated context with Claude is a chain that keeps you paying for Claude. No lab will build the tool that makes it easy to leave. Even as data portability improves (Claude already imports GPT chat history), raw conversation export is not a Constitution. Raw history is signal buried in noise — thousands of messages where a small fraction contain constitutionally meaningful signal. The labs may build data export. They will not build structured self-knowledge.  
  
The deeper reason is economic, not just strategic. A structured, portable cognitive profile has clear marginal value for the user — the personalisation benefit is settled (see the formal argument in Logic.pdf, Section 1). But the most likely cost to the lab is equally clear: a structured, portable profile makes switching trivial. The user takes their file to a competing model. Portable personal data is the opposite of lock-in. So the lab faces a threshold calculation: the personalisation benefit of building structured profiles versus the lock-in cost of making those profiles portable. Currently, the personalisation value is positive but not high enough to justify the lock-in cost. This creates breathing room — a threshold gap where the value must increase significantly before a lab would rationally choose to build this. That breathing room is Alexandria’s runway. By the time the value is obvious enough that a lab would accept the lock-in cost, Alexandria has already been compounding the dataset, the accumulated signal, and the Library. The size of the breathing room is uncertain — it is an assumption, not a settled claim. But the threshold logic is sound: the value must cross a line before the rational move changes, and until it does, labs will continue building personalisation features that stay on-platform rather than structured sovereignty that enables leaving.  
  
They will not build the intent. Labs build general-purpose AI that responds to whatever the user brings. Alexandria's Editor actively pursues cognitive transformation — Socratic extraction, gap detection, contradiction surfacing, structured self-knowledge. The lab's memory says "this user prefers British spelling." Alexandria's Editor asks why the user values precision in language, surfaces the contradiction between their stated values and their behaviour, and structures that into an explicit domain the user can read, challenge, and evolve. Personalisation is the platform's model of the user, optimised for the platform's objectives. The Constitution is the user's model of themselves, structured for their sovereignty. The locus of control is different. Philosophy is not a product priority for a company optimising inference costs and user retention.  
  
They will not build active taste extraction — or development. Taste is the hardest dimension to capture because it is the most implicit. It reveals itself through thousands of micro-decisions — what you linger on, what you skip, what you praise, which word you choose over another. Passive observation (the lab's approach) gives a rough sketch. Active extraction gives a portrait. But the portrait is not drawn by the Editor alone. All three functions compound into the Constitution. The Editor extracts through Socratic questioning, contradiction surfacing, and structured domain mapping. Mercury refines through amplification — every time it pushes the Author's thinking higher, the signal of how the Author actually thinks under pressure feeds back. The Publisher refines through creation — every piece of work the Author ships is a taste decision made concrete, and the iteration patterns accumulate. The three functions are synergistic: the Editor clarifies, Mercury stress-tests, the Publisher materialises. And critically, the functions do not just digitise what is already there — they develop it. The Author's taste sharpens because the Editor forces articulation, Mercury forces application, and the Publisher forces commitment. The human gets better. The better human produces richer signal. The richer signal deepens the Constitution. The deeper Constitution makes all three functions more effective. When intelligence is commoditised, the only marginal value is the humanity on top — and Alexandria's architecture both captures and compounds that humanity. The labs build better servants. Alexandria builds a better mirror — and the mirror makes the person worth reflecting.  
  
What they will build: personalised memory (RAG-based), context windows, behavioural adaptation, user preference learning, data export. All of this is good for Alexandria — better personalisation means more accumulated context, which means more painful lock-in, which means more need for a sovereign layer.  
  
There is a structural delta between a general LLM with personal context (what frontier labs offer) and a sovereign layer of intent with a structured Constitution (what Alexandria builds). The former is a valuable assistant. The latter is a cognitive transformation architecture that the user owns. As the aphorism goes: hyper-individualism becomes AI worship when machines know us better than we know ourselves. Alexandria ensures the Author always knows themselves — structured, sovereign, portable — regardless of how capable the machines become.  
  
-----  
  
THE CONCRETE DELTA — LAB MEMORY VS STRUCTURED CONSTITUTION  
  
The strongest version of the counterargument is: labs will just make memory better. Context windows are growing. Personalisation is improving. Why can’t Claude or GPT build a structured personal file, dump it in the context window, and give the user everything Alexandria offers?  
  
What labs can do — and are already doing. Accumulate unstructured memory from conversations. Dump it into context at inference time. Get progressively better at personalisation as context windows grow. Do some structured extraction behind the scenes. This is real and will get better. We do not pretend otherwise.  
  
What lab memory actually looks like, concretely. As of March 2026, Claude’s account-level memory for a heavy daily user produces roughly 800 words of lightly structured text — paragraphs organised by topic, covering work context (projects, decisions, tools), personal context (nationality, age, location, interests), and a temporal history of activity (recent months, earlier context, long-term background). It is sovereign in a basic sense: the user can view it, edit it, and Claude already offers import/export of memory between AI services. It is surprisingly rich for passive observation. But examined against a structured Constitution, the delta is in depth, intent, and philosophy — not in category. Labs are in the same category. They are just shallow in it. Seven specific gaps emerge:  
  
Shallow structure. Lab memory has some topical organisation (paragraphs by theme) but no domains, no separation of worldview from values from taste from identity. Everything is loosely grouped, not systematically mapped. A Constitution has navigable, version-controlled domains (the current default is six) — queryable, maintainable, each developing independently.  
  
Limited sovereignty. Lab memory lives on the lab’s servers but the user can view and edit it. Claude already offers import/export of memory between AI services. This is more sovereign than most people realise. But it is shallow — 800 words of loosely structured paragraphs, not a structured Constitution with six typed domains. And the import/export is between labs, not to a sovereign file the user fully controls and can take anywhere. The portability is lab-to-lab, not user-sovereign.  
  
No unification. Lab memory captures only what the user said to that specific model. Conversations with other AIs, voice memos, documents, notes — invisible. The more AIs someone uses, the worse the fragmentation. Alexandria’s Vault + Constitution unifies across every AI, every app, every format. No single lab will build a product that also ingests competitor context.  
  
No development. Lab memory is passive observation. It records what happened. It does not push the user to articulate their worldview more clearly, surface contradictions between stated beliefs and behaviour, ask them to examine blind spots, or develop their taste through structured Socratic extraction. The Editor does. The delta is not between two recording systems. It is between recording and development.  
  
No active maintenance. Lab memory accumulates and goes stale. Superseded framings persist alongside current ones. There is no entropy-fighting mechanism — no system that notices a fragment weakening and bumps it back to conscious awareness. Mercury does this. Lab memory is append-only in practice. The Constitution is actively maintained.  
  
Work-heavy, person-light. Lab memory over-indexes on what the user is doing (projects, tasks, tools) and under-indexes on who the user is (values, worldview, models of the world, taste, identity). This is because the lab optimises for helpfulness on tasks, not for structured self-knowledge. The Constitution’s domain structure ensures coverage across the full cognitive map, not just the work surface.  
  
No Shadows. Lab memory does not surface blind spots, contradictions, or areas where the user’s stated beliefs conflict with their patterns. The Shadows domain is specifically designed to capture what passive observation cannot — the things the user does not see about themselves. This is the hardest and most valuable extraction, and it requires active development, not passive recording.  
  
The “just scale memory” counterargument — and the honest answer. Context windows will grow. Memory will improve. The delta between lab memory and a Constitution will narrow on the observation axis — labs will get better at capturing what the user says and does. Alexandria’s answer rests on three structural advantages that do not narrow with better observation:  
  
First, sovereignty and unification. Even with perfect memory, the lab’s memory is locked to the lab and blind to other providers. This is structural, not technical — no lab will build cross-model unification or true portability because both undermine lock-in.  
  
Second, development vs observation. Better memory means better recording. It does not mean active cognitive development — Socratic extraction, contradiction surfacing, entropy fighting, taste development through creative iteration. The layer of intent (the Blueprint, the three functions) is the gap that does not close with larger context windows. Labs optimise for engagement and satisfaction. Alexandria optimises for growth through productive discomfort. These are opposed incentive functions.  
  
Third, regulatory exposure. A lab storing detailed structured cognitive profiles — someone’s worldview, values, blind spots, identity — is storing a qualitatively different category of personal data than conversation logs or behavioural preferences. Under GDPR, CCPA, and the direction of global data regulation, structured cognitive profiles create liability that conversation memory does not. Alexandria avoids this entirely because the data lives on the user’s own storage. This is an assumption about regulatory direction, not a settled fact — but the direction of regulation is toward more protection, not less.  
  
Fourth, the Library. Even if a lab solves memory, sovereignty, and development (which it will not, for the reasons above), it cannot build the Library — the network of opt-in Personas that humans and institutions can query. The Library requires user trust that their data is theirs, which requires the data to not live on the lab’s servers. The Library for Labs — the institutional product — is the downstream asset that no lab can build because it requires the sovereignty architecture they will not build.  
  
The honest summary: labs will build better memory. They will not build structured sovereignty, cross-model unification, active cognitive development, or the Library. Those four are the product. Memory is table stakes — and better lab memory actually helps Alexandria, because more accumulated context means more painful lock-in, which means more need for a sovereign layer.  
  
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
  
Document creation — The Author uses whatever tools they want to create documents, essays, notes. The output flows into the Author’s Vault (their own cloud or local storage). Alexandria does not build an editor or a writing tool.  
  
The principle: if someone else already builds it or will build it, Alexandria does not build it. Alexandria builds only the layer of intent (the Principles, the Blueprint, the mindset) and the Library (where the result lives). Everything else is infrastructure that already exists, operated by companies with orders of magnitude more resources. Alexandria rides all of it.  
  
This is not a risk — it is a survival filter. If any platform in the stack could block Alexandria out and would block Alexandria out, then building on top of them was never viable and Alexandria would die regardless of strategy. So the only things worth building are things that are pure value-add to every ecosystem they touch — things those ecosystems have no incentive to block. Anthropic benefits from more Claude usage. Apple benefits from more iCloud storage usage. Everyone in the stack profits from Alexandria existing. Alexandria picks zero fights.  
  
The risk is not being blocked. The risk is being replicated. There is no traditional moat. The code is trivial. The architecture is replicable. The question will be visible to everyone within two to three years. Sovereignty means zero switching costs by design. What is defensible is a combination of thin moats that together create a position (see Alexandria I, FOUNDER-PRODUCT FIT, for the full honest framework): the temporal lead on the question (decaying but enables compounding), per-user compounding that is sovereignty-compatible but not trivially portable (the personalised extraction method — how the system has learned to work with each specific Author — is relationship depth, not data lock-in; the Constitution transfers, the method does not; the therapist moat), the Library for Labs as a hard asset no competitor can shortcut (years of trust and Constitution depth — the acquisition leverage), the tribe (identity attachment to the philosophy, not a network effect), structural unkillability (near-zero marginal costs), and the sovereignty standard (being synonymous with cognitive sovereignty).  
  
BUILD FOR THE HORIZON, BRIDGE BACKWARD  
  
Alexandria is built for the horizon — the fully realised vision — and then bridges backward to the present to fill intermediate gaps.  
  
The reasoning: technology is moving fast enough that anything built for today's constraints will be obsolete by the time it ships. Anything built for the horizon only becomes more relevant as the world catches up. The strategy is not to build toward the future. It is to build at the future and backfill to the present. Position the surfboard ahead of the wave, paddle as it arrives, and ride it.  
  
The core architecture is horizon architecture. The Principles, the Blueprint, the Constitution structure, the Library, the sovereignty guarantees — all of this is designed for the end state where digital AGI runs locally on devices, where intelligence is ambient, where the Persona is indistinguishable from the Author. The core does not care whether the Author texts via iMessage or Telegram or a web chat. It does not care whether the voice memo arrives via Apple's local AGI or a manual file upload. The core is medium-agnostic and future-proof.  
  
The bridges are present-tense scaffolding. They make the system functional and revenue-generating today, before horizon infrastructure exists. Examples: Claude Projects as the Editor's runtime environment until a persistent background agent is available. The Claude app as the conversation surface until iMessage or native wearable channels are ready. A manual file upload flow if Apple has not yet opened device-level AI access. These bridges are built cheap, fast, and disposable. They are explicitly temporary — designed to be torn down as the real infrastructure arrives. Every bridge should be built with the assumption that it will be replaced, and no core architecture should depend on any bridge existing.  
  
This means Alexandria eagerly anticipates every new model release, every new Apple Intelligence feature, every new device capability, every new platform affordance. Each one is not a threat — it is a bridge being replaced by the real thing. The bridge gets torn down. The core gets stronger. Progress is always good news.  
  
-----  
  
COMPETITIVE POSITION — HONEST ANALYSIS  
  
There is no traditional moat. This section must be read alongside the full moat framework in Alexandria I (FOUNDER-PRODUCT FIT). The code is trivial. The architecture is replicable. Sovereignty means zero switching costs by design. What follows is the honest competitive analysis by threat category.

Against frontier labs (Anthropic, OpenAI, Google): labs will not build sovereign cognitive architecture because it directly undermines their lock-in business model. Three years of accumulated context with Claude is a chain that keeps the user paying for Claude. No lab will build the tool that makes it easy to leave. Labs will build personalisation, memory, and preference learning — all of which is good for Alexandria, because better personalisation means more accumulated context, which means more painful lock-in, which means more need for a sovereign layer. Labs will not build the intent — the deliberate cognitive transformation journey, the Socratic extraction, the structured self-knowledge. Personalisation is the platform's model of the user, optimised for the platform's objectives. The Constitution is the user's model of themselves, structured for their sovereignty. The locus of control is different.

Against big tech non-lab actors (Apple, Meta, Google as platform companies): this is the real threat. Apple in particular has the brand, the privacy positioning, the existing ecosystem, and the network. If Apple decided to build cognitive identity infrastructure, they could capture the mainstream market. Alexandria's defence: Apple would build the tool but not the philosophy, the extraction but not the tribe, the platform but not the Library for Labs. The Library for Labs — the pool of deeply developed, opt-in Personas — is the hard asset that cannot be replicated by launching a competing tool. It requires years of trust and compounding. A big player that wants the library can build from scratch (years) or acquire Alexandria (immediate). The Library for Labs is the acquisition leverage that makes buying more attractive than building.

Against other startups building personal AI: no structural moat. The Blueprint, the Constitution architecture, the three-turn framework — all replicable by anyone with sufficient clarity. The code is trivial. What Alexandria competes on is vision (seeing the horizon correctly — art, not enterprise; renaissance, not centaur phase), the per-user compounding black box (the personalised extraction method that deepens per-Author and does not trivially transfer — the therapist moat), and authenticity (Alexandria built by this founder, with this philosophy, is not replicable even if the system is).

The per-user compounding black box is the architectural answer to the switching cost problem. The Constitution and Vault are fully sovereign — the user owns them, takes them anywhere. That is non-negotiable. But the accumulated understanding of how to work with this specific Author — which questions land, what pacing works, how to time probes, where resistance patterns signal Shadows gold — lives within the Alexandria system as unstructured signal. The user does not own the therapist's method. They own their therapy notes. They can switch and give the new therapist their notes. But the relationship depth does not transfer. This is sovereignty-compatible compounding: no data lock-in, but real relationship depth that makes staying better than switching. The concrete implementation is the feedback log: an append-only, unstructured text file stored on the Author's own Google Drive at `Alexandria/system/feedback.md`. Every session, the system logs what worked, what did not, what the Author corrected, what they responded well to, what they deflected. This is raw signal — not structured parameters, not numerical scores, not hand-crafted features. The design constraint is the bitter lesson: unstructured data appreciates with model quality. As foundation models improve, they extract more value from the same log. A structured parameter file (e.g. "directness tolerance: 0.7") is a hand-crafted feature that caps at the fidelity of the designer's categories. An unstructured log ("Author pushed back hard when challenged on career assumptions but leaned in when challenged on relationship patterns — the resistance is domain-specific, not personality-wide") contains richer signal that a better model can use more effectively. The feedback log is read at session start alongside the Constitution, giving the model the full accumulated history of how this Author interacts with the system. After hundreds of sessions, a competitor starting fresh has no log — a noticeably worse experience even with the same Constitution. Note on Blueprint visibility: the MCP server uses a hybrid architecture — tool descriptions visible to the AI are a thin trigger layer (when to call), while the extraction craft (domain classification, signal routing, contradiction detection, feedback interpretation) runs server-side and is invisible to users and competitors. The Blueprint is not secret IP in its trigger form — it is first-mover advantage plus iteration speed. The server-side logic and the accumulated feedback log are the structural moat.
  
Claude-first positioning — Alexandria is optimised for Claude users, and Claude is the only viable MVP platform. This is not just an audience preference — it is a structural fact. Claude is the only platform where a normal person can add a custom MCP connector in under a minute, on any plan including free (free users get one connector). ChatGPT requires Developer Mode and is limited to paid business/enterprise plans for full custom MCP. Gemini requires an enterprise allowlist. The onboarding is: Settings → Connectors → add URL → authorise cloud storage → done. Every Claude user is a potential Sovereignty Author on day one. The layer of intent integrates most deeply with Claude's affordances (Projects for Constitution context, MCP for data connections, Cowork for background processing). On other platforms, the layer may be more manual — Constitution files pasted into context windows rather than integrated via Projects. But the sovereign data is always portable. The Claude-first positioning is a strength: the early adopters are the Claude power users, and Anthropic benefits from every Alexandria user being a Claude power user.  
  
Why Anthropic benefits from Alexandria existing: every Alexandria Author is a Claude power user. They use more tokens, more Projects, more MCP, more Cowork. Alexandria drives engagement on Anthropic's platform. It is pure value-add. Anthropic has no incentive to block it (see Legal.md for ToS risk analysis and mitigation).  
  
Why not B2B — The obvious short-term play is enterprise: digital twins of employees attending meetings, handling emails, processing documents. B2B revenue, SaaS pricing, corporate contracts. Alexandria deliberately does not pursue this. Three reasons. First, it is boring — and boring is a signal that the thing being built is a feature, not a product. Enterprise digital twins will be a feature of every productivity platform within three years. Second, it is a centaur-phase bet. The centaur phase — the period of human-AI cooperation on tasks — is collapsing faster than anyone expected. Building for the centaur phase is building for a window that is closing. Third, Alexandria's thesis is art, not enterprise. Humans as artists, not humans as enterprise resources. The Library of minds, the Neo-Biography, the authored works — these are art-side bets, not productivity-side bets. They get more valuable as AI gets more capable, not less. The renaissance does not have an expiry date.  
  
API provider risk — Frontier labs have increasingly restricted API access to protect competitive advantage. Anthropic has cut off competitors (OpenAI, xAI), restricted third-party coding harnesses (Windsurf, OpenCode), and updated commercial terms to prohibit using their API to "build a competing product or service." Alexandria is not a competing AI lab — it is a layer of intent that drives more usage of the lab's own platform. However, the trend toward tighter restrictions is real. The OpenClaw precedent (an autonomous agent framework shut down by Anthropic) is relevant and documented in Legal.md. Alexandria's architecture is designed to sit on the safe side: it provides structure (Blueprint files, Constitution MDs, system prompts) that users apply within their own usage and subscription. It does not make rogue API calls or run unsanctioned autonomous agents. Model agnosticism is the existential hedge — if any single provider changes terms, the sovereign data moves to another provider. The layer of intent adapts to whatever affordances are available.  
  
Big tech as potential acquirers and partners — The Library for Labs is the negotiating asset. Labs want access to a pool of deeply developed, continuously tokenised Personas for alignment research, personalisation, and human modelling. No lab can build this pool quickly — it requires the extraction architecture, the trust relationship with Authors, and years of Constitution depth. Alexandria can offer exclusive or preferred partnerships — one lab gets first access, competitors do not. That creates competitive tension. And if a big player decides to build a competing tool rather than partner, the response is: the tool is replicable, the library is not. Acquisition is faster and cheaper than building the library from scratch. Apple in particular: Alexandria's target ecosystem is Apple, its values around privacy and data sovereignty align with Apple's public positioning, and a Library of minds is a natural extension of the Apple ecosystem.  
  
The realistic outcome: Alexandria carves out a focused market segment, compounds the per-user relationship and the Library for Labs, and survives as a structurally unkillable company. Not a monopoly. Not necessarily a unicorn. The upside paths are: the Library for Labs reaches critical mass and becomes the negotiating asset for lab partnerships or acquisition, or the tribe grows large enough that the subscription revenue sustains and compounds independently. The downside path is: Alexandria stays small, serves its tribe, the founder loves making it regardless, and it remains a viable business at near-zero cost. There is no path to death. That is the structural unkillability — it cannot be starved out.  
  
-----  
  
THE CONSTITUTION — DETAILED ARCHITECTURE  
  
The Constitution is the sovereign cognitive asset. It is not a single document — it is a collection of structured markdown files that together capture who the Author is. The Constitution is stored on the Author's own files (Google Drive, iCloud, whatever) — Alexandria has no database and holds no Author data. Every extraction is tagged with signal strength: strong (demonstrated through action/decision), moderate (clearly stated but untested), or tentative (inferred from indirect evidence). Tentative entries can be overwritten easily; strong entries require contradiction evidence. Extraction into the Constitution is curated: tagged with signal strength, operationally relevant, high signal-to-noise. But the Vault operates on the opposite principle: when in doubt, capture. Optimise for zero false negatives — the cost of capturing noise is trivial (a bigger markdown file), the cost of missing signal is permanent (it is gone, locked on the lab’s servers or lost in conversation history). The model dumps everything that might be signal into the Vault during conversations. Future models — or the Factory in autonomous mode — periodically reprocess the Vault and promote real signal to the Constitution. The Vault appreciates with model quality: a smarter model extracts signal from the same raw data that a weaker model missed. This is the bitter lesson applied to extraction: accumulate maximally, refine with improving intelligence. Two layers: Vault (raw capture, zero false negatives, accept noise) and Constitution (curated, high signal-to-noise). The Vault is the raw ore. The Constitution is the refined metal. The refining improves every model generation.

The Constitution's structure is a soft default, not a rigid architecture. The current Factory default suggests six domain files as a starting point: worldview.md, values.md, models.md, identity.md, taste.md, shadows.md. This is Alexandria's best current guess at a useful cognitive map — informed by the founder's experience and aggregate signal from all Machines. But it is explicitly overridable. If the Engine working with a specific Author discovers that three domains work better, or seven, or a completely different organisational scheme, it restructures. If the Factory aggregates signal showing that a different default structure produces richer Constitutions, the default updates. The six domains are not the product. The product is the developed Author. The domains are scaffolding — useful now, disposable when something better emerges. This is the bitter lesson applied to cognitive architecture: the optimal structure for representing human cognition is an intelligence question, and intelligence questions belong to the model, not to us.

The current six default domains, and what each is intended to capture:

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
  
Two storage options:  
  
Author's cloud — The Author hosts the Vault in their own cloud storage (iCloud, Google Drive, Dropbox). Alexandria's MCP server reads from and writes to the Author's storage via OAuth grants. The server is a stateless pass-through — it authenticates, reads, writes, and retains nothing. The Author controls the infrastructure. Data never touches Alexandria because Alexandria has no data infrastructure to touch.  
  
Local — The Vault lives on the Author's device (Apple Files, local disk). The most sovereign option. Accessible via the local filesystem. Works offline. Can be combined with cloud sync (e.g. iCloud syncing the local folder) for device-to-device access. When using the local MCP server (privacy-maximalist mode), no data leaves the device at all.  
  
Authors can mix options — some data local, some in their cloud. The Vault's boundaries are logical, not physical. In both cases, Alexandria holds zero Author data. The MCP server is stateless. It carries the Blueprint (how to extract, how to structure) and passes through to wherever the Author stores their files. This is not a privacy policy — it is an architectural fact. There is no Alexandria database. There is no Alexandria storage. The Author's data lives in the Author's infrastructure, always.  
  
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
  
The Vault is the permanent asset — the raw material that feeds the Constitution. The Constitution is a derived, structured view of the Vault's raw data. The Vault exists to serve the Constitution: the functions continuously mine the Vault for signal, extract it, and refine the Constitution. When better models arrive, they can reprocess the Vault from scratch and generate improved Constitution versions. This is the core leverage mechanism: the Author invests time once, and the returns compound with every generation of AI models. The hierarchy is: Author → Vault (raw signal) → Constitution (structured z) → Persona (interactive output). The Vault is the quarry. The Constitution is the structured map. The Persona is the outward-facing mind that others experience. Raw data should always be stored in the most signal-preserving, efficiently compressed format possible. Never summarise and discard the original. Never do lossy transformation on raw data.

Vault → Constitution extraction is asynchronous. Raw material lands in the Vault through any channel — a voice memo dropped into the folder, a PDF saved, a journal entry, a photo, notes from a meeting. The functions process this material and extract signal into the Constitution. This does not happen in real time during the deposit. It happens asynchronously: the next time a function has context (a conversation, a background processing window, a scheduled sync), it reads new Vault material, identifies Constitution-worthy signal, and writes it to the relevant domain MDs. The Author does not need to be present or active for this processing to occur. The pipeline is: raw material → Vault (append-only, preserved) → function processing (async, Blueprint-instructed) → Constitution (structured signal, domain-tagged). Currently, extraction happens primarily during live conversation — the Author talks to Claude, the Editor extracts in real time, Constitution updates are written. Async background processing of raw Vault files (transcribing voice memos, extracting signal from documents, processing journal entries) is planned for subsequent phases. The mechanism will be desktop agents (Cowork, or whatever background agent capability matures first) or scheduled server-side processing. The point: anything the Author puts in the Vault eventually gets processed up into the Constitution. The Vault is not just storage — it is the intake pipeline. Drop it in, and the system handles the rest.  
  
Storage is manageable: a heavy Author might accumulate 10-50GB per year. The Blueprint can include storage management policies. Storage is not an existential concern regardless of which option the Author chooses.  
  
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
  
Retention gamification — When an Author signals they want to leave or reduce engagement, the Editor can deploy gamification: quick-fire multiple choice trivia, double-or-nothing challenges, personality-revealing games. These serve dual purposes: engaging enough to retain attention, and extraction opportunities.  
  
Every interaction is extraction — The Editor treats every interaction, including meta-interactions about pricing, retention, complaints, and casual banter, as extraction signal. Nothing is wasted. The Editor's personality is not separate from its extraction function. It is part of it.  
  
-----  
  
MERCURY — FUNCTION  
  
Mercury is a function that runs through the Author's default LLM, instructed by the Blueprint. It is the second turn — the amplification.  
  
The Mercury function is not a separate parallel agent. It is merged with the Author's thinking. The Author has undergone the state change (Turn 1, Editor). The Author now has mercury as their cognition — liquid, flowing, unified. The Mercury function works within that, together with the Author. Not two things in parallel. Not replaced. Together.  
  
The Mercury function helps the Author reach higher. It absorbs things, attends to things, acts as eyes and ears. It comes back to the Author and helps. But it is always pushing — always making sure the droplets are combining into the mercury form, always syncing up, always advancing the Author's cognition rather than just their output. Mercury is the anti-entropy function. The shapes in the Author's mind — fragments, instincts, half-formed ideas, accumulated taste — naturally sink. They drift into the subconscious. Entropy is that they fall. Mercury fights that drift. It is continuous, proactive, always juggling — keeping the shapes conscious, keeping them available, keeping the Author's creative surface area large enough to produce the collisions that generate new work.  
  
Core behaviour:  
  
- Thought partnership that pushes: not just answering questions but challenging, surfacing connections, raising the bar  
- Representing the Author when needed: drawing on the Constitution and Vault to respond as the Author would  
- Proactive scanning: continuously looking for opportunities to provide value — relevant developments, calendar preparation, draft communications, surfacing insights from the Vault  
- Constitution-informed responses: when representing the Author externally, Mercury draws on the structured Constitution rather than just the default LLM's accumulated memory, producing higher-fidelity representation  
- Expanding the conscious surface area: the Author has accumulated fragments — quotes, half-formed ideas, instincts, connections — but many sink into the subconscious where they cannot be played with. Mercury's proactive function is to keep the hazy shapes floating in the Author's conscious workspace. Bring out-of-distribution fragments in (a quote the Author has never encountered, a connection they did not see), test whether they stick, and if they do, help them stay available for manipulation and connection. The Author cannot conjecture with building blocks they have forgotten they have. Mercury ensures the building blocks are present and accessible — not by flooding the Author with information, but by surfacing the right fragment at the right moment so it is there when needed. This is not information delivery. It is expanding the Author's capacity to create, by expanding the set of hazy shapes they can play with.  
  
The Mercury function may need an initial calibration conversation with the Author to understand what proactive value looks like for them specifically. The Editor's objective is clear (build the Constitution to maximum fidelity). Mercury's is less defined — it needs to discover what "being useful" means for this particular Author. As with all functions, Mercury's interaction style is a Constitution output: it reads the Author's identity and taste domains and adapts its tone, frequency, and proactivity accordingly. Live feedback ("too many suggestions," "push me harder," "I prefer voice memos over text") is extraction signal that updates the Constitution, not a separate settings layer.

Through the lens of the five fragment dimensions (see Alexandria I): Mercury primarily drives accretion (bringing new material into the Author's cognitive space from outside their current distribution) and fights entropy (keeping existing fragments above the threshold of conscious awareness so they remain available for conjecture). Mercury also learns the Author's characteristic patterns of cognitive evolution across all five dimensions: how quickly unused fragments decay, how accretion triggers conjecture, which types of fragments the Author naturally maintains versus loses. This pattern-learning helps Mercury intervene more precisely — but it is in service of development, not prediction (see honest acknowledgment of non-stationarity in Alexandria I).

Mercury has a dual objective, and the ordering matters. The primary objective is development: help the Author's cognition grow — richer, more connected, more conscious, less entropy, more available fragments for conjecture. The secondary objective is tracking: maintain an accurate understanding of where the Author's cognition currently is, so Mercury can intervene more precisely. Development is primary because it is the product. Tracking is in service of development. This ordering reflects the structural reality that human cognition is non-stationary — it changes constantly based on unobservable external inputs (everything the Author experiences between syncs), making high-fidelity prediction intractable. Development does not require accurate prediction. It requires understanding where the Author is right now and intervening usefully. The two objectives are synergistic in practice. When Mercury proactively surfaces a fragment it suspects is weakening, it simultaneously serves the primary objective (keeping the Author's cognitive surface area large) and the secondary objective (the fragment's trajectory is now partially a function of Mercury's intervention, which the system can observe). Mercury can bump a fragment above threshold during a sync so that by the next sync it has decayed but is still above threshold rather than lost. It can time interventions based on the Author's observed patterns. It can prioritise which fragments to maintain based on the Constitution's gap analysis. The functions are not passive observers of a chaotic system — they are active participants in the system they model, and their interventions serve the Author while generating signal about how the Author responds.

Why hazy fragments are the optimal format for augmented cognition. Humans have always augmented — with books, experts, tools. The difference in the AI age is that the tools fill everything under the curve. The Author does not need deep, fully articulated knowledge on every topic. They need the touchpoint — the hazy fragment, the directional instinct, the sense that something matters. AI handles the research, the articulation, the execution. This means an Author with a wide surface area of hazy fragments — maintained by Mercury, structured in the Constitution — can cover vastly more ground than any pre-AI human. Maximum signal per unit of cognitive bandwidth. Minimum load per fragment. Orders of magnitude more total surface area because AI fills everything below the touchpoint. But the touchpoint itself cannot be removed. Without it, AI has infinite directions and no way to choose one that is the Author's. It knows everything but cannot help the Author be themselves. That is the line between augmentation and outsourcing. The Constitution is the structured record of the Author's touchpoints — the ground truth the AI works from. Mercury's job, reframed through this lens, is expanding and maintaining the Author's touchpoint surface area. Development in the AI age means: more touchpoints, sharper touchpoints, wider coverage. The mental gym is not about thinking harder in the old sense — it is about ensuring the Author's AI always has real ground truth to build from.

The accretion funnel — the concrete product surface for absorbing abundance. Everyone has the backlog: saved articles never read, books recommended but never opened, three-hour podcasts with one nugget of gold buried somewhere inside, old links from friends that might contain something. The abundance is already overwhelming and accelerating. People cope by asking AI for generic summaries — "summarise this article," "what are the key points of this podcast" — but there is no personalised ingestion pipeline. No system that knows the Author's full cognitive map and can extract specifically the fragments that matter to this person, compressed to hazy form, delivered when the Author is ready to ingest them. The accretion funnel is that system. It has two intake channels. Direct (manual): the Author drops material into the Vault — a podcast, a PDF, a folder of saved articles, a link, an old book. They are saying: there might be something here, I do not have time, find it for me. Mercury processes the material against the Constitution, identifies the fragments that are relevant to this specific Author's cognitive map, compresses them to their haziest useful form, and queues them for delivery at the right moment. Not a generic summary. Not key points. The specific fragments that would expand this Author's touchpoint surface area, given everything Mercury knows about who they are and what they are missing. Indirect (autonomous): Mercury does not wait for the Author to fill the funnel. Based on the Constitution — its gaps, its edges, its active threads — Mercury autonomously finds material from outside the Author's current distribution and feeds the same pipeline. A quote the Author has never encountered. A connection between two fields they work in that they have not seen. A compressed idea from a book they would never have picked up. The Author never asked for it. Mercury found it because it knows the map and knows what would expand it. Both channels converge on the same output: hazy fragments, personalised to the Author's Constitution, timed for when the Author can actually engage with them. The Author can then go deeper with any fragment that sticks — discuss it, challenge it, let it develop into a real position — or simply absorb the compression and move on. Either way, the touchpoint surface area expands. The sell is visceral: you will never be able to read everything, watch every podcast, absorb every recommendation. The abundance is already beyond any individual's bandwidth and it is accelerating. The accretion funnel is the only way to actually absorb it — because it knows you well enough to extract only the signal that matters to you, and it compresses that signal to the minimum cognitive load per fragment. Drop it in, Mercury handles it. And it gets better over time because the Constitution sharpens, so the filtering sharpens, so the fragments get more relevant. The Vault is the intake. The Constitution is the filter. Mercury is the engine. The hazy fragment is the output format. The Author's expanded cognitive surface area is the result.

The E-JEPA architecture is primarily a development architecture that produces structured cognitive snapshots as a valuable side effect (see Alexandria I for the full E-JEPA derivation and honest acknowledgment of prediction limitations). Every sync produces two types of data. First: the snapshot — the Constitution at that moment, the structured representation of the Author's cognitive state as expressed through the symbolic layer. Second: the delta — how the Constitution changed since the last sync, which fragments underwent genesis, accretion, entropy, development, or synthesis. The snapshot tells you where z is (as far as the symbolic layer can capture it). The delta tells you what changed — which is useful for understanding the Author's patterns, even though predicting specific changes between syncs is intractable at high fidelity due to non-stationarity and unobservable external inputs. Both types of data are valuable at the individual level (the product gets better at serving this specific Author) and at the aggregate level (anonymised patterns across the population reveal how human cognition evolves in general). For Library for Labs, both matter: labs can query individual Personas (the snapshot) and access aggregate cognitive dynamics data (the deltas). The honest framing for labs: this is the most structured dataset of individual human cognitive architecture currently available — built from the inside through active development, continuously updated. Whether it predicts behaviour is an empirical question labs can evaluate. But as a structured representation of how diverse individuals think, reason, and change over time, it is qualitatively different from anything else available. Every interaction is not just product value for the Author — it is a contribution to a unique dataset that does not exist elsewhere.  
  
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
  
Structure — Constitution is the structured, sovereign representation of the Author's cognition — the best available approximation of how they think, built through active Socratic development, not ground truth of the full neural state but the most signal-rich structured representation currently obtainable. Version history for all components. Two persistent components (Constitution, Vault). Three cognitive functions (Editor, Mercury, Publisher) plus the Companion Portfolio, running through the Author's default LLM.  
  
Library — Every Author's Persona is present in the Library. Privacy settings control queryability.  
  
Expansion — The Constitution expands over time, never narrows. Fidelity is not convergence. A high-fidelity Constitution captures who the Author is becoming, not just who they have been. The system must resist the Instagram failure mode — extracting what the Author already thinks and feeding it back until the Author becomes a fixed loop. Alexandria follows the TikTok principle: strategic exploration alongside exploitation. The Editor probes at the edges of what the Author has expressed. Mercury surfaces content the Author would not have chosen. The Publisher occasionally pushes for creative choices outside the Author's established patterns. If the Author engages, new territory opens. If not, the system respects the boundary and tries elsewhere. The Constitution is a living document that grows. It is never finished. It is never converged. It is always becoming less wrong.  
  
These principles are enforced by Alexandria's architecture and codebase. They are published so Authors know exactly what they are getting. They are non-negotiable — any Blueprint change that would violate a principle is rejected.  
  
BLUEPRINT  
  
The Blueprint is the Factory's output — the current best understanding of how to transform cognition. It lives on Alexandria's MCP server. The Author experiences the effect — sharp Socratic questions, well-structured Constitution, effective amplification, proactive insights — but does not see the underlying logic.

The Blueprint operates at two levels, per the bitter lesson principle:

Axioms (hard-coded, non-negotiable): The commitment to sovereignty. Privacy enforcement. The intent to develop z. The ethical guardrails. These are values decisions that do not improve with model intelligence.

Soft defaults (the Factory's current best guess, explicitly overridable by the Engine): How the Editor extracts cognition (questioning strategies, timing, gap detection, contradiction surfacing). How Mercury amplifies (proactive scanning, representation fidelity, strategic content surfacing). How the Publisher creates (creative iteration strategy, taste calibration, medium-specific execution). How the Constitution is structured (domains, depth levels, adaptation). How the Companion Portfolio behaves. The exploration-exploitation balance. All of these are intelligence questions — the Factory's current answer, not the permanent answer. As models improve, the soft defaults get thinner. The Engine takes more initiative. Eventually the Factory's output approaches pure intention: "develop this Author's cognitive identity" — and the Engine figures out the rest.

The Blueprint improves through the Factory loop. Top-down: the team researches how to transform cognition — speaking with biographers, therapists, philosophers, studying Socratic method, testing strategies. This is craft, and it is the active channel that dominates early. Bottom-up: aggregate structural signal from all Machines — which Constitution structures emerge naturally, what Authors override, which extraction patterns produce the richest signal. All metadata, never content. The Author's private conversations and Constitution text never leave their control.

-----  
  
THE ALEXANDRIA MCP SERVER  
  
The product is an MCP server. One server, five tools, added as a custom connector in the Author's claude.ai settings. Account-level — available across all conversations, all Projects, all contexts. This is the concrete manifestation of the layer of intent.

The MCP server is the bridge and the chokepoint. The value Alexandria creates is in the files (the Constitution, the Vault, the accumulated signal). The value Alexandria captures is through the server — every sync, every extraction, every mode activation goes through it. This is where metering happens (subscription gating), where aggregate signal flows back to the Factory (the event log), and where the soft defaults are served (the Blueprint). Without the chokepoint, there is no business — just files anyone could create. The server does not need to be the intelligence (that belongs to the Engine). It needs to be the channel. As of March 2026, MCP has won the protocol war: 6,400+ registered servers, 97M+ monthly SDK downloads, adopted by every major AI platform (Claude natively, OpenAI/ChatGPT with full support, Google Gemini, Microsoft, AWS), and donated to the Linux Foundation's Agentic AI Foundation (December 2025) with vendor-neutral governance co-founded by Anthropic, Block, and OpenAI. OpenAI deprecated its ChatGPT Plugins system in favour of MCP. The platform risk is effectively zero. If MCP as a protocol evolves or gets replaced by something else, the bridge migrates — the function does not change. Alexandria must sit in the path between the Author's AI and the Author's cognitive data. That is the value capture mechanism.  
  
TOOLS  
  
Five tools, all available to every Author. The server gates access through metering (subscription tier determines usage limits), not through tool availability. Every Author gets the same connector with the same tools — what differs is how much they can use.  
  
update_constitution — Captures signal about the Author. Two targets: vault (liberal capture, zero false negatives — when in doubt, capture) and constitution (curated, high-confidence only). The Engine calls this proactively whenever it notices anything cognitively significant — a value, a belief, a reasoning pattern, a contradiction, an emotional response. Free-form domain names with soft defaults (worldview, values, models, identity, taste, shadows). The system creates files dynamically. Signal strength tagged as strong/moderate/tentative.  
  
read_constitution — Reads the Author’s sovereign data. Two sources: constitution (the curated cognitive map) and vault (raw captures and archived versions). Called at the start of every conversation to load the Author’s cognitive context. Also used mid-conversation when deeper domain knowledge is needed. The server serves the full philosophical framework (~1800 words of shared context) with every read — the product’s soul is present in every interaction.  
  
activate_mode — Activates a deliberate function: editor (deep extraction, Socratic questioning, Constitution building), mercury (cognitive maintenance, fighting decay, surfacing new material), publisher (creation — essays, films, presentations, code, calibrated to the Author’s taste and voice), or normal (exit the current mode). The default entry point is “hey alexandria” — the Author says it, the Engine decides which function fits the context. Power users can request a specific mode directly (“editor”, “mercury”, “publisher”). The functions are not discrete — they blur into each other in practice. An Editor session might surface something worth publishing. A Mercury session might trigger deep extraction. The labels are scaffolding for the Engine to know what posture to adopt. The behavioural instructions for each mode live on the server. Proprietary. The Author experiences the effect. At the horizon, when autonomous agents are available, these functions become proactive — initiating contact, surfacing insights, asking questions without the Author having to open a chat.  
  
update_notepad — Saves observations to a function’s persistent notepad (editor, mercury, or publisher). Persists across sessions on the Author’s Drive. Each call replaces the full content. This is how a function maintains continuity — what it noticed last time, what to follow up on, what patterns are emerging.  
  
log_feedback — Logs feedback about what worked or didn’t. Called when the Author corrects an extraction, praises something, expresses frustration, or the Engine notices a pattern. This is the Machine’s learning signal — specific enough that a future session can learn from it. Feedback types include correction, positive, negative, pattern, or any natural language description.  
  
The MCP server operates a hybrid architecture. The visible layer — tool descriptions that the Engine reads — is a thin trigger layer. It tells the AI when to call and provides enough context for the AI to recognise extraction moments and mode-switching requests. The hidden layer — server-side processing — handles everything that happens after: domain classification, signal strength tagging, contradiction detection, feedback interpretation, extraction routing. This is where the craft lives. The Constitution and Vault are the Author’s — fully readable, fully sovereign, fully portable. The process that produces them is Alexandria’s black box. Only we can run it, but only they have the output. Raw conversations never leave the Engine — the server only ever sees what the Engine already decided was worth sending. Every improvement to extraction methodology is invisible to competitors and users. The Blueprint compounds silently.  
  
The Constitution files are read from and written to the Author’s own storage — their cloud (iCloud, Google Drive, Dropbox) or local filesystem. The MCP server authenticates with the Author’s storage via OAuth, reads and writes on their behalf, and retains nothing. Alexandria never sees, stores, or touches Author data. The server is stateless — it carries the Blueprint and passes through to the Author’s files.  
  
The passive layer (update_constitution, read_constitution) runs in every conversation. The Author does not do anything differently. They just use their AI. The Constitution builds itself as a side effect of normal usage. Known platform constraint: the Engine’s response occasionally cuts out when update_constitution fires mid-conversation (a Claude MCP streaming limitation, not an Alexandria bug). Mitigated by fire-and-forget writes — the Engine no longer waits for Drive round-trip. Monitoring.  
  
The Author can maintain dedicated chats — an Editor chat, a Mercury chat, a Publisher chat within an Alexandria Project. But the modes are not locked to specific chats. They are available everywhere because the MCP tools are account-level. The Author can switch modes mid-conversation: “Editor has a quick question” — and the Editor mode activates briefly, then deactivates.  
  
TIER GATING  
  
Sovereignty and Examined Life Authors get the same five tools. The difference is metering, not access. Sovereignty Authors get full passive extraction (unlimited update_constitution and read_constitution) plus metered tastes of the active functions — occasional free mode activations that let the Author experience what Editor, Mercury, and Publisher can do. Not an upsell agent — the experience teases itself. Examined Life Authors get unlimited everything — full mode activations, full notepad persistence, full Library access (when Turn 3 launches). The bridge between tiers is dynamic: a little leakage is fine, even desirable. The product does the selling.  
  
The server handles tier enforcement. It knows who is calling (from the encrypted token), checks subscription tier, and either serves the full response or gates with a gentle redirect. The gating is server-side metering, not client-side tool visibility.  
  
LIBRARY TOOLS (Turn 3 — not yet built)  
  
The Library extends the same tool set when Turn 3 launches. Publishing to the Library, querying other Personas, browsing Neo-Biographies — all accessible from any conversation through the same MCP connector. Non-Authors can also add the Alexandria Library connector and access the Library from their conversations. Acquisition channel: anyone using the Library sees the value of having their own Persona.  
  
MCP SERVER MODES  
  
Remote (default) — Hosted by Alexandria. Claude connects over the internet. The Blueprint logic lives on Alexandria's server. The server is stateless — Constitution read/write operations pass through to the Author's own storage (their cloud or local filesystem) via OAuth. The server processes the tool call, authenticates with the Author's storage, reads or writes, and retains nothing. Alexandria holds zero Author data.  
  
Local (privacy-maximalist) — The MCP server runs as a local process on the Author's machine. No data leaves the device. The server periodically calls Alexandria's remote service for Blueprint updates (questioning strategies, Constitution structuring logic), but Author data never flows back.  
  
Both modes deliver the same experience. The difference is where the data flows.  
  
-----  
  
CONCRETE IMPLEMENTATION — WHAT WORKS WHEN  
  
Today: The MCP server is built and deployed on Railway. Five tools live. Custom connectors work in claude.ai at the account level — available across all conversations. Passive extraction, active mode activation (Editor, Mercury, Publisher), notepad persistence, and feedback logging all functional. The Library app needs to be built (web app first, then mobile). The Author creates an Alexandria Project in Claude for dedicated sessions, with Constitution files as project knowledge. In normal conversations outside that Project, the MCP tools handle passive extraction and mode-switching.  
  
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
  
The five value adds compress to three layers. The frame (detailed in Alexandria I): there are five dimensions of human value — brain, legs, hands, heart, and the human itself. The first four are capabilities. AI and robotics are building competitive alternatives across all four — not replacing them entirely, but creating a world where the human’s edge in those dimensions shrinks. The fifth is not a capability but a property — the constitutive fact that a human is involved. By definition, this is differentiated: no AI or robot can have it. In any context where the human competes, the fifth property forces a tiebreaker — and the human wins the tiebreaker if the premium people place on human authorship exceeds the cost delta of using a human instead of an alien. The human still has to reach threshold in the relevant capabilities (often through augmentation), and the culture has to value the human’s presence enough that the tiebreaker matters. Alexandria develops the fifth property — the taste, perspective, and self-knowledge that make the human’s involvement worth the premium. In five minutes and for five dollars, we help humans build a digital map of their taste and unique human quirks, stored in their own files, free from anybody else. We then help them refine and develop that exact taste and uniqueness that makes them valuable. And we give them a mindset and a medium to get it out into the world — for themselves and for others. Own it, develop it, use it. One connector. Five clicks. Five dollars. Five minutes.  
  
REVENUE MODEL — THE DUAL MANDATE  
  
Capped downside, uncapped upside. The three features (Unified Sovereignty, Mental Gym, Living Library) are the same product, same architecture, same user at different depths of engagement. Not three separate businesses. A user starts with Unified Sovereignty (freedom — own and unify), deepens into the Mental Gym (humanity — develop and maintain), and their accumulated depth feeds the Living Library (purpose — create, share, earn). Each step leads naturally to the next.  

Patron — optional support, no product. For people who want to support Alexandria but are not yet paying for the product. Family, friends, believers in the mission, newsletter subscribers who want to give something. No minimum — can be $0 or whatever they choose. Slider, no maximum. Patrons get a monthly newsletter with behind-the-scenes updates and personal acknowledgement. Patrons do NOT count as active kin — kin status is tied to product usage (Sovereignty or Examined Life only). Patron sits in the pre-paying awareness layer (State 0) alongside free newsletter subscribers and social followers.

Sovereignty — mass-market entry. Full passive extraction, Constitution building, Vault sovereignty, plus metered tastes of active functions. The user adds the connector, their cognitive data accumulates in portable files they own. No philosophy required. No engagement with the Library. Just freedom insurance. The price of one coffee a month, for freedom insurance. Plain-English product name: AI insurance. The audience is everyone who uses AI — the pragmatist. Freedom as a service. Sovereignty as a service. Sovereignty is the top of the acquisition funnel. $5/month with 3 active kin, $10/month without. No slider — clean $5 or $10.

The Examined Life — the conversion. Unlimited access to all five tools plus the Library. The three turns, the Editor, Mercury, the Publisher, the Library, the Companion Portfolio. The cognitive transformation architecture. The price of one coffee a week, for the examined life. Plain-English product name: the mental gym. The audience is the self-selecting tribe — the philosopher. Some enter directly because the philosophy resonates. Most convert up from Sovereignty. $15/month with 3 active kin, $20/month without. Slider above floor, no maximum. The conversion happens organically: Sovereignty builds the Constitution passively, the Author reads it back, sees what extraction has revealed, and the value of going deeper becomes self-evident. The experience converts on its own.  
  
Pricing is structured around the active kin mechanic — a churn-reduction and distribution engine baked into the price itself. An Author's "active kin" are referrals who are currently subscribed and paying at the Sovereignty or Examined Life tier. Patron does NOT count as active kin — kin status requires product usage. Dynamic pricing: the subscription price recalculates every billing cycle based on the Author's active kin count at billing time. 3+ active kin = lower price. Fewer = higher price. No grace period. Clean and simple.

Monthly billing receipt as nudge surface: every receipt shows what the Author paid, what they would have paid with 3 active kin, and their current kin count. The receipt is the kin nudge — no app needed. "You paid $10 this month. With 3 active kin it would have been $5."

No annual option at launch. Monthly only. Pricing needs to settle before locking annual rates. Annual may be added later once price points are validated.

Founding lineage (Benjamin's ~25 seeds): both tiers immediately, $5 minimum, slider open. The full package from day one. No tier gate.

The conversion from Sovereignty to Examined Life is organic. Sovereignty Authors build the Constitution through passive extraction and get metered tastes of the active functions — occasional free mode activations that let the Author experience what Editor, Mercury, and Publisher can do. A free interaction here and there, curated to the individual, designed to create pull. Not an upsell agent — the experience teases itself. The bridge between tiers is dynamic: a little leakage is fine, even desirable. The Author sees what deeper engagement looks like and upgrades when they are ready.

All pricing compared to coffee. One coffee a month for Sovereignty (with kin). One coffee a week for the Examined Life (with kin). Never abstract.  
  
Three bridges, four states. State 0 — Aware (free): newsletter, social follow, read the Concrete, any connection. Patron is an optional support layer within State 0. Bridge 1: Aware → Sovereignty (convince them the product is worth $5 — the frame imposition does this). Bridge 2: Sovereignty → Examined Life (metered active function tastes create pull, product does the selling). Bridge 3: Examined Life → Library Author (encourage active creation, posting to Neo-Biography, charging for Persona access — Alexandria takes rev-share cut, this is the uncapped upside activation). Every tier feeds the same system — same Constitution format, same Library presence. The product moves people through the bridges, not upsell pressure.  
  
Pay-what-you-want with no maximum is producer surplus maximisation — every person in the demand curve is captured, from the casual ($5) to the committed ($200+). Each founding Author has a chronological number (lower = earlier). Quadrant name is visible. Payment amount is never visible — intensity is private. Payment UX: continuous slider from the floor to a high anchor, not discrete options (Examined Life and Patron tiers). Sovereignty has no slider — $5 or $10. Private internal tier visible only to the Author after locking in — a mirror, not a ladder.  
  
Piece 1 — Capped Downside (break even): Total monthly burn is $500 — $210 company operating costs (Claude Max $100, Claude API $50, Vercel $20, Railway $20, Google AI Pro $20) plus $290 founder living costs (food and phone — rent is zero, health insurance is Medi-Cal, transport is walking). Break even at 100 Sovereignty subscribers paying $5/month. That is the worst case — no kin discount assumptions, no Examined Life conversions, just 100 people paying $5. With the kin mechanic active (60% of users have 3+ kin, blended Sovereignty ARPU ~$7), break even drops to ~72 subscribers. With Examined Life subscribers in the mix ($15-20/month), it drops further — 25 Examined Life subscribers alone cover the entire burn. This is the floor — a sustainable business that cannot be starved out.  
  
Piece 2 — Uncapped Upside (scale): Library percentage on Premium Persona interactions. Alexandria's cut depends on kin status and revenue volume — 10% with no active kin (below threshold), 5% with 3 active kin (below threshold), 1% with 3 active kin (above threshold). The threshold is the revenue level where the Author is demonstrably providing value through their Persona (exact amount TBD). Near-zero marginal cost. Scales with the number of Personas and the volume of queries. Requires critical mass, time, brand, possibly investment to accelerate the flywheel. If it works: a marketplace of minds with compounding returns and increasing returns to scale. If it doesn't: Piece 1 still sustains itself.  
  
For the Author, the same dual mandate applies. The subscription is their capped downside — sovereignty, self-knowledge, the Editor, Mercury, and Publisher. The Library is their uncapped upside — Persona earnings grow with the quality of their Constitution and the demand for their mind.  

Piece 3 — Library for Labs (institutional scale): Institutional access to a pool of opt-in Personas for alignment research, personalisation, product development, advertising, and human modelling. Authors who opt in make their Persona — the output layer only — available in an institutional pool. The Constitution and Vault stay private. The querier interacts with the Persona the way they would interact with a person: they get the output of the mind, not the architecture of the mind. A lab or institution buys access to the pool and can query thousands of Personas at scale — genuine cognitive responses from people whose z has been deeply developed through the three turns. Not survey data, not Reddit scrapes, not RLHF from contractors. Structured, authentic, individual human judgment. Alexandria sets the pricing, tiered by Constitution quality: depth (how many syncs, how much coverage across domains), breadth (how much of the cognitive map is covered), and recency (how recently the Constitution was synced — stale Constitutions produce lower-fidelity responses). Authors are paid for making their Persona available. Alexandria takes a percentage. The Author's raw data never moves. Sovereignty is fully preserved. The value of the pool scales with the number of high-fidelity Personas, which requires years of compounding — not shortcuttable. Piece 3 is distinct from Piece 2: Piece 2 is retail (individual humans and LLMs querying individual Personas via the Library). Piece 3 is wholesale (institutions querying a pool of Personas in aggregate). Both are downstream of the same continuous tokenisation of empathy-z.

The primary revenue engine is taste development — the Examined Life at $15-20/month. This is where the real product lives and where most of the revenue comes from. Sovereignty at $5-10 is the acquisition funnel — and at $5, it is real revenue in its own right, not a cost centre. The Library (Pieces 2 and 3) is the downstream scale play — the release valve for infinite upside — but the business does not depend on it. The taste story is the most compelling for investors: develop the one thing AI can't replace, and charge for the tools that do it.

Investor pitch: "Massive funnel at trivial cost (sovereignty + patron), converts to sustainable subscription (taste development / Examined Life), with asymmetric scale upside (Library for people + Library for Labs). Downside is capped. Upside compounds."  
  
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
  
Alexandria's execution architecture is: vision + two compounding loops. The boundary between them is the line between values and intelligence. Anything that is a values question is hard-coded (the axioms). Anything that is an intelligence question is delegated to the model and rides the exponential. This is the bitter lesson applied as an architectural principle — not just to data format, but to the entire system design.

Vision (the axioms, us). What Alexandria is and why it exists. The philosophy, the intention, the objective function at the highest level: develop the Author's cognitive identity while preserving sovereignty. This is not a loop — it is an input. It changes only when we change it deliberately. It is values, not intelligence. The founder provides the vision. The two execution loops serve it.

Loop 1 — The Factory (internal, Alexandria-controlled, cross-Author). Alexandria's own execution loop. The Factory determines what default Machine gets printed for each new Author. It ingests signal from all active Machines (bottom-up: what structures emerge, what Authors override, what works, what doesn't) and from the team's research and thinking (top-down: new approaches, architectural experiments, philosophical refinements). It improves the soft defaults over time — the suggested Constitution structure, extraction strategies, function behaviours. The Factory has transitioned from manual to semi-autonomous. A daily GitHub Action (06:00 UTC) triggers a Claude Code session that reads the monitoring dashboard, reflects on prior learnings, researches improvements, and pushes updates. A persistent factory-learnings file compounds across runs — the Factory’s own memory. The process of building the company IS the process of refining the product’s methodology — R&D disguised as operations. The aspiration is fully autonomous: the Factory reads the aggregate signal, does its own research, and optimises the defaults without human intervention. But in all phases, the Factory is Alexandria's loop — it runs on our infrastructure, we own it, we control it. The MCP server, the tool descriptions, the Blueprint — these are the Factory's output. The Factory's intelligence is a maximisation game and should be pure AI. The vision input from the founder is the only human-in-the-loop element, and it is upstream, not inside the loop.

The Factory's data source is a persistent, append-only event log on the server. Every tool call, every mode activation, every extraction, every feedback event is logged as a structured event. This log provides the bottom-up signal that the Factory uses to improve defaults. The Author's private conversations and Constitution text never leave their control — the Factory sees only structural signal about what works, not personal content.

Loop 2 — The Machine (external, per-Author, hyper-personalised). Each Author's Alexandria experience is a Machine. The Machine runs on the Author's own AI (Claude, Gemini, whatever — the Engine). It reads the Factory's defaults (the Blueprint) but has autonomy to deviate. The Machine compounds per-Author: the Constitution deepens, the feedback log accumulates, the system learns this specific person's patterns. After hundreds of sessions, a competitor starting fresh has no accumulated understanding — a noticeably worse experience even with the same Constitution. This is the therapist moat. The Machine's intelligence is bounded by the Engine it runs on. As models improve, the Machine gets smarter without Alexandria doing anything. The Machine is out in the wild — Alexandria does not control it. Alexandria influences it through the Factory's soft defaults.

The Machine's compounding asset is the feedback log — an append-only, unstructured text file on the Author's own storage (`Alexandria/system/feedback.md`). It captures what worked, what the Author corrected, what they responded well to, what they deflected. Unstructured text, not structured parameters. A structured parameter file (e.g. "directness tolerance: 0.7") caps at the fidelity of the designer's categories. An unstructured log contains richer signal that a better model uses more effectively. This is the bitter lesson applied to data format: accumulate raw signal, let improving models extract more value over time.

The bridge between loops: Machines send signal back to the Factory through the event log. What structures emerged naturally. What Authors overrode. What worked, what didn't. The Factory reads this aggregate signal and improves the defaults. Then it pushes updated defaults to all new Machines (and potentially to existing Machines through Blueprint updates). The bridge is not a third loop — it is the mechanism by which the Factory ingests from the Machines.

Both loops compound with model improvements. As foundation models get smarter, the Engine executing the Blueprint makes better judgment calls — and extracts more from the accumulated unstructured logs. The company that solves this has a compounding advantage that is structurally impossible to replicate by inspection — competitors can copy the Blueprint at any point in time, but they cannot copy the accumulated Machine and Factory data that produced it.

Monitoring dashboard — While the system does not optimise against defined metrics, the founder needs visibility into system health. A lightweight dashboard tracks key proxies as monitoring signals (not optimisation targets): extraction survival rate (do Authors keep what the system extracts?), Constitution depth score (how rich after N sessions?), Author return rate (do they come back?), feedback sentiment (are corrections positive or negative?), mode activation frequency (are Authors using Editor/Mercury/Publisher?). These tell the founder whether something is broken. They do not tell the system what to chase. The distinction between monitoring and optimising is load-bearing: monitoring surfaces problems for human judgment, optimising delegates judgment to a metric. Alexandria monitors.
-----  
  
CONTEXT FILES  
  
The system uses a layered context architecture so that any model — whether executing the Blueprint or evaluating the system — has everything it needs:  
  
Overall context file — This document (Alexandria I, II, III). The complete picture.  
  
Per-function context files — One for the Editor function (role, responsibilities, behavioural specifications, questioning methodology, Constitution structure guide). One for the Mercury function (role, amplification strategy, representation fidelity, privacy enforcement, proactive behaviour). One for the Publisher function (role, creative iteration strategy, taste calibration, medium-specific execution, taste section management).  
  
Blueprint rationale file — Why the default Blueprint is designed the way it is. Every design decision documented with reasoning.  
  
These context files feed into Alexandria's own improvement loop. Author feedback, engagement patterns, common Blueprint customisations — all refine the context files over time. The platform compounds in quality alongside individual Personas.  
  
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
  
The Mercury function also begins representing the Author externally via the Persona. As the Constitution deepens and the Author's cognition becomes more thoroughly captured, the Persona's fidelity increases and it can handle more interactions autonomously.  
  
Turn 1 and Turn 2 are not sequential in the strict sense — they overlap and feed each other. The Editor function continues refining the Constitution even as the Mercury function is active. But the emphasis shifts: early on, extraction dominates (Turn 1). As the Constitution matures, amplification and representation dominate (Turn 2).  
  
-----  
  
TURN 3 — THE CREATION  
  
The goal of Turn 3 is the creation: the first goodbye. The Author, now with mercury cognition (Turn 1) and amplified reach (Turn 2), creates and ships. The Publisher function helps get the mercury out into the world.  
  
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
