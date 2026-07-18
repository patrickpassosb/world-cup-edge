"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  VersionedTransaction,
  TransactionMessage,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

type Step = "idle" | "connecting" | "fetching-jwt" | "subscribing" | "activating" | "testing" | "done" | "error";

interface LogEntry {
  time: string;
  step: Step;
  message: string;
}

interface WalletHandle {
  publicKey: PublicKey;
  signAndSendTransaction: (tx: VersionedTransaction, options?: { skipPreflight?: boolean; maxRetries?: number }) => Promise<string>;
  signMessage: (message: Uint8Array, display?: string) => Promise<Uint8Array>;
  disconnect: () => Promise<void>;
}

declare global {
  interface Window {
    solana?: { isPhantom?: boolean };
    solflare?: { isSolflare?: boolean };
  }
}

const PROGRAM_ID = new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA");
const TXL_TOKEN_MINT = new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL");
const API_ORIGIN = "https://txline.txodds.com";
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY ?? "";
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const SERVICE_LEVEL_ID = 12;
const DURATION_WEEKS = 4;

function logTime(): string {
  return new Date().toLocaleTimeString();
}

function subscribeInstructionData(): Buffer {
  const data = Buffer.alloc(11);
  data.writeUInt8(254, 0);
  data.writeUInt8(28, 1);
  data.writeUInt8(191, 2);
  data.writeUInt8(138, 3);
  data.writeUInt8(156, 4);
  data.writeUInt8(179, 5);
  data.writeUInt8(183, 6);
  data.writeUInt8(53, 7);
  data.writeUInt16LE(SERVICE_LEVEL_ID, 8);
  data.writeUInt8(DURATION_WEEKS, 10);
  return data;
}

const PREVIOUS_TX_SIG = "D4xP1QRznYfMoEnAj9TVx7byjXjkg1FKj7MQ4AxCyuaEp8bot3noRygUEQeWCbfSXXY5gpbbDAxdXcGFQY9N2gg";

