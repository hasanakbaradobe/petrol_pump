import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.run('DROP TABLE IF EXISTS users_backup;');
  db.run('DROP TABLE IF EXISTS fuels_backup;');
  db.run('DROP TABLE IF EXISTS parties_backup;');
  db.run('DROP TABLE IF EXISTS sales_backup;');
  db.run('DROP TABLE IF EXISTS ledger_backup;');
  db.run('DROP TABLE IF EXISTS inventory_history_backup;');
});

db.close((err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Backup tables dropped.');
});
