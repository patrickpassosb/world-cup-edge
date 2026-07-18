"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Circle,
  Clock,
  Filter,
  Loader,
  Radio,
  RefreshCw,
  Settings,
  WifiOff,
  XCircle,
} from "lucide-react";
import { DISCLAIMER_LINES, MATCH } from "@/lib/config";
import type { MatchEntry, SessionAlert, Snapshot } from "@/lib/types";

const POLL_INTERVAL_MS = 3000;

type DisplayState =
  | "loading"
  | "live"
  | "stale"
  | "no-alert"
  | "alert"
  | "unavailable"
  | "error";

function deriveDisplayState(snapshot: Snapshot | null): DisplayState {
  if (snapshot === null) return "loading";
  if (snapshot.status === "loading") return "loading";
  if (snapshot.status === "error") return "error";
  if (snapshot.status === "unavailable") return "unavailable";
  if (snapshot.status === "stale") return "stale";
  if (snapshot.status === "live") {
    return snapshot.alert.active ? "alert" : "no-alert";
  }
  return "loading";
}

function formatPp(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const pp = value * 100;
  const sign = pp > 0 ? "+" : "";
  return `${sign}${pp.toFixed(1)} pp`;
}

function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function formatAge(receivedAt: number | null, timestamp: number | null): string {
  if (timestamp === null || receivedAt === null) return "—";
  const age = Math.max(0, Math.floor((receivedAt - timestamp) / 1000));
  return `${age}s ago`;
}

