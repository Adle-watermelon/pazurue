import pkg from "pg";
import 'dotenv/config';
const { Pool } = pkg;

export const pool = new Pool({
  host: process.env.HOST,
  port: 5432,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE
});
