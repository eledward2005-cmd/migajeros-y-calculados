// Driver SQL Server. Se activa con DB_DRIVER=mssql (ver .env.example).
// Requiere el paquete "mssql" (se instala con npm install) y haber creado
// las tablas con database/schema.sqlserver.sql o "npm run db:init".
const fs = require('node:fs');
const path = require('node:path');

async function createMssqlDb(env = process.env) {
  let sql;
  try {
    sql = require('mssql');
  } catch {
    throw new Error('Falta el paquete "mssql". Ejecuta: npm install mssql');
  }
  const pool = await new sql.ConnectionPool({
    server: env.DB_SERVER || 'localhost',
    port: Number(env.DB_PORT || 1433),
    database: env.DB_NAME || 'MigajerosCalculados',
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    options: {
      encrypt: env.DB_ENCRYPT === 'true',
      trustServerCertificate: env.DB_TRUST_CERT !== 'false'
    }
  }).connect();

  const q = async (text, params = {}) => {
    const req = pool.request();
    for (const [name, [type, value]] of Object.entries(params)) req.input(name, type, value);
    return req.query(text);
  };
  const S = sql.NVarChar;
  const I = sql.Int;

  return {
    kind: 'mssql',
    async createMember({ firstName, lastName, email, passwordHash }) {
      const r = await q(
        `INSERT INTO dbo.members (first_name, last_name, email, password_hash)
         OUTPUT INSERTED.id VALUES (@fn, @ln, @em, @ph)`,
        { fn: [S, firstName], ln: [S, lastName], em: [S, email], ph: [S, passwordHash] }
      );
      return r.recordset[0].id;
    },
    async findMemberByEmail(email) {
      const r = await q('SELECT * FROM dbo.members WHERE email = @em', { em: [S, email] });
      return r.recordset[0] || null;
    },
    async findMemberById(id) {
      const r = await q('SELECT * FROM dbo.members WHERE id = @id', { id: [I, id] });
      return r.recordset[0] || null;
    },
    async getEnrollments(memberId) {
      const r = await q('SELECT * FROM dbo.enrollments WHERE member_id = @m ORDER BY joined_at', { m: [I, memberId] });
      return r.recordset;
    },
    async getEnrollment(memberId, programId) {
      const r = await q('SELECT * FROM dbo.enrollments WHERE member_id = @m AND program_id = @p',
        { m: [I, memberId], p: [S, programId] });
      return r.recordset[0] || null;
    },
    async enroll(memberId, programId) {
      await q(
        `IF NOT EXISTS (SELECT 1 FROM dbo.enrollments WHERE member_id = @m AND program_id = @p)
         INSERT INTO dbo.enrollments (member_id, program_id) VALUES (@m, @p)`,
        { m: [I, memberId], p: [S, programId] }
      );
    },
    async leave(memberId, programId) {
      await q('DELETE FROM dbo.step_progress WHERE member_id = @m AND program_id = @p', { m: [I, memberId], p: [S, programId] });
      await q('DELETE FROM dbo.enrollments WHERE member_id = @m AND program_id = @p', { m: [I, memberId], p: [S, programId] });
    },
    async getCompletedSteps(memberId, programId) {
      const r = await q('SELECT step_id FROM dbo.step_progress WHERE member_id = @m AND program_id = @p',
        { m: [I, memberId], p: [S, programId] });
      return r.recordset.map(x => x.step_id);
    },
    async setStepCompleted(memberId, programId, stepId, completed) {
      if (completed) {
        await q(
          `IF NOT EXISTS (SELECT 1 FROM dbo.step_progress WHERE member_id = @m AND step_id = @s)
           INSERT INTO dbo.step_progress (member_id, program_id, step_id) VALUES (@m, @p, @s)`,
          { m: [I, memberId], p: [S, programId], s: [S, stepId] }
        );
      } else {
        await q('DELETE FROM dbo.step_progress WHERE member_id = @m AND step_id = @s', { m: [I, memberId], s: [S, stepId] });
      }
    },
    async markProgramCompleted(memberId, programId) {
      await q(
        `UPDATE dbo.enrollments SET completed_at = SYSUTCDATETIME()
         WHERE member_id = @m AND program_id = @p AND completed_at IS NULL`,
        { m: [I, memberId], p: [S, programId] }
      );
    },
    async awardBadge(memberId, badgeId, programId) {
      await q(
        `IF NOT EXISTS (SELECT 1 FROM dbo.member_badges WHERE member_id = @m AND badge_id = @b)
         INSERT INTO dbo.member_badges (member_id, badge_id, program_id) VALUES (@m, @b, @p)`,
        { m: [I, memberId], b: [S, badgeId], p: [S, programId] }
      );
    },
    async getBadges(memberId) {
      const r = await q('SELECT * FROM dbo.member_badges WHERE member_id = @m ORDER BY awarded_at', { m: [I, memberId] });
      return r.recordset;
    },
    async saveQuestion(x) {
      const r = await q(
        `INSERT INTO dbo.questions (first_name, last_name, email, subject, topic, question)
         OUTPUT INSERTED.id VALUES (@fn, @ln, @em, @su, @to, @qu)`,
        { fn: [S, x.firstName], ln: [S, x.lastName], em: [S, x.email], su: [S, x.subject], to: [S, x.topic], qu: [S, x.question] }
      );
      return r.recordset[0].id;
    },
    async listQuestions() {
      const r = await q('SELECT * FROM dbo.questions ORDER BY created_at DESC');
      return r.recordset;
    },
    async saveAttempt(memberId, exerciseId, choice, isCorrect) {
      await q(
        `MERGE dbo.exercise_attempts AS t
         USING (SELECT @m AS member_id, @e AS exercise_id) AS s
         ON t.member_id = s.member_id AND t.exercise_id = s.exercise_id
         WHEN MATCHED THEN UPDATE SET choice = @c, is_correct = @ok, answered_at = SYSUTCDATETIME()
         WHEN NOT MATCHED THEN INSERT (member_id, exercise_id, choice, is_correct) VALUES (@m, @e, @c, @ok);`,
        { m: [I, memberId], e: [S, exerciseId], c: [S, choice], ok: [sql.Bit, isCorrect ? 1 : 0] }
      );
    },
    async getAttempts(memberId) {
      const r = await q('SELECT member_id, exercise_id, choice, CAST(is_correct AS INT) AS is_correct, answered_at FROM dbo.exercise_attempts WHERE member_id = @m', { m: [I, memberId] });
      return r.recordset;
    },
    async clearAttempts(memberId, exerciseIds) {
      for (const id of exerciseIds) {
        await q('DELETE FROM dbo.exercise_attempts WHERE member_id = @m AND exercise_id = @e', { m: [I, memberId], e: [S, id] });
      }
    },
    async getStepRows(memberId) {
      const r = await q('SELECT program_id, step_id, completed_at FROM dbo.step_progress WHERE member_id = @m', { m: [I, memberId] });
      return r.recordset;
    },
    async getSettings(memberId) {
      const r = await q('SELECT * FROM dbo.member_settings WHERE member_id = @m', { m: [I, memberId] });
      return r.recordset[0] || null;
    },
    async saveSettings(memberId, { weeklyGoal, focusArea }) {
      await q(
        `MERGE dbo.member_settings AS t
         USING (SELECT @m AS member_id) AS s ON t.member_id = s.member_id
         WHEN MATCHED THEN UPDATE SET weekly_goal = @g, focus_area = @f
         WHEN NOT MATCHED THEN INSERT (member_id, weekly_goal, focus_area) VALUES (@m, @g, @f);`,
        { m: [I, memberId], g: [I, weeklyGoal], f: [S, focusArea] }
      );
    },
    async close() { await pool.close(); }
  };
}

// Crea la base de datos y las tablas ejecutando database/schema.sqlserver.sql
// (separa los lotes por "GO", como hace sqlcmd).
async function initMssqlSchema(env = process.env) {
  const sql = require('mssql');
  const pool = await new sql.ConnectionPool({
    server: env.DB_SERVER || 'localhost',
    port: Number(env.DB_PORT || 1433),
    database: 'master',
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    options: { encrypt: env.DB_ENCRYPT === 'true', trustServerCertificate: env.DB_TRUST_CERT !== 'false' }
  }).connect();
  const dbName = env.DB_NAME || 'MigajerosCalculados';
  const script = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'schema.sqlserver.sql'), 'utf8')
    .replaceAll('MigajerosCalculados', dbName);
  for (const batch of script.split(/^\s*GO\s*$/m).map(s => s.trim()).filter(Boolean)) {
    await pool.request().batch(batch);
  }
  await pool.close();
}

module.exports = { createMssqlDb, initMssqlSchema };
