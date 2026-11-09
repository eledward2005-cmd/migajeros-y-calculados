// Selecciona el motor de base de datos según DB_DRIVER:
//   sqlite (por defecto) -> archivo local data/migajeros.db, sin instalar nada.
//   mssql               -> SQL Server, con las variables DB_SERVER, DB_USER, etc.
const path = require('node:path');

async function createDb(env = process.env) {
  const driver = (env.DB_DRIVER || 'sqlite').toLowerCase();
  if (driver === 'mssql' || driver === 'sqlserver') {
    const { createMssqlDb } = require('./mssql');
    return createMssqlDb(env);
  }
  const { createSqliteDb } = require('./sqlite');
  const file = env.SQLITE_FILE || path.join(__dirname, '..', '..', 'data', 'migajeros.db');
  return createSqliteDb(file);
}

module.exports = { createDb };
