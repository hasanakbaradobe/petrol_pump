import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { AlertTriangle, History, ArrowDownRight, ArrowUpRight, Calendar, User, Fuel } from 'lucide-react';
import { motion } from 'motion/react';

const Inventory = () => {
  const { user } = useContext(AuthContext) || {};

  const [stock, setStock] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedFuel, setSelectedFuel] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  const fetchUsers = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchStock = async () => {
    try {
      const res = await api.get('/inventory/stock');
      setStock(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchHistory = async () => {
    try {
      let query = '?';
      if (startDate) query += `startDate=${startDate}&`;
      if (endDate) query += `endDate=${endDate}&`;
      if (selectedUser) query += `user_id=${selectedUser}&`;
      if (selectedFuel) query += `fuel_id=${selectedFuel}`;

      const res = await api.get(`/inventory/history${query}`);
      setHistory(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchStock();
    fetchUsers();
  }, [user?.role]);

  useEffect(() => {
    fetchHistory();
  }, [startDate, endDate, selectedUser, selectedFuel]);

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedUser('');
    setSelectedFuel('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Inventory</h1>
          <p className="text-slate-500 mt-1">Monitor fuel stock levels and history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {stock.map(fuel => (
          <div key={fuel.id} className={`bg-white p-6 rounded-2xl shadow-sm border ${fuel.low_stock_warning ? 'border-red-200' : 'border-slate-100'} relative overflow-hidden transition-transform hover:-translate-y-1 duration-200`}>
            {fuel.low_stock_warning && (
              <div className="absolute top-0 right-0 bg-red-100 text-red-600 px-3 py-1 rounded-bl-xl text-xs font-bold flex items-center">
                <AlertTriangle size={14} className="mr-1" /> Low Stock
              </div>
            )}
            <h3 className="text-xl font-bold text-slate-900 mb-2">{fuel.name}</h3>
            <div className="flex justify-between items-end mt-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Current Stock</p>
                <p className={`text-3xl font-bold mt-1 ${fuel.low_stock_warning ? 'text-red-600' : 'text-emerald-600'}`}>
                  {Number(fuel.current_stock).toFixed(2)} <span className="text-lg text-slate-400 font-medium">{fuel.unit || 'L'}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-500">Price</p>
                <p className="text-lg font-bold text-slate-900">৳{Number(fuel.price_per_litre).toFixed(2)} / {fuel.unit || 'L'}</p>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-6 overflow-hidden">
              <div 
                className={`h-full rounded-full ${fuel.low_stock_warning ? 'bg-red-500' : 'bg-emerald-500'}`} 
                style={{ width: `${Math.min((Number(fuel.current_stock) / (fuel.threshold * 5)) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        ))}
        {stock.length === 0 && (
          <div className="col-span-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-500">
            No fuel stock data available.
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center mb-4">
          <History size={24} className="text-indigo-600 mr-2" />
          <h2 className="text-2xl font-bold text-slate-900">Fuel Transaction History</h2>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center">
              <Calendar size={12} className="mr-1" /> Start Date
            </label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center">
              <Calendar size={12} className="mr-1" /> End Date
            </label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          {user?.role === 'admin' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center">
                <User size={12} className="mr-1" /> Filter by User
              </label>
              <select 
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">All Users</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center">
              <Fuel size={12} className="mr-1" /> Filter by Fuel
            </label>
            <select 
              value={selectedFuel}
              onChange={(e) => setSelectedFuel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Fuels</option>
              {stock.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center"
          >
            Clear All Filters
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fuel Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Transaction Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {history.length > 0 ? (
                  history.map((item, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      key={item.id} 
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                        {item.Fuel?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.transaction_type === 'in' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              <ArrowDownRight size={14} className="mr-1" /> Stock In
                              {item.Transaction?.type === 'purchase' && ' (Purchase)'}
                              {!item.Transaction && ' (Manual Add)'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                              <ArrowUpRight size={14} className="mr-1" /> Stock Out
                              {item.Transaction?.type === 'sale' && ' (Sale)'}
                              {!item.Transaction && ' (Manual Reduce)'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-slate-600">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mr-2">
                            <User size={12} />
                          </div>
                          {item.Transaction ? item.Transaction.User?.username : item.User?.username || 'System'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-slate-900">
                        {item.transaction_type === 'in' ? '+' : '-'}{Number(item.quantity).toFixed(2)} {item.Fuel?.unit || 'L'}
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No inventory history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
