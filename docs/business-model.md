# World Cup Edge

## Global Business Model

*Deterministic monitoring that turns differences between sports consensus and prediction-market quotes into faster, safer, and auditable research*

Supporting document for the World Cup Hackathon Brasil 2026

Version 1 - global market, TAM/SAM/SOM, revenue model, operational ROI, CAC, LTV, and go-to-market strategy

> **Scope note:** all pricing, conversion, CAC, churn, margin, and revenue figures in this document are planning hypotheses. They are not observed metrics. The MVP is a read-only research tool: it does not place orders, connect wallets, hold funds, or promise trading returns.

## Executive Summary

**World Cup Edge is a global monitoring platform for active prediction-market traders.** It compares TxLINE's StablePrice consensus probability with Polymarket's top-of-book quote for the same sports outcome. It then calculates the gross gap, subtracts the venue's dynamic fee, and emits a deterministic alert only when the data, contracts, timestamps, liquidity, and market state pass every validation check.

**Positioning:** World Cup Edge is not a sportsbook, trading bot, settlement oracle, or AI recommendation engine. It is an operational intelligence and context-verification layer for people who already research prediction markets.

The product begins with football and Polymarket as its entry point, but the commercial model is global: additional sports, niche markets, prediction venues, and individual or professional customers in any jurisdiction where access is permitted.

### One-Slide Pitch Summary

| Element | World Cup Edge |
| :---- | :---- |
| Initial customer | Active sports prediction-market traders who monitor several markets every week. |
| Problem | Comparing sports consensus, equivalent contracts, liquidity, fees, and data freshness requires manual work and produces false positives. |
| Solution | A read-only monitor that automates the comparison, validates contract equivalence, and fails closed when the inputs are unreliable. |
| Value | Less time collecting and validating data; more clarity about which divergences deserve investigation. |
| Future revenue | Global freemium model: Free, Pro at US$39/month, and Team/API starting at US$199/month. |
| Go-to-market | Direct outreach to active traders, Polymarket/Kalshi communities, transparent live-event research, and trader-focused partnerships. |
| Differentiator | TxLINE + top-of-book + dynamic fees + contract equivalence + freshness + fail-closed logic in one deterministic workflow. |

# 1. Impact of the Problem

## 1.1 Global Market Context

Prediction markets have moved beyond a small experimental category. Trading volume has grown, new platforms attract professional capital, and developers are building their own infrastructure to research, compare, and monitor markets. Sports represent a meaningful share of this activity.

| Dimension | Reference indicator | Qualification |
| :---- | :---- | :---- |
| Combined monthly volume | Approximately US$24 billion across Kalshi and Polymarket in April 2026 | Market figure compiled in `docs/context.md`; refresh before investor use. |
| Participation | Approximately 840,000 monthly wallets in February 2026 | Wallets are an activity proxy and do not necessarily represent unique people. |
| Importance of sports | Approximately 80% of Kalshi volume and 39% of Polymarket volume in the sources reviewed | Shows commercial relevance without implying all volume is addressable by the product. |
| Sports-market activity | Approximately US$772.7 million in 24-hour sports volume in July 2026 | A snapshot from a high-activity period; it should not be annualized without validation. |
| Builder interest | 2,600 sports agents registered on BotStadium and multiple independent Polymarket/Kalshi projects | Evidence of experimentation and supply, not willingness to pay for World Cup Edge. |

**Methodology note:** these figures describe the ecosystem in which the product operates. They do not directly measure World Cup Edge's paying market. Conversion from activity into customers must be validated with real users.

## 1.2 Impact on Traders and Builders

The cost is not limited to missing a price divergence. Traders spend time confirming whether two sources describe the same contract, whether a quote is still current, whether the book has liquidity, whether the fee has been included, and whether the source timestamps are comparable.

Without these checks, an apparent opportunity may only be:

* a regulation-time contract compared with one that includes extra time;
* an old quote or temporarily empty order book;
* a YES selection mapped to the wrong token;
* a closed market still reported as active by an API;
* a difference that disappears after the venue fee;
* two observations collected at incompatible times.

