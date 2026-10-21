import session from 'express-session';

/**
 * Store de sessão mínimo compatível com express-session, persistido na
 * mesma instância SQLite da aplicação (node:sqlite). Evita depender de
 * MemoryStore (não sobrevive a restart e não é recomendado em produção).
 */
export class SqliteSessionStore extends session.Store {
  constructor(db) {
    super();
    this.db = db;
    db.exec(
      `CREATE TABLE IF NOT EXISTS sessions (
         sid TEXT PRIMARY KEY,
         sess TEXT NOT NULL,
         expires_at INTEGER NOT NULL
       )`
    );
    this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  }

  get(sid, callback) {
    try {
      const row = this.db.prepare('SELECT sess, expires_at FROM sessions WHERE sid = ?').get(sid);
      if (!row) return callback();
      if (row.expires_at < Date.now()) {
        this.destroy(sid, () => {});
        return callback();
      }
      callback(null, JSON.parse(row.sess));
    } catch (err) {
      callback(err);
    }
  }

  set(sid, sessionData, callback) {
    try {
      const expiresAt = sessionData.cookie?.expires
        ? new Date(sessionData.cookie.expires).getTime()
        : Date.now() + 1000 * 60 * 60 * 24;
      this.db
        .prepare(
          `INSERT INTO sessions (sid, sess, expires_at) VALUES (@sid, @sess, @expiresAt)
           ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires_at = excluded.expires_at`
        )
        .run({ sid, sess: JSON.stringify(sessionData), expiresAt });
      callback && callback();
    } catch (err) {
      callback && callback(err);
    }
  }

  destroy(sid, callback) {
    try {
      this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      callback && callback();
    } catch (err) {
      callback && callback(err);
    }
  }

  touch(sid, sessionData, callback) {
    this.set(sid, sessionData, callback);
  }
}

export default SqliteSessionStore;
