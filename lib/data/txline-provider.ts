import type { Snapshot } from "@/lib/types";

export class TxLineDataProvider {
  async getSnapshot(): Promise<Snapshot> {
    throw new Error(
      "TxLINE not activated. Set TXLINE_JWT and TXLINE_API_TOKEN in .env.local",
    );
  }
}