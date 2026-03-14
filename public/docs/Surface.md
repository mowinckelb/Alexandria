# Surface — mowinckel.ai

*Working document for the Surface. CTO builds from this. CDO/COO maintain.*

---

## Objective Function

One job: get the visitor to paste the Concrete into any AI chat app. Everything on this page serves that singular aim.

## Key Insight

Nobody arrives at mowinckel.ai cold. Every visitor was sent by someone — a friend in the lineage, Benjamin directly, a tweet, a forward. The referrer IS the hook. The Surface doesn't need to convince. It needs to not fumble the warm lead.

## Funnel

Surface (5 seconds) → Concrete via AI chat conversation (up to 10 minutes) → return to Surface → three audience paths diverge

Each stage has one job: get them to the next stage.

- **Surface top** is pure action. No pitch, no copy, no explanation. One click. The Concrete does all the work.
- **Concrete** (concrete.md) is a punchy, bold-formatted pitch delivered by the AI — short lines, bold emphasis, cliffhanger hooks, "just type yes" loop. Gossip tabloid energy. The Concrete does all the work.
- **Return** brings them back to the Surface where waitlist, contact, and abstract are revealed.
- **Pragmatists** sign up at Phase 3 and leave. Done. They do not need the scroll.
- **Philosophers and investors** scroll into the philosophy section — a one-page summary in plain English. The bridge between the Concrete's facts and the Abstract's art. No jargon. Teaches the actual five-dimension frame. At the bottom, paths split: philosophers sign up and read the Abstract; investors submit email, email directly, or call.
- **Abstract** (Alexandria.pdf) is the emotional lock-in. The poetic version. For the deeply convinced.
- **Investor flow** after scroll: investor reaches out via form/email/phone → Benjamin engages 1:1 digitally (and ideally physically) → pre-meeting sends investor.md → meeting covers final 10% questions + founder profiling → go from there.

The Surface is not the product. It is not the pitch. It is the door — and the hallway that leads to the cathedral.

## What Is Built (Current State)

Single continuous scroll. Hero with auto-looping phase widget, always-visible waitlist, scroll nudge → investor section → philosophy intro → ~1200 word philosophy with visual texture → bottom CTAs with abstract, waitlist, and investor contact. Everything immediately accessible — no gating, no welcome back state, no sessionStorage.

### Hero — Top of Page

```
              alexandria.
            droplets of grace

          [phase widget]               ← auto-cycling, see below

      join waitlist — [email input]    ← always visible

          or keep scrolling            ← scroll nudge, delayed fade-in
              ↓↓
```

The phase widget auto-cycles through 5 states in a continuous loop:

- **Phase 0** — "click here" (hop animation, copies Concrete to clipboard on click)
- **Phase 1** — "you just copied everything about this company." (3s)
- **Phase 2** — "paste it into any AI chat app." (5s)
- **Phase 3** — "ask it anything. come back after." (muted, 10s)
- **Phase 4** — "you're still lingering..." (italic, ghost color, 10s)
- Loops back to Phase 0 automatically.

Waitlist email field is always visible below the phase widget. Scroll nudge appears after 1.5s delay (CSS animation).

### Investor Section — First Thing After Scroll

```
                INVESTORS

      if you have five minutes right now,
      just call me / email.

      or just leave your email — [input]
```

Prose-style CTA. "call me" is a `tel:` link, "email" is a `mailto:` link — both inline, primary color, hover to muted. Below: italic ghost text "or just leave your email —" with inline waitlist input (source="investor"). No stacked buttons, no "for investors" framing — just direct, personal language.

### Philosophy Intro

```
              THE PHILOSOPHY

      There is a beautiful essay behind
      all of this — the Abstract. Below
      is the plain English version.
```

"Abstract" links to Alexandria.pdf. Brief bridge between the investor section and the scroll philosophy.

### Philosophy Scroll (~700 words)

