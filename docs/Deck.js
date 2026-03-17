const pptxgen = require("pptxgenjs");

let pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Benjamin Mowinckel";
pres.title = "Alexandria — Investor Meeting";

const C = {
  cream: "F7F5F0",
  charcoal: "2A2A2A",
  muted: "8A8580",
  light: "B0ABA5",
};
const hFont = "Georgia";
const bFont = "Calibri";

// 1. TITLE
let s1 = pres.addSlide();
s1.background = { color: C.cream };
s1.addText("alexandria.", {
  x: 0.8, y: 1.8, w: 8.4, h: 1.2,
  fontFace: hFont, fontSize: 52, color: C.charcoal,
  align: "left", valign: "bottom", margin: 0,
});
s1.addText("Cognitive identity infrastructure", {
  x: 0.8, y: 3.2, w: 8.4, h: 0.5,
  fontFace: bFont, fontSize: 15, color: C.muted,
  align: "left", valign: "top", margin: 0,
});
s1.addText("Benjamin Mowinckel  \u00b7  benjamin@mowinckel.com  \u00b7  mowinckel.ai", {
  x: 0.8, y: 4.8, w: 8.4, h: 0.4,
  fontFace: bFont, fontSize: 10, color: C.light,
  align: "left", valign: "bottom", margin: 0,
});
s1.addNotes("Thank them for reading the materials. They have been through the memo, the logic, and the numbers. Do not re-pitch. Ask: what stood out? What do you want to start with? If they do not have a preference, guide with the slides. The deck is your cue card \u2014 you talk, the slides anchor.");

// 2. THE FRAME
let s2 = pres.addSlide();
s2.background = { color: C.cream };
s2.addText("Five dimensions of human value", {
  x: 0.8, y: 1.5, w: 8.4, h: 1.0,
  fontFace: hFont, fontSize: 36, color: C.charcoal,
  align: "left", valign: "bottom", margin: 0,
});
s2.addText("Brain  \u00b7  Legs  \u00b7  Hands  \u00b7  Heart  \u00b7  The human itself", {
  x: 0.8, y: 2.8, w: 8.4, h: 0.5,
  fontFace: bFont, fontSize: 16, color: C.muted,
  align: "left", valign: "top", margin: 0,
});
s2.addNotes("They have read this. Anchor it in 30 seconds and move on.\n\nThe thesis: AI and robotics compete on all five dimensions of human value. The first four can be done by either humans or machines. The fifth \u2014 the constitutive fact that a human is involved \u2014 is by definition differentiated. It forces a tiebreaker in threshold loops. Alexandria develops the thing the tiebreaker depends on.\n\nIf they push back on the frame: this is the most important conversation. Ask which of the five they think AI will not compete on. Usually resolves fast.\n\nKey nuance: humans still compete on the first four, augmented. The fifth forces the tiebreaker when both meet threshold. Developing z improves both sides \u2014 lower cost (better direction, fewer iterations) and higher premium (more developed human, more valued).\n\nBroader context if it fits: the technology industry moves through eras. Deep software is maturing. Deep hardware is the current frontier. Deep philosophy is next \u2014 once the machines are built and the intelligence is running, the only remaining question is what it should do, and for whom. Alexandria is building the philosophy layer now so that both the company and the product are ready when the world catches up. This is what pre-positioning looks like.");

// 3. THE PRODUCT
let s3 = pres.addSlide();
s3.background = { color: C.cream };
s3.addText("Freedom  \u00b7  Humanity  \u00b7  Purpose", {
  x: 0.8, y: 1.5, w: 8.4, h: 1.0,
  fontFace: hFont, fontSize: 36, color: C.charcoal,
  align: "left", valign: "bottom", margin: 0,
});
s3.addText("One product. Three depths. Natural funnel.", {
  x: 0.8, y: 2.8, w: 8.4, h: 0.5,
  fontFace: bFont, fontSize: 16, color: C.muted,
  align: "left", valign: "top", margin: 0,
});
s3.addNotes("Quick anchor \u2014 they know this from the memo.\n\nFreedom ($5\u201310/mo): Own and unify your cognitive profile across every AI. Sovereign, portable, stored on your own files. Zero servers.\n\nHumanity ($15\u201320/mo): Develop it. The mental gym. Socratic extraction. The examined life as a subscription.\n\nPurpose (Library): Share it. Others query your perspective. Labs access structured cognitive representations.\n\nEmphasis: NOT three separate businesses. Same architecture, same user, different depth. Insurance \u2192 mental gym \u2192 Library is a natural funnel.\n\nLayer 1 costs near-zero to serve (user\u2019s own AI + storage), so even $5/mo is almost pure margin.\n\nIf they want a demo: offer to show the MCP server live.");

