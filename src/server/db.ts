import 'server-only';

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// 检测是否在 Vercel 环境
const isVercel = process.env.VERCEL === '1';
const hasPostgres = !!process.env.POSTGRES_URL;

let sqliteDb: Database.Database | null = null;

// SQLite 初始化
const getDbPath = () => {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'funds.db');
};

const initSqlite = () => {
  if (!sqliteDb) {
    sqliteDb = new Database(getDbPath());
    sqliteDb.exec(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS funds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        code TEXT NOT NULL,
        initial_cost REAL NOT NULL,
        current_amount REAL NOT NULL,
        last_settlement_date TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, code)
      );

      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        fund_code TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        value REAL NOT NULL,
        change REAL NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, fund_code, date, time)
      );
    `);
    console.log('[DB] SQLite 数据库初始化成功');
  }
  return sqliteDb;
};

// PostgreSQL 初始化（仅在需要时动态导入）
let pgSql: any = null;
const initPostgres = async () => {
  if (!pgSql) {
    const { sql } = await import('@vercel/postgres');
    pgSql = sql;
    
    try {
      await pgSql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL
        );
      `;

      await pgSql`
        CREATE TABLE IF NOT EXISTS funds (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          code TEXT NOT NULL,
          initial_cost DECIMAL NOT NULL,
          current_amount DECIMAL NOT NULL,
          last_settlement_date TEXT,
          created_at TIMESTAMP NOT NULL,
          UNIQUE(user_id, code)
        );
      `;

      await pgSql`
        CREATE TABLE IF NOT EXISTS history (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          fund_code TEXT NOT NULL,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          value DECIMAL NOT NULL,
          change DECIMAL NOT NULL,
          created_at TIMESTAMP NOT NULL,
          UNIQUE(user_id, fund_code, date, time)
        );
      `;

      console.log('[DB] PostgreSQL 数据库初始化成功');
    } catch (error) {
      console.error('[DB] PostgreSQL 初始化失败:', error);
    }
  }
  return pgSql;
};

// 统一的数据库接口
export const db = {
  usePostgres: isVercel || hasPostgres,

  async init() {
    if (this.usePostgres) {
      await initPostgres();
    } else {
      initSqlite();
    }
  },

  // 查询方法
  async query<T = any>(sqlStr: string, params: any[] = []): Promise<T[]> {
    if (this.usePostgres) {
      const pg = await initPostgres();
      const result = await pg.query(sqlStr, params);
      return result.rows;
    } else {
      const sqlite = initSqlite();
      const stmt = sqlite.prepare(sqlStr);
      return stmt.all(...params) as T[];
    }
  },

  // 单行查询
  async get<T = any>(sqlStr: string, params: any[] = []): Promise<T | null> {
    if (this.usePostgres) {
      const pg = await initPostgres();
      const result = await pg.query(sqlStr, params);
      return result.rows[0] || null;
    } else {
      const sqlite = initSqlite();
      const stmt = sqlite.prepare(sqlStr);
      return (stmt.get(...params) as T) || null;
    }
  },

  // 执行（INSERT/UPDATE/DELETE）
  async run(sqlStr: string, params: any[] = []): Promise<void> {
    if (this.usePostgres) {
      const pg = await initPostgres();
      await pg.query(sqlStr, params);
    } else {
      const sqlite = initSqlite();
      const stmt = sqlite.prepare(sqlStr);
      stmt.run(...params);
    }
  },

  // 事务执行
  async transaction(callback: () => Promise<void> | void): Promise<void> {
    if (this.usePostgres) {
      // PostgreSQL 自动处理事务
      await callback();
    } else {
      const sqlite = initSqlite();
      const transaction = sqlite.transaction(callback);
      transaction();
    }
  }
};

console.log(`[DB] 使用数据库: ${db.usePostgres ? 'PostgreSQL' : 'SQLite'}`);
