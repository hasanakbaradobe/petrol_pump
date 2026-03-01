import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Droplets, Banknote, AlertTriangle, TrendingUp, Users, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, Cell } from 'recharts';
import { format, subDays, isSameDay, parseISO } from 'date-fns';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    fuels: 0,
    salesCount: 0,
    lowStock: 0,
    totalSalesToday: 0,
    totalSalesAllTime: 0,
    totalReceivables: 0,
    totalPayables: 0,
  });

  const [stockData, setStockData] = useState<any[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [fuelsRes, salesRes, stockRes, partiesRes] = await Promise.all([
          api.get('/fuels'),
          api.get('/cash/sales'),
          api.get('/inventory/stock'),
          api.get('/parties')
        ]);
        
        const fuels = fuelsRes.data.data || [];
        const sales = salesRes.data.data || [];
        const stock = stockRes.data.data || [];
        const parties = partiesRes.data.data || [];

        // Calculate Stock Metrics
        const lowStockCount = stock.filter((f: any) => f.low_stock_warning).length;
        
        // Calculate Sales Metrics
        const today = new Date();
        let salesToday = 0;
        let salesAllTime = 0;
        
        sales.forEach((sale: any) => {
          const amount = Number(sale.total_amount) || 0;
          salesAllTime += amount;
          if (isSameDay(parseISO(sale.createdAt), today)) {
            salesToday += amount;
          }
        });

        // Calculate Party Metrics
        let receivables = 0;
        let payables = 0;
        parties.forEach((party: any) => {
          const bal = Number(party.balance) || 0;
          if (bal > 0) receivables += bal;
          else if (bal < 0) payables += Math.abs(bal);
        });

        setStats({
          fuels: fuels.length,
          salesCount: sales.length,
          lowStock: lowStockCount,
          totalSalesToday: salesToday,
          totalSalesAllTime: salesAllTime,
          totalReceivables: receivables,
          totalPayables: payables,
        });

        // Prepare Chart Data: Stock Levels
        setStockData(stock.map((s: any) => ({
          name: s.name,
          stock: Number(s.current_stock),
          threshold: s.threshold,
          unit: s.unit || 'L'
        })));

        // Prepare Chart Data: Sales Trend (Last 7 Days)
        const trendData = [];
        for (let i = 6; i >= 0; i--) {
          const d = subDays(today, i);
          const dayStr = format(d, 'MMM dd');
          
          const daySales = sales.filter((s: any) => isSameDay(parseISO(s.createdAt), d))
                                .reduce((sum: number, s: any) => sum + Number(s.total_amount), 0);
          
          trendData.push({
            date: dayStr,
            sales: daySales
          });
        }
        setSalesTrend(trendData);

        // Recent Sales Table Data
        setRecentSales(sales.slice(0, 5));

      } catch (error) {
        console.error('Error fetching dashboard stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const statCards = [
    { title: 'Sales Today', value: `৳${stats.totalSalesToday.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: <TrendingUp size={24} className="text-emerald-600" />, bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { title: 'Total Receivables', value: `৳${stats.totalReceivables.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: <ArrowUpRight size={24} className="text-blue-600" />, bg: 'bg-blue-50', border: 'border-blue-100', subtitle: 'Customers owe us' },
    { title: 'Total Payables', value: `৳${stats.totalPayables.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: <ArrowDownRight size={24} className="text-red-600" />, bg: 'bg-red-50', border: 'border-red-100', subtitle: 'We owe suppliers' },
    { title: 'Low Stock Alerts', value: stats.lowStock, icon: <AlertTriangle size={24} className="text-amber-600" />, bg: 'bg-amber-50', border: 'border-amber-100', subtitle: 'Fuels below threshold' },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">Real-time insights into your petrol pump operations.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-2xl shadow-sm border ${stat.border} flex flex-col justify-between transition-transform hover:-translate-y-1 duration-200`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                {stat.icon}
              </div>
            </div>
            {stat.subtitle && (
              <p className="text-xs font-medium text-slate-400 mt-4">{stat.subtitle}</p>
            )}
          </div>
        ))}
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Sales Trend (Last 7 Days)</h2>
          <div className="w-full" style={{ minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `৳${val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`৳${value.toFixed(2)}`, 'Sales']}
                />
                <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Stock Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Current Inventory Levels</h2>
          <div className="w-full" style={{ minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stockData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string, props: any) => [`${value} ${props.payload.unit || 'L'}`, 'Current Stock']}
                />
                <Bar dataKey="stock" radius={[6, 6, 0, 0]}>
                  {stockData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.stock <= entry.threshold ? '#f59e0b' : '#4f46e5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Recent Sales</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Fuel</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Quantity</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Amount</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Payment</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {recentSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {format(parseISO(sale.createdAt), 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                    {sale.Fuel?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {Number(sale.quantity).toFixed(2)} {sale.Fuel?.unit || 'L'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right text-slate-900">
                    ৳{Number(sale.total_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${sale.payment_method === 'cash' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                      {sale.payment_method.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {recentSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">No recent sales found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
