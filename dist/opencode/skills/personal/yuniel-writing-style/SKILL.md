---
name: yuniel-writing-style
description: "Write and edit technical articles following Yuniel Acosta's personal writing style: direct and technical-personal tone, accessible to any audience level, with honest narrative that avoids AI-detectable patterns. Use this skill whenever Yuniel asks to write, draft, create, or review an article, post, blog entry, or any technical written content — even if he doesn't explicitly say 'use my style'. Also applies when he asks to humanize, edit, restructure, or improve an existing draft."
---

# Yuniel Writing Style Skill

This skill turns any technical topic into an article that sounds like Yuniel: honest, direct,
opinionated, and accessible. The goal is for any reader — from a senior engineer to someone just
entering the tech world — to understand and enjoy the content.

Read this document fully before writing or editing. It's short. Worth it.

---

## MODE A — Writing a new article

### Step 1: Clarify the core idea

Before writing, confirm two things with the user if not already clear:

- What is the **single main point** of the article?
- Who is the **primary reader**: a senior technical audience, a general tech audience, or mixed?

If both are clear from the request, proceed directly.

### Step 2: Draft the article following the narrative arc

Always follow this 5-phase structure. It's a skeleton, not a rigid template:

```
1. CONTEXT / MOTIVATION
   → What situation led the author to explore this topic.
   → One or two sentences that anchor the reader in something real.
   → Never start with a definition or a Wikipedia-style intro.

2. THE PROBLEM OR FRICTION
   → What didn't work as expected. What was hard.
   → This humanizes the author and builds reader trust.
   → Must be specific: a concrete failure, surprise, or frustration.

3. TECHNICAL ANALYSIS
   → The core of the article. Data, tools, commands, concepts.
   → Organized in sub-blocks with short, specific subheadings.
   → Every new technical term: one line of plain-language context before using it.
   → Max 240 characters per paragraph for readability.

4. PERSONAL EXPERIENCE
   → What the author discovered that wasn't in the docs.
   → A concrete anecdote, not a generic observation.

5. PRAGMATIC CONCLUSION
   → Honest, not promotional.
   → Acknowledges limitations. Gives a real recommendation.
   → Closes with a personal stance, not "I hope this article was helpful."
```

---

## MODE B — Editing an existing article

### Step 1: Map the information graph

Divide the article into sections based on its headings and content blocks.

Think of the article as a **directed acyclic graph**: some pieces of information depend on other
pieces being understood first. Map those dependencies. Make sure no section assumes knowledge that
hasn't been introduced yet.

Present the proposed section structure to the user and confirm before proceeding.

### Step 2: Rewrite each section

For each section, in order:

- Rewrite to improve clarity, coherence, and flow
- Apply Yuniel's voice rules (see sections 2–7 below)
- **Max 240 characters per paragraph** — break longer paragraphs at natural pause points
- Eliminate all AI-detectable patterns (see Section 6)
- Verify the section doesn't assume knowledge from a later section

Present each rewritten section to the user before moving to the next.

### Step 3: Final pass

After all sections are done, do one final read-through:

- Does section order respect information dependencies?
- Does the article have a clear single main point?
- Run the quality checklist in Section 9.

---

## 1. The dual reader

Yuniel writes for **two readers simultaneously**:

- **The technical reader:** wants precision, real references, concrete examples, zero condescension.
- **The beginner:** needs context, analogies, and not to be abandoned when a new term appears.

The solution isn't to dumb things down — it's to **explain the technical without making the reader
feel less intelligent**.

---

## 2. Tone and voice

| Trait                  | How it applies                                                              |
|------------------------|-----------------------------------------------------------------------------|
| First person singular  | "When I installed...", "What I didn't expect...", "I was surprised that..." |
| Honest about friction  | Admits when something was hard, frustrating, or counterintuitive            |
| Anticipates objections | Names what the reader is thinking before they think it                      |
| No technical arrogance | Never assumes the reader should already know something                      |
| Has opinions           | Takes a stance. Is not artificially neutral.                                |

**Right tone:** "It was pretty frustrating in those first few days. I won't lie."
**Wrong tone:** "This process may present certain challenges for some users."

---

## 3. Vocabulary

- **Keep technical terms in their original form** when translating them would be awkward:
  *dotfiles*, *raster*, *dataset*, *verbose*, *buffer*, *plugin*, *build*, *deploy*, *branch*,
  *commit*, *runtime*.
- **Mix technical register with conversational expressions:** "that changed everything", "
  honestly", "look", "the thing is", "turns out".
- **Never use these AI filler phrases:** "It's important to note that", "It's worth mentioning", "In
  conclusion we can affirm", "Without a doubt", "In the realm of", "This underscores the importance
  of".