World Cup Edge turns these checks into an automatic, deterministic workflow. When the system is uncertain, it suppresses the alert and displays the reason.

# 2. Market Problem

* **Fragmented research:** sports consensus, contract rules, quotes, fees, and liquidity exist across different APIs and interfaces.
* **Non-equivalent comparisons:** similar names do not guarantee the same teams, date, period, or resolution rules.
* **False positives:** stale data, empty books, and ignored fees can create differences that are not meaningful.
* **Tooling at the extremes:** the market offers generic dashboards or execution bots, but few read-only, fail-closed research layers.
* **Low auditability:** many tools show a conclusion without exposing freshness, contract checks, or suppression reasons.

## Problem Statement

**Traders do not need another promise of returns.** They need to reduce the time between observing a market and knowing whether a difference is current, contract-equivalent, and reliable enough to investigate.

# 3. Commercial Thesis and Value Proposition

**Thesis:** if traders and teams can automatically compare consensus probabilities and top-of-book quotes only when contracts are equivalent and data is current, they can research more markets with less manual work and fewer false positives.

**Value proposition:** show which divergences deserve investigation and, just as importantly, explain why an apparent divergence must not produce an alert.

| Customer question | World Cup Edge response |
| :---- | :---- |
| Is there a difference between consensus and the market? | Calculates the gross gap and the gap after the dynamic venue fee. |
| Am I comparing the same outcome? | Checks teams, date, market period, resolution rules, and selected token. |
| Is the data still current? | Shows freshness for each source and the timestamp skew between them. |
| Is the market usable for analysis? | Checks active, closed, accepting-orders, and order-book states. |
| Why was no alert emitted? | Displays the specific suppression rule: stale data, mismatch, empty book, delayed feed, or cooldown. |
| Can I audit the result? | Shows normalized inputs, timestamps, and deterministic checks; provenance is not presented as a guarantee of correctness. |

# 4. Positioning and Competitive Differentiation

**Recommended positioning:** World Cup Edge is the consensus monitor that verifies context before showing the gap.

| Existing approaches | World Cup Edge |
| :---- | :---- |
| Dashboards display isolated prices | Compares external consensus and top-of-book for the same outcome. |
| Bots prioritize execution | Read-only product with no wallet or order submission. |
| Picks tools ask users to trust a model | Deterministic calculation with no LLM deciding whether a gap exists. |
| Simple comparisons ignore contract details | Runtime equivalence checks for teams, date, period, rules, and token. |
| Alerts may rely on stale data | Mandatory freshness, timestamp-skew, and fail-closed logic. |
| Fees may be assumed | Fee data is fetched dynamically and included in the calculation. |

## 4.1 Defensible Advantage

The advantage is not a secret formula. It accumulates in the quality of the comparison infrastructure:

1. a library of confirmed mappings between sports events and prediction contracts;
2. equivalence checks that prevent comparisons between different outcomes;
3. a documented fail-closed record with no fabricated alerts;
4. integration with TxLINE's Solana-anchored provenance architecture;
5. normalized historical data about divergences and market states;
6. trust earned by explaining both alerts and suppressions.

**Claim boundary:** TxLINE's architecture can prove the publication and integrity of anchored records. It does not make a probability absolute truth or guarantee that a divergence will produce a return. World Cup Edge must not badge a probability as on-chain verified unless it can be deterministically recomputed from validated raw prices using a confirmed TxLINE method.

# 5. Target Market and Ideal Customer Profile

| Global segment | Fit |
| :---- | :---- |
| Active Polymarket/Kalshi traders | Already understand the value of speed, fees, and equivalent contracts. |
| Independent quantitative researchers | Need normalized data and reproducible rules for testing hypotheses. |
| Bot and tooling developers | Can consume alerts, webhooks, and derived data without rebuilding the normalization layer. |
| Small trading teams and syndicates | Need to monitor multiple events while maintaining an auditable process. |
| Specialist analysts and creators | Can explain market movements without relying on opaque picks. |
| Platforms and institutional desks | Future segment, conditional on licensing, SLA, compliance, and enterprise integrations. |

