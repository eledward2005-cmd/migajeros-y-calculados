// Crea las tablas de la base de datos.
//   SQLite (por defecto): crea data/migajeros.db
//   SQL Server (DB_DRIVER=mssql en .env): crea la base y las tablas con database/schema.sqlserver.sql
const path = require('node:path');
const fs = require('node:fs');

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

(async () => {
  const driver = (process.env.DB_DRIVER || 'sqlite').toLowerCase();
  if (driver === 'mssql' || driver === 'sqlserver') {
    const { initMssqlSchema } = require('../src/db/mssql');
    await initMssqlSchema();
    console.log(`SQL Server listo: base de datos ${process.env.DB_NAME || 'MigajerosCalculados'} en ${process.env.DB_SERVER || 'localhost'}`);
  } else {
    const { createDb } = require('../src/db');
    const db = await createDb();
    await db.close();
    console.log('SQLite listo: data/migajeros.db');
  }
})().catch(err => {
  console.error('Error al crear la base de datos:', err.message);
  process.exit(1);
});
