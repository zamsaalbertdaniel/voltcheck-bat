/**
 * VoltCheck — AES-256-GCM Encryption Helpers
 * Uses Web Crypto API (available in browsers + React Native Hermes)
 *
 * Key derivation: PBKDF2 with 100k iterations
 * Encryption: AES-256-GCM with random 12-byte IV
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface EncryptedPayload {
    ciphertext: string;  // base64
    iv: string;          // base64
    tag: string;         // included in ciphertext by Web Crypto (GCM appends tag)
    algorithm: 'AES-256-GCM';
    salt: string;        // base64, for key derivation
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Derive a CryptoKey from a passphrase using PBKDF2
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100_000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Encrypts a string payload using AES-256-GCM
 *
 * @param plaintext - The text to encrypt
 * @param key - Passphrase for key derivation
 * @returns Encrypted payload with base64-encoded fields
 */
export async function encrypt(plaintext: string, key: string): Promise<EncryptedPayload> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const salt = crypto.getRandomValues(new Uint8Array(16));

    const cryptoKey = await deriveKey(key, salt);

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encoder.encode(plaintext)
    );

    return {
        ciphertext: bufferToBase64(encrypted),
        iv: bufferToBase64(iv.buffer),
        tag: 'included',  // GCM appends authentication tag to ciphertext
        algorithm: 'AES-256-GCM',
        salt: bufferToBase64(salt.buffer),
    };
}

/**
 * Decrypts an AES-256-GCM encrypted payload
 *
 * @param payload - The encrypted payload from encrypt()
 * @param key - Same passphrase used for encryption
 * @returns Decrypted plaintext string
 */
export async function decrypt(payload: EncryptedPayload, key: string): Promise<string> {
    const iv = new Uint8Array(base64ToBuffer(payload.iv));
    const salt = new Uint8Array(base64ToBuffer(payload.salt));
    const ciphertext = base64ToBuffer(payload.ciphertext);

    const cryptoKey = await deriveKey(key, salt);

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}
