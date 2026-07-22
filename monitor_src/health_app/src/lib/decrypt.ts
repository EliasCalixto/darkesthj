import type { Envelope } from "./gateTypes";

// Descifrado en el navegador con WebCrypto. Reproduce el sobre generado en
// build (PBKDF2-SHA256 -> AES-256-GCM), idéntico al de Finance. Solo se usa
// desde el cliente.

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

// Lanza si la passphrase es incorrecta (AES-GCM falla la verificación del tag).
export async function decryptEnvelope<T>(
  envelope: Envelope,
  passphrase: string,
): Promise<T> {
  const salt = b64ToBytes(envelope.salt);
  const iv = b64ToBytes(envelope.iv);
  const ct = b64ToBytes(envelope.ct);
  const key = await deriveKey(passphrase, salt, envelope.iters);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ct,
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
