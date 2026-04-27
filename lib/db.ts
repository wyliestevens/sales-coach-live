import { neon } from '@neondatabase/serverless';

export function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return sql;
}

export async function initializeDatabase() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS calls (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      started_at TIMESTAMP NOT NULL,
      duration INTEGER NOT NULL,
      talk_ratio_you INTEGER,
      talk_ratio_prospect INTEGER,
      filler_words INTEGER DEFAULT 0,
      transcript JSONB,
      coaching_log JSONB,
      sentiment_journey JSONB,
      objections JSONB,
      buying_signals JSONB,
      audio_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}
