import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Delete } from 'lucide-react';

const CashCounter = () => {
  const [fuels, setFuels] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    fuel_id: '',
    payment_method: 'cash',
    party_id: '',
    quantity: '',
    total_amount: ''
  });
  const [activeField, setActiveField] = useState<'quantity' | 'total_amount'>('total_amount');

  const fetchData = async () => {
    try {
      const [fuelsRes, partiesRes, salesRes] = await Promise.all([
        api.get('/fuels'),
        api.get('/parties'),
        api.get('/cash/sales')
      ]);
      setFuels(fuelsRes.data.data);
      setParties(partiesRes.data.data);
      setSales(salesRes.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCalculate = (field: 'quantity' | 'total_amount', value: string) => {
    const fuel = fuels.find(f => f.id.toString() === formData.fuel_id);
    if (!fuel || !value) {
      setFormData({ ...formData, [field]: value, [field === 'quantity' ? 'total_amount' : 'quantity']: '' });
      return;
    }

    const price = Number(fuel.price_per_litre);
    const numVal = Number(value);

    if (field === 'quantity') {
      setFormData({ ...formData, quantity: value, total_amount: (numVal * price).toFixed(2) });
    } else {
      setFormData({ ...formData, total_amount: value, quantity: (numVal / price).toFixed(2) });
    }
  };

  const handleDialerInput = (val: string) => {
    if (!formData.fuel_id) {
      alert('Please select a fuel type first');
      return;
    }

    let currentVal = formData[activeField];
    
    if (val === 'C') {
      currentVal = '';
    } else if (val === 'backspace') {
      currentVal = currentVal.slice(0, -1);
    } else {
      if (val === '.' && currentVal.includes('.')) return;
      currentVal += val;
    }

    handleCalculate(activeField, currentVal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/cash/sale', formData);
      setFormData({ fuel_id: '', payment_method: 'cash', party_id: '', quantity: '', total_amount: '' });
      fetchData();
      alert('Sale recorded successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error recording sale');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Cash Counter</h1>
        <p className="text-slate-500 mt-1">Record new fuel sales instantly.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">New Sale</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Fuel Type</label>
                <select required value={formData.fuel_id} onChange={e => setFormData({...formData, fuel_id: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors">
                  <option value="">Select Fuel</option>
                  {fuels.map(f => <option key={f.id} value={f.id}>{f.name} (৳{f.price_per_litre}/{f.unit || 'L'})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Method</label>
                <select required value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors">
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                </select>
              </div>

              {formData.payment_method === 'credit' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Party / Customer</label>
                  <select required value={formData.party_id} onChange={e => setFormData({...formData, party_id: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors">
                    <option value="">Select Party</option>
                    {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div onClick={() => setActiveField('quantity')} className={`p-1 rounded-xl border-2 transition-colors ${activeField === 'quantity' ? 'border-indigo-500' : 'border-transparent'}`}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Quantity</label>
                  <input type="number" step="0.01" value={formData.quantity} onChange={e => handleCalculate('quantity', e.target.value)} onFocus={() => setActiveField('quantity')} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" placeholder="0.00" />
                </div>
                <div onClick={() => setActiveField('total_amount')} className={`p-1 rounded-xl border-2 transition-colors ${activeField === 'total_amount' ? 'border-indigo-500' : 'border-transparent'}`}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Amount (৳)</label>
                  <input type="number" step="0.01" value={formData.total_amount} onChange={e => handleCalculate('total_amount', e.target.value)} onFocus={() => setActiveField('total_amount')} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" placeholder="0.00" />
                </div>
              </div>

              {/* Dialer */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '00'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleDialerInput(key)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-4 rounded-xl text-xl transition-colors shadow-sm"
                  >
                    {key}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleDialerInput('C')}
                  className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-4 rounded-xl text-xl transition-colors shadow-sm col-span-1"
                >
                  C
                </button>
                <button
                  type="button"
                  onClick={() => handleDialerInput('backspace')}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-4 rounded-xl text-xl transition-colors shadow-sm col-span-2 flex justify-center items-center"
                >
                  <Delete size={24} />
                </button>
              </div>

              <button type="submit" disabled={!formData.fuel_id || (!formData.quantity && !formData.total_amount)} className="w-full bg-indigo-600 text-white py-4 px-4 rounded-xl hover:bg-indigo-700 transition-colors font-bold text-lg disabled:opacity-50 mt-6 shadow-sm">
                Record Sale
              </button>
            </form>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">Recent Sales</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Fuel</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Qty</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Method</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(sale.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{sale.Fuel?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{Number(sale.quantity).toFixed(2)} {sale.Fuel?.unit || 'L'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">৳{Number(sale.total_amount).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 capitalize">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${sale.payment_method === 'cash' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>
                          {sale.payment_method}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">No recent sales.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashCounter;
