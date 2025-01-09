import { NextResponse } from 'next/server';
import { Pool } from 'pg';
const pool = new Pool({
  connectionString:"postgresql://neondb_owner:3Bj7PeDgvQdU@ep-morning-dream-a51muxnt.us-east-2.aws.neon.tech/Data?sslmode=require",
  ssl: {
    rejectUnauthorized: false
  }
});
export async function GET() {
  try {
    const client = await pool.connect();
    try {
      // Fetch 3 random questions from the database
      const result = await client.query(
        'SELECT question_text FROM questions ORDER BY RANDOM() LIMIT 3'
      );
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}
