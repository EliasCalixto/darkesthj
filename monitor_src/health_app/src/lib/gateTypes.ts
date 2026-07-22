import type { FoodEntry } from "./types";

// Sobre cifrado (AES-256-GCM con clave derivada por PBKDF2-SHA256). Mismo
// formato exacto que usa Finance (scripts/sync_finance_notion.py), para que la
// MISMA passphrase (secret DATA_PASSPHRASE) desbloquee ambos paneles.
// `ct` es base64 de (ciphertext ++ tag GCM).
export type Envelope = {
  v: 1;
  kdf: "pbkdf2-sha256";
  iters: number;
  salt: string; // base64
  iv: string; // base64
  ct: string; // base64
};

// Datos sensibles que viajan dentro del sobre cifrado.
export type FoodPayload = {
  food: FoodEntry[];
};

// Los datos llegan al cliente cifrados (si DATA_PASSPHRASE está configurada en
// el build) o en claro (si no). Es la "opción" de requerir passphrase.
export type Gate<T> =
  | { encrypted: false; payload: T }
  | { encrypted: true; envelope: Envelope };
