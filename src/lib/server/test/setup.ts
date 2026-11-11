/**
 * Per-test setup for the `db` project (UST-41): every test starts on empty tables.
 * See `truncateAll` in `./db.ts` for why this is truncation rather than rollback.
 */
import { beforeEach } from 'vitest';
import { truncateAll } from './db';

beforeEach(truncateAll);
