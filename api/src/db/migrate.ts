import 'dotenv/config';
import { initDb, pool } from './index';
initDb().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
