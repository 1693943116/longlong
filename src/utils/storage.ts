import { Fund, User, HistoryPoint } from '@/types/fund';

const STORAGE_KEYS = {
  USERS: 'fund_users',
  CURRENT_USER: 'fund_current_user',
  FUNDS: 'fund_funds',
  HISTORY: 'fund_history',
};

// 用户管理
export const storage = {
  // 获取所有用户
  getUsers(): User[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },

  // 保存用户列表
  saveUsers(users: User[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  // 添加用户
  addUser(name: string): User {
    const users = this.getUsers();
    const newUser: User = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
    };
    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  },

  // 删除用户
  deleteUser(userId: string): void {
    const users = this.getUsers().filter(u => u.id !== userId);
    this.saveUsers(users);
    // 同时删除该用户的基金和历史数据
    this.deleteFundsByUser(userId);
    this.deleteHistoryByUser(userId);
  },

  // 获取当前用户
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  // 设置当前用户
  setCurrentUser(user: User | null): void {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  // 获取指定用户的基金列表
  getFunds(userId: string): Fund[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.FUNDS);
    const allFunds: Record<string, Fund[]> = data ? JSON.parse(data) : {};
    return allFunds[userId] || [];
  },

  // 保存指定用户的基金列表
  saveFunds(userId: string, funds: Fund[]): void {
    if (typeof window === 'undefined') return;
    const data = localStorage.getItem(STORAGE_KEYS.FUNDS);
    const allFunds: Record<string, Fund[]> = data ? JSON.parse(data) : {};
    allFunds[userId] = funds;
    localStorage.setItem(STORAGE_KEYS.FUNDS, JSON.stringify(allFunds));
  },

  // 添加基金
  addFund(userId: string, fund: Omit<Fund, 'code'> & { code: string }): void {
    const funds = this.getFunds(userId);
    const existingIndex = funds.findIndex(f => f.code === fund.code);
    
    if (existingIndex >= 0) {
      // 更新现有基金
      funds[existingIndex] = { ...funds[existingIndex], ...fund };
    } else {
      // 添加新基金
      funds.push(fund);
    }
    
    this.saveFunds(userId, funds);
  },

  // 更新基金
  updateFund(userId: string, code: string, updates: Partial<Fund>): void {
    const funds = this.getFunds(userId);
    const index = funds.findIndex(f => f.code === code);
    if (index >= 0) {
      funds[index] = { ...funds[index], ...updates };
      this.saveFunds(userId, funds);
    }
  },

  // 删除基金
  deleteFund(userId: string, code: string): void {
    const funds = this.getFunds(userId).filter(f => f.code !== code);
    this.saveFunds(userId, funds);
    // 同时删除该基金的历史数据
    this.deleteHistoryByFund(userId, code);
  },

  // 删除用户的所有基金
  deleteFundsByUser(userId: string): void {
    if (typeof window === 'undefined') return;
    const data = localStorage.getItem(STORAGE_KEYS.FUNDS);
    const allFunds: Record<string, Fund[]> = data ? JSON.parse(data) : {};
    delete allFunds[userId];
    localStorage.setItem(STORAGE_KEYS.FUNDS, JSON.stringify(allFunds));
  },

  // 获取历史数据
  getHistory(userId: string, date?: string): Record<string, HistoryPoint[]> {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    const allHistory: Record<string, Record<string, Record<string, HistoryPoint[]>>> = data ? JSON.parse(data) : {};
    
    const today = date || new Date().toISOString().split('T')[0];
    return allHistory[userId]?.[today] || {};
  },

  // 保存历史数据点
  saveHistoryPoint(userId: string, fundCode: string, date: string, point: HistoryPoint): void {
    if (typeof window === 'undefined') return;
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    const allHistory: Record<string, Record<string, Record<string, HistoryPoint[]>>> = data ? JSON.parse(data) : {};
    
    if (!allHistory[userId]) allHistory[userId] = {};
    if (!allHistory[userId][date]) allHistory[userId][date] = {};
    if (!allHistory[userId][date][fundCode]) allHistory[userId][date][fundCode] = [];
    
    const points = allHistory[userId][date][fundCode];
    const existingIndex = points.findIndex(p => p.time === point.time);
    
    if (existingIndex >= 0) {
      points[existingIndex] = point;
    } else {
      points.push(point);
      // 只保留最近 50 条
      if (points.length > 50) {
        points.shift();
      }
    }
    
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(allHistory));
  },

  // 删除指定基金的历史数据
  deleteHistoryByFund(userId: string, fundCode: string): void {
    if (typeof window === 'undefined') return;
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    const allHistory: Record<string, Record<string, Record<string, HistoryPoint[]>>> = data ? JSON.parse(data) : {};
    
    if (allHistory[userId]) {
      Object.keys(allHistory[userId]).forEach(date => {
        delete allHistory[userId][date][fundCode];
      });
    }
    
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(allHistory));
  },

  // 删除用户的所有历史数据
  deleteHistoryByUser(userId: string): void {
    if (typeof window === 'undefined') return;
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    const allHistory: Record<string, Record<string, Record<string, HistoryPoint[]>>> = data ? JSON.parse(data) : {};
    delete allHistory[userId];
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(allHistory));
  },

  // 清空所有数据
  clearAll(): void {
    if (typeof window === 'undefined') return;
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },
};
