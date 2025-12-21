import pkg from "pg";
import "dotenv/config";
const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
    || "postgresql://pazurue:pazurue@localhost:5432/pazurue",

  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
});