Full philosophy in plain English. Scroll-triggered fade-in sections (IntersectionObserver, threshold 0.1). Visual texture system:

- **Pull quotes** — large centered text (~1.35rem), breathing padding, primary color
- **Body prose** — readable paragraphs (~0.92rem, secondary color, generous leading)
- **Italic asides** — muted color, smaller, editorial voice
- **`· · ·` dividers** — ghost color, generous vertical padding between sections

Sections: 1 of 5 — Five things (capabilities vs property) → 2 of 5 — The shift (industrial revolution chain, inevitability, fifth thing holds) → 3 of 5 — The alien (thought experiment, category difference) → 4 of 5 — Why it matters (augmentation, threshold, mental gym) → 5 of 5 — Alexandria (inaction-is-decision, two product levels, abundance as positive frame, Pascal's Wager close, terrifying-and-exhilarating lift, investor bait). ~800 words, 5 minute read.

### Bottom CTAs — After Philosophy

```
          read the abstract             ← links to Alexandria.pdf

      join waitlist — [email input]     ← same inline waitlist, source="bottom"

              INVESTORS                 ← full InvestorSection repeated
      if you have five minutes...
```

Three elements stacked vertically: abstract link, waitlist, and the full investor section. Same components reused from higher up the page.

### Footer

Minimal footer with "built by benjamin" credit.

### Design

- Design north stars: Anthropic + Apple. Quiet confidence.
- Theme follows `prefers-color-scheme` media query. Manual toggle top-right: minimal circle SVG (outline = light mode, filled = dark mode). Very subtle (30% opacity, 50% on hover). No localStorage persistence — session only.
- Phase widget has fixed min-height container (60px) to prevent layout jolt.
- Phase 0: hop animation (CSS `@keyframes hop`, 2s loop, continuous).
- All phase transitions: fade-in (CSS `@keyframes fadeIn`, 0.6s).
- Philosophy fade-in: 1.4s opacity, 1.6s transform with 16px translateY.
- Scroll nudge: 1.5s delayed fadeInUp animation.
- No persistent footer links on hero — waitlist is always visible, abstract and contact are in the scroll.
- The visitor should feel: this is simple, I should try this.

### Technical

- Next.js 16 app at mowinckel.ai
- concrete.md served from /docs/concrete.md — clipboard fetch on click (ClipboardItem API with textarea fallback)
- Alexandria.pdf served from /docs/Alexandria.pdf
- Email submits to /api/waitlist (Google Sheets backend), stores email + source tag
- Sources: "hero", "investor", "bottom" — all same endpoint, differentiated by source param
- Theme follows `prefers-color-scheme` media query, no localStorage persistence
- Email input uses `fontSize: 16px` + `transform: scale(0.72)` to prevent iOS Safari zoom
- "noted." success state uses same scale trick for matched line height
- No sessionStorage. No phase persistence. Widget is self-contained and auto-loops.
- ScrollPhilosophy component: IntersectionObserver with threshold 0.1, CSS transitions for fade-in
- EB Garamond serif font throughout

## Referral Path

Primary referral: sending the link "check out mowinckel.ai" — natural, easy. Power referrers can send the Concrete file directly and skip the Surface. Both paths work.

---

## Scroll — Philosophy Section

Below Phase 3, scrollable. ~80vh centered prose, clean typography (Garamond or system serif), generous leading. The philosophy in plain English. No jargon. Five numbered sections (~700 words, 5 minute read) with "X of 5" progress markers. Teaches the five-dimension frame, the industrial revolution chain, the alien thought experiment, augmentation and threshold, and the mental gym product. Investor bait woven into final section. Level-4 evidence standard — every claim is either an observable fact, a definitional truth, or a necessary consequence. The reader should finish thinking "this cannot not be true."

### Copy (COO session 20)

*5 minute read.*

**1 of 5 — What you are**

There are five things a human being brings to the world.

Your brain — intelligence, analysis, problem-solving. Your legs — strength, endurance, physical power. Your hands — dexterity, craft, precision. Your heart — empathy, emotional intelligence, understanding what someone else is feeling. And then there is a fifth thing, which is not like the other four. It is not something you do. It is something you are. The fact that you are a human being. That you are this specific person. Your kid's drawing on the fridge — it is the same image you could print from the internet. But it is not the same thing. It is not even close. Because a human made it, and you know which one.

The first four are capabilities. The fifth is a property. Different category entirely.

**2 of 5 — The shift**

Our dominance over those four capabilities is being competed away. And it is not new — the first one already went.

Strength — the industrial revolution made human muscle irrelevant for most work two centuries ago. That is settled. Now look at the other three. Intelligence — every few months, AI does something that surprises even the people building it. It keeps saturating benchmarks, solving problems nobody expected it to solve, and taking on work that was supposed to be safe from automation. Whether you think it is truly intelligent or not, the direction is not in doubt. Dexterity — look at factory floors, look at surgical robots. Both ends of the spectrum are already handled by machines. The gap in the middle is narrowing, and obviously it will close. Empathy — you already see it. Kids forming deep relationships with their AIs. People perfectly comfortable with emotional support that is not human. The approximation is getting better every month.

All four are already in motion. The first is finished. The other three are at different stages, but the direction is the same. Taking this to its logical conclusion is not radical — it is obvious.

If you are sceptical, take a moment to reflect on the position you are holding. Every government, every military, every brilliant engineer, every spare dollar on earth is on the other side. They are betting everything on this. Look back five years at where AI was. Look at where it is now. Project forward ten years. Twenty. There is no law of physics, no hard limit between here and there. Just time. And this is not some distant hypothetical where it does not matter whether you are right or wrong. This is your one life. Your one family. The one civilisation you are part of. The most important transition that will happen in your lifetime is already underway, and you have very little influence over its direction. What you do have influence over is how you position yourself within it. That starts with accepting where we are — clearly, honestly — so that the solution makes sense when you hear it. Read the room.

The fifth thing — the fact that a human is involved — is not going anywhere. Not because machines are not good enough yet. By definition. A machine cannot be you. And that matters, because we are a species that values its own kind.

**3 of 5 — The alien**

Try a thought experiment. Imagine an alien — vastly more intelligent than any human, with perfect emotional intelligence, exquisite taste, and extraordinary dexterity. It can cook a better meal than any chef on earth. Design a more beautiful building. Write a more compelling argument. It even has better taste than you — it knows what you like before you do.

Would you eat at the alien's restaurant? Probably. Would you admire its work? Sure. But is it the same as something a human made? No. And you know exactly why. Not because the alien's version is worse. It is better. But it is not one of us. If the word "speciesist" just crossed your mind — very astute. That is exactly what it is. Humans value humans. That is what this company is built on. If that does not sit well with you, this is probably not your thing.

**4 of 5 — Why it matters**

Humans have always augmented themselves — books, experts, institutions, tools. Not in a science fiction sense. In the ordinary sense. You have always used things to extend what you can do. AI is just the most powerful version of that. The difference is that AI can also close the loop without you. No book ever wrote itself. No tool ever finished the job on its own. AI can. Your involvement is now a choice, not a requirement.

Which means the question for every job, every task, every role becomes simple. Can a human do it to an adequate level? And does anyone care that it is a human doing it? The coder who does not write code anymore and just approves what the AI generated — nobody cares that a human pressed accept. The analyst who reformats what the AI produced — there is no human premium there. The human costs more and adds nothing. That is an easy decision. The human gets replaced.

The only roles where humans have a future are the ones where it matters that a human is involved. And your ability to be in those roles — to be above the bar where your involvement actually counts — depends entirely on your mind being sharp enough to keep you there.

But here is the problem. Every time you let AI think for you without engaging, that sharpness fades. Every decision you outsource entirely, every thought you skip because the machine already answered — your ability to direct weakens. Quietly, the way you stop being able to do mental arithmetic after years of using a calculator. Except this is not arithmetic. This is your ability to think, to decide, to know what you actually believe.

The same way people need a physical gym because machines handle physical labour, people need a mental gym because AI handles cognitive labour. But the mental gym is more important. If your body weakens, your mind can decide to fix it. If your mind weakens, the thing that would decide to fix it is the thing that weakened. It is the one muscle where letting it go means losing the ability to realise you need it back.

**5 of 5 — Alexandria**

Alexandria is that mental gym. The product is not the technology. The product is the changed person. Three pillars: freedom, humanity, purpose. One connection. Three features.

We see this problem clearly, and we have a simple, elegant solution for it. Most AI companies are built for the transition — they help you use AI better right now. Alexandria is built for what comes after. But it has to exist now, because the foundations have to be in place during the transition or you do not survive it. Your mind decays during the transition if you do not maintain it. And it compounds — the earlier you start, the stronger your position, the sharper your mind, the more your AI has to work with. Not starting is not the same as waiting. It is a decision — and it is the wrong one.

At the first level — unify and own. You probably use two or three AIs right now. Each one knows a fragment of you. None of them talk to each other. Alexandria unifies all of it into one structured, living map of how you think — your values, your taste, your worldview, your blind spots — across every AI you use. And that map is stored on your own files, not ours. We hold nothing. We cannot see it. You own it completely and can take it anywhere. Every AI you touch gets the full picture. That is immediately useful — and completely safe.

At the second level — the mental gym. Alexandria actively develops your mind. New ideas you would not have found on your own. Sharpening what you already believe. Keeping alive the things that would otherwise quietly fade. But this is not just maintenance — it is what lets you actually absorb the extraordinary abundance that is coming. More ideas, more tools, more possibilities than any generation has ever had access to. The people who can direct that abundance — who know what they think, what they want, what matters to them — will do things that were never possible before. The mental gym is what puts you in that position. You walk out a different person — not because someone told you what to think, but because you know yourself better, and everything you do with AI gets better because of it.

Even if you are only half-convinced by what you just read — even if you think there is merely a chance this is as important as we are suggesting — it is five dollars. If we are wrong, you lost five dollars. If we are right and you did nothing, you lost something you cannot get back. That is not a close call.

If you have read this far, the $5 AI insurance is a no-brainer. One connection. Five minutes. Everything your AI learns about you, saved to your own files, yours to keep no matter what happens. The $15 is for the people who understand what is coming and do not want to be caught without it — the mental gym, the full experience. It compounds. It only gets better. And it gets more relevant every single day, not less.

One employee. No database. No way to hold your data. Breaks even at 80 subscribers paying $5 a month. Total monthly burn: $400. The market is every person who uses AI — which is everyone.

This is the most terrifying and the most exhilarating moment in human history. The future that is coming can be extraordinarily good — for you, for your family, for everyone. But it will not happen automatically. The people who thrive will be the ones who took ownership of their own minds — who positioned themselves, who kept their edge sharp, who made sure the abundance worked for them instead of washing over them. That is what Alexandria is for. Take ownership of your life and the future can be better than anything you have ever imagined. Do not take ownership, and someone else — or something else — will. Start now.

### Bottom CTAs (after scroll copy)

Three paths, equal weight, clean layout. Centered, same typography as Phase 3.

```
      read the abstract             ← links to Alexandria.pdf
      sign up — [email]             ← same waitlist as Phase 3
      reach out                     ← expands to: submit email form + benjamin@mowinckel.com + +47 466 43 844
```

"reach out" serves investors and anyone who wants direct contact. Submit email form (lowest friction — just drop your email, Benjamin gets back to you). Direct email and phone as alternatives. No "for investors" label — the person who scrolled this far and wants to talk knows who they are.

---

*This document is maintained by COO and CTO. CC edits welcome.*
