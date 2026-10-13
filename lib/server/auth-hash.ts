import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split("$")
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false
  const expected = Buffer.from(keyHex, "hex")
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
