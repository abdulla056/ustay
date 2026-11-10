import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(env.DATABASE_URL);

export const db = drizzle(client, { schema });

/** A database handle or an open transaction. Repositories take it last, defaulting to `db`. */
export type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
