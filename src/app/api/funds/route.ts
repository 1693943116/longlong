import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    await db.init();
    const rows = await db.query<{
      code: string;
      initial_cost: number;
      current_amount: number;
      last_settlement_date: string | null;
    }>('SELECT code, initial_cost, current_amount, last_settlement_date FROM funds WHERE user_id = ? ORDER BY id ASC', [userId]);

    const funds = rows.map((row) => ({
      code: row.code,
      initialCost: Number(row.initial_cost),
      currentAmount: Number(row.current_amount),
      lastSettlementDate: row.last_settlement_date,
    }));

    return NextResponse.json(funds);
  } catch (error) {
    console.error("[API] 获取基金列表失败:", error);
    return NextResponse.json(
      { error: "Failed to fetch funds" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const initialCost = Number(body?.initialCost);
    const currentAmount = Number(body?.currentAmount);
    const lastSettlementDate =
      typeof body?.lastSettlementDate === "string"
        ? body.lastSettlementDate
        : null;

    if (
      !userId ||
      !code ||
      !Number.isFinite(initialCost) ||
      !Number.isFinite(currentAmount)
    ) {
      return NextResponse.json(
        { error: "Missing or invalid fund data" },
        { status: 400 },
      );
    }

    await db.init();
    const createdAt = new Date().toISOString();
    await db.run(
      `INSERT INTO funds (user_id, code, initial_cost, current_amount, last_settlement_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, code) DO UPDATE SET
         initial_cost = EXCLUDED.initial_cost,
         current_amount = EXCLUDED.current_amount,
         last_settlement_date = EXCLUDED.last_settlement_date`,
      [userId, code, initialCost, currentAmount, lastSettlementDate, createdAt]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] 新增基金失败:", error);
    return NextResponse.json(
      { error: "Failed to create fund" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (!userId || !code) {
      return NextResponse.json(
        { error: "Missing userId or code" },
        { status: 400 },
      );
    }

    await db.init();
    
    // 构建动态 SQL 更新语句
    let query = `UPDATE funds SET `;
    const params: any[] = [];
    let hasUpdates = false;
    
    if (body?.initialCost !== undefined) {
      const initialCost = Number(body.initialCost);
      if (Number.isFinite(initialCost)) {
        query += `initial_cost = ?, `;
        params.push(initialCost);
        hasUpdates = true;
      }
    }
    
    if (body?.currentAmount !== undefined) {
      const currentAmount = Number(body.currentAmount);
      if (Number.isFinite(currentAmount)) {
        query += `current_amount = ?, `;
        params.push(currentAmount);
        hasUpdates = true;
      }
    }
    
    if (body?.lastSettlementDate !== undefined) {
      const lastSettlementDate = typeof body.lastSettlementDate === 'string' ? body.lastSettlementDate : null;
      query += `last_settlement_date = ?, `;
      params.push(lastSettlementDate);
      hasUpdates = true;
    }
    
    if (!hasUpdates) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }
    
    query = query.slice(0, -2); // 移除最后的 ", "
    query += ` WHERE user_id = ? AND code = ?`;
    params.push(userId, code);
    
    await db.run(query, params);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] 更新基金失败:", error);
    return NextResponse.json(
      { error: "Failed to update fund" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    const code = request.nextUrl.searchParams.get("code");
    if (!userId || !code) {
      return NextResponse.json(
        { error: "Missing userId or code" },
        { status: 400 },
      );
    }

    await db.init();
    
    await db.transaction(async () => {
      await db.run('DELETE FROM history WHERE user_id = ? AND fund_code = ?', [userId, code]);
      await db.run('DELETE FROM funds WHERE user_id = ? AND code = ?', [userId, code]);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] 删除基金失败:", error);
    return NextResponse.json(
      { error: "Failed to delete fund" },
      { status: 500 },
    );
  }
}
