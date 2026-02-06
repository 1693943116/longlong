/**
 * 基金数据处理工具类
 * 
 * 核心逻辑：
 * 1. 调用第三方估值接口（如天天基金）
 * 2. 解析 JSONP 格式数据
 * 3. 计算实时收益
 */

export interface FundEstimate {
  fundcode: string; // 基金代码
  name: string;     // 基金名称
  jzrq: string;     // 净值日期
  dwjz: string;     // 昨日单位净值
  gsz: string;      // 实时估算净值
  gszzl: string;    // 估算涨跌幅 (%)
  gztime: string;   // 估值时间
}

export interface FundProfit {
  estimate: FundEstimate;
  holdingAmount: number; // 持有金额
  profit: number;        // 预估收益
}

/**
 * 获取基金实时估值
 * @param code 基金代码
 */
export const fetchFundEstimate = async (code: string): Promise<FundEstimate | null> => {
  try {
    const timestamp = Date.now();
    // 天天基金 JSONP 接口 - 使用https
    const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${timestamp}`;
    
    console.log(`[FundService] 请求基金数据: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://fund.eastmoney.com/'
      },
      cache: 'no-store', // 禁用缓存，确保获取最新数据
    });

    console.log(`[FundService] 响应状态: ${response.status}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    console.log(`[FundService] 响应内容长度: ${text.length}`);
    
    // 解析 JSONP: jsonpgz({...});
    const match = text.match(/jsonpgz\((.*)\)/);
    
    if (match && match[1]) {
      const data = JSON.parse(match[1]) as FundEstimate;
      console.log(`[FundService] 解析成功: ${data.name}`);
      return data;
    }
    
    console.error(`[FundService] 解析失败，响应内容: ${text.substring(0, 200)}`);
    return null;
  } catch (error) {
    console.error(`[FundService] 获取基金 ${code} 估值失败:`, error);
    if (error instanceof Error) {
      console.error(`[FundService] 错误详情: ${error.message}`);
      console.error(`[FundService] 错误堆栈: ${error.stack}`);
    }
    return null;
  }
};

/**
 * 计算单只基金实时收益
 * @param code 基金代码
 * @param holdingAmount 持有金额
 */
export const calculateFundProfit = async (code: string, holdingAmount: number): Promise<FundProfit | null> => {
  const estimate = await fetchFundEstimate(code);
  
  if (!estimate) return null;

  // 收益 = 持有金额 * (估算涨跌幅 / 100)
  const rate = parseFloat(estimate.gszzl);
  const profit = holdingAmount * (rate / 100);

  return {
    estimate,
    holdingAmount,
    profit: Number(profit.toFixed(2)) // 保留两位小数
  };
};
