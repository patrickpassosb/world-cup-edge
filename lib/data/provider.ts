import type { Snapshot } from "@/lib/types";

export interface DataProvider {
  getSnapshot(): Promise<Snapshot>;
}