// チェックポイントを2時間前に更新
const Database = require('better-sqlite3');
const os = require('os');
const path = require('path');

const dbPath = path.join(os.homedir(), '.m365-update', 'm365-roadmap.db');
const db = new Database(dbPath);

db.prepare(`UPDATE sync_checkpoint SET last_sync = datetime('now', '-2 hours') WHERE id = 1`).run();
console.log('Checkpoint updated to 2 hours ago');

const result = db.prepare('SELECT last_sync FROM sync_checkpoint WHERE id = 1').get();
console.log('New last_sync:', result.last_sync);

db.close();
