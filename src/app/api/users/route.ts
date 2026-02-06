import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT id, name FROM users ORDER BY created_at ASC').all();
    return NextResponse.json(rows);
  } catch (error) {
    console.error('[API] 获取用户失败:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API] POST /api/users - 开始处理请求');
    const body = await request.json();
    console.log('[API] 请求体:', body);
    
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    console.log('[API] 解析的用户名:', name);

    if (!name) {
      console.log('[API] 用户名为空');
      return NextResponse.json({ error: 'Missing user name' }, { status: 400 });
    }

    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    console.log('[API] 准备插入:', { id, name, createdAt });

    const db = getDb();
    const stmt = db.prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)');
    const result = stmt.run(id, name, createdAt);
    console.log('[API] 插入结果:', result);

    return NextResponse.json({ id, name });
  } catch (error) {
    console.error('[API] 创建用户失败 - 详细错误:', error);
    if (error instanceof Error) {
      console.error('[API] 错误消息:', error.message);
      console.error('[API] 错误堆栈:', error.stack);
    }
    return NextResponse.json({ 
      error: 'Failed to create user',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('id');
    if (!userId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const db = getDb();
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM history WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM funds WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] 删除用户失败:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
