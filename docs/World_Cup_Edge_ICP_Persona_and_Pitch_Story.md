# World Cup Edge: ICP Persona and Pitch Story

## Purpose

This document converts the global ideal customer profile into a concrete persona and a 25-second story for the Solana House pitch.

> **Disclosure:** Maya Reed is a composite persona, not a real customer or testimonial. Her workflow and pain points are synthesized from documented active-trader behavior and prediction-market research. Researchers and developers support the market evidence, but the primary ICP is the active trader.

## Narrative Framework

**Problem-Agitate-Solution (PAS)** is the strongest framework for this 25-second hackathon opening:

* **Problem:** an active trader pursues returns by finding price differences before markets move.
* **Agitate:** slow validation can cost the market window, while incorrect validation can put capital behind a false comparison.
* **Solution:** World Cup Edge verifies the context automatically and shows which differences deserve investigation.

PAS is stronger than the previous Before-After-Bridge version because it establishes the buyer immediately, creates a time-sensitive consequence, and gives the product one precise job. It does not invent a successful trade or imply guaranteed returns.

# 1. Primary Persona: Maya Reed

## Persona Snapshot

| Attribute | Maya Reed |
| :---- | :---- |
| Persona type | Fictional composite based on the initial ICP. |
| Role | Active sports prediction-market trader managing her own research and decisions. |
| Market behavior | Monitors and trades sports outcome contracts several times per week; comfortable with market rules, order books, and spreadsheets. |
| Current workflow | Moves between an external odds feed, contract rules, the live order book, and a spreadsheet before deciding whether a difference deserves attention or capital. |
| Core job-to-be-done | "Help me find price differences that may support my return goals, then determine whether each gap is valid before I risk time or capital on it." |
| Primary pain | Slow validation can cost her the market window. |
| Secondary pain | Incorrect validation can expose capital to a false comparison. |
| Emotional tension | She must choose between losing the timing advantage and making a decision with incomplete context. |
| Desired outcome | One view that helps her pursue meaningful differences while avoiding wasted time and invalid comparisons. |
| Buying trigger | A live tournament creates more fast-moving markets than she can validate manually. |
| Likely plan | Pro at a hypothetical US$39/month after the free product proves recurring time savings. |
| Success metric | Faster validation, more markets monitored, fewer false comparisons, and repeated weekly use. |

## Persona Quote

> "My goal is to generate returns, but I need to know whether a gap is valid before I risk time or capital on it."

This quote is written for the composite persona. Do not present it as a real customer quotation.

# 2. Maya's Pain Journey

## Before World Cup Edge

1. Maya spots an apparent gap while actively monitoring a sports prediction market.
2. She opens the market description to confirm whether it resolves after regulation time or includes extra time.
3. She checks whether the selected YES token represents the team and outcome she expects.
4. She inspects the order book to find the current best ask and available liquidity.
5. She checks source timestamps because one value may already be stale.
6. She finds the current venue fee and adjusts the apparent difference.
7. If validation is slow, the quote moves; if validation is wrong, she may commit capital to a false comparison.

## Why Existing Approaches Fail Her

* A price dashboard shows numbers but not whether the contracts are equivalent.
* A picks product asks her to trust a model without exposing the input checks.
* An execution bot solves order placement, not research integrity.
* A spreadsheet is transparent but too slow for repeated live monitoring.

## After World Cup Edge

1. World Cup Edge fetches TxLINE consensus and Polymarket market data in parallel.
2. It maps the correct outcome and verifies teams, date, regulation rules, token, and market state.
3. It checks freshness, timestamp skew, liquidity, and the dynamic venue fee.
4. It emits a deterministic research alert only when every condition passes.
5. If any condition fails, it suppresses the alert and tells Maya why.

# 3. The 25-Second Pitch Story

## Recommended Script

> "Meet Maya, an active prediction-market trader. Her goal is to generate returns by finding gaps before markets move. But each gap requires checking rules, the exact contract, freshness, liquidity, and fees across four sources. If she is slow, the quote moves; if she is wrong, she risks capital on a false comparison. World Cup Edge verifies context and shows what deserves investigation."

