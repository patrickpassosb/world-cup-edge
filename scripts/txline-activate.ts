import * as anchor from "@coral-xyz/anchor";
import idlJson from "../idl/txoracle.json";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import nacl from "tweetnacl";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const NETWORK = (process.env.TXLINE_NETWORK ?? "mainnet") as "mainnet" | "devnet";

const CONFIG = {
  mainnet: {
    rpcUrl: process.env.NEXT_PUBLIC_HELIUS_API_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
      : "https://api.mainnet-beta.solana.com",
    apiOrigin: "https://txline.txodds.com",
    programId: new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA"),
    txlTokenMint: new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL"),
  },
  devnet: {
    rpcUrl: "https://api.devnet.solana.com",
    apiOrigin: "https://txline-dev.txodds.com",
    programId: new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
    txlTokenMint: new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
  },
} as const;

const SERVICE_LEVEL_ID = 12;
const DURATION_WEEKS = 4;
const SELECTED_LEAGUES: number[] = [];

function log(label: string, value: unknown): void {
  console.log(`[${label}]`, typeof value === "string" ? value : JSON.stringify(value));
}

async function getGuestJwt(apiOrigin: string): Promise<string> {
  log("guest-jwt", `POST ${apiOrigin}/auth/guest/start`);
  const res = await fetch(`${apiOrigin}/auth/guest/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Guest JWT failed: HTTP ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { token: string };
  if (!data.token) {
    throw new Error("Guest JWT response missing 'token' field");
  }
  log("guest-jwt", "OK (token received)");
  return data.token;
}

async function checkBalance(
  connection: Connection,
  pubkey: PublicKey,
): Promise<number> {
  const lamports = await connection.getBalance(pubkey);
  return lamports / LAMPORTS_PER_SOL;
}

async function subscribeOnChain(
  connection: Connection,
  payer: Keypair,
  program: {
    programId: PublicKey;
    methods: {
      subscribe: (
        serviceLevelId: number,
        weeks: number,
      ) => {
        accounts: (accounts: Record<string, PublicKey>) => {
          rpc: () => Promise<string>;
        };
      };
    };
  },
  txlTokenMint: PublicKey,
): Promise<string> {
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    program.programId,
  );

  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    txlTokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    program.programId,
  );

  const userTokenAccount = getAssociatedTokenAddressSync(
    txlTokenMint,
    payer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  log("subscribe", `calling subscribe(${SERVICE_LEVEL_ID}, ${DURATION_WEEKS}) on-chain...`);

  const txSig = await program.methods
    .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
    .accounts({
      user: payer.publicKey,
      pricingMatrix: pricingMatrixPda,
      tokenMint: txlTokenMint,
      userTokenAccount,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  log("subscribe", `tx submitted: ${txSig}`);
  await connection.confirmTransaction(txSig, "confirmed");
  log("subscribe", "tx confirmed");
  return txSig;
}

async function activateApiToken(
  apiOrigin: string,
  jwt: string,
  txSig: string,
  payer: Keypair,
): Promise<string> {
  const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
  const message = new TextEncoder().encode(messageString);
  log("activate", `signing message: ${txSig}::${jwt.substring(0, 20)}...`);

  const signatureBytes = nacl.sign.detached(message, payer.secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString("base64");

  log("activate", `POST ${apiOrigin}/api/token/activate`);
  const res = await fetch(`${apiOrigin}/api/token/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      txSig,
      walletSignature,
      leagues: SELECTED_LEAGUES,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Activation failed: HTTP ${res.status} ${body}`);
  }

  const data = (await res.json()) as { token?: string } | string;
  const apiToken =
    typeof data === "string" ? data : data.token ?? (data as { token: string }).token;

  if (!apiToken) {
    throw new Error(`Activation response missing token: ${JSON.stringify(data)}`);
  }

  log("activate", "OK (API token received)");
  return apiToken;
}

async function testFixtures(
  apiOrigin: string,
  jwt: string,
  apiToken: string,
): Promise<void> {
  log("test", `GET ${apiOrigin}/api/fixtures/snapshot`);
  const res = await fetch(`${apiOrigin}/api/fixtures/snapshot`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      "X-Api-Token": apiToken,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Fixtures test failed: HTTP ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const count = Array.isArray(data) ? data.length : 1;
  log("test", `OK - ${count} fixtures retrieved`);
}

function writeEnvFile(jwt: string, apiToken: string, network: string): void {
  const envPath = join(process.cwd(), ".env.local");
  const lines = [
    `TXLINE_JWT=${jwt}`,
    `TXLINE_API_TOKEN=${apiToken}`,
    `TXLINE_NETWORK=${network}`,
    "",
  ];

  if (existsSync(envPath)) {
    const existing = readFileSync(envPath, "utf8");
    const filtered = existing
      .split("\n")
      .filter(
        (line) =>
          !line.startsWith("TXLINE_JWT=") &&
          !line.startsWith("TXLINE_API_TOKEN=") &&
          !line.startsWith("TXLINE_NETWORK="),
      )
      .join("\n")
      .replace(/\n+$/, "\n");
    writeFileSync(envPath, filtered + lines.join("\n"));
  } else {
    writeFileSync(envPath, lines.join("\n"));
  }

  log("env", `.env.local updated with TXLINE_JWT, TXLINE_API_TOKEN, TXLINE_NETWORK`);
}

async function main(): Promise<void> {
  console.log("=== TxLINE Activation ===");
  console.log(`Network: ${NETWORK}`);
  console.log(`Service level: ${SERVICE_LEVEL_ID} (real-time World Cup)`);
  console.log(`Duration: ${DURATION_WEEKS} weeks`);
  console.log("");

  const keypairPath = join(process.cwd(), "keypair.json");
  if (!existsSync(keypairPath)) {
    console.error("ERROR: keypair.json not found.");
    console.error("Create one with: node -e \"const k=require('@solana/web3.js').Keypair.generate();require('fs').writeFileSync('keypair.json',JSON.stringify(Array.from(k.secretKey)));console.log('Address:',k.publicKey.toBase58())\"");
    process.exit(1);
  }

  const secretKey = Uint8Array.from(JSON.parse(readFileSync(keypairPath, "utf8")) as number[]);
  const payer = Keypair.fromSecretKey(secretKey);
  log("wallet", `Address: ${payer.publicKey.toBase58()}`);

  const { rpcUrl, apiOrigin, programId, txlTokenMint } = CONFIG[NETWORK];
  const connection = new Connection(rpcUrl, "confirmed");

  const balance = await checkBalance(connection, payer.publicKey);
  log("balance", `${balance.toFixed(6)} SOL`);
  if (balance < 0.01) {
    console.error(`ERROR: Wallet has only ${balance.toFixed(6)} SOL.`);
    console.error(`Send at least 0.05 SOL to ${payer.publicKey.toBase58()} and re-run.`);
    process.exit(1);
  }

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(payer),
    { commitment: "confirmed" },
  );
  anchor.setProvider(provider);

  const program = new anchor.Program(idlJson as anchor.Idl, provider) as unknown as {
    programId: PublicKey;
    methods: {
      subscribe: (
        serviceLevelId: number,
        weeks: number,
      ) => {
        accounts: (accounts: Record<string, PublicKey>) => {
          rpc: () => Promise<string>;
        };
      };
    };
  };
  if (!program.programId.equals(programId)) {
    throw new Error(
      `IDL program ${program.programId.toBase58()} does not match ${NETWORK} program ${programId.toBase58()}`,
    );
  }
  log("program", `Loaded: ${program.programId.toBase58()}`);

  const jwt = await getGuestJwt(apiOrigin);
  const txSig = await subscribeOnChain(connection, payer, program, txlTokenMint);
  const apiToken = await activateApiToken(apiOrigin, jwt, txSig, payer);

  await testFixtures(apiOrigin, jwt, apiToken);
  writeEnvFile(jwt, apiToken, NETWORK);

  console.log("");
  console.log("=== Activation Complete ===");
  console.log("Credentials written to .env.local");
  console.log("You can now run: DATA_SOURCE=txline npm run dev");
}

main().catch((err) => {
  console.error("");
  console.error("=== ACTIVATION FAILED ===");
  console.error(err instanceof Error ? err.message : String(err));
  if (err instanceof Error && err.stack) {
    console.error("");
    console.error(err.stack);
  }
  process.exit(1);
});