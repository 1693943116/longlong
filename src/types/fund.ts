export interface Fund {
  code: string;
  initialCost: number; // 初始成本（买入时的总成本）
  currentAmount: number; // 当前实际金额（含累计收益）
  lastSettlementDate?: string; // 最后结算日期（YYYY-MM-DD格式）
}

export interface FundData {
  fundcode: string;
  name: string;
  dwjz: string;
  gsz: string;
  gszzl: string;
  gztime: string;
  profit: number;
  holdingAmount: number;
}

export interface HistoryPoint {
  time: string; // HH:mm
  value: string; // 净值
  change: string; // 涨跌幅
}

export interface User {
  id: string;
  name: string;
}
