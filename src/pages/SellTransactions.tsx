import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Fuel, Users, CreditCard, Calendar, User, ArrowUpRight, ArrowDownLeft, Filter, Download, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SellTransactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'party' | 'cash'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedFuel, setSelectedFuel] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [fuels, setFuels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext) || {};

  const fetchUsers = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchFuels = async () => {
    try {
      const res = await api.get('/fuels');
      setFuels(res.data.data);
    } catch (error) {
      console.error('Error fetching fuels:', error);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let query = `?type=${filter === 'all' ? '' : filter}`;
      if (startDate) query += `&startDate=${startDate}`;
      if (endDate) query += `&endDate=${endDate}`;
      if (selectedUser) query += `&user_id=${selectedUser}`;
      if (selectedFuel) query += `&fuel_id=${selectedFuel}`;
      
      const res = await api.get(`/ledger/all-transactions${query}`);
      setTransactions(res.data.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchFuels();
  }, [user?.role]);

  useEffect(() => {
    fetchTransactions();
  }, [filter, startDate, endDate, selectedUser, selectedFuel]);

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedUser('');
    setSelectedFuel('');
    setFilter('all');
  };

  const isIncomeTx = (tx: any) => {
    if (tx.category === 'cash') return true;
    if (tx.category === 'party') {
      if (tx.transaction_id) {
        return tx.Transaction?.type === 'sale';
      } else {
        return tx.type === 'credit'; // Payment received
      }
    }
    return false;
  };

  const exportToExcel = () => {
    if (transactions.length === 0) return;

    const exportData = transactions.map(tx => {
      let description = '';
      if (tx.category === 'party') {
        description = `${tx.description} (${tx.Party?.name})`;
      } else if (tx.category === 'cash') {
        description = `Cash Sale: ${tx.Fuel?.name}`;
      }

      return {
        'Date & Time': formatDate(tx.createdAt),
        'Category': tx.category.toUpperCase(),
        'Description': description,
        'User': tx.User?.username || 'System',
        'Payment Method': tx.payment_method || 'N/A',
        'Amount (৳)': Number(tx.total_amount || tx.amount).toFixed(2),
        'Type': isIncomeTx(tx) ? 'INCOME' : 'EXPENSE'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    
    // Generate filename with date
    const fileName = `Transactions_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportToPDF = () => {
    if (transactions.length === 0) return;

    const doc = new jsPDF();
    
    // Add Header
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text('Salim & Sons', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('Fuel Station Pro - Sell Transactions Report', 14, 30);

    // Add Filters Info
    doc.setFontSize(9);
    let filterText = `Filters Applied: Category: ${filter.toUpperCase()}`;
    if (startDate) filterText += ` | From: ${startDate}`;
    if (endDate) filterText += ` | To: ${endDate}`;
    if (selectedUser) {
      const u = users.find(u => u.id.toString() === selectedUser);
      if (u) filterText += ` | User: ${u.username}`;
    }
    if (selectedFuel) {
      const f = fuels.find(f => f.id.toString() === selectedFuel);
      if (f) filterText += ` | Fuel: ${f.name}`;
    }
    doc.text(filterText, 14, 38);
    
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 44);

    // Prepare Table Data
    const tableColumn = ["Date & Time", "Category", "Description", "User", "Method", "Amount", "Type"];
    const tableRows: any[] = [];

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(tx => {
      let description = '';
      if (tx.category === 'party') {
        description = `${tx.description} (${tx.Party?.name})`;
      } else if (tx.category === 'cash') {
        description = `Cash Sale: ${tx.Fuel?.name}`;
      }

      const amount = Number(tx.total_amount || tx.amount);
      const isIncome = isIncomeTx(tx);
      
      if (isIncome) totalIncome += amount;
      else totalExpense += amount;

      const transactionData = [
        formatDate(tx.createdAt),
        tx.category.toUpperCase(),
        description,
        tx.User?.username || 'System',
        tx.payment_method || 'N/A',
        amount.toFixed(2),
        isIncome ? 'INCOME' : 'EXPENSE'
      ];
      tableRows.push(transactionData);
    });

    // Add Table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        5: { halign: 'right', fontStyle: 'bold' },
        6: { fontStyle: 'bold' }
      },
      didParseCell: function(data: any) {
        if (data.section === 'body' && data.column.index === 6) {
          if (data.cell.raw === 'INCOME') {
            data.cell.styles.textColor = [5, 150, 105]; // Emerald-600
          } else {
            data.cell.styles.textColor = [220, 38, 38]; // Red-600
          }
        }
      }
    });

    // Add Summary
    const finalY = (doc as any).lastAutoTable.finalY || 50;
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text('Summary', 14, finalY + 10);
    
    doc.setFontSize(9);
    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.text(`Total Income: +${totalIncome.toFixed(2)}`, 14, finalY + 16);
    
    doc.setTextColor(220, 38, 38); // Red-600
    doc.text(`Total Expense: -${totalExpense.toFixed(2)}`, 14, finalY + 22);

    doc.setTextColor(15, 23, 42); // Slate-900
    doc.setFontSize(10);
    doc.text(`Net Balance: ${(totalIncome - totalExpense).toFixed(2)}`, 14, finalY + 30);

    // Save PDF
    const fileName = `Transactions_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'party': return <Users size={16} />;
      case 'cash': return <CreditCard size={16} />;
      default: return <Filter size={16} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'party': return 'bg-purple-100 text-purple-600';
      case 'cash': return 'bg-emerald-100 text-emerald-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Sell Transactions</h1>
          <p className="text-slate-500 mt-1">Detailed history of all system transitions.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('party')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === 'party' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Party
          </button>
          <button 
            onClick={() => setFilter('cash')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === 'cash' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Cash
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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
            {fuels.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 w-full md:w-auto md:col-span-5 justify-end mt-2">
          <button 
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center"
          >
            Clear Filters
          </button>
          <button 
            onClick={exportToExcel}
            disabled={transactions.length === 0}
            className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} className="mr-2" /> Excel
          </button>
          <button 
            onClick={exportToPDF}
            disabled={transactions.length === 0}
            className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={16} className="mr-2" /> PDF Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                  </tr>
                ))
              ) : transactions.length > 0 ? (
                transactions.map((tx, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    key={`${tx.category}-${tx.id}`} 
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-slate-600">
                        <Calendar size={14} className="mr-2 opacity-50" />
                        {formatDate(tx.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${getCategoryColor(tx.category)}`}>
                        <span className="mr-1.5">{getCategoryIcon(tx.category)}</span>
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 font-medium">
                        {tx.category === 'party' && (
                          <span>{tx.description} ({tx.Party?.name})</span>
                        )}
                        {tx.category === 'cash' && (
                          <span>
                            Cash Sale: {tx.Fuel?.name}
                          </span>
                        )}
                      </div>
                      {tx.payment_method && (
                        <div className="text-xs text-slate-400 mt-0.5 capitalize">Method: {tx.payment_method}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-slate-600">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mr-2">
                          <User size={12} />
                        </div>
                        {tx.User?.username || 'System'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={`text-sm font-bold ${
                        isIncomeTx(tx)
                        ? 'text-emerald-600' 
                        : 'text-red-600'
                      }`}>
                        {isIncomeTx(tx) ? '+' : '-'}
                        ৳{Number(tx.total_amount || tx.amount).toFixed(2)}
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No transactions found for this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SellTransactions;