function formatCountdown(kickoffUTC: string): string {
  const target = new Date(kickoffUTC).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return "00:00:00";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function buildExplanation(snapshot: Snapshot): string {
  const gap = snapshot.gap.gapAfterFee;
  if (gap === null) return "Gap value unavailable.";
  const pp = (gap * 100).toFixed(1);
  if (gap > 0) {
    return `TxLINE's consensus probability is ${pp} percentage points higher than Polymarket's best ask for the same outcome. Not an arbitrage guarantee.`;
  }
  if (gap < 0) {
    return `TxLINE's consensus probability is ${Math.abs(Number(pp)).toFixed(1)} percentage points lower than Polymarket's best ask. Not an arbitrage guarantee.`;
  }
  return "TxLINE consensus and Polymarket best ask are aligned. No meaningful gap detected.";
}

function formatKickoffRelative(kickoffUTC: string): string {
  const target = new Date(kickoffUTC);
  const now = new Date();
  const hh = String(target.getUTCHours()).padStart(2, "0");
  const mm = String(target.getUTCMinutes()).padStart(2, "0");
  const timeStr = `${hh}:${mm}`;
  const dayDiff = Math.floor((target.getTime() - now.getTime()) / 86_400_000);
  if (dayDiff <= 0) return `Today ${timeStr}`;
  if (dayDiff === 1) return `Tomorrow ${timeStr}`;
  if (dayDiff < 7) {
    const ddd = target.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
    return `${ddd} ${timeStr}`;
  }
  const month = target.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const day = target.getUTCDate();
  return `${month} ${day} ${timeStr}`;
}

interface MatchPickerSectionProps {
  matches: MatchEntry[];
  selectedFixtureId: number | null;
  onSelect: (match: MatchEntry) => void;
  loading: boolean;
  error: string | null;
}

function MatchPickerSection({
  matches,
  selectedFixtureId,
  onSelect,
  loading,
  error,
}: MatchPickerSectionProps) {
  if (loading && matches.length === 0) {
    return (
      <div className="mb-6 overflow-x-auto border-b border-outline-variant">
        <div className="flex min-w-max pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="mr-3 h-16 w-48 animate-pulse bg-surface-container-high"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error !== null && matches.length === 0) {
    return (
      <div className="mb-6 flex items-center gap-3 border-b border-outline-variant pb-4">
        <XCircle className="h-5 w-5 text-error" aria-hidden="true" />
        <span className="text-error">{error}</span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="ml-auto border border-on-surface px-3 py-2 text-xs font-bold uppercase tracking-[0.05em] text-on-surface transition-colors duration-100 hover:bg-on-surface hover:text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Retry now
        </button>
      </div>
    );
  }

  if (!loading && !error && matches.length === 0) {
    return (
      <div className="mb-6 flex items-center justify-center gap-2 border-b border-outline-variant pb-4 text-center">
        <Clock className="h-5 w-5 text-on-surface-variant" aria-hidden="true" />
        <span className="italic text-on-surface-variant">No upcoming World Cup fixtures</span>
      </div>
    );
  }

  return (
    <div className="mb-6 overflow-x-auto border-b border-outline-variant">
      <div className="flex min-w-max pb-2">
        {matches.map((match) => {
          const isSelected = match.fixtureId === selectedFixtureId;
          return (
            <button
              key={match.fixtureId}
              type="button"
              onClick={() => onSelect(match)}
              aria-label={`Select match: ${match.homeTeam} vs ${match.awayTeam}`}
              aria-pressed={isSelected}
              className={`min-w-[200px] border-b-2 px-4 py-3 text-left whitespace-nowrap transition-colors duration-100 hover:bg-surface-container ${
                isSelected
                  ? "border-primary text-on-surface"
                  : "border-transparent text-on-surface-variant opacity-50"
              }`}
            >
              <div className="font-bold">{`${match.homeTeam} vs ${match.awayTeam}`}</div>
              <div suppressHydrationWarning className="text-sm">
                {formatKickoffRelative(match.kickoffUTC)}
                {!match.hasPolymarketMarket && (
                  <span className="ml-2 text-xs text-on-surface-variant">TxLINE only</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [countdown, setCountdown] = useState<string>(formatCountdown(MATCH.kickoffUTC));
  const [sessionAlerts, setSessionAlerts] = useState<SessionAlert[]>([]);
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchEntry | null>(null);
  const lastDedupeKeyRef = useRef<string | null>(null);

  const selectedFixtureId = selectedMatch?.fixtureId ?? null;
  const txlineOnly = selectedMatch !== null && !selectedMatch.hasPolymarketMarket;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch("/api/matches", { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: MatchEntry[] = await res.json();
        if (cancelled) return;
        setMatches(data);
        setMatchesError(null);
        setSelectedMatch(data[0] ?? null);
      } catch {
        if (!cancelled) {
          setMatchesError("Failed to load matches.");
          setMatches([]);
          setSelectedMatch(null);
        }
      } finally {
        if (!cancelled) setMatchesLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedMatch === null) {
      const raf = requestAnimationFrame(() => setSnapshot(null));
      return () => cancelAnimationFrame(raf);
    }
    let cancelled = false;
    lastDedupeKeyRef.current = null;

    const doPoll = async () => {
      try {
        let url = "/api/snapshot?fixtureId=" + encodeURIComponent(selectedMatch.fixtureId);
        if (selectedMatch.hasPolymarketMarket && selectedMatch.polymarketMarketSlug) {
          url += "&marketSlug=" + encodeURIComponent(selectedMatch.polymarketMarketSlug);
        }
        const res = await fetch(url, { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Snapshot = await res.json();
        if (cancelled) return;
        setSnapshot(data);

        if (data.alert.active && !txlineOnly) {
          const dedupeKey = data.alert.dedupeKey;
          if (dedupeKey !== lastDedupeKeyRef.current) {
            lastDedupeKeyRef.current = dedupeKey;
            const entry: SessionAlert = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              timestamp: Date.now(),
              match: data.match.name,
              gapValue: data.gap.gapAfterFee ?? 0,
              explanation: buildExplanation(data),
              dedupeKey,
            };
            setSessionAlerts((prev) => [entry, ...prev].slice(0, 50));
          }
        }
      } catch {
        if (!cancelled) {
          setSnapshot((prev) => {
            if (prev && prev.status !== "error") {
              return {
                ...prev,
                status: "error",
                errorMessage: "Failed to reach /api/snapshot.",
              } as Snapshot;
            }
            return prev;
          });
        }
      }
    };

    doPoll();
    const interval = setInterval(doPoll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedMatch, txlineOnly]);

  useEffect(() => {
    const update = () => setCountdown(formatCountdown(selectedMatch?.kickoffUTC ?? MATCH.kickoffUTC));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [selectedMatch?.kickoffUTC]);

  const displayState = deriveDisplayState(snapshot);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 md:px-8">
        <MatchPickerSection
          matches={matches}
          selectedFixtureId={selectedFixtureId}
          onSelect={setSelectedMatch}
          loading={matchesLoading}
          error={matchesError}
        />
        <HeaderSection countdown={countdown} snapshot={snapshot} selectedMatch={selectedMatch} />
        <FocalPointSection snapshot={snapshot} displayState={displayState} txlineOnly={txlineOnly} />
        <TwoColumnSection snapshot={snapshot} displayState={displayState} txlineOnly={txlineOnly} />
        <StatusBadges displayState={displayState} txlineOnly={txlineOnly} snapshot={snapshot} />
        <SessionAlertsSection alerts={sessionAlerts} displayState={displayState} txlineOnly={txlineOnly} />
      </main>
      <Footer />
    </div>
  );
}

function TopBar() {
  return (
    <header className="border-b-2 border-on-surface">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-4 md:h-[72px] md:px-8">
        <div className="font-sans text-2xl font-bold tracking-tight text-on-surface md:text-[38px] md:leading-none">
          WORLD CUP EDGE
        </div>
        <div className="flex items-center gap-4 text-on-surface md:gap-6">
          <span className="hidden items-center gap-2 text-xs font-bold uppercase tracking-[0.05em] text-on-surface-variant md:inline-flex">
            <Radio className="h-4 w-4" aria-hidden="true" />
            Live feed active
          </span>
          <span className="flex items-center gap-3" aria-hidden="true">
            <Filter className="h-[18px] w-[18px]" />
            <RefreshCw className="h-[18px] w-[18px]" />
            <Settings className="h-[18px] w-[18px]" />
          </span>
        </div>
      </div>
    </header>
  );
}

function HeaderSection({
  countdown,
  snapshot,
  selectedMatch,
}: {
  countdown: string;
  snapshot: Snapshot | null;
  selectedMatch: MatchEntry | null;
}) {
  const matchName = selectedMatch
    ? `${selectedMatch.homeTeam} vs ${selectedMatch.awayTeam}`
    : snapshot?.match.name ?? MATCH.matchName;
  const matchDate = selectedMatch
    ? selectedMatch.kickoffUTC.slice(0, 10)
    : snapshot?.match.date ?? MATCH.matchDate;
  const matchRules = snapshot?.match.rules ?? MATCH.rules;

  return (
    <section className="mb-8 border-b border-outline-variant pb-1 md:mb-12">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-sans text-[30px] font-bold leading-9 tracking-[-0.02em] text-on-surface md:text-[40px] md:leading-[48px]">
            {matchName}
          </h1>
          <p className="text-base italic text-on-surface-variant">
            {matchDate} · 19:00 UTC · {matchRules}
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-xs font-bold uppercase tracking-[0.05em] text-on-surface-variant">
            Next event start
          </p>
          <p
            suppressHydrationWarning
            className="font-mono text-xl font-medium tracking-tight tabular-nums text-on-surface md:text-2xl"
          >
            Kickoff in {countdown}
          </p>
        </div>
      </div>
    </section>
  );
}

function FocalPointSection({
  snapshot,
  displayState,
  txlineOnly,
}: {
  snapshot: Snapshot | null;
  displayState: DisplayState;
  txlineOnly: boolean;
}) {
  if (txlineOnly) {
    return (
      <section className="border-b border-outline-variant py-12 text-center md:py-16">
        <div className="inline-block max-w-full">
          <p className="mb-2 font-mono text-[64px] font-bold leading-none tracking-tight tabular-nums text-on-surface-variant md:text-[96px]">
            Gap monitoring disabled
          </p>
          <h2 className="mb-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-on-surface">
            TxLINE consensus only
          </h2>
          <p className="mx-auto max-w-xl border-t border-on-surface pt-4 text-base leading-6 text-on-surface">
            No Polymarket market for this match. Showing TxLINE consensus only.
          </p>
        </div>
      </section>
    );
  }

  if (displayState === "loading") {
    return (
      <section className="border-b border-outline-variant py-16 text-center">
        <div className="inline-block max-w-full">
          <div className="mx-auto mb-2 h-24 w-96 max-w-full animate-pulse bg-surface-container-high" />
          <div className="mx-auto mb-4 h-4 w-[420px] max-w-full animate-pulse bg-surface-container-high" />
          <div className="mx-auto h-12 w-[576px] max-w-full animate-pulse border-t border-on-surface bg-surface-container" />
        </div>
      </section>
    );
  }

  const gapValue = snapshot?.gap.gapAfterFee ?? null;
  const isAlert = displayState === "alert";
  const isUnavailable = displayState === "unavailable";
  const gapColor = isAlert ? "text-alert" : "text-primary";
  const explanation = snapshot ? buildExplanation(snapshot) : "";

  return (
    <section className="border-b border-outline-variant py-12 text-center md:py-16">
      <div className="inline-block max-w-full">
        <p
          className={`mb-2 font-mono text-[64px] font-bold leading-none tracking-tight tabular-nums md:text-[96px] ${gapColor}`}
        >
          {formatPp(gapValue)}
        </p>
        <h2 className="mb-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-on-surface">
          {isAlert ? "Consensus Gap Alert — England to win in regulation" : "Gross Consensus Gap — England to win in regulation"}
        </h2>
        <p className="mx-auto max-w-xl border-t border-on-surface pt-4 text-base leading-6 text-on-surface">
          {explanation}
        </p>
        {isAlert && (
          <p className="mt-3 text-sm font-medium text-alert">
            <AlertTriangle className="mr-1 inline-block h-4 w-4 align-text-bottom" />
            Gap exceeds {formatPp(snapshot?.gap.threshold ?? 0.05)} threshold after fee. Not an arbitrage guarantee.
          </p>
        )}
        {isUnavailable && (
          <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-stale">
            <WifiOff className="h-4 w-4" aria-hidden="true" />
            {snapshot?.errorMessage ?? "Source unavailable. No comparison generated."}
          </p>
        )}
      </div>
    </section>
  );
}

function TwoColumnSection({
  snapshot,
  displayState,
  txlineOnly,
}: {
  snapshot: Snapshot | null;
  displayState: DisplayState;
  txlineOnly: boolean;
}) {
  return (
    <section className="grid grid-cols-1 border-b border-outline-variant md:min-h-[628px] md:grid-cols-2">
      <TxlineColumn snapshot={snapshot} displayState={displayState} />
      <div className="border-t border-outline-variant md:border-t-0">
        <PolymarketColumn snapshot={snapshot} displayState={displayState} txlineOnly={txlineOnly} />
      </div>
    </section>
  );
}

function TxlineColumn({
  snapshot,
  displayState,
}: {
  snapshot: Snapshot | null;
  displayState: DisplayState;
}) {
  const probability = snapshot?.txline.probability ?? null;
  const fresh = snapshot?.txline.fresh ?? false;
  const age = formatAge(snapshot?.txline.receivedAt ?? null, snapshot?.txline.timestamp ?? null);
  const delayed = snapshot?.txline.delayed ?? false;
  const checks = snapshot?.checks;
  const isStale = displayState === "stale";

  if (displayState === "loading") {
    return (
      <div className="border-b border-outline-variant py-10 pr-0 md:border-b-0 md:border-r md:py-12 md:pr-6">
        <div className="mb-8 h-4 w-48 animate-pulse bg-surface-container-high" />
        <div className="mb-3 h-16 w-40 animate-pulse bg-surface-container-high" />
        <div className="mb-12 h-5 w-56 animate-pulse bg-surface-container" />
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse border-t border-outline-variant bg-surface-container" />
          <div className="h-4 w-full animate-pulse bg-surface-container" />
          <div className="h-4 w-full animate-pulse bg-surface-container" />
          <div className="h-4 w-full animate-pulse bg-surface-container" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-b border-outline-variant py-10 pr-0 md:border-b-0 md:border-r md:py-12 md:pr-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <h3 className="font-sans text-xs font-bold uppercase tracking-[0.05em] text-on-surface-variant">
          TxLINE Consensus
        </h3>
        <FreshnessIndicator
          label="TxLINE"
          fresh={fresh && !isStale}
          age={age}
          delayed={delayed}
        />
      </div>
      <div className="mb-12">
        <span className="font-mono text-[56px] font-medium leading-none tracking-tight tabular-nums text-on-surface md:text-[64px]">
          {formatPct(probability)}
        </span>
        <p className="mt-2 text-base text-on-surface-variant">England to win (regulation time)</p>
      </div>
      <div className="space-y-4 border-t border-outline-variant pt-8">
        <CheckRow passed={checks?.teams ?? false} label="Teams matched" />
        <CheckRow passed={checks?.date ?? false} label="Date matched" />
        <CheckRow passed={checks?.rules ?? false} label="Rules: regulation-time 1X2" />
        <CheckRow passed={checks?.marketState ?? false} label="Market state: open" />
      </div>
    </div>
  );
}

function PolymarketColumn({
  snapshot,
  displayState,
  txlineOnly,
}: {
  snapshot: Snapshot | null;
  displayState: DisplayState;
  txlineOnly: boolean;
}) {
  if (txlineOnly) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-10 pl-0 text-center md:py-12 md:pl-6">
        <h3 className="mb-6 font-sans text-xs font-bold uppercase tracking-[0.05em] text-on-surface-variant">
          Polymarket Top-of-Book Quote
        </h3>
        <WifiOff className="mb-4 h-8 w-8 text-on-surface-variant" aria-hidden="true" />
        <p className="text-on-surface-variant">No Polymarket market for this match.</p>
      </div>
    );
  }

  const bestAsk = snapshot?.polymarket.bestAsk ?? null;
  const fresh = snapshot?.polymarket.fresh ?? false;
  const age = formatAge(snapshot?.polymarket.receivedAt ?? null, snapshot?.polymarket.timestamp ?? null);
  const gapAfterFee = snapshot?.gap.gapAfterFee ?? null;
  const isStale = displayState === "stale";
  const isUnavailable = displayState === "unavailable";

  if (displayState === "loading") {
    return (
      <div className="py-10 pl-0 md:py-12 md:pl-6">
        <div className="mb-8 h-4 w-56 animate-pulse bg-surface-container-high" />
        <div className="mb-3 h-16 w-40 animate-pulse bg-surface-container-high" />
        <div className="mb-12 h-5 w-56 animate-pulse bg-surface-container" />
        <div className="ml-auto mt-24 h-10 w-32 animate-pulse bg-surface-container" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col py-10 pl-0 md:py-12 md:pl-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <h3 className="font-sans text-xs font-bold uppercase tracking-[0.05em] text-on-surface-variant">
          Polymarket Top-of-Book Quote
        </h3>
        <FreshnessIndicator
          label="Polymarket"
          fresh={fresh && !isStale}
          age={age}
          delayed={false}
        />
      </div>
      <div className="mb-12">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[56px] font-medium leading-none tracking-tight tabular-nums text-on-surface md:text-[64px]">
            {formatPct(bestAsk)}
          </span>
          {!isUnavailable && bestAsk !== null && (
            <span className="border border-on-surface px-1 font-sans text-xs font-bold uppercase tracking-[0.05em] text-on-surface">
              best ask
            </span>
          )}
        </div>
        <p className="mt-2 text-base text-on-surface-variant">England YES · top-of-book quote</p>
      </div>
      <div className="mt-16 text-right">
        <span className="block font-sans text-xs font-bold uppercase tracking-[0.05em] text-on-surface-variant">
          Gap after fee
        </span>
        <span className="font-mono text-2xl font-medium tracking-tight tabular-nums text-primary">
          {formatPp(gapAfterFee)}
        </span>
      </div>
    </div>
  );
}

function FreshnessIndicator({
  label,
  fresh,
  age,
  delayed,
}: {
  label: string;
  fresh: boolean;
  age: string;
  delayed: boolean;
}) {
  return (
    <div className="text-right">
      <span
        className={`inline-flex items-center font-sans text-xs font-bold uppercase tracking-[0.05em] ${
          fresh ? "text-primary" : "text-stale"
        }`}
      >
        {fresh ? (
          <span className="mr-1.5 h-1.5 w-1.5 animate-pulse bg-primary" />
        ) : (
          <span className="mr-1.5 h-1.5 w-1.5 bg-stale" />
        )}
        <span className="sr-only">{label} </span>
        {fresh ? "live" : "stale"} · {age}
      </span>
      {delayed && (
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.05em] text-stale">
          60-second delayed
        </p>
      )}
    </div>
  );
}

function CheckRow({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between font-mono text-sm uppercase tracking-[0.04em] text-on-surface-variant">
      <span>{label}</span>
      <span className={passed ? "font-bold text-on-surface" : "font-bold text-error"}>
        {passed ? "✓" : "×"}
      </span>
    </div>
  );
}

const STATUS_BADGES: {
  state: DisplayState;
  label: string;
  Icon: typeof Radio;
}[] = [
  { state: "loading", label: "Loading", Icon: Loader },
  { state: "live", label: "Live", Icon: Radio },
  { state: "stale", label: "Stale", Icon: Clock },
  { state: "no-alert", label: "No Alert", Icon: CheckCircle },
  { state: "alert", label: "Alert", Icon: AlertTriangle },
  { state: "unavailable", label: "Unavailable", Icon: WifiOff },
  { state: "error", label: "Error", Icon: XCircle },
];

function StatusBadges({
  displayState,
  txlineOnly,
  snapshot,
}: {
  displayState: DisplayState;
  txlineOnly: boolean;
  snapshot: Snapshot | null;
}) {
  return (
    <section className="mb-12 border-y border-on-surface py-8 md:py-12">
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-4 md:gap-x-8">
        {STATUS_BADGES.map(({ state, label, Icon }) => {
          let active =
            displayState === state ||
            (state === "live" && (displayState === "no-alert" || displayState === "alert"));
          if (txlineOnly) {
            if (state === "alert" || state === "unavailable") {
              active = false;
            } else if (state === "no-alert") {
              active = true;
            } else if (state === "live") {
              active = snapshot?.status === "live";
            } else if (state === "stale") {
              active = snapshot?.status === "stale";
            }
          }
          return (
            <div
              key={state}
              className={`flex items-center font-sans text-xs font-bold uppercase tracking-[0.05em] ${
                active
                  ? "border-b-2 border-primary pb-1 text-primary"
                  : "text-state-muted"
              }`}
            >
              <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
              {label}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SessionAlertsSection({
  alerts,
  displayState,
  txlineOnly,
}: {
  alerts: SessionAlert[];
  displayState: DisplayState;
  txlineOnly: boolean;
}) {
  if (txlineOnly) {
    return (
      <section className="mb-12">
        <div className="mb-6 flex items-center">
          <h2 className="shrink-0 font-serif text-2xl font-semibold italic text-on-surface">Session alerts</h2>
          <div className="ml-8 h-px flex-1 bg-outline-variant" />
        </div>
        <div className="overflow-x-auto">
          <div className="font-mono text-sm md:min-h-[198px] md:min-w-[680px]">
            <div className="grid grid-cols-[72px_120px_82px_1fr] border-b border-outline-variant py-2 uppercase tracking-[0.04em] text-on-surface-variant md:grid-cols-[100px_150px_120px_1fr]">
              <span>Time</span>
              <span>Match</span>
              <span>Gap</span>
              <span className="hidden md:block">Summary</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] border-b border-outline-variant py-4 text-on-surface-variant">
              <Circle className="h-4 w-4 self-center" aria-hidden="true" />
              <span>No alerts generated this session.</span>
            </div>
            <div className="py-4 text-sm text-on-surface-variant">
              Gap monitoring disabled — no Polymarket market for this match.
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (displayState === "error" && alerts.length === 0) {
    return (
      <section className="mb-12">
        <div className="mb-6 flex items-center">
          <h2 className="shrink-0 font-serif text-2xl font-semibold italic text-on-surface">Session alerts</h2>
          <div className="ml-8 h-px flex-1 bg-outline-variant" />
        </div>
        <div className="border border-outline-variant p-6 text-center">
          <XCircle className="mx-auto mb-3 h-8 w-8 text-error" />
          <p className="text-on-surface-variant">{`Failed to reach /api/snapshot.`}</p>
          <p className="mt-1 text-sm text-on-surface-variant">Retrying automatically every {POLL_INTERVAL_MS / 1000}s.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 border border-on-surface px-3 py-2 text-xs font-bold uppercase tracking-[0.05em] text-on-surface transition-colors duration-100 hover:bg-on-surface hover:text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Retry now
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <div className="mb-6 flex items-center">
        <h2 className="shrink-0 font-serif text-2xl font-semibold italic text-on-surface">Session alerts</h2>
        <div className="ml-8 h-px flex-1 bg-outline-variant" />
      </div>
      <div className="overflow-x-auto">
        <div className="font-mono text-sm md:min-h-[198px] md:min-w-[680px]">
          <div className="grid grid-cols-[72px_120px_82px_1fr] border-b border-outline-variant py-2 uppercase tracking-[0.04em] text-on-surface-variant md:grid-cols-[100px_150px_120px_1fr]">
            <span>Time</span>
            <span>Match</span>
            <span>Gap</span>
            <span className="hidden md:block">Summary</span>
          </div>
          {alerts.length === 0 ? (
            <div className="grid grid-cols-[100px_1fr] border-b border-outline-variant py-4 text-on-surface-variant">
              <Circle className="h-4 w-4 self-center" aria-hidden="true" />
              <span>No alerts generated this session.</span>
            </div>
          ) : (
            alerts.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-[72px_120px_82px_1fr] border-b border-outline-variant py-4 text-on-surface md:grid-cols-[100px_150px_120px_1fr]"
              >
                <span className="text-on-surface-variant">
                  {new Date(entry.timestamp).toLocaleTimeString("en-US", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="font-bold">{entry.match}</span>
                <span className="font-bold text-primary">{formatPp(entry.gapValue)}</span>
                <span className="hidden text-on-surface-variant md:block">{entry.explanation}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-outline-variant bg-transparent">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-3 md:px-8">
        <div className="mb-2 font-sans text-xs font-bold uppercase tracking-[0.05em] text-on-surface">
          Read-only monitoring interface
        </div>
        <p className="mb-2 max-w-2xl text-xs leading-relaxed text-on-surface-variant">
          {DISCLAIMER_LINES.line1}
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-on-surface-variant">
          {DISCLAIMER_LINES.line2}
        </p>
      </div>
    </footer>
  );
}
