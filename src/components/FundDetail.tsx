'use client';

import { Fund, FundData, HistoryPoint } from '@/types/fund';

interface FundDetailProps {
  fund: Fund;
  data: FundData;
  history: HistoryPoint[];
  onClose: () => void;
}

export default function FundDetail({ data, history, onClose }: FundDetailProps) {
  // 计算图表数据
  const values = history.map(h => parseFloat(h.value));
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 0;
  const range = maxValue - minValue || 1;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{data.name}</h2>
            <p className="text-sm text-gray-500">{data.fundcode}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 当前信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">实时估值</div>
            <div className="text-xl font-bold">{data.gsz}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">涨跌幅</div>
            <div className={`text-xl font-bold ${parseFloat(data.gszzl) >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {parseFloat(data.gszzl) >= 0 ? '+' : ''}{data.gszzl}%
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">昨日净值</div>
            <div className="text-xl font-bold">{data.dwjz}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">更新时间</div>
            <div className="text-xl font-bold">{data.gztime.split(' ')[1]}</div>
          </div>
        </div>

        {/* 折线图 */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">实时走势</h3>
              <div className="text-xs text-gray-500 mt-1">数据每30秒更新</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-800">{data.gsz}</div>
              <div className={`text-lg font-semibold ${parseFloat(data.gszzl) >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {parseFloat(data.gszzl) >= 0 ? '+' : ''}{data.gszzl}%
                <span className="text-sm ml-2">
                  {parseFloat(data.gszzl) >= 0 ? '+' : ''}{(parseFloat(data.gsz) - parseFloat(data.dwjz)).toFixed(4)}
                </span>
              </div>
            </div>
          </div>
          {history.length > 1 ? (
            <div className="relative h-80 bg-white rounded-lg p-6 shadow-inner">
              {/* 图表信息提示 */}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-gray-200 z-10">
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">昨日净值</span>
                    <span className="ml-2 font-semibold text-gray-700">{data.dwjz}</span>
                  </div>
                  <div className="border-l border-gray-300 pl-4">
                    <span className="text-gray-500">最新估值</span>
                    <span className="ml-2 font-semibold text-gray-700">{data.gsz}</span>
                  </div>
                  <div className="border-l border-gray-300 pl-4">
                    <span className="text-gray-500">涨跌额</span>
                    <span className={`ml-2 font-semibold ${parseFloat(data.gszzl) >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {parseFloat(data.gszzl) >= 0 ? '+' : ''}{(parseFloat(data.gsz) - parseFloat(data.dwjz)).toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
              
              <svg width="100%" height="100%" viewBox="0 0 800 240" preserveAspectRatio="none" className="overflow-visible">
                <defs>
                  {/* 渐变定义 */}
                  <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={parseFloat(data.gszzl) >= 0 ? '#f59e0b' : '#10b981'} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={parseFloat(data.gszzl) >= 0 ? '#f59e0b' : '#10b981'} stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* 背景网格 */}
                <line x1="0" y1="0" x2="800" y2="0" stroke="#f3f4f6" strokeWidth="1" />
                <line x1="0" y1="60" x2="800" y2="60" stroke="#f3f4f6" strokeWidth="1" />
                <line x1="0" y1="120" x2="800" y2="120" stroke="#f3f4f6" strokeWidth="1" />
                <line x1="0" y1="180" x2="800" y2="180" stroke="#f3f4f6" strokeWidth="1" />
                <line x1="0" y1="240" x2="800" y2="240" stroke="#f3f4f6" strokeWidth="1" />

                {/* 面积图 */}
                <path
                  d={`M 0,240 ${history.map((point, index) => {
                    const x = (index / (history.length - 1)) * 800;
                    const y = 240 - ((parseFloat(point.value) - minValue) / range) * 240;
                    return `L ${x},${y}`;
                  }).join(' ')} L 800,240 Z`}
                  fill="url(#areaGradient)"
                />

                {/* 平滑曲线 */}
                <path
                  d={history.map((point, index) => {
                    const x = (index / (history.length - 1)) * 800;
                    const y = 240 - ((parseFloat(point.value) - minValue) / range) * 240;
                    if (index === 0) return `M ${x},${y}`;
                    
                    // 简单的平滑处理
                    const prevX = ((index - 1) / (history.length - 1)) * 800;
                    const prevY = 240 - ((parseFloat(history[index - 1].value) - minValue) / range) * 240;
                    const cpX = (prevX + x) / 2;
                    return `Q ${cpX},${prevY} ${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke={parseFloat(data.gszzl) >= 0 ? '#f59e0b' : '#10b981'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 数据点 */}
                {history.map((point, index) => {
                  const x = (index / (history.length - 1)) * 800;
                  const y = 240 - ((parseFloat(point.value) - minValue) / range) * 240;
                  
                  // 只在首尾和部分点显示圆点
                  if (index === 0 || index === history.length - 1 || index % 5 === 0) {
                    return (
                      <g key={index}>
                        <circle
                          cx={x}
                          cy={y}
                          r="5"
                          fill="white"
                          stroke={parseFloat(data.gszzl) >= 0 ? '#f59e0b' : '#10b981'}
                          strokeWidth="2"
                        />
                      </g>
                    );
                  }
                  return null;
                })}
              </svg>
              
              {/* Y轴标签 - 左侧 */}
              <div className="absolute left-0 top-6 bottom-6 flex flex-col justify-between text-xs text-gray-400 pointer-events-none">
                <div className="bg-white px-2 py-1 rounded">{maxValue.toFixed(4)}</div>
                <div className="bg-white px-2 py-1 rounded">{((maxValue * 3 + minValue) / 4).toFixed(4)}</div>
                <div className="bg-white px-2 py-1 rounded">{((maxValue + minValue) / 2).toFixed(4)}</div>
                <div className="bg-white px-2 py-1 rounded">{((maxValue + minValue * 3) / 4).toFixed(4)}</div>
                <div className="bg-white px-2 py-1 rounded">{minValue.toFixed(4)}</div>
              </div>

              {/* X轴标签 - 底部 */}
              <div className="absolute bottom-0 left-6 right-6 flex justify-between text-xs text-gray-400 pointer-events-none">
                <span className="bg-white px-2 py-1 rounded">{history[0]?.time}</span>
                {history.length > 4 && (
                  <span className="bg-white px-2 py-1 rounded">{history[Math.floor(history.length * 0.25)]?.time}</span>
                )}
                {history.length > 2 && (
                  <span className="bg-white px-2 py-1 rounded">{history[Math.floor(history.length / 2)]?.time}</span>
                )}
                {history.length > 4 && (
                  <span className="bg-white px-2 py-1 rounded">{history[Math.floor(history.length * 0.75)]?.time}</span>
                )}
                <span className="bg-white px-2 py-1 rounded">{history[history.length - 1]?.time}</span>
              </div>

              {/* 数据提示 */}
              {range < 0.001 && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg text-xs text-yellow-700">
                  <p className="font-semibold">估值暂无明显变化</p>
                  <p className="mt-1">• 交易时段：工作日 9:30-15:00</p>
                  <p>• 已收集 {history.length} 个数据点</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>数据收集中，请稍后查看...</p>
              <p className="text-xs mt-2">已收集 {history.length} 个数据点</p>
              {history.length > 0 && (
                <div className="mt-4 text-xs text-left max-w-md mx-auto bg-gray-50 p-4 rounded">
                  <p className="font-semibold mb-2">最近收集的数据：</p>
                  {history.slice(-5).map((h, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span>{h.time}</span>
                      <span>{h.value}</span>
                      <span className={parseFloat(h.change) >= 0 ? 'text-red-500' : 'text-green-500'}>
                        {h.change}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 数据说明 */}
        <div className="mt-4 text-sm text-gray-500">
          <p>💡 图表显示今日实时走势，数据每30秒更新一次</p>
        </div>
      </div>
    </div>
  );
}
