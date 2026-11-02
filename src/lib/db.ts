import { Pool } from "pg";

const globalForDb = globalThis as unknown as { ticketiaPool?: Pool };

export const db = globalForDb.ticketiaPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3000,
});

if (process.env.NODE_ENV !== "production") globalForDb.ticketiaPool = db;
