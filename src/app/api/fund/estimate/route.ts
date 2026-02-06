import { NextRequest, NextResponse } from 'next/server';
import { calculateFundProfit } from '@/utils/fund';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const amount = searchParams.get('amount');

    if (!code) {
      return NextResponse.json({ error: 'Missing fund code' }, { status: 400 });
    }

    const holdingAmount = amount ? parseFloat(amount) : 10000; // 默认持有10000元

    console.log(`[API] 获取基金数据: code=${code}, amount=${holdingAmount}`);

    const result = await calculateFundProfit(code, holdingAmount);

    if (!result) {
      console.error(`[API] 获取基金数据失败: code=${code}`);
      return NextResponse.json({ error: 'Failed to fetch fund data' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] 接口异常:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