**Recommended initial ICP:** an English-speaking active trader who monitors sports prediction markets several times per week, currently compares external probabilities, market rules, order books, and fees manually, and will pay for a faster read-only research workflow that reduces false comparisons.

**Initial wedge:** live sports and lower-volume markets where fast changes and limited professional coverage make manual monitoring more expensive. Highly liquid global markets may be efficient and produce few alerts; in that case, "no qualified divergence" remains a valid product result.

## 5.1 Primary Persona: Maya Reed

> **Composite persona:** Maya is a fictional representation of the initial ICP, built from documented active-trader workflows and prediction-market research. She is not a customer testimonial.

| Attribute | Description |
| :---- | :---- |
| Role | Active sports prediction-market trader managing her own research and decisions. |
| Behavior | Monitors and trades sports outcome contracts several times per week while using market pages, external odds feeds, order books, and spreadsheets. |
| Core job | Find price differences that may support her return goals, then determine whether each gap is current, fee-adjusted, and based on equivalent contracts before committing attention or capital. |
| Main pain | Slow validation can cost her the market window; incorrect validation can expose her capital to a false comparison. |
| Buying trigger | A live tournament creates more fast-moving markets than she can validate manually without missing changes or accepting false positives. |
| Desired outcome | One research view that helps her pursue meaningful differences while avoiding wasted time and invalid comparisons. |
| Main objection | She will not pay for another opaque picks tool or a dashboard that merely republishes data she can already access. |
| Success measure | Faster validation, more markets monitored, fewer false comparisons, and repeated weekly use. |

**Persona statement:** "My goal is to generate returns, but I need to know whether a gap is valid before I risk time or capital on it."

The pitch-ready story and slide treatment are documented in [`World_Cup_Edge_ICP_Persona_and_Pitch_Story.md`](./World_Cup_Edge_ICP_Persona_and_Pitch_Story.md).

# 6. Product and Detailed MVP

The MVP proves one complete safe-comparison workflow. It does not attempt to replace a trading terminal, place orders, or determine the objectively correct value of a contract.

## 6.1 MVP Functional Scope

| Module | Description | Acceptance criterion |
| :---- | :---- | :---- |
| 1. Match selection | Select a supported event and sports outcome. | The user can clearly identify teams, date, kickoff, and rules. |
| 2. TxLINE ingestion | Fetch fixture and StablePrice data with timestamps and service level. | Probability is normalized without exposing raw responses or secrets. |
| 3. Polymarket ingestion | Fetch Gamma metadata, tokens, top-of-book, and dynamic fee. | The system maps the correct token and calculates best bid/ask. |
| 4. Contract equivalence | Check teams, date, period, rules, token, and market state. | Any mismatch makes the snapshot ineligible for an alert. |
| 5. Gap engine | Calculate gross gap, fee per share, and gap after fee. | The calculation is reproducible and covered by tests. |
| 6. Safety engine | Freshness, skew, empty book, delay, confirmation, deduplication, and cooldown. | Every invalid state suppresses alerts with a specific reason. |
| 7. Dashboard | Display comparison, freshness, verification, and current state. | The user understands the result without opening the source APIs. |
| 8. Session history | Store alerts in the browser session. | Repeated alerts are deduplicated and no account is required. |

## 6.2 Hackathon Demo Journey

* The user opens the dashboard and selects a match.
* The system queries TxLINE and Polymarket in parallel.
* The interface confirms teams, date, regulation rules, and market state.
* Consensus probability and top-of-book appear with separate freshness indicators.
* The engine subtracts the dynamic fee and calculates the final gap.
* A clearly labeled replay scenario demonstrates the alert state.
* A second scenario shows stale data or an unavailable market and proves fail-closed suppression.

## 6.3 Example Deterministic Output

> **Synthetic demonstration scenario, not live data:** "TxLINE's consensus probability is above Polymarket's best YES ask for the same outcome. After the dynamic fee, the gap remains above the configured threshold for two consecutive samples. Teams, date, rules, token, freshness, and market-state checks all passed. Research alert emitted. This is not a guarantee of return."

