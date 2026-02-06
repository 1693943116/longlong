'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import FundDetail from '@/components/FundDetail';
import { Fund, FundData, HistoryPoint, User } from '@/types/fund';
import { storage } from '@/utils/storage';

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);

  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundData, setFundData] = useState<Record<string, FundData>>({});
  const [code, setCode] = useState('');
  const [inputTotalAmount, setInputTotalAmount] = useState('');
  const [inputHoldingProfit, setInputHoldingProfit] = useState('');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [editingFund, setEditingFund] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [detailFundCode, setDetailFundCode] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<Record<string, HistoryPoint[]>>({});

  const loadUsers = useCallback(async () => {
    try {
      const list = storage.getUsers();
      setUsers(list);
      const saved = storage.getCurrentUser();
      setCurrentUser(prev => prev ?? saved ?? (list[0] ?? null));
    } catch (error) {
      console.error('加载用户失败:', error);
    }
  }, []);

  const loadFunds = useCallback(async (userId: string) => {
    try {
      const list = storage.getFunds(userId);
      setFunds(list);
    } catch (error) {
      console.error('加载基金失败:', error);
      setFunds([]);
    }
  }, []);

  const loadHistory = useCallback(async (userId: string) => {
    try {
      const data = storage.getHistory(userId);
      setHistoryData(data);
    } catch (error) {
      console.error('加载历史数据失败:', error);
      setHistoryData({});
    }
  }, []);

  // 初始化用户列表
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // 切换用户时加载数据
  useEffect(() => {
    if (currentUser) {
      storage.setCurrentUser(currentUser);
      setFundData({});
      loadFunds(currentUser.id);
      loadHistory(currentUser.id);
    } else {
      setFunds([]);
      setFundData({});
      setHistoryData({});
    }
  }, [currentUser, loadFunds, loadHistory]);

  // 添加用户
  const handleAddUser = async () => {
    if (!newUserName.trim()) return;

    try {
      const newUser = storage.addUser(newUserName.trim());
      setUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      setNewUserName('');
      setShowUserModal(false);
    } catch (error) {
      console.error('添加用户失败:', error);
    }
  };

  // 切换用户
  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
  };

  const createFund = async (fund: Fund) => {
    if (!currentUser) return;
    try {
      storage.addFund(currentUser.id, fund);
    } catch (error) {
      console.error('保存基金失败:', error);
    }
  };

  const updateFund = async (fundCode: string, updates: Partial<Fund>) => {
    if (!currentUser) return;
    try {
      storage.updateFund(currentUser.id, fundCode, updates);
    } catch (error) {
      console.error('更新基金失败:', error);
    }
  };

  const deleteFund = async (fundCode: string) => {
    if (!currentUser) return;
    try {
      storage.deleteFund(currentUser.id, fundCode);
    } catch (error) {
      console.error('删除基金失败:', error);
    }
  };

  const saveHistoryPoint = async (fundCode: string, point: HistoryPoint) => {
    if (!currentUser) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      storage.saveHistoryPoint(currentUser.id, fundCode, today, point);
    } catch (error) {
      console.error('保存历史数据失败:', error);
    }
  };

  // 删除用户
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除此用户及其所有基金数据吗？')) return;

    try {
      storage.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));

      if (currentUser?.id === userId) {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('删除用户失败:', error);
    }
  };

  // 获取基金数据
  const fetchFundData = async (fund: Fund) => {
    if (!currentUser) return;
    setLoading(prev => ({ ...prev, [fund.code]: true }));
    try {
      const res = await fetch(`/api/fund/estimate?code=${fund.code}&amount=${fund.currentAmount}`);
      const data = await res.json();

      if (!data.error) {
        setFundData(prev => ({
          ...prev,
          [fund.code]: {
            ...data.estimate,
            profit: data.profit,
            holdingAmount: data.holdingAmount
          }
        }));

        // 记录历史数据
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const historyPoint: HistoryPoint = {
          time: timeStr,
          value: data.estimate.gsz,
          change: data.estimate.gszzl
        };

        setHistoryData(prev => {
          const existing = prev[fund.code] || [];
          // 避免重复记录相同时间的数据
          const filtered = existing.filter(p => p.time !== timeStr);
          // 只保留最近50个数据点
          const newData = [...filtered, historyPoint].slice(-50);
          
          console.log(`[历史数据] ${fund.code} - 时间:${timeStr}, 净值:${historyPoint.value}, 涨跌:${historyPoint.change}%, 总数据点:${newData.length}`);
          
          return { ...prev, [fund.code]: newData };
        });

        await saveHistoryPoint(fund.code, historyPoint);

        // 检查是否需要结算（下午3点后且今天未结算）
        const currentHour = now.getHours();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
        
        const shouldSettlement = currentHour >= 15 && fund.lastSettlementDate !== today;
        
        if (shouldSettlement) {
          // 下午3点后更新当前金额（结算）
          const settledAmount = fund.currentAmount + data.profit;
          setFunds(prevFunds =>
            prevFunds.map(f =>
              f.code === fund.code
                ? {
                    ...f,
                    currentAmount: settledAmount,
                    lastSettlementDate: today
                  }
                : f
            )
          );
          await updateFund(fund.code, { currentAmount: settledAmount, lastSettlementDate: today });
        }
      }
    } catch (error) {
      console.error('获取基金数据失败:', error);
    } finally {
      setLoading(prev => ({ ...prev, [fund.code]: false }));
    }
  };

  // 基金代码列表（用于检测基金增减）
  const fundCodes = useMemo(() => funds.map(f => f.code).join(','), [funds]);

  // 刷新所有基金数据
  useEffect(() => {
    if (funds.length > 0) {
      funds.forEach(fetchFundData);

      // 每30秒自动刷新
      const interval = setInterval(() => {
        funds.forEach(fetchFundData);
      }, 30000);

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundCodes]);

  // 添加基金
  const handleAdd = async () => {
    if (!currentUser || !code || !inputTotalAmount || !inputHoldingProfit) return;

    const currentAmountValue = parseFloat(inputTotalAmount);
    const profitValue = parseFloat(inputHoldingProfit);
    const initialCostValue = currentAmountValue - profitValue;

    const newFund: Fund = {
      code: code.trim(),
      initialCost: initialCostValue,
      currentAmount: currentAmountValue
    };
    setFunds(prev => [...prev, newFund]);
    setCode('');
    setInputTotalAmount('');
    setInputHoldingProfit('');

    await createFund(newFund);
    fetchFundData(newFund);
  };

  // 删除基金
  const handleDelete = async (fundCode: string) => {
    setFunds(prev => prev.filter(f => f.code !== fundCode));
    setFundData(prev => {
      const newData = { ...prev };
      delete newData[fundCode];
      return newData;
    });
    setHistoryData(prev => {
      const newData = { ...prev };
      delete newData[fundCode];
      return newData;
    });
    await deleteFund(fundCode);
  };

  // 开始编辑持仓
  const handleStartEdit = (fund: Fund) => {
    setEditingFund(fund.code);
    setEditAmount(fund.currentAmount.toString());
  };

  // 保存编辑
  const handleSaveEdit = async (fundCode: string) => {
    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount <= 0) return;

    setFunds(prevFunds =>
      prevFunds.map(f =>
        f.code === fundCode
          ? { ...f, currentAmount: newAmount }
          : f
      )
    );

    // 立即刷新该基金数据
    const fund = funds.find(f => f.code === fundCode);
    if (fund) {
      fetchFundData({ ...fund, currentAmount: newAmount });
    }

    await updateFund(fundCode, { currentAmount: newAmount });

    setEditingFund(null);
    setEditAmount('');
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingFund(null);
    setEditAmount('');
  };

  // 计算统计数据
  const totalDayProfit = Object.values(fundData).reduce((sum, data) => sum + (data.profit || 0), 0); // 当日总收益
  const totalAmount = funds.reduce((sum, f) => sum + f.currentAmount, 0); // 当前总金额
  const totalInitialAmount = funds.reduce((sum, f) => sum + f.initialCost, 0); // 初始总金额
  const totalProfit = totalAmount - totalInitialAmount; // 总收益

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-800">基金管理</h1>
        </div>

        {/* 用户Tab栏 */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-8">
          <div className="flex items-center gap-2 overflow-x-auto">
            {users.map(user => (
              <div
                key={user.id}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  currentUser?.id === user.id
                    ? 'border-blue-500 text-blue-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <button
                  onClick={() => handleSwitchUser(user)}
                  className="text-sm md:text-base"
                >
                  {user.name}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUser(user.id);
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="删除用户"
                >
                  ×
                </button>
              </div>
            ))}
            
            {/* 添加用户按钮 */}
            {showUserModal ? (
              <div className="flex items-center gap-2 px-2 py-2">
                <input
                  type="text"
                  placeholder="用户名"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddUser()}
                  onBlur={() => {
                    if (!newUserName.trim()) {
                      setShowUserModal(false);
                    }
                  }}
                  autoFocus
                  className="w-32 px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddUser}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setNewUserName('');
                  }}
                  className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowUserModal(true)}
                className="px-4 py-3 text-gray-400 hover:text-blue-500 transition-colors"
                title="添加用户"
              >
                + 添加用户
              </button>
            )}
          </div>
        </div>

        {/* 主内容区 */}
        <div className="p-4 md:p-8">
          {/* 未选择用户提示 */}
          {!currentUser && users.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-12 text-center">
              <p className="text-yellow-800 text-lg">请选择一个用户查看基金数据</p>
            </div>
          )}

          {users.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
              <p className="text-blue-800 text-lg mb-2">欢迎使用基金管理系统</p>
              <p className="text-blue-600">点击上方&ldquo;添加用户&rdquo;开始使用</p>
            </div>
          )}

          {/* 基金管理区域 */}
          {currentUser && (
            <>
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">添加基金</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="基金代码"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="总金额"
                  value={inputTotalAmount}
                  onChange={(e) => setInputTotalAmount(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="持有收益"
                  value={inputHoldingProfit}
                  onChange={(e) => setInputHoldingProfit(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleAdd}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  添加
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">提示：总金额是当前持有的总价值，持有收益是已有的盈亏（没有填0）</p>
            </div>

            {/* 总览 */}
            {funds.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">总持有</div>
                    <div className="text-2xl font-bold">¥{totalAmount.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">当日收益</div>
                    <div className={`text-2xl font-bold ${totalDayProfit >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {totalDayProfit >= 0 ? '+' : ''}¥{totalDayProfit.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">总收益</div>
                    <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {totalProfit >= 0 ? '+' : ''}¥{totalProfit.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">总收益率</div>
                    <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {totalProfit >= 0 ? '+' : ''}{((totalProfit / totalInitialAmount) * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
                  <p>💡 持仓金额每日下午15:00结算更新，当日收益实时显示但不影响持仓金额</p>
                </div>
              </div>
            )}

            {/* 基金列表 */}
            <div className="grid gap-4">
              {funds.map(fund => {
                const data = fundData[fund.code];
                const isLoading = loading[fund.code];
                
                // 计算该基金的总收益
                const fundTotalProfit = fund.currentAmount - fund.initialCost;
                
                return (
                  <div key={fund.code} className="bg-white rounded-lg shadow-md p-6 relative">
                    {data ? (
                      <>
                        {/* 刷新指示器 */}
                        {isLoading && (
                          <div className="absolute top-2 right-2 w-5 h-5">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800">{data.name}</h3>
                            <p className="text-sm text-gray-500">{data.fundcode}</p>
                          </div>
                          <div className="flex gap-2 mr-8">
                            <button
                              onClick={() => setDetailFundCode(fund.code)}
                              className="text-green-500 hover:text-green-700"
                            >
                              详情
                            </button>
                            <button
                              onClick={() => handleStartEdit(fund)}
                              className="text-blue-500 hover:text-blue-700"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDelete(fund.code)}
                              className="text-red-500 hover:text-red-700"
                            >
                              删除
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          <div>
                            <div className="text-sm text-gray-500">总金额</div>
                            <div className="text-lg font-bold text-blue-600">¥{fund.currentAmount.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">昨日净值</div>
                            <div className="text-lg font-medium">{data.dwjz}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">实时估值</div>
                            <div className="text-lg font-medium">{data.gsz}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">涨跌幅</div>
                            <div className={`text-lg font-medium ${parseFloat(data.gszzl) >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {parseFloat(data.gszzl) >= 0 ? '+' : ''}{data.gszzl}%
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">当日收益</div>
                            <div className={`text-lg font-bold ${data.profit >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {data.profit >= 0 ? '+' : ''}¥{data.profit.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">总收益</div>
                            <div className={`text-lg font-bold ${fundTotalProfit >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {fundTotalProfit >= 0 ? '+' : ''}¥{fundTotalProfit.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          {editingFund === fund.code ? (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm text-gray-500">持有金额:</span>
                              <input
                                type="number"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(fund.code)}
                                className="px-2 py-1 border border-blue-500 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(fund.code)}
                                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                保存
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-between text-sm text-gray-500 mb-2">
                              <span>持有金额: ¥{data.holdingAmount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>
                              {(() => {
                                const now = new Date();
                                const today = now.toISOString().split('T')[0];
                                const isSettled = fund.lastSettlementDate === today;
                                const currentHour = now.getHours();
                                
                                if (isSettled) {
                                  return <span className="text-green-600">✓ 今日已结算</span>;
                                } else if (currentHour >= 15) {
                                  return <span className="text-orange-600">等待结算...</span>;
                                } else {
                                  return <span className="text-gray-500">未到结算时间</span>;
                                }
                              })()}
                            </span>
                            <span>更新时间: {data.gztime}</span>
                          </div>
                        </div>
                      </>
                    ) : isLoading ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <div>加载中...</div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">获取数据失败</div>
                    )}
                  </div>
                );
              })}
            </div>

            {funds.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
                还没有添加基金，请先添加基金
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {/* 基金详情模态框 */}
      {detailFundCode && (() => {
        const fund = funds.find(f => f.code === detailFundCode);
        const data = fundData[detailFundCode];
        const history = historyData[detailFundCode] || [];
        
        if (!fund || !data) return null;

        return (
          <FundDetail
            fund={fund}
            data={data}
            history={history}
            onClose={() => setDetailFundCode(null)}
          />
        );
      })()}
    </div>
  );
}