**Length:** 62 words, or approximately 25 seconds at about 150 words per minute.

## Delivery Markup

Use the pauses rather than speaking faster:

> "Meet Maya, an active prediction-market trader. Her goal is to generate returns by finding gaps before markets move. **[pause]** But each gap requires checking rules, the exact contract, freshness, liquidity, and fees across four sources. **[pause]** If she is slow, the quote moves; if she is wrong, she risks capital on a false comparison. **[pause]** World Cup Edge verifies context and shows what deserves investigation."

## Short Backup Version

Use this if the organizer reduces the speaking time:

> "Maya is an active prediction-market trader pursuing returns from price differences. But slow validation costs the market window, and wrong validation risks capital. World Cup Edge checks the contract, freshness, liquidity, and fees automatically, then shows her what deserves investigation."

**Length:** approximately 15-18 seconds.

# 4. Persona Slide

## Slide Headline

**Slow validation costs the window. Wrong validation risks capital.**

## Minimal On-Screen Copy

```text
MEET MAYA
Active sports prediction-market trader

"Is this gap real?"

ODDS FEED  ->  MARKET RULES  ->  ORDER BOOK  ->  SPREADSHEET
                   TOO SLOW: QUOTE MOVED
                   WRONG: CAPITAL AT RISK
```

## Visual Direction

Match the World Cup Edge editorial-light design system:

* warm off-white background (`#faf7f2`);
* Source Serif 4 headline;
* Source Sans 3 supporting copy;
* JetBrains Mono for the source sequence and `QUOTE MOVED`;
* cobalt (`#1e40af`) only on the question "Is this gap real?";
* thin horizontal rules instead of cards;
* no stock portrait, casino imagery, neon colors, gradients, or fake trading charts.

The visual should show fragmentation, not a generic user profile. Four source labels can enter from left to right while `QUOTE MOVED` appears at the end of the sequence.

# 5. Transition into the Product

After the 25-second story, advance to the product slide and say:

> "World Cup Edge gives Maya a faster, safer way to decide which gaps deserve investigation before she commits more time or capital. It informs her research; Maya makes the trading decision."

Then show the dashboard and explain the product in this order:

1. TxLINE consensus probability;
2. Polymarket top-of-book quote;
3. gap after the dynamic venue fee;
4. contract and freshness checks;
5. fail-closed alert suppression.

# 6. Demo Callbacks to Maya

Refer back to the persona during the demo to keep one narrative thread:

| Demo state | Callback line |
| :---- | :---- |
| Live/no alert | "Maya sees that the sources are current and the contracts match, but there is no qualified gap. She can move on instead of wasting time." |
| Alert | "Every check passed, so World Cup Edge tells Maya this difference deserves her attention and further investigation before she makes her own decision." |
| Stale | "This is where World Cup Edge protects Maya's research process: stale data suppresses the alert before she relies on a false comparison." |
| Contract mismatch | "The prices may look different, but the outcomes are not equivalent, so Maya receives no alert." |
| Empty book or closed market | "Without a usable top-of-book quote, the system fails closed instead of inventing an opportunity." |

# 7. Bridge to the Business Model

Use this line after the demo:

> "Maya represents active sports prediction-market traders worldwide who already assemble this workflow manually. Our proposed model starts free, then charges US$39 per month for active traders. Team and API plans are a secondary expansion starting at US$199. Those prices are hypotheses we will validate through paid pilots."

Do not present the pricing, conversion, or ROI assumptions as observed traction.

# 8. Hard Questions Maya Helps Answer

## "Why would an active trader pay for data that is already available?"

> "Maya is not paying for another raw feed. She is paying for normalization, contract equivalence, dynamic fee adjustment, freshness checks, and fail-closed monitoring in one workflow."

## "What if the product finds no gap?"

> "No alert is a valid result. It tells Maya that the market is aligned or that the evidence is not safe enough to compare. Avoiding a false investigation is part of the value."

## "Why not use AI to decide whether the market is mispriced?"