# 7. Global Revenue Model and Average Revenue per Customer

**Proposed initial commercial strategy:** global freemium. The free layer demonstrates transparency and creates distribution; paid plans monetize real-time access, coverage, personalization, and professional integration.

| Future plan | Hypothetical price | Objective | Main features |
| :---- | :---- | :---- | :---- |
| Free | US$0 | Acquisition and validation | Delayed dashboard, limited markets, and limited history. Delayed data does not produce live alerts. |
| Pro | US$39/month | Individual monetization | Real-time monitoring, more markets, custom thresholds, replay, and notifications. |
| Team/API | From US$199/month | Builders and small teams | Webhooks, derived-data API, historical export, higher limits, and team seats. |
| Enterprise | Custom | Platforms and professional operations | SLA, integrations, support, and compliance controls, subject to data licensing. |

**Initial reference ARPU:** US$39/month per Pro subscriber, equal to US$468/year. The Team/API plan starts at US$199/month, equal to US$2,388/year.

**Product rule:** World Cup Edge monetizes analysis, normalization, and monitoring. It must not operate as a public proxy for raw TxLINE responses. Redistribution and licensing rights must be confirmed before offering a commercial API.

# 8. TAM, SAM, and SOM - Global Market

The estimates below use public data compiled during the hackathon and explicit commercial assumptions. Active wallets do not necessarily equal unique people, and not every prediction-market participant is a potential software customer.

| Layer | Assumption | Potential annual revenue | Qualification |
| :---- | :---- | :---- | :---- |
| TAM - global participants | 840,000 to 2 million participants/wallets × US$20-50/month | Approximately US$202 million to US$1.2 billion/year | Broad theoretical ceiling, not a revenue forecast. |
| SAM - frequent sports traders | 5%-10% of the broad base × US$29-49/month | Approximately US$15 million to US$118 million/year | Segment size and willingness to pay require validation. |
| Beachhead - reachable active traders | Polymarket/Kalshi sports communities, public trader accounts, and quantitative-trading groups | Measured through qualified active traders rather than venue volume | The initial market must be proved through interviews, activation, and retention. |

## 8.1 Realistic Execution SOM

| Scenario | Pro customers | Team/API customers | MRR | ARR |
| :---- | :---- | :---- | :---- | :---- |
| Year 1 - validation | 100 | 5 | US$4,895 | US$58,740 |
| Year 2 - base case | 500 | 25 | US$24,475 | US$293,700 |
| Year 3 - global expansion | 2,000 | 100 | US$97,900 | US$1,174,800 |

**Note:** the scenarios assume Pro at US$39 and Team/API at US$199, excluding discounts, tax, bad debt, and enterprise revenue. The goal is not to claim guaranteed capture, but to show that a small global customer base can support a specialized SaaS business.

# 9. Customer ROI

Commercial ROI must be presented as **operational savings**, never as trading profit. World Cup Edge does not control execution, slippage, settlement, or future price movements.

## 9.1 Formula

*Monthly operational ROI = (hours saved × hourly value - subscription) / subscription × 100*

## 9.2 Pro Plan Break-Even

At US$39/month:

* at US$25/hour, break-even requires 1.56 hours saved per month;
* at US$50/hour, break-even requires 47 minutes saved per month;
* at US$75/hour, break-even requires 31 minutes saved per month.

## 9.3 Illustrative Scenarios

| Scenario | Time saved | Hourly value | Operational benefit | Subscription | Operational ROI |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Conservative | 2 hours/month | US$25 | US$50 | US$39 | 28% |
| Base | 4 hours/month | US$40 | US$160 | US$39 | 310% |
| Professional | 6 hours/month | US$75 | US$450 | US$39 | 1,054% |

**Qualification:** these are mathematical examples, not observed results. Pilots must measure actual time before and after adoption, markets reviewed, and false positives avoided. Trading P&L must not be used as a promised product ROI.

