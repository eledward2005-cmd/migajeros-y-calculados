// Driver SQLite (incluido en Node.js 22.13+). Se usa por defecto para que el
// proyecto funcione sin instalar nada más. Mismo esquema que SQL Server.
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function createSqliteDb(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'schema.sqlite.sql'), 'utf8'));

  const now = () => new Date().toISOString();

  return {
    kind: 'sqlite',
    async createMember({ firstName, lastName, email, passwordHash }) {
      const r = db.prepare(
        'INSERT INTO members (first_name, last_name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(firstName, lastName, email, passwordHash, now());
      return Number(r.lastInsertRowid);
    },
    async findMemberByEmail(email) {
      return db.prepare('SELECT * FROM members WHERE email = ?').get(email) || null;
    },
    async findMemberById(id) {
      return db.prepare('SELECT * FROM members WHERE id = ?').get(id) || null;
    },
    async getEnrollments(memberId) {
      return db.prepare('SELECT * FROM enrollments WHERE member_id = ? ORDER BY joined_at').all(memberId);
    },
    async getEnrollment(memberId, programId) {
      return db.prepare('SELECT * FROM enrollments WHERE member_id = ? AND program_id = ?').get(memberId, programId) || null;
    },
    async enroll(memberId, programId) {
      db.prepare(
        'INSERT OR IGNORE INTO enrollments (member_id, program_id, joined_at) VALUES (?, ?, ?)'
      ).run(memberId, programId, now());
    },
    async leave(memberId, programId) {
      db.prepare('DELETE FROM step_progress WHERE member_id = ? AND program_id = ?').run(memberId, programId);
      db.prepare('DELETE FROM enrollments WHERE member_id = ? AND program_id = ?').run(memberId, programId);
    },
    async getCompletedSteps(memberId, programId) {
      return db.prepare('SELECT step_id FROM step_progress WHERE member_id = ? AND program_id = ?')
        .all(memberId, programId).map(r => r.step_id);
    },
    async setStepCompleted(memberId, programId, stepId, completed) {
      if (completed) {
        db.prepare(
          'INSERT OR IGNORE INTO step_progress (member_id, program_id, step_id, completed_at) VALUES (?, ?, ?, ?)'
        ).run(memberId, programId, stepId, now());
      } else {
        db.prepare('DELETE FROM step_progress WHERE member_id = ? AND step_id = ?').run(memberId, stepId);
      }
    },
    async markProgramCompleted(memberId, programId) {
      db.prepare('UPDATE enrollments SET completed_at = ? WHERE member_id = ? AND program_id = ? AND completed_at IS NULL')
        .run(now(), memberId, programId);
    },
    async awardBadge(memberId, badgeId, programId) {
      db.prepare(
        'INSERT OR IGNORE INTO member_badges (member_id, badge_id, program_id, awarded_at) VALUES (?, ?, ?, ?)'
      ).run(memberId, badgeId, programId, now());
    },
    async getBadges(memberId) {
      return db.prepare('SELECT * FROM member_badges WHERE member_id = ? ORDER BY awarded_at').all(memberId);
    },
    async saveQuestion(q) {
      const r = db.prepare(
        `INSERT INTO questions (first_name, last_name, email, subject, topic, question, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(q.firstName, q.lastName, q.email, q.subject, q.topic, q.question, now());
      return Number(r.lastInsertRowid);
    },
    async listQuestions() {
      return db.prepare('SELECT * FROM questions ORDER BY created_at DESC').all();
    },
    async saveAttempt(memberId, exerciseId, choice, isCorrect) {
      db.prepare(
        `INSERT INTO exercise_attempts (member_id, exercise_id, choice, is_correct, answered_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(member_id, exercise_id) DO UPDATE SET choice = excluded.choice, is_correct = excluded.is_correct, answered_at = excluded.answered_at`
      ).run(memberId, exerciseId, choice, isCorrect ? 1 : 0, now());
    },
    async getAttempts(memberId) {
      return db.prepare('SELECT * FROM exercise_attempts WHERE member_id = ?').all(memberId);
    },
    async clearAttempts(memberId, exerciseIds) {
      const del = db.prepare('DELETE FROM exercise_attempts WHERE member_id = ? AND exercise_id = ?');
      for (const id of exerciseIds) del.run(memberId, id);
    },
    async getStepRows(memberId) {
      return db.prepare('SELECT program_id, step_id, completed_at FROM step_progress WHERE member_id = ?').all(memberId);
    },
    async getSettings(memberId) {
      return db.prepare('SELECT * FROM member_settings WHERE member_id = ?').get(memberId) || null;
    },
    async saveSettings(memberId, { weeklyGoal, focusArea }) {
      db.prepare(
        `INSERT INTO member_settings (member_id, weekly_goal, focus_area) VALUES (?, ?, ?)
         ON CONFLICT(member_id) DO UPDATE SET weekly_goal = excluded.weekly_goal, focus_area = excluded.focus_area`
      ).run(memberId, weeklyGoal, focusArea);
    },
    async close() { db.close(); }
  };
}

module.exports = { createSqliteDb };
