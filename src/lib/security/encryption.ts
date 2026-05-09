import crypto from "crypto";
import { getServerEnv } from "@/lib/env";

function getKey() {
  const env = getServerEnv();
  if (!env.GOOGLE_TOKEN_ENCRYPTION_KEY) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is required for Google token encryption.");
  }
  return crypto.createHash("sha256").update(env.GOOGLE_TOKEN_ENCRYPTION_KEY).digest();
}

export function encryptSecret(plainText: string) {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(cipherText: string) {
  const raw = Buffer.from(cipherText, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
