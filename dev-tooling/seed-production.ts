import { pool } from "../src/db";
import { seedDatabase } from "../src/db/seed";

async function main() {
  try {
    await seedDatabase();
  } finally {
    await pool.end();
  }
}

void main();
