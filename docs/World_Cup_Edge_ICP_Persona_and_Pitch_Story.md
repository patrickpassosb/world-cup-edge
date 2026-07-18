# World Cup Edge: ICP Persona and Pitch Story

## Purpose

This document converts the global ideal customer profile into a concrete persona and a 25-second story for the Solana House pitch.

> **Disclosure:** Maya Reed is a composite persona, not a real customer or testimonial. Her workflow and pain points are synthesized from the project's market research into prediction-market traders, quantitative researchers, and independent tooling developers.

## Narrative Framework

**Before-After-Bridge** is the best fit for a 25-second opening:

* **Before:** Maya manually assembles several sources to validate one apparent gap.
* **Cost:** the quote moves, or the comparison turns out to be invalid.
* **Bridge:** World Cup Edge performs the equivalence, freshness, liquidity, and fee checks automatically.
* **After:** Maya sees what deserves investigation and why, without receiving a profit promise.

# 1. Primary Persona: Maya Reed

## Persona Snapshot

| Attribute | Maya Reed |
| :---- | :---- |
| Persona type | Fictional composite based on the initial ICP. |
| Role | Independent prediction-market researcher and part-time automation builder. |
| Market behavior | Monitors sports markets several times per week; comfortable with spreadsheets, APIs, and order books. |
| Current workflow | Opens market rules, an external odds feed, the order book, and a spreadsheet to compare one outcome. |
| Core job-to-be-done | "Help me determine whether this apparent difference is current, fee-adjusted, and based on equivalent contracts before I spend more time investigating it." |
| Primary pain | Manual validation is slow while quotes move quickly. |
| Secondary pain | A mismatch in rules, tokens, timestamps, or liquidity can create a false comparison. |
| Emotional tension | She distrusts opaque picks and does not want another system asking her to accept a conclusion without seeing the checks. |
| Desired outcome | One view showing the comparison, input freshness, contract checks, and the reason an alert is emitted or suppressed. |
| Buying trigger | A live tournament creates more markets than she can validate manually. |
| Likely plan | Pro at a hypothetical US$39/month after the free product proves recurring time savings. |
| Success metric | Less time validating each market, more markets monitored, fewer false comparisons, and repeated weekly use. |

## Persona Quote

> "I do not need another prediction. I need to know whether the two prices are actually comparable."

This quote is written for the composite persona. Do not present it as a real customer quotation.

# 2. Maya's Pain Journey

## Before World Cup Edge

1. Maya notices a difference between an external sports probability and a prediction-market quote.
2. She opens the market description to confirm whether it resolves after regulation time or includes extra time.
3. She checks whether the selected YES token represents the team and outcome she expects.
4. She inspects the order book to find the current best ask and available liquidity.
5. She checks source timestamps because one value may already be stale.
6. She finds the current venue fee and adjusts the apparent difference.
7. The quote moves before she finishes, or one failed check invalidates the entire comparison.

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

> "Meet Maya, an independent prediction-market researcher. Before every match, she jumps between odds feeds, market rules, order books, and spreadsheets to answer one question: is this gap real? Checking teams, 90-minute rules, freshness, liquidity, and fees takes time. The quote moves, or the comparison fails. World Cup Edge runs those checks automatically and shows Maya what deserves investigation, and why."

**Length:** 60 words, or approximately 25 seconds at a natural pitch pace.

## Delivery Markup

Use the pauses rather than speaking faster:

> "Meet Maya, an independent prediction-market researcher. **[pause]** Before every match, she jumps between odds feeds, market rules, order books, and spreadsheets to answer one question: **is this gap real?** Checking teams, 90-minute rules, freshness, liquidity, and fees takes time. **[pause]** The quote moves, or the comparison fails. World Cup Edge runs those checks automatically and shows Maya what deserves investigation, and why."

## Short Backup Version

Use this if the organizer reduces the speaking time:

> "Maya researches sports prediction markets, but validating one apparent gap means checking rules, tokens, timestamps, liquidity, and fees across several sources. By the time she finishes, the quote has moved - or the gap was false. World Cup Edge performs those checks automatically and shows her what deserves investigation."

**Length:** approximately 15-18 seconds.

# 4. Persona Slide

## Slide Headline

**The gap can disappear before Maya proves it is real.**

## Minimal On-Screen Copy

```text
MEET MAYA
Independent prediction-market researcher

"Is this gap real?"

ODDS FEED  ->  MARKET RULES  ->  ORDER BOOK  ->  SPREADSHEET
                              QUOTE MOVED
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

> "Maya does not need another prediction. She needs a reliable way to decide what deserves investigation. That is World Cup Edge."

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
| Live/no alert | "Maya can see that the sources are current and the contracts match, but there is no qualified gap. That is a valid result." |
| Alert | "Every check passed, so World Cup Edge tells Maya this difference deserves investigation." |
| Stale | "This is where World Cup Edge protects Maya from a false comparison: stale data suppresses the alert." |
| Contract mismatch | "The prices may look different, but the outcomes are not equivalent, so Maya receives no alert." |
| Empty book or closed market | "Without a usable top-of-book quote, the system fails closed instead of inventing an opportunity." |

# 7. Bridge to the Business Model

Use this line after the demo:

> "Maya represents a global market of active traders and builders who already spend time assembling this workflow themselves. Our model is freemium: free for limited delayed monitoring, US$39 per month for active traders, and plans starting at US$199 for teams and builders. Those prices are hypotheses we will validate through paid pilots."

Do not present the pricing, conversion, or ROI assumptions as observed traction.

# 8. Hard Questions Maya Helps Answer

## "Why would someone pay for data that is already available?"

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

# 10. Evidence Behind the Composite Persona

Maya's behavior is grounded in the project's market research:

* independent builders created their own prediction-market tools because existing workflows did not serve them;
* cross-venue and sports-market researchers reported fragmented APIs and manual comparison work;
* developers built unified libraries, data products, and monitoring bots around Polymarket and Kalshi;
* practitioners emphasized that major sports markets are efficient, increasing the importance of live, niche, and workflow-focused monitoring;
* the business-model ICP targets active traders and builders rather than casual users.

Primary project sources:

* [`Modelo_de_Negocios_World_Cup_Edge_v1.md`](./Modelo_de_Negocios_World_Cup_Edge_v1.md)
* [`context.md`](./context.md)
* [`claims.md`](./claims.md)
* [`safety.md`](./safety.md)
