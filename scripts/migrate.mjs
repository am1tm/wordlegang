// Usage: node --env-file=.env.local scripts/migrate.mjs
import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
await pool.end();
console.log("Schema applied.");
