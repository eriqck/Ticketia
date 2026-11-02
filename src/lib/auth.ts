import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export type AccountType = "organizer";

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createUser(input: { fullName: string; email: string; password: string }) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const passwordHash = await bcrypt.hash(input.password, 12);
  const result = await db.query<{ id: string; full_name: string; email: string; account_type: AccountType }>(
    `INSERT INTO users (full_name, email, password_hash, account_type)
     VALUES ($1, LOWER($2), $3, $4)
     RETURNING id, full_name, email, account_type`,
    [input.fullName, input.email, passwordHash, "organizer"],
  );
  return result.rows[0];
}

export async function authenticateUser(email: string, password: string) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const result = await db.query<{ id: string; full_name: string; email: string; account_type: AccountType; password_hash: string }>(
    "SELECT id, full_name, email, account_type, password_hash FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
    [email],
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return null;
  return user;
}

export async function createSession(userId: string) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const token = randomBytes(32).toString("base64url");
  await db.query(
    `INSERT INTO sessions (user_id, session_token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [userId, hashSessionToken(token)],
  );
  return token;
}
