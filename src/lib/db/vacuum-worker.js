const path = require('path');

let Database;
try {
  Database = require('better-sqlite3');
} catch {
  Database = require(path.resolve(process.cwd(), 'node_modules', 'better-sqlite3'));
}

const [sourceDbPath, destPath] = process.argv.slice(2);

try {
  if (!sourceDbPath || !destPath) {
    throw new Error('Missing sourceDbPath or destPath arguments for backup worker');
  }

  const db = new Database(sourceDbPath, { readonly: true, timeout: 30000 });
  db.pragma('busy_timeout = 30000');
  db.pragma('cache_size = -64000');
  db.prepare('VACUUM INTO ?').run(destPath);
  db.close();

  if (process.send) {
    process.send({ success: true });
  }
  process.exit(0);
} catch (err) {
  console.error('[VacuumWorker] Error:', err);
  if (process.send) {
    process.send({ success: false, error: err?.message || 'Database snapshot creation failed' });
  }
  process.exit(1);
}
