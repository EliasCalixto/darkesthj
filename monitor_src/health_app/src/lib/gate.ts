import crypto from "node:crypto";
import type { Envelope, Gate } from "./gateTypes";

// PBKDF2 iterations — debe coincidir con Finance y con el descifrado en el
// navegador (scripts/sync_finance_notion.py usa 600_000).
const ITERATIONS = 600_000;

// Envuelve el payload en un sobre AES-256-GCM cifrado con la passphrase de
// build (secret DATA_PASSPHRASE, el MISMO que Finance). Si no hay passphrase
// configurada, los datos se envían en claro (passphrase opcional).
//
// Se ejecuta en el build/export (Server Component), así que la passphrase nunca
// llega al bundle del cliente: solo viaja el sobre cifrado.
export function buildGate<T>(payload: T): Gate<T> {
  const passphrase = (process.env.DATA_PASSPHRASE ?? "").trim();
  if (!passphrase) {
    return { encrypted: false, payload };
  }

  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, 32, "sha256");

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const envelope: Envelope = {
    v: 1,
    kdf: "pbkdf2-sha256",
    iters: ITERATIONS,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    ct: Buffer.concat([ciphertext, tag]).toString("base64"),
  };
  return { encrypted: true, envelope };
}