// 4. THE ASSUMPTIONS
let s4 = pres.addSlide();
s4.background = { color: C.cream };
s4.addText("The assumptions", {
  x: 0.8, y: 1.5, w: 8.4, h: 1.0,
  fontFace: hFont, fontSize: 36, color: C.charcoal,
  align: "left", valign: "bottom", margin: 0,
});
s4.addText("Everything settled cannot reasonably be denied.\nThese are the only things worth discussing.", {
  x: 0.8, y: 2.8, w: 8.4, h: 0.8,
  fontFace: bFont, fontSize: 16, color: C.muted,
  align: "left", valign: "top", margin: 0,
});
s4.addNotes("This is the intellectual core of the meeting. Transition: you have read the logic chain. 44 premises, 11 conclusions. Everything marked settled cannot reasonably be denied. The only conversation is about the 20 assumptions. Which ones do you want to talk through?\n\nLet them drive. For each assumption they raise:\n\n- Breathing room size: the logic is sound, the SIZE is the assumption. Ask how fast they think it closes.\n- Regulation: GDPR Articles 13/14 transparency, Article 4(4) profiling. LinkedIn fined \u20ac310M in 2024. Cognitive profiling is far more sensitive.\n- Non-lab giants: Palm to iPhone, Pebble to Apple Watch. Giants enter proven categories, not unproven ones.\n- $5 insurance: Pascal\u2019s Wager. Even half-convinced, $5 is not a close call.\n- Mental gym market: therapy, coaching, journaling apps already exist. This is the AI-native version.\n- Labs paying for Library: three ways to access cognitive data. Only structured Socratic extraction works. And it requires sovereignty.\n- Calibration: the therapist moat. Encrypted parameters compound per-user.\n- Apple: acknowledge it. That IS the exit thesis. Acquisition not competition.\n\nGoal: they leave understanding exactly what they are betting on. No hidden risk.");

// 5. DEFENSIBILITY
let s5 = pres.addSlide();
s5.background = { color: C.cream };
s5.addText("Defensibility \u2014 honest", {
  x: 0.8, y: 1.5, w: 8.4, h: 1.0,
  fontFace: hFont, fontSize: 36, color: C.charcoal,
  align: "left", valign: "bottom", margin: 0,
});
s5.addText("No single traditional moat.\nThree layers that together create a meaningful head start.", {
  x: 0.8, y: 2.8, w: 8.4, h: 0.8,
  fontFace: bFont, fontSize: 16, color: C.muted,
  align: "left", valign: "top", margin: 0,
});
s5.addNotes("Be maximally honest.\n\nDefensibility is a cost gradient, not a wall. Primary force: the lock-in disincentive \u2014 labs won\u2019t build the thing that makes it easy to leave. Regulation and breach liability reinforce it. On top: (1) Hidden implementation \u2014 extraction logic is server-side, a competitor cannot inspect it. (2) Per-user feedback log compounding \u2014 the therapist moat, unstructured signal that appreciates with model quality. (3) Non-obvious question \u2014 the problem is not trivially obvious to identify.\n\nNone is a wall. Together they create a position genuinely hard for labs to occupy.\n\nAdditional moats if they ask: Library for Labs network effects, tribe identity (kin mechanic creates social lock-in), structural unkillability ($101/mo company opex means the company literally cannot die).\n\nIf they ask what stops Apple: nothing, structurally. Giants do not create categories. They enter proven ones. And if Apple builds it \u2014 that IS the exit thesis. Acquisition not competition.\n\nThe honesty IS the pitch. If you hedge here, they trust nothing else.");

// 6. THE NUMBERS
let s6 = pres.addSlide();
s6.background = { color: C.cream };
s6.addText("$101/month company opex", {
  x: 0.8, y: 1.2, w: 8.4, h: 1.0,
  fontFace: hFont, fontSize: 36, color: C.charcoal,
  align: "left", valign: "bottom", margin: 0,
});
s6.addText("Break-even at ~21 subscribers  \u00b7  Near-zero marginal CAC  \u00b7  89%+ gross margin by Year 2", {
  x: 0.8, y: 2.5, w: 8.4, h: 0.5,
  fontFace: bFont, fontSize: 15, color: C.muted,
  align: "left", valign: "top", margin: 0,
});
s6.addText("Y1: $211K rev  \u00b7  Y3: $1.3M  \u00b7  Y5: $4.6M", {
  x: 0.8, y: 3.3, w: 8.4, h: 0.5,
  fontFace: bFont, fontSize: 15, color: C.muted,
  align: "left", valign: "top", margin: 0,
});
s6.addNotes("They have seen Numbers.xlsx. This is the conversation about assumptions, not a re-presentation.\n\nKey assumptions to discuss:\n- 2,000 Sovereignty users Y1 \u2014 founding lineage 25 to 75 to 225 to 675 to 2,025 gets there organically\n- 8% initial Sov to Examined Life conversion \u2014 conservative\n- 4% monthly Sovereignty churn \u2014 high, which is honest\n- 150% YoY growth \u2014 aggressive but declining curve\n- Company opex: $101/month \u2014 Claude Max $100, Railway $1. Everything else free tier or owned. Founder living costs (~$300/month + rent) separate.\n- Payment processing optimised: ACH for Sovereignty (0.8% flat), Stripe cards for Examined Life (2.9% + $0.30). Blended ~1.4% of revenue. Billing frequency: monthly default, quarterly 10% off, annual 20% off.\n- Break-even at ~21 Sovereignty subscribers at $5/month. With kin mechanic (~$7 blended ARPU): ~15. With Examined Life: as few as 6.\n\nThe projections are conservative on some axes and optimistic on others. Say so.\n\nThe returns look high because the cost base is near-zero.\n\nEven the downside (half base case) is a profitable business. There is no scenario where the investment goes to zero.");

// 7. THE RETURN
let s7 = pres.addSlide();
s7.background = { color: C.cream };
s7.addText("$50K at ~1% equity", {
  x: 0.8, y: 1.2, w: 8.4, h: 1.0,
  fontFace: hFont, fontSize: 36, color: C.charcoal,
  align: "left", valign: "bottom", margin: 0,
});
s7.addText("10x ARR:  9.1x MOM  \u00b7  56% IRR\n15x ARR:  13.7x MOM  \u00b7  69% IRR\n20x ARR:  18.2x MOM  \u00b7  79% IRR", {
  x: 0.8, y: 2.5, w: 8.4, h: 1.2,
  fontFace: bFont, fontSize: 16, color: C.muted,
  align: "left", valign: "top", margin: 0,
});
s7.addText("Downside \u2014 half the base case:  4.6x MOM.  Still profitable.", {
  x: 0.8, y: 4.0, w: 8.4, h: 0.5,
  fontFace: bFont, fontSize: 14, color: C.light,
  align: "left", valign: "top", margin: 0,
});
s7.addNotes("$50K at ~1% implies a $5M pre-money valuation. Conservative relative to comps: Delphi ($18.7M Series A, Sequoia), Mem0 ($24M, YC), Uare.ai ($10.3M seed) — all building fragments of what Alexandria unifies. None has the full thesis.\n\nThe MOM and IRR numbers are a function of the near-zero cost base, not optimistic projections.\n\nThe 10x case assumes Alexandria is just a SaaS company with no dataset premium. Even the floor is 9.1x on a $50K check.\n\nIf they push on the 20x multiple: it assumes a strategic buyer paying a premium for the Library for Labs dataset and trust infrastructure. That is an assumption.\n\nThe downside is not zero \u2014 it is 4.6x. The company is still profitable. There is no scenario where the investment goes to zero because the burn is so low.\n\nWhy the raise is small: the company does not need the money. Company opex is $101/month. The money is a buffer \u2014 it lets the founder stay in build mode without friction. The real value of the investment is partnership, not capital. The founder is choosing who to have on the cap table, not filling a round.\n\nThree return paths: subscription growth, Library for Labs B2B, strategic exit.");

