import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;
const MAX_BCRYPT_PASSWORD_BYTES = 72;

export function isPasswordLengthAllowed(password: string): boolean {
  return new TextEncoder().encode(password).byteLength <= MAX_BCRYPT_PASSWORD_BYTES;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