async function activateWithToken(
  jwt: string,
  txSig: string,
  walletSignature: string,
  addLog: (s: Step, msg: string) => void,
  setResult: (r: { jwt: string; apiToken: string }) => void,
): Promise<void> {
  addLog("activating", "Activating API token...");
  const activateRes = await fetch(`${API_ORIGIN}/api/token/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ txSig, walletSignature, leagues: [] }),
  });
  if (!activateRes.ok) {
    const body = await activateRes.text();
    throw new Error(`Activation failed: HTTP ${activateRes.status} ${body.slice(0, 300)}`);
  }
  const activateText = await activateRes.text();
  let apiToken: string;
  try {
    const activateData = JSON.parse(activateText) as { token?: string } | string;
    apiToken = typeof activateData === "string" ? activateData : (activateData.token ?? "");
  } catch {
    apiToken = activateText.trim();
  }
  if (!apiToken) throw new Error(`Activation response missing token: ${activateText.slice(0, 300)}`);
  addLog("activating", "API token received.");

  addLog("testing", "Testing fixtures endpoint...");
  const testRes = await fetch(`${API_ORIGIN}/api/fixtures/snapshot`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      "X-Api-Token": apiToken,
    },
  });
  if (!testRes.ok) {
    const body = await testRes.text();
    throw new Error(`Fixtures test failed: HTTP ${testRes.status} ${body.slice(0, 200)}`);
  }
  const fixtures = await testRes.json();
  const count = Array.isArray(fixtures) ? fixtures.length : 1;
  addLog("testing", `Fixtures test OK - ${count} fixtures retrieved.`);

  addLog("done", "Activation complete.");
  setResult({ jwt, apiToken });
}

export default function TxLineActivateClient() {
  const [step, setStep] = useState<Step>("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [result, setResult] = useState<{ jwt: string; apiToken: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [walletDetected, setWalletDetected] = useState(false);
  const [walletName, setWalletName] = useState<string>("");
  const [connectedPublicKey, setConnectedPublicKey] = useState<PublicKey | null>(null);
  const walletRef = useRef<WalletHandle | null>(null);

  const addLog = useCallback((s: Step, msg: string) => {
    setLogs((prev) => [...prev, { time: logTime(), step: s, message: msg }]);
    setStep(s);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const interval = setInterval(() => {
      const sf = window.solflare;
      const ph = window.solana;
      const detected = Boolean(sf?.isSolflare || ph?.isPhantom);
      if (detected && !walletDetected) {
        setWalletDetected(true);
        setWalletName(sf?.isSolflare ? "Solflare" : "Phantom");
      }
    }, 500);
    return () => clearInterval(interval);
  }, [walletDetected]);

  const connectWallet = useCallback(async () => {
    try {
      addLog("connecting", "Detecting wallet...");

      if (window.solflare?.isSolflare) {
        addLog("connecting", "Solflare detected. Loading SDK...");
        const SolflareModule = (await import("@solflare-wallet/sdk")).default;
        const solflareWallet = new SolflareModule({ network: "mainnet-beta" });

        addLog("connecting", "Requesting Solflare connection...");
        await solflareWallet.connect();

        if (!solflareWallet.publicKey) {
          throw new Error("Solflare connected but publicKey is null.");
        }

        const pk = solflareWallet.publicKey;
        walletRef.current = {
          publicKey: pk,
          signAndSendTransaction: async (tx, options) => {
            const sig = await solflareWallet.signAndSendTransaction(tx, options);
            return typeof sig === "string" ? sig : (sig as { signature: string }).signature;
          },
          signMessage: async (message, display) => {
            const result = await solflareWallet.signMessage(message, (display ?? "utf8") as "utf8" | "hex");
            return result instanceof Uint8Array ? result : (result as { signature: Uint8Array }).signature;
          },
          disconnect: async () => { await solflareWallet.disconnect(); },
        };

        setWalletConnected(true);
        setWalletAddress(pk.toBase58());
        setConnectedPublicKey(pk);
        addLog("connecting", `Connected: ${pk.toBase58()}`);
        setStep("idle");
        return;
      }

      if (window.solana?.isPhantom) {
        addLog("connecting", "Phantom detected. Connecting...");
        const provider = window.solana as unknown as {
          connect: () => Promise<{ publicKey: PublicKey }>;
          signAndSendTransaction: (tx: VersionedTransaction, options?: { skipPreflight?: boolean; maxRetries?: number }) => Promise<{ signature: string }>;
          signMessage: (message: Uint8Array, display?: string) => Promise<{ signature: Uint8Array }>;
          disconnect: () => Promise<void>;
        };
        const res = await provider.connect();

        walletRef.current = {
          publicKey: res.publicKey,
          signAndSendTransaction: async (tx, options) => {
            const result = await provider.signAndSendTransaction(tx, options);
            return result.signature;
          },
          signMessage: async (message, display) => {
            const result = await provider.signMessage(message, display ?? "utf8");
            return result.signature;
          },
          disconnect: async () => { await provider.disconnect(); },
        };

        setWalletConnected(true);
        setWalletAddress(res.publicKey.toBase58());
        setConnectedPublicKey(res.publicKey);
        addLog("connecting", `Connected: ${res.publicKey.toBase58()}`);
        setStep("idle");
        return;
      }

      setErrorMsg("No Solana wallet detected. Install Solflare or Phantom.");
      setStep("error");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
      addLog("error", msg);
      setStep("error");
    }
  }, [addLog]);

  const runActivation = useCallback(async () => {
    const wallet = walletRef.current;
    if (!wallet || !connectedPublicKey) {
      setErrorMsg("Connect your wallet first.");
      setStep("error");
      return;
    }

    setErrorMsg(null);
    setResult(null);
    setLogs([]);

    const payer = connectedPublicKey;
    const connection = new Connection(RPC_URL, "confirmed");
    let jwt = "";

    try {
      const balance = await connection.getBalance(payer);
      addLog("connecting", `Wallet balance: ${(balance / 1e9).toFixed(6)} SOL`);
      if (balance < 0.001 * 1e9) {
        throw new Error(`Insufficient SOL: ${(balance / 1e9).toFixed(6)}. Need at least 0.005 SOL.`);
      }

      addLog("fetching-jwt", "Requesting guest JWT from TxLINE...");
      const jwtRes = await fetch(`${API_ORIGIN}/auth/guest/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!jwtRes.ok) throw new Error(`Guest JWT failed: HTTP ${jwtRes.status}`);
      const jwtData = await jwtRes.json() as { token: string };
      jwt = jwtData.token;
      if (!jwt) throw new Error("Guest JWT response missing 'token'");
      addLog("fetching-jwt", "JWT received.");

      const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("token_treasury_v2")],
        PROGRAM_ID,
      );
      const tokenTreasuryVault = getAssociatedTokenAddressSync(
        TXL_TOKEN_MINT,
        tokenTreasuryPda,
        true,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );
      const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pricing_matrix")],
        PROGRAM_ID,
      );
      const userTokenAccount = getAssociatedTokenAddressSync(
        TXL_TOKEN_MINT,
        payer,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

      addLog("subscribing", "Building subscribe(12, 4) transaction...");
      const subscribeIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: payer, isSigner: true, isWritable: true },
          { pubkey: pricingMatrixPda, isSigner: false, isWritable: false },
          { pubkey: TXL_TOKEN_MINT, isSigner: false, isWritable: false },
          { pubkey: userTokenAccount, isSigner: false, isWritable: true },
          { pubkey: tokenTreasuryVault, isSigner: false, isWritable: true },
          { pubkey: tokenTreasuryPda, isSigner: false, isWritable: false },
          { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        data: subscribeInstructionData(),
      });

      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      const instructions: TransactionInstruction[] = [];

      const userTokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
      if (!userTokenAccountInfo) {
        addLog("subscribing", "Creating TxL token account (first time setup)...");
        instructions.push(
          createAssociatedTokenAccountIdempotentInstruction(
            payer,
            userTokenAccount,
            payer,
            TXL_TOKEN_MINT,
            TOKEN_2022_PROGRAM_ID,
          ),
        );
      } else {
        addLog("subscribing", "TxL token account exists.");
      }
      instructions.push(subscribeIx);
      instructions.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));

      const messageV0 = new TransactionMessage({
        payerKey: payer,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      const tx = new VersionedTransaction(messageV0);

      addLog("subscribing", "Simulating transaction...");
      try {
        const simulation = await connection.simulateTransaction(tx, { replaceRecentBlockhash: true });
        if (simulation.value.err) {
          const simLogs = simulation.value.logs || [];
          throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}\n${simLogs.slice(-5).join("\n")}`);
        }
        addLog("subscribing", "Simulation OK.");
      } catch (simErr) {
        const simMsg = simErr instanceof Error ? simErr.message : String(simErr);
        if (simMsg.includes("Simulation failed")) throw simErr;
        addLog("subscribing", `Simulation note: ${simMsg}`);
      }

      addLog("subscribing", "Please approve the transaction in your wallet...");
      let sig: string;
      try {
        sig = await wallet.signAndSendTransaction(tx, { skipPreflight: false, maxRetries: 3 });
        addLog("subscribing", `Tx submitted: ${sig}`);
      } catch (signErr) {
        const signMsg = signErr instanceof Error ? signErr.message : String(signErr);
        if (signMsg.toLowerCase().includes("rejected") || signMsg.toLowerCase().includes("user rejected")) {
          throw new Error("You rejected the transaction.");
        }
        if (signMsg.includes("ActiveSubscription") || signMsg.includes("6016") || signMsg.includes("already")) {
          addLog("subscribing", "Already subscribed (previous activation). Using last known txSig.");
          throw new Error("ALREADY_SUBSCRIBED");
        }
        throw new Error(`Signing failed: ${signMsg}`);
      }

      addLog("subscribing", "Confirming transaction...");
      await connection.confirmTransaction(sig, "confirmed");
      addLog("subscribing", "Transaction confirmed on-chain.");
      const txSig = sig;

      addLog("activating", "Signing activation message...");
      const messageString = `${txSig}::${jwt}`;
      const message = new TextEncoder().encode(messageString);
      const signature = await wallet.signMessage(message, "utf8");
      const walletSignature = Buffer.from(signature).toString("base64");
      addLog("activating", "Message signed.");

      await activateWithToken(jwt, txSig, walletSignature, addLog, setResult);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);

      if (msg === "ALREADY_SUBSCRIBED") {
        addLog("activating", "Using previous transaction signature for activation...");
        const txSig = PREVIOUS_TX_SIG;
        addLog("activating", "Signing activation message with previous txSig...");
        const messageString = `${txSig}::${jwt}`;
        const message = new TextEncoder().encode(messageString);
        const signature = await wallet.signMessage(message, "utf8");
        const walletSignature = Buffer.from(signature).toString("base64");
        addLog("activating", "Message signed.");
        await activateWithToken(jwt, txSig, walletSignature, addLog, setResult);
        return;
      }

      const stack = e instanceof Error ? e.stack : "";
      setErrorMsg(msg);
      addLog("error", `${msg}${stack ? `\n${stack.split("\n").slice(0, 5).join("\n")}` : ""}`);
      console.error("Activation error:", e);
    }
  }, [addLog, connectedPublicKey]);

  return (
    <div style={{
      maxWidth: 880,
      margin: "0 auto",
      padding: "32px 24px",
      fontFamily: "Inter, system-ui, sans-serif",
      background: "#faf7f2",
      color: "#1f1f1f",
      minHeight: "100vh",
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>
        TxLINE Activation
      </h1>
      <p style={{ color: "#444748", marginTop: 0, marginBottom: 24, fontSize: 14 }}>
        Service level 12 (real-time World Cup) · 4 weeks · Mainnet
      </p>

      {!walletConnected ? (
        <>
          {!walletDetected && (
            <p style={{ color: "#ba1a1a", fontSize: 14, marginBottom: 16 }}>
              No Solana wallet detected. Install{" "}
              <a href="https://solflare.com/download" target="_blank" rel="noreferrer">Solflare</a>{" "}
              or{" "}
              <a href="https://phantom.app" target="_blank" rel="noreferrer">Phantom</a>.
            </p>
          )}
          <button
            onClick={connectWallet}
            disabled={!walletDetected}
            style={{ ...btnPrimary, opacity: walletDetected ? 1 : 0.5, cursor: walletDetected ? "pointer" : "not-allowed" }}
          >
            Connect {walletName || "Wallet"}
          </button>
        </>
      ) : (
        <>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#444748", marginBottom: 4 }}>
              Connected wallet
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, wordBreak: "break-all" }}>
              {walletAddress}
            </div>
          </div>

          {step !== "done" && step !== "error" && (
            <button
              onClick={runActivation}
              disabled={step !== "idle"}
              style={{
                ...btnPrimary,
                opacity: step !== "idle" ? 0.5 : 1,
                cursor: step !== "idle" ? "not-allowed" : "pointer",
              }}
            >
              {step === "idle" ? "Activate TxLINE" : `Working: ${step}...`}
            </button>
          )}

          {step === "error" && (
            <div style={{ ...card, ...cardError, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Activation failed</div>
              <div style={{ fontSize: 13, wordBreak: "break-word" }}>{errorMsg}</div>
              <button onClick={() => { setStep("idle"); setErrorMsg(null); }} style={{ ...btnPrimary, marginTop: 12 }}>
                Retry
              </button>
            </div>
          )}

          {result && (
            <div style={{ ...card, ...cardSuccess, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>
                Activation complete — copy these to .env.local
              </div>
              <pre style={{
                background: "#fff",
                padding: 12,
                borderRadius: 4,
                fontSize: 12,
                fontFamily: "JetBrains Mono, monospace",
                overflowX: "auto",
                border: "1px solid #e5e7eb",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}>{`TXLINE_JWT=${result.jwt}
TXLINE_API_TOKEN=${result.apiToken}
TXLINE_NETWORK=mainnet`}</pre>
              <p style={{ fontSize: 12, color: "#444748", marginTop: 12, marginBottom: 0 }}>
                Save the above into <code>.env.local</code> at the project root, then run
                <code> DATA_SOURCE=real npm run dev</code>.
              </p>
            </div>
          )}
        </>
      )}

      {logs.length > 0 && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontSize: 12, color: "#444748", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Log
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, lineHeight: 1.6 }}>
            {logs.map((l, i) => (
              <div key={i}>
                <span style={{ color: "#888" }}>{l.time}</span>{" "}
                <span style={{ color: "#1e40af" }}>[{l.step}]</span>{" "}
                <span>{l.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, fontSize: 12, color: "#666", lineHeight: 1.5 }}>
        <p style={{ margin: 0 }}>
          Uses the Solflare SDK (or Phantom) to sign the on-chain subscribe transaction and the activation message.
          No key export, no SOL transfer to a new wallet.
        </p>
        <p style={{ margin: "8px 0 0" }}>
          Cost: ~0.005 SOL (ATA rent + tx fee) from your connected wallet.
        </p>
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: "#1e40af",
  color: "#fff",
  border: "none",
  padding: "12px 24px",
  borderRadius: 4,
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 4,
  padding: 16,
};

const cardError: React.CSSProperties = {
  borderColor: "#ba1a1a",
  background: "#fef2f2",
};

const cardSuccess: React.CSSProperties = {
  borderColor: "#15803d",
  background: "#f0fdf4",
};