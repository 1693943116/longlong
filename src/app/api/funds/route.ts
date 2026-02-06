import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const db = getDb();
    const rows = db
      .prepare('SELECT code, initial_cost, current_amount, last_settlement_date FROM funds WHERE user_id = ? ORDER BY id ASC')
      .all(userId);

    const funds = rows.map(row => ({
      code: row.code as string,
      initialCost: Number(row.initial_cost),
      currentAmount: Number(row.current_amount),
      lastSettlementDate: row.last_settlement_date as string | null
    }));

    return NextResponse.json(funds);
  } catch (error) {
    console.error('[API] 获取基金列表失败:', error);
    return NextResponse.json({ error: 'Failed to fetch funds' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = typeof body?.userId === 'string' ? body.userId : '';
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const initialCost = Number(body?.initialCost);
    const currentAmount = Number(body?.currentAmount);
    const lastSettlementDate = typeof body?.lastSettlementDate === 'string' ? body.lastSettlementDate : null;

    if (!userId || !code || !Number.isFinite(initialCost) || !Number.isFinite(currentAmount)) {
      return NextResponse.json({ error: 'Missing or invalid fund data' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO funds (user_id, code, initial_cost, current_amount, last_settlement_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, code) DO UPDATE SET
        initial_cost = excluded.initial_cost,
        current_amount = excluded.current_amount,
        last_settlement_date = excluded.last_settlement_date
    `).run(userId, code, initialCost, currentAmount, lastSettlementDate, new Date().toISOString());

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] 新增基金失败:', error);
    return NextResponse.json({ error: 'Failed to create fund' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = typeof body?.userId === 'string' ? body.userId : '';
    const code = typeof body?.code === 'string' ? body.code.trim() : '';

    if (!userId || !code) {
      return NextResponse.json({ error: 'Missing userId or code' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: Array<string | number | null> = [];

    if (body?.initialCost !== undefined) {
      const initialCost = Number(body.initialCost);
      if (Number.isFinite(initialCost)) {
        updates.push('initial_cost = ?');
        values.push(initialCost);
      }
    }

    if (body?.currentAmount !== undefined) {
      const currentAmount = Number(body.currentAmount);
      if (Number.isFinite(currentAmount)) {
        updates.push('current_amount = ?');
        values.push(currentAmount);
      }
    }

    if (body?.lastSettlementDate !== undefined) {
      const lastSettlementDate = typeof body.lastSettlementDate === 'string' ? body.lastSettlementDate : null;
      updates.push('last_settlement_date = ?');
      values.push(lastSettlementDate);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`UPDATE funds SET ${updates.join(', ')} WHERE user_id = ? AND code = ?`).run(
      ...values,
      userId,
      code
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] 更新基金失败:', error);
    return NextResponse.json({ error: 'Failed to update fund' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const code = request.nextUrl.searchParams.get('code');
    if (!userId || !code) {
      return NextResponse.json({ error: 'Missing userId or code' }, { status: 400 });
    }

    const db = getDb();
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM history WHERE user_id = ? AND fund_code = ?').run(userId, code);
      db.prepare('DELETE FROM funds WHERE user_id = ? AND code = ?').run(userId, code);
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] 删除基金失败:', error);
    return NextResponse.json({ error: 'Failed to delete fund' }, { status: 500 });
  }
}
