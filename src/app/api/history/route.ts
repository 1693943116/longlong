import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';

export const runtime = 'nodejs';

const getToday = () => new Date().toISOString().split('T')[0];

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const date = request.nextUrl.searchParams.get('date') || getToday();

    await db.init();
    const rows = await db.query<{
      fund_code: string;
      time: string;
      value: number;
      change: number;
    }>('SELECT fund_code, time, value, change FROM history WHERE user_id = ? AND date = ? ORDER BY id ASC', [userId, date]);

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

    await db.init();
    const createdAt = new Date().toISOString();
    
    await db.run(
      `INSERT INTO history (user_id, fund_code, date, time, value, change, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, fund_code, date, time) DO UPDATE SET
         value = EXCLUDED.value,
         change = EXCLUDED.change`,
      [userId, fundCode, date, time, value, change, createdAt]
    );

    // 删除超过 50 条的历史记录
    await db.run(
      `DELETE FROM history
       WHERE id IN (
         SELECT id FROM history
         WHERE user_id = ? AND fund_code = ? AND date = ?
         ORDER BY id DESC
         LIMIT -1 OFFSET 50
       )`,
      [userId, fundCode, date]
    );

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

    await db.init();
    
    if (date) {
      await db.run('DELETE FROM history WHERE user_id = ? AND date = ?', [userId, date]);
    } else {
      await db.run('DELETE FROM history WHERE user_id = ?', [userId]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] 删除历史数据失败:', error);
    return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
  }
}
