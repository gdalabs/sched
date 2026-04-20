import { randomBytes } from "crypto";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function nanoid(size = 8): string {
  const bytes = randomBytes(size);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
