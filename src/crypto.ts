// Client-side End-to-End Encryption (E2EE) using Web Crypto API AES-GCM-256

const PBKDF2_SALT = "harmony-notes-e2ee-salt-key-salt"; // Stable salt for key derivation
const ITERATIONS = 100000;

/**
 * Derives an AES-GCM-256 cryptographic key from a master passphrase.
 */
export async function deriveEncryptionKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(PBKDF2_SALT),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false, // key is not exportable for safety
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a string using AES-GCM-256.
 * Returns Base64 strings for both the ciphertext and the random IV.
 */
export async function encryptText(text: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // AES-GCM standard 12-byte IV

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    enc.encode(text)
  );

  // Convert Uint8Arrays to Base64 strings for JSON-safe storage/sync
  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  return {
    encrypted: encryptedBase64,
    iv: ivBase64,
  };
}

/**
 * Decrypts a Base64 encoded AES-GCM ciphertext using the given key and Base64 IV.
 */
export async function decryptText(encryptedBase64: string, ivBase64: string, key: CryptoKey): Promise<string> {
  try {
    const dec = new TextDecoder();

    // Decode Base64 back to Uint8Arrays
    const encryptedBytes = new Uint8Array(
      atob(encryptedBase64)
        .split("")
        .map((char) => char.charCodeAt(0))
    );
    const ivBytes = new Uint8Array(
      atob(ivBase64)
        .split("")
        .map((char) => char.charCodeAt(0))
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBytes,
      },
      key,
      encryptedBytes
    );

    return dec.decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed. Check key authenticity.", error);
    throw new Error("Decryption failed. Invalid security phrase.");
  }
}
