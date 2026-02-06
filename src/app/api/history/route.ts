import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db';

export const runtime = 'nodejs';

const getToday = () => new Date().toISOString().split('T')[0];

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const date = request.nextUrl.searchParams.get('date') || getToday();

    const db = getDb();
    const rows = db
      .prepare('SELECT fund_code, time, value, change FROM history WHERE user_id = ? AND date = ? ORDER BY id ASC')
      .all(userId, date) as Array<{ fund_code: string; time: string; value: number; change: number }>;

    const data: Record<string, Array<{ time: string; value: string; change: string }>> = {};

    rows.forEach(row => {
      if (!data[row.fund_code]) data[row.fund_code] = [];
      data[row.fund_code].push({
        time: row.time,
        value: row.value.toFixed(4),
        change: row.change.toFixed(2)
      });
    });

    return NextResponse.json({ date, data });
  } catch (error) {
    console.error('[API] 获取历史数据失败:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = typeof body?.userId === 'string' ? body.userId : '';
    const fundCode = typeof body?.fundCode === 'string' ? body.fundCode.trim() : '';
    const time = typeof body?.time === 'string' ? body.time : '';
    const date = typeof body?.date === 'string' ? body.date : getToday();
    const value = Number(body?.value);
    const change = Number(body?.change);

    if (!userId || !fundCode || !time || !Number.isFinite(value) || !Number.isFinite(change)) {
      return NextResponse.json({ error: 'Missing or invalid history data' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO history (user_id, fund_code, date, time, value, change, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, fund_code, date, time) DO UPDATE SET
        value = excluded.value,
        change = excluded.change
    `).run(userId, fundCode, date, time, value, change, new Date().toISOString());

    db.prepare(`
      DELETE FROM history
      WHERE id IN (
        SELECT id FROM history
        WHERE user_id = ? AND fund_code = ? AND date = ?
        ORDER BY id DESC
        LIMIT -1 OFFSET 50
      )
    `).run(userId, fundCode, date);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] 保存历史数据失败:', error);
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const date = request.nextUrl.searchParams.get('date');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const db = getDb();
    if (date) {
      db.prepare('DELETE FROM history WHERE user_id = ? AND date = ?').run(userId, date);
    } else {
      db.prepare('DELETE FROM history WHERE user_id = ?').run(userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] 删除历史数据失败:', error);
    return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
  }
}