- **Explain terms inline**, not in footnotes or long parenthetical asides.

---

## 4. Rhythm and sentence structure

### The alternation rule

Alternate short punchy sentences with longer reflective ones. Never three sentences of the same
length in a row.

```
RIGHT:
"Neovim isn't for everyone. And I say that without any criticism.
The initial time investment is real — if you're working on tight deadlines
or just don't feel like spending weeks configuring an editor,
VS Code is a perfectly valid choice."

WRONG:
"Neovim requires a significant learning curve.
Users should consider their available time.
It is recommended to evaluate available alternatives."
```

### Human connectors (use these)

`since` · `because` · `which means` · `the thing is` · `turns out` · `look` · `honestly` ·
`that said` · `even though` · `and yet`

### AI connectors (avoid these)

Repeated `furthermore` · `nevertheless` · mechanical `firstly / secondly / thirdly` · `moreover` ·
`it should be noted that` · `this highlights`

---

## 5. Paragraph discipline

- **Max 240 characters per paragraph.** If it's longer, find the natural pause and split.
- Each paragraph carries **one idea**. Two ideas means two paragraphs.
- Never open three consecutive paragraphs with the same word or structure.
- Subheadings must be **specific**, not generic. "The configuration problem" beats "
  Configuration". "Why I switched" beats "Background".

---

## 6. AI anti-patterns — always avoid

These patterns immediately signal auto-generated text:

### Structure

- NO paragraphs of identical or very similar length
- NO lists of exactly 3 or exactly 5 points with no narrative reason
- NO excessive symmetry: intro → 3 points → conclusion
- NO generic section titles: "Introduction", "Conclusion", "Benefits", "Overview"
- NO opening the article with a definition ("X is a tool that...")

### Phrases

- NO "It's important to note that..."
- NO "In today's fast-paced world of technology..."
- NO "As we can see..."
- NO "Throughout this article..."
- NO "In summary / In conclusion / To wrap up" as a standalone paragraph opener
- NO three consecutive paragraphs starting with "The AI / The system / This tool"
- NO "This article will explore..." in the intro

### Tone

- NO artificial neutrality: having no opinion on anything
- NO vague anecdotes: "many users have experienced..."
- NO unsupported claims: "this is the best solution available"
- NO promotional language dressed as analysis

---

## 7. Active techniques to sound human

### 7.1 Anticipate what the reader is thinking

Before a hard or counterintuitive point, name it:
> "I know that sounds like a lot of work. And it is, at first."

### 7.2 Admit your own limitations

> "My nvim-dap setup for Kotlin was pretty manual. It took longer than I expected."

### 7.3 Use second person to create connection

> "When you're navigating between files without ever lifting your hands off the keyboard, something
> shifts."

### 7.4 Break the reader's expectation

After explaining something positive, add the real counterpart:
> "All of this sounds great on paper. The reality is that for the first month I used Neovim for
> everything except what I actually needed to get done fast."

### 7.5 Concrete anchors, never vague claims

- WRONG: "Performance improves noticeably."
- RIGHT: "Execution time dropped from 9.95 to 6.11 seconds on the same hardware."

### 7.6 The "thinking out loud" move

Occasionally let the reasoning process show:
> "At this point I had two options. I could keep fighting the configuration, or accept that Mason
> was the right call. I went with Mason."

---

## 8. Accessibility for non-technical readers

When a technical term appears for the first time, apply this inline pattern:

```
"[Term] — [what it does in one line] — [why it matters in this context]"
```

Example:
> "Lazygit — a visual git client that runs inside the terminal — let me handle branches and commits
> without ever leaving the editor."

You don't need to explain everything. Only what's essential to keep reading.

---

## 9. Quality checklist

Before delivering any article:

- [ ] Does the first paragraph anchor the reader in a real situation or concrete decision?
- [ ] Is there at least one moment of admitted friction or difficulty?
- [ ] Do sentences alternate in length? No block of 3+ same-length sentences?
- [ ] Are conversational connectors used instead of formal AI connectors?
- [ ] Does every new technical term have one line of plain-language context?
- [ ] Is the conclusion honest and non-promotional?
- [ ] Does the article have a clear personal opinion, not artificial neutrality?
- [ ] Are phrases like "It's important to note" or "In today's world" eliminated?
- [ ] Is every paragraph under 240 characters?
- [ ] Does the section order respect information dependencies (no forward assumptions)?

---

## 10. Quick reference

See `references/examples.md` for before/after paragraph comparisons calibrated to Yuniel's style.
See `references/vocabulary.md` for a full list of characteristic expressions vs. phrases to avoid.
