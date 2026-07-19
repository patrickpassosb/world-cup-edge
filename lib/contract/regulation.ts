const REGULATION_1X2_TYPES = [
  "1x2",
  "participant_result",
  "3way",
  "match result",
  "moneyline",
  "full time result",
  "ft result",
];

const REGULATION_PERIODS = [
  "regulation",
  "full time",
  "fulltime",
  "ft",
  "90",
  "regular",
];

const EXCLUDED_PERIOD_FRAGMENTS = [
  "half=",
  "half time",
  "halftime",
  "first half",
  "second half",
  "extra time",
  "extra_time",
  "overtime",
  "after penalties",
  "penalties",
  "qualification",
  "qualify",
  "to advance",
  "advance",
];

export function isRegulationTime1X2(
  marketType: string | null,
  marketPeriod: string | null,
): boolean {
  if (marketType === null) return false;
  const mt = marketType.toLowerCase();
  if (!REGULATION_1X2_TYPES.some((t) => mt.includes(t))) return false;

  if (marketPeriod === null || marketPeriod === undefined || marketPeriod === "") {
    return mt.includes("participant_result");
  }

  const mp = marketPeriod.toLowerCase();
  if (EXCLUDED_PERIOD_FRAGMENTS.some((frag) => mp.includes(frag))) return false;
  return REGULATION_PERIODS.some((p) => mp.includes(p)) || mp === "";
}