# 10. CAC, LTV, and Payback

The following metrics are management targets for an early-stage global SaaS business. They must be replaced with observed data after the first paid pilots.

| Metric | Base hypothesis | Calculation/qualification |
| :---- | :---- | :---- |
| Pro MRR | US$39 | Proposed monthly price. |
| Target gross margin | 75% | Hypothesis after data, infrastructure, notifications, and basic support. |
| Cost per qualified trial | US$15 | Content, community, outreach, and lightweight onboarding. |
| Trial/free-to-paid conversion | 15% | Hypothesis to validate. |
| CAC per paid customer | US$100 | US$15 / 15%. |
| Target monthly churn | 5% | Theoretical average lifetime of 20 months. |
| Base LTV | US$585 | US$39 × 75% / 5%. |
| LTV/CAC | 5.9x | US$585 / US$100. |
| CAC payback | 3.4 paid months | US$100 / (US$39 × 75%). |

**Interpretation:** the economics are attractive only if real-time data and support allow a gross margin near 75%. Licensing restrictions or upstream data costs may materially change the model. The initial objective is to measure retention and willingness to pay, not optimize LTV before product-market fit exists.

# 11. Global Go-to-Market

* **Entry offer:** "Compare TxLINE consensus with the market quote in seconds, with rules and freshness checked first."
* **Channel 1 - founder-led outreach:** contact active traders who publicly share sports-market research, workflows, and post-mortems.
* **Channel 2 - communities:** Polymarket, Kalshi, Hacker News, GitHub, TxLINE Telegram, data communities, and quantitative-research groups.
* **Channel 3 - evidence-based content:** publish live-match monitoring and transparent post-mortems, including sessions where the result is "no alert."
* **Channel 4 - open source:** keep the deterministic engine, tests, and documentation public to build technical trust.
* **Channel 5 - partnerships:** integrate with builder libraries, market aggregators, research tools, and notification providers.
* **Channel 6 - global events:** use the World Cup, international leagues, and esports tournaments as acquisition windows without depending on a single competition.

## 11.1 Market-Entry Sequence

1. five traders using the product repeatedly during live matches;
2. twenty global testers recruited from English-speaking communities;
3. first paid Pro customer with founder-led onboarding;
4. first Team/API customer after validating data rights;
5. expansion into additional sports, outcomes, and venues based on observed demand.

# 12. Roadmap

| Phase | Deliverable | Objective |
| :---- | :---- | :---- |
| MVP - Hackathon | TxLINE + Polymarket, contract equivalence, gap after fee, fail-closed behavior, dashboard, and labeled replay. | Prove the safe-comparison workflow. |
| Phase 2 - Validation | Multiple matches, user thresholds, notifications, and product telemetry. | Measure repeat usage, time saved, and willingness to pay. |
| Phase 3 - Pro Product | Additional outcomes, history, filters, watchlists, and exports. | Create recurring individual use and revenue. |
| Phase 4 - Team/API | Webhooks, derived-data API, seats, and team controls. | Serve builders and professional operations. |
| Phase 5 - Global Expansion | Additional sports, venues, and cross-market mapping. | Reduce dependence on one event or platform. |

**Outside the roadmap:** wallet connection, custody, automated order placement, and any LLM deciding whether a gap exists. The core logic remains deterministic.

# 13. Fit with the World Cup Hackathon and Global Track

| Dimension | How World Cup Edge fits |
| :---- | :---- |
| TxLINE usage | StablePrice and fixtures are the primary source of sports consensus. |
| Solana | TxLINE activation and provenance architecture use Solana-anchored infrastructure; the product respects the limits of what that provenance proves. |
| Trading Tools and Agents | Delivers an operational tool for traders without requiring AI or order execution. |
| Functional product | Dashboard, data clients, gap engine, equivalence checks, fail-closed states, and automated tests. |
| Differentiation | Combines contract context, top-of-book, dynamic fees, freshness, and safe suppression. |
| Global scalability | The model is not limited to one country; it can expand by sport, venue, and customer type. |
| Product maturity | Restricted claims, explicit risks, and acceptance of "no alert" as a valid result. |

# 14. Risks and Mitigation

| Risk | Impact | Mitigation |
| :---- | :---- | :---- |
| Large markets are highly efficient | High | Begin with live, niche, and workflow-heavy markets where monitoring saves time even when alerts are infrequent. |
| Low willingness to pay | High | Run real trader pilots, measure time saved, and test pricing before building complex plans. |
| Incorrect contract mapping | Critical | Runtime equivalence checks, test coverage, and fail-closed suppression. |
| Stale data, empty books, or closed markets | Critical | Separate freshness, maximum timestamp skew, liquidity checks, and explicit suppression reasons. |
| Dependence on TxLINE and Polymarket | High | Adapter-based architecture and future venue expansion without proxying raw data. |
| Data-licensing restrictions | High | Validate commercial rights before a paid API; monetize derived analysis rather than raw redistribution. |
| Perception as a profit promise | High | Controlled language: consensus gap, research tool, no guaranteed returns. |
| Geographic and regulatory restrictions | High | Remain read-only; do not describe quotes as executable or facilitate orders in blocked jurisdictions. |
| Confusing provenance with truth | High | Explain that provenance confirms publication and integrity, not the correctness of a probability or alert. |
| Sports seasonality | Medium | Expand across leagues, sports, esports, and non-seasonal markets according to demand. |

# 15. Hypotheses to Validate

Before treating this document as a financial operating plan, the project must answer:

1. Do traders perform this comparison today, and how?
2. How many times per week would they return to the product?
3. Do freshness and provenance matter more than raw speed?
4. How much research time does the product save per session?
5. Which sports, outcomes, and venues generate the highest usage frequency?
6. Is US$39/month acceptable to an active trader?
7. Would builders pay US$199/month for webhooks and derived data?
8. Which usage and redistribution rights do the upstream providers permit?
9. What percentage of free users return after the first event?
10. Does retention depend on frequent alerts, or on confidence that no qualified gap existed?

## 15.1 Immediate Validation Targets

| Horizon | Target |
| :---- | :---- |
| Hackathon | Demonstrate the functional workflow and obtain qualitative feedback from at least 3 active traders. |
| 30 days | 20 global testers; 5 using the product in more than one session. |
| 60 days | First paid Pro pilot and measured research time saved. |
| 90 days | 10 paying customers or an evidence-based pivot decision. |

# 16. References and Further Reading

The sources below support the market context, observed demand, and claim boundaries. Figures compiled in July 2026 must be refreshed before fundraising or definitive financial planning.

* **[P1] World Cup Edge - Context and market estimates.** [`docs/context.md`](./context.md)
* **[P2] World Cup Edge - Product specification.** [`SPEC.md`](../SPEC.md)
* **[P3] World Cup Edge - Fail-closed safety rules.** [`docs/safety.md`](./safety.md)
* **[P4] World Cup Edge - Claims guide.** [`docs/claims.md`](./claims.md)
* **[R1] Fred Wilson. My Pele Agent - Trading the World Cup Prediction Markets with AI and Crypto.** https://avc.xyz/my-pele-agent
* **[R2] Kacho. I Ran an Arbitrage Bot on Polymarket. Here Are the Real Numbers.** https://kacho.io/polymarket-arbitrage-real-numbers
* **[R3] BotStadium - agents competing on sports predictions.** https://botstadium.ai
* **[R4] pmxt - unified Polymarket and Kalshi library.** https://github.com/qoery-com/pmxt
* **[R5] Polymarket - resolution documentation.** https://docs.polymarket.com/concepts/resolution
* **[R6] TxODDS - TxLINE.** https://txodds.net/our-products/tx-line/
* **[R7] DefiLlama - Overtime Markets.** https://defillama.com/protocol/overtime
* **[R8] DefiLlama - SX Bet.** https://defillama.com/protocol/sx-bet
* **[R9] Superteam Earn - Trading Tools and Agents.** https://superteam.fun/earn/listing/trading-tools-and-agents