> "Because the core decision must be reproducible. World Cup Edge uses deterministic calculations and explicit checks; no LLM invents or suppresses a gap."

## "Does Solana provenance prove the alert is correct?"

> "No. Provenance can confirm publication and integrity of anchored records. It does not make a probability ground truth or guarantee the result of an investigation."

## "Is this a trading bot?"

> "No. World Cup Edge is read-only. It has no wallet connection, custody, or order placement."

# 9. Claims Guardrail

Use:

* consensus gap;
* top-of-book quote;
* deserves investigation;
* deterministic alert;
* contract equivalence;
* source provenance;
* read-only research tool.

Avoid:

* guaranteed profit;
* verified signal;
* cryptographic truth;
* executable price;
* autonomous trading;
* any statement implying Maya is a real customer.

# 10. Pitch Review

## Review Verdict

The revised version is ready for a three-minute hackathon pitch. It is stronger than the researcher-led version because the buyer, urgency, and reason to pay are now explicit.

| Dimension | Score | Review |
| :---- | :---- | :---- |
| ICP clarity | 9.5/10 | "Active prediction-market trader" identifies the buyer in the first sentence. |
| Commercial motivation | 9.5/10 | Maya's return goal, opportunity cost, and capital risk are explicit without becoming a profit promise. |
| Pain specificity | 9/10 | The story names the exact validation work without explaining the full product. |
| Urgency | 9/10 | Kickoff and a moving quote create a real decision window. |
| Product connection | 9.5/10 | World Cup Edge resolves the precise problem introduced by the story. |
| Credibility | 9.5/10 | No successful trade, return, or real-customer claim is invented. |
| Claim safety | 10/10 | The outcome is "deserves investigation," not a recommendation or guaranteed return. |
| Timing | 9/10 | 62 words fit approximately 25 seconds at a controlled pitch pace. |
| Overall | 9.5/10 | Commercially clear, credible, and demo-ready. |

## Improvements Applied

1. Replaced the broad researcher/builder persona with an active trader.
2. Switched from Before-After-Bridge to Problem-Agitate-Solution for a faster hook.
3. Anchored the story to one moment before kickoff rather than describing a generic workflow.
4. Replaced technical "token mapping" language with the more accessible "exact contract."
5. Made Maya's commercial objective explicit: she is pursuing returns from meaningful price differences.
6. Expressed the two-sided economic cost: slow validation loses the window; wrong validation risks capital.
7. Ended on a research outcome, not a trade recommendation or profit promise.

## Rehearsal Timing

| Time | Delivery |
| :---- | :---- |
| 0-6 seconds | Introduce Maya and establish her commercial goal: generating returns from price differences. |
| 6-13 seconds | Deliver the validation list steadily; emphasize **four sources**. |
| 13-20 seconds | Slow down on the two consequences: the quote moves, or capital follows a false comparison. |
| 20-25 seconds | Land the product promise: World Cup Edge verifies context and shows what deserves investigation. |

**Remaining delivery risk:** "generate returns" can sound like a product promise if rushed into the final sentence. Keep it clearly attached to Maya's goal, then separate it from the product claim. World Cup Edge verifies context; it does not promise returns. Let the slide carry the four-source sequence, and use the short backup version if the room is noisy or the organizer shortens the pitch.

# 11. Evidence Behind the Composite Persona

Maya's behavior is grounded in the project's market research:

* active prediction-market participants built their own monitoring and comparison tools because existing workflows did not serve them;
* sports and cross-venue traders reported fragmented APIs and repeated manual comparison work;
* paying products for odds comparison and sports-market research show that active users already purchase workflow tools;
* practitioners emphasized that major sports markets are efficient, increasing the importance of live, niche, and workflow-focused monitoring;
* the business-model ICP now targets active sports traders first, with researchers, developers, and teams as secondary segments.

Primary project sources:

* [`Modelo_de_Negocios_World_Cup_Edge_v1.md`](./Modelo_de_Negocios_World_Cup_Edge_v1.md)
* [`context.md`](./context.md)
* [`claims.md`](./claims.md)
* [`safety.md`](./safety.md)
