import 'server-only';

import { sql } from '@vercel/postgres';

export const initDb = async () => {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL
      );
    `;

    await sql`
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

    await sql`
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

    console.log('[DB] 数据库表初始化成功');
  } catch (error) {
    console.error('[DB] 初始化失败:', error);
    // 如果表已存在，忽略错误
  }
};

export { sql };
