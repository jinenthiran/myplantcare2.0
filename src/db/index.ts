import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
  var _schemaReadyPromise: Promise<void> | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });

export async function ensureDatabaseSchema(): Promise<void> {
  if (!global._schemaReadyPromise) {
    global._schemaReadyPromise = (async () => {
      try {
        await pool.query(`
          UPDATE users u
          SET demo_seeded = TRUE
          WHERE demo_seeded = FALSE
            AND (
              EXISTS (SELECT 1 FROM user_plants p WHERE p.user_uid = u.uid)
              OR EXISTS (SELECT 1 FROM plant_diagnoses d WHERE d.user_uid = u.uid)
              OR EXISTS (SELECT 1 FROM ai_tool_runs r WHERE r.user_uid = u.uid)
            );
        `);
      } catch (error) {
        console.warn('Workspace seed flag check skipped:', error instanceof Error ? error.message : error);
        global._schemaReadyPromise = undefined;
      }
    })();
  }
  return global._schemaReadyPromise;
}
