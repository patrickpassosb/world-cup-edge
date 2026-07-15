"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Circle,
  Clock,
  Loader,
  Radio,
  WifiOff,
  XCircle,
} from "lucide-react";
import { DISCLAIMER_LINES, MATCH } from "@/lib/config";
import type { SessionAlert, Snapshot } from "@/lib/types";

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

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [countdown, setCountdown] = useState<string>(formatCountdown(MATCH.kickoffUTC));
  const [sessionAlerts, setSessionAlerts] = useState<SessionAlert[]>([]);
  const lastDedupeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const doPoll = async () => {
      try {
        const res = await fetch("/api/snapshot", { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Snapshot = await res.json();
        if (cancelled) return;
        setSnapshot(data);

        if (data.alert.active) {
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
  }, []);

  useEffect(() => {
    const update = () => setCountdown(formatCountdown(MATCH.kickoffUTC));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const displayState = deriveDisplayState(snapshot);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-8 md:px-12">
        <HeaderSection countdown={countdown} snapshot={snapshot} />
        <FocalPointSection snapshot={snapshot} displayState={displayState} />
        <TwoColumnSection snapshot={snapshot} displayState={displayState} />
        <StatusBadges displayState={displayState} />
        <SessionAlertsSection alerts={sessionAlerts} displayState={displayState} />
      </main>
      <Footer />
    </div>
  );
}

function TopBar() {
  return (
    <header className="border-b border-outline-variant">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-4 md:px-12">
        <div className="font-serif text-2xl font-bold text-on-surface">World Cup Edge</div>
        <div className="flex items-center gap-4 text-sm text-on-surface-variant">
          <span className="font-mono">Read-only monitor</span>
        </div>
      </div>
    </header>
  );
}

function HeaderSection({
  countdown,
  snapshot,
}: {
  countdown: string;
  snapshot: Snapshot | null;
}) {
  const matchName = snapshot?.match.name ?? MATCH.matchName;
  const matchDate = snapshot?.match.date ?? MATCH.matchDate;
  const matchRules = snapshot?.match.rules ?? MATCH.rules;

  return (
    <section className="border-b border-outline-variant py-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-serif text-5xl font-bold leading-tight text-on-surface">
            {matchName}
          </h1>
          <p className="mt-2 text-lg text-on-surface-variant">
            {matchDate} · 19:00 UTC · {matchRules}
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Time to Match
          </p>
          <p className="font-mono text-xl font-bold tabular-nums text-on-surface">{countdown}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Kickoff countdown</p>
        </div>
      </div>
    </section>
  );
}

function FocalPointSection({
  snapshot,
  displayState,
}: {
  snapshot: Snapshot | null;
  displayState: DisplayState;
}) {
  if (displayState === "loading") {
    return (
      <section className="border-b border-outline-variant py-8">
        <div className="max-w-3xl">
          <div className="mb-2 h-16 w-40 animate-pulse rounded bg-surface-container-high" />
          <div className="mb-4 h-4 w-96 max-w-full animate-pulse rounded bg-surface-container-high" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded bg-surface-container" />
        </div>
      </section>
    );
  }

  const gapValue = snapshot?.gap.gapAfterFee ?? null;
  const isAlert = displayState === "alert";
  const gapColor = isAlert ? "text-alert" : "text-primary";
  const explanation = snapshot ? buildExplanation(snapshot) : "";

  return (
    <section className="border-b border-outline-variant py-8">
      <div className="max-w-3xl">
        <p className={`mb-2 font-mono text-6xl font-bold leading-tight tabular-nums ${gapColor}`}>
          {formatPp(gapValue)}
        </p>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          {isAlert ? "Consensus Gap Alert — England to win in regulation" : "Gross Consensus Gap — England to win in regulation"}
        </h2>
        <p className="max-w-2xl text-lg text-on-surface-variant">
          {explanation}
        </p>
        {isAlert && (
          <p className="mt-3 text-sm font-medium text-alert">
            <AlertTriangle className="mr-1 inline-block h-4 w-4 align-text-bottom" />
            Gap exceeds {formatPp(snapshot?.gap.threshold ?? 0.05)} threshold after fee. Not an arbitrage guarantee.
          </p>
        )}
      </div>
    </section>
  );
}

function TwoColumnSection({
  snapshot,
  displayState,
}: {
  snapshot: Snapshot | null;
  displayState: DisplayState;
}) {
  return (
    <section className="grid grid-cols-1 border-b border-outline-variant md:grid-cols-2">
      <TxlineColumn snapshot={snapshot} displayState={displayState} />
      <div className="border-t border-outline-variant md:border-t-0">
        <PolymarketColumn snapshot={snapshot} displayState={displayState} />
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
      <div className="border-b border-outline-variant py-8 pr-0 md:border-b-0 md:border-r md:pr-6">
        <div className="mb-6 h-6 w-48 animate-pulse rounded bg-surface-container-high" />
        <div className="mb-6 h-12 w-28 animate-pulse rounded bg-surface-container-high" />
        <div className="space-y-2">
          <div className="h-4 w-40 animate-pulse rounded bg-surface-container" />
          <div className="h-4 w-44 animate-pulse rounded bg-surface-container" />
          <div className="h-4 w-48 animate-pulse rounded bg-surface-container" />
          <div className="h-4 w-40 animate-pulse rounded bg-surface-container" />
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-outline-variant py-8 pr-0 md:border-b-0 md:border-r md:pr-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="font-serif text-2xl font-semibold text-on-surface">TxLINE Consensus</h3>
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            England to win (regulation time)
          </p>
        </div>
        <FreshnessIndicator
          label="TxLINE"
          fresh={fresh && !isStale}
          age={age}
          delayed={delayed}
        />
      </div>
      <div className="mb-8">
        <span className="font-mono text-5xl font-bold leading-none tabular-nums text-on-surface">
          {formatPct(probability)}
        </span>
      </div>
      <div className="space-y-2 text-sm text-on-surface-variant">
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
}: {
  snapshot: Snapshot | null;
  displayState: DisplayState;
}) {
  const bestAsk = snapshot?.polymarket.bestAsk ?? null;
  const fresh = snapshot?.polymarket.fresh ?? false;
  const age = formatAge(snapshot?.polymarket.receivedAt ?? null, snapshot?.polymarket.timestamp ?? null);
  const gapAfterFee = snapshot?.gap.gapAfterFee ?? null;
  const isStale = displayState === "stale";
  const isUnavailable = displayState === "unavailable";

  if (displayState === "loading") {
    return (
      <div className="py-8 pl-0 md:pl-6">
        <div className="mb-6 h-6 w-56 animate-pulse rounded bg-surface-container-high" />
        <div className="mb-6 h-12 w-28 animate-pulse rounded bg-surface-container-high" />
        <div className="mt-8 h-4 w-40 animate-pulse rounded bg-surface-container" />
      </div>
    );
  }

  return (
    <div className="py-8 pl-0 md:pl-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="font-serif text-2xl font-semibold text-on-surface">
            Polymarket Top-of-Book Quote
          </h3>
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            England YES · top-of-book quote
          </p>
        </div>
        <FreshnessIndicator
          label="Polymarket"
          fresh={fresh && !isStale}
          age={age}
          delayed={false}
        />
      </div>
      <div className="mb-8 flex items-baseline gap-3">
        <span className="font-mono text-5xl font-bold leading-none tabular-nums text-on-surface">
          {formatPct(bestAsk)}
        </span>
        {!isUnavailable && bestAsk !== null && (
          <span className="bg-on-surface px-2 py-1 text-xs font-bold uppercase tracking-widest text-white">
            best ask
          </span>
        )}
      </div>
      <div className="mt-8 border-t border-outline-variant pt-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Gap after fee
          </span>
          <span className="font-mono text-xl font-bold tabular-nums text-primary">
            {formatPp(gapAfterFee)}
          </span>
        </div>
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
      <span className="inline-flex items-center font-mono text-sm text-on-surface-variant">
        {fresh ? (
          <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-success" />
        ) : (
          <span className="mr-2 h-2 w-2 rounded-full bg-stale" />
        )}
        {label} · {fresh ? "live" : "stale"} · {age}
      </span>
      {delayed && (
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-stale">
          60-second delayed
        </p>
      )}
    </div>
  );
}

function CheckRow({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center">
      {passed ? (
        <CheckCircle className="mr-2 h-4 w-4 text-success" />
      ) : (
        <XCircle className="mr-2 h-4 w-4 text-error" />
      )}
      <span>{label}</span>
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

function StatusBadges({ displayState }: { displayState: DisplayState }) {
  return (
    <section className="overflow-x-auto whitespace-nowrap border-b border-outline-variant py-4">
      <div className="flex gap-6">
        {STATUS_BADGES.map(({ state, label, Icon }) => {
          const active = displayState === state;
          return (
            <div
              key={state}
              className={`flex items-center text-xs font-bold uppercase tracking-widest ${
                active
                  ? "border-b-2 border-primary pb-1 text-primary"
                  : "text-on-surface-variant opacity-50"
              }`}
            >
              <Icon className="mr-1 h-4 w-4" />
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
}: {
  alerts: SessionAlert[];
  displayState: DisplayState;
}) {
  if (displayState === "error" && alerts.length === 0) {
    return (
      <section className="border-b border-outline-variant py-8">
        <h2 className="mb-4 font-serif text-2xl font-semibold text-on-surface">Session alerts</h2>
        <div className="border border-outline-variant bg-surface-container-lowest p-6 text-center">
          <XCircle className="mx-auto mb-3 h-8 w-8 text-error" />
          <p className="text-on-surface-variant">{`Failed to reach /api/snapshot.`}</p>
          <p className="mt-1 text-sm text-on-surface-variant">Retrying automatically every {POLL_INTERVAL_MS / 1000}s.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-outline-variant py-8">
      <h2 className="mb-4 font-serif text-2xl font-semibold text-on-surface">Session alerts</h2>
      {alerts.length === 0 ? (
        <div className="border border-outline-variant bg-surface-container-lowest p-6">
          <div className="flex items-center text-on-surface-variant">
            <Circle className="mr-2 h-4 w-4" />
            <span>No alerts generated this session.</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-3 border border-outline-variant bg-surface-container-lowest p-4 md:flex-row md:items-center"
            >
              <span className="shrink-0 font-mono text-sm text-on-surface-variant">
                {new Date(entry.timestamp).toLocaleTimeString("en-US", {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                UTC
              </span>
              <span className="shrink-0 font-bold text-on-surface">{entry.match}</span>
              <span className="shrink-0 font-mono font-bold text-primary">
                {formatPp(entry.gapValue)}
              </span>
              <span className="text-on-surface-variant">{entry.explanation}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-8 border-t border-outline-variant bg-surface-container-low">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-8 md:px-12">
        <div className="text-xs font-bold uppercase tracking-widest text-on-surface mb-3">
          World Cup Edge
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-on-surface-variant mb-3">
          {DISCLAIMER_LINES.line1}
        </p>
        <p className="max-w-2xl text-sm leading-relaxed text-on-surface-variant">
          {DISCLAIMER_LINES.line2}
        </p>
      </div>
    </footer>
  );
}