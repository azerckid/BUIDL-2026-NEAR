const TEST_PILOT_GUEST_STORAGE_KEY = "mydna_test_pilot_guest_identity";
const TEST_PILOT_GUEST_PATTERN = /^guest-[a-z0-9]{12}\.testnet$/;
const GUEST_TOKEN_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function isTestPilotClientEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TEST_PILOT_ENABLED === "true";
}

export function isTestPilotGuestIdentity(value: string | null | undefined): value is string {
  return typeof value === "string" && TEST_PILOT_GUEST_PATTERN.test(value);
}

export function maskTestPilotGuestIdentity(identity: string): string {
  if (!isTestPilotGuestIdentity(identity)) return "test session";
  return `${identity.slice(0, 10)}...testnet`;
}

export function getOrCreateTestPilotGuestIdentity(): string {
  if (typeof window === "undefined") {
    throw new Error("Test pilot guest identity can only be created in the browser");
  }

  const stored = window.sessionStorage.getItem(TEST_PILOT_GUEST_STORAGE_KEY);
  if (isTestPilotGuestIdentity(stored)) return stored;

  const identity = `guest-${createGuestToken()}.testnet`;
  window.sessionStorage.setItem(TEST_PILOT_GUEST_STORAGE_KEY, identity);
  return identity;
}

function createGuestToken(length = 12): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => GUEST_TOKEN_ALPHABET[byte % GUEST_TOKEN_ALPHABET.length]).join("");
}