// 8. THE FOUNDER
let s8 = pres.addSlide();
s8.background = { color: C.cream };
s8.addText("The founder", {
  x: 0.8, y: 1.5, w: 8.4, h: 1.0,
  fontFace: hFont, fontSize: 36, color: C.charcoal,
  align: "left", valign: "bottom", margin: 0,
});
s8.addText("The hard part is not technical.", {
  x: 0.8, y: 2.8, w: 8.4, h: 0.5,
  fontFace: bFont, fontSize: 16, color: C.muted,
  align: "left", valign: "top", margin: 0,
});
s8.addNotes("Be direct.\n\nNo technical credentials. No track record. This must be stated plainly because the entire pitch rests on it being irrelevant.\n\nThe hard part is philosophical \u2014 seeing the problem, understanding what to build, knowing how to do the extraction well. Those are craft and philosophy problems. The engineering was built entirely with AI agents \u2014 COO, CTO, CDO, CGO, CFO, CLO \u2014 which proves the thesis: one human with philosophical depth and AI leverage.\n\nThe company itself is the proof of concept. This deck, the logic chain, the financial model, the live product \u2014 all produced by the operating model.\n\nPreviously: three years in venture capital. Left because the thesis demanded building, not funding. You understand their side of the table.\n\nIf they want a technical co-founder: the engineering is trivial. A lab could rebuild the stack in a week. A technical co-founder solves a problem that does not exist. The philosophy is the differentiator.");

// 9. THE ASK
let s9 = pres.addSlide();
s9.background = { color: C.cream };
s9.addText("The ask", {
  x: 0.8, y: 1.5, w: 8.4, h: 1.0,
  fontFace: hFont, fontSize: 36, color: C.charcoal,
  align: "left", valign: "bottom", margin: 0,
});
s9.addText("$50K at ~1% equity.\nI do not need the money. I am choosing a partner.", {
  x: 0.8, y: 2.8, w: 8.4, h: 0.8,
  fontFace: bFont, fontSize: 16, color: C.muted,
  align: "left", valign: "top", margin: 0,
});
s9.addNotes("State the ask clearly. Do not apologise for it.\n\nThe company does not need the money. Company opex is $101 a month. The founder builds regardless.\n\nWhat $50K goes to: roughly half to brand building (ads, events, merch, community presence \u2014 the fuel that gets the kin mechanic flywheel started), and half to founder buffer (SF is tight at ~$300/month + rent, rent-free does not last forever, this removes friction so the founder focuses on building). Both are real, both are specific.\n\nThe kin mechanic is the distribution engine, but engines need fuel. The 25 founding seeds need to come from somewhere. Brand presence creates the top-of-funnel that the kin mechanic then compounds. Near-zero marginal CAC once the flywheel is turning, but modest upfront spend to start and sustain it.\n\nThe real value of the investment is partnership. The founder is choosing who to have on the cap table, not filling a round. This is the cheapest entry point that will ever exist into a category where no one is building the full stack.\n\nEvery AI investor is spreading bets across crowded categories. Cognitive identity infrastructure has no full-stack competitor. Adjacent companies have raised $60M+ from Sequoia, YC, and a16z. Most AI investments get obsoleted by the next model release. Alexandria is structurally different \u2014 the value is in the data and methodology, not the model capability.\n\nIf they are receptive to the bigger picture: VC itself will become AI-native. The human investor's remaining edge is judgment about human-centric companies \u2014 evaluating whether a founder's conviction is genuine, whether a thesis about humanity is real. Pro-human companies in a portfolio are not sentiment. They are the argument for why human VCs still have an edge. Alexandria is that kind of company. Use this if the moment is right. Do not force it.\n\nIf they want to negotiate terms: be open. But be clear about selectivity. Limited spots. The founder does not need the money.");

// 10. CLOSE
let s10 = pres.addSlide();
s10.background = { color: C.cream };
s10.addText("a.", {
  x: 0.8, y: 2.0, w: 8.4, h: 1.2,
  fontFace: hFont, fontSize: 56, color: C.charcoal,
  align: "left", valign: "middle", margin: 0,
});
s10.addText("mentes aeternae", {
  x: 0.8, y: 3.5, w: 8.4, h: 0.5,
  fontFace: bFont, fontSize: 12, color: C.light,
  italic: true, align: "left", valign: "top", margin: 0,
});
s10.addNotes("Do not linger. The a. is the mark. The meeting is over. Thank them. Follow up within 24 hours with a personal note.\n\nIf they want to continue talking, this slide stays up as background. Quiet, confident, final.");

pres.writeFile({ fileName: "/home/claude/Deck.pptx" })
  .then(() => console.log("Deck.pptx created"))
  .catch(err => console.error(err));
