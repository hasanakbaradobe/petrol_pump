import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Droplets, Search } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const formatDescription = (desc: string, unit?: string) => {
  if (!desc) return '';
  if (!unit) return desc;
  return desc.replace(/(\d+(?:\.\d+)?)L of/, `$1${unit} of`);
};

const PartyLedger = () => {
  const { user } = useContext(AuthContext) || {};
  const isAdmin = user?.role === 'admin';

  const [parties, setParties] = useState<any[]>([]);
  const [fuels, setFuels] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total_sales: 0, total_purchases: 0, total_paid: 0, total_received: 0, net_balance_change: 0 });
  const [selectedParty, setSelectedParty] = useState<string>('');

  const [showPartyForm, setShowPartyForm] = useState(false);
  const [partyForm, setPartyForm] = useState({ name: '', contact_info: '', balance: '' });
  const [editingPartyId, setEditingPartyId] = useState<number | null>(null);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', description: '', type: 'received' });

  const [showFuelForm, setShowFuelForm] = useState(false);
  const [fuelForm, setFuelForm] = useState({ type: 'sale', fuel_id: '', rate: '', quantity: '', total_amount: '', payment_method: 'credit' });

  const [searchQuery, setSearchQuery] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const [partiesRes, fuelsRes] = await Promise.all([
        api.get('/parties'),
        api.get('/fuels')
      ]);
      setParties(partiesRes.data.data);
      setFuels(fuelsRes.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchLedger = async () => {
    try {
      const url = selectedParty ? `/ledger?party_id=${selectedParty}` : '/ledger';
      const res = await api.get(url);
      setLedger(res.data.data);
      setSummary(res.data.summary);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [selectedParty]);

  const handleEditParty = (party: any) => {
    setEditingPartyId(party.id);
    setPartyForm({
      name: party.name,
      contact_info: party.contact_info || '',
      balance: party.balance || ''
    });
    setShowPartyForm(true);
  };

  const confirmDelete = (id: number) => {
    setPartyToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteParty = async () => {
    if (!partyToDelete) return;
    try {
      await api.delete(`/parties/${partyToDelete}`);
      if (selectedParty === partyToDelete.toString()) {
        setSelectedParty('');
      }
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error deleting party');
    }
  };
  const handlePartySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPartyId) {
        await api.put(`/parties/${editingPartyId}`, partyForm);
      } else {
        await api.post('/parties', partyForm);
      }
      setShowPartyForm(false);
      setEditingPartyId(null);
      setPartyForm({ name: '', contact_info: '', balance: '' });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error saving party');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/ledger/payment', { ...paymentForm, party_id: selectedParty });
      setShowPaymentForm(false);
      setPaymentForm({ amount: '', description: '', type: 'received' });
      fetchLedger();
      fetchData(); // to update balances
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error recording payment');
    }
  };

  const handleFuelChange = (fuel_id: string) => {
    const fuel = fuels.find(f => f.id.toString() === fuel_id);
    if (fuel) {
      setFuelForm({ ...fuelForm, fuel_id, rate: fuel.price_per_litre, quantity: '', total_amount: '' });
    } else {
      setFuelForm({ ...fuelForm, fuel_id, rate: '', quantity: '', total_amount: '' });
    }
  };

  const handleFuelCalculate = (field: 'quantity' | 'total_amount' | 'rate', value: string) => {
    const numVal = Number(value);
    
    if (field === 'rate') {
      const qty = Number(fuelForm.quantity);
      if (qty && value) {
        setFuelForm({ ...fuelForm, rate: value, total_amount: (qty * numVal).toFixed(2) });
      } else {
        setFuelForm({ ...fuelForm, rate: value });
      }
    } else if (field === 'quantity') {
      const price = Number(fuelForm.rate);
      if (price && value) {
        setFuelForm({ ...fuelForm, quantity: value, total_amount: (numVal * price).toFixed(2) });
      } else {
        setFuelForm({ ...fuelForm, quantity: value });
      }
    } else if (field === 'total_amount') {
      const price = Number(fuelForm.rate);
      if (price && value) {
        setFuelForm({ ...fuelForm, total_amount: value, quantity: (numVal / price).toFixed(2) });
      } else {
        setFuelForm({ ...fuelForm, total_amount: value });
      }
    }
  };

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        party_id: selectedParty,
        fuel_id: fuelForm.fuel_id,
        quantity: fuelForm.quantity,
        total_amount: fuelForm.total_amount,
        rate: fuelForm.rate,
        payment_method: fuelForm.payment_method
      };

      if (fuelForm.type === 'sale') {
        await api.post('/cash/sale', payload);
      } else {
        await api.post('/ledger/purchase', payload);
      }

      setShowFuelForm(false);
      setFuelForm({ type: 'sale', fuel_id: '', rate: '', quantity: '', total_amount: '', payment_method: 'credit' });
      fetchLedger();
      fetchData(); // to update balances
      alert('Fuel transaction recorded successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error recording fuel transaction');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Party Ledger</h1>
          <p className="text-slate-500 mt-1">Manage credit customers, suppliers, and payments.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setShowPartyForm(true); setEditingPartyId(null); }} className="bg-indigo-600 text-white py-2 px-4 rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-sm flex items-center">
            <Plus size={20} className="mr-2" /> Add Party
          </button>
        )}
      </div>

      {showPartyForm && isAdmin && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-4">{editingPartyId ? 'Edit Party' : 'Add New Party'}</h2>
          <form onSubmit={handlePartySubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Name</label>
              <input type="text" required value={partyForm.name} onChange={e => setPartyForm({...partyForm, name: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Info</label>
              <input type="text" value={partyForm.contact_info} onChange={e => setPartyForm({...partyForm, contact_info: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Opening Balance (৳)</label>
              <input type="number" step="0.01" value={partyForm.balance} onChange={e => setPartyForm({...partyForm, balance: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" placeholder="Positive = They owe you" />
            </div>
            <div className="flex space-x-2">
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-sm">Save</button>
              <button type="button" onClick={() => setShowPartyForm(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 px-4 rounded-xl hover:bg-slate-200 transition-colors font-semibold">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 mb-3">Parties</h2>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name or contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 pl-10 pr-3 border bg-white transition-colors"
                />
              </div>
            </div>
            <ul className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              <li 
                className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedParty === '' ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'border-l-4 border-transparent'}`}
                onClick={() => setSelectedParty('')}
              >
                <p className="font-semibold text-slate-900">All Parties</p>
              </li>
              {parties
                .filter(party => 
                  party.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  (party.contact_info && party.contact_info.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .map(party => (
                <li 
                  key={party.id} 
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedParty === party.id.toString() ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'border-l-4 border-transparent'}`}
                  onClick={() => setSelectedParty(party.id.toString())}
                >
                  <div className="flex justify-between items-center group">
                    <div>
                      <p className="font-semibold text-slate-900">{party.name}</p>
                      <p className={`text-sm font-bold mt-1 ${Number(party.balance) > 0 ? 'text-emerald-600' : Number(party.balance) < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                        {Number(party.balance) > 0 
                          ? `They owe you: ৳${Math.abs(Number(party.balance)).toFixed(2)}` 
                          : Number(party.balance) < 0 
                            ? `You owe them: ৳${Math.abs(Number(party.balance)).toFixed(2)}` 
                            : 'Settled (৳0.00)'}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditParty(party); }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Party"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); confirmDelete(party.id); }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Party"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
              {parties.filter(party => 
                  party.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  (party.contact_info && party.contact_info.toLowerCase().includes(searchQuery.toLowerCase()))
                ).length === 0 && (
                <li className="p-6 text-center text-sm text-slate-500">
                  No parties found matching "{searchQuery}"
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {selectedParty && (
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  {parties.find(p => p.id.toString() === selectedParty)?.name}
                </h2>
                <p className="text-indigo-700 mt-1">Current Balance Status</p>
              </div>
              <div className="text-right">
                {(() => {
                  const party = parties.find(p => p.id.toString() === selectedParty);
                  if (!party) return null;
                  const bal = Number(party.balance);
                  if (bal > 0) {
                    return (
                      <>
                        <p className="text-sm font-bold text-emerald-700 uppercase tracking-wider">They owe you</p>
                        <p className="text-3xl font-black text-emerald-600">৳{Math.abs(bal).toFixed(2)}</p>
                      </>
                    );
                  } else if (bal < 0) {
                    return (
                      <>
                        <p className="text-sm font-bold text-red-700 uppercase tracking-wider">You owe them</p>
                        <p className="text-3xl font-black text-red-600">৳{Math.abs(bal).toFixed(2)}</p>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Account Settled</p>
                        <p className="text-3xl font-black text-slate-700">৳0.00</p>
                      </>
                    );
                  }
                })()}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm font-medium text-slate-500">Total Sales (They Owe)</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">৳{summary.total_sales.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm font-medium text-slate-500">Total Purchases (We Owe)</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">৳{summary.total_purchases.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm font-medium text-slate-500">Payments Received</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">৳{summary.total_received.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm font-medium text-slate-500">Payments Given</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">৳{summary.total_paid.toFixed(2)}</p>
            </div>
          </div>

          {selectedParty && (
            <div className="flex justify-end space-x-3">
              <button onClick={() => { setShowFuelForm(!showFuelForm); setShowPaymentForm(false); }} className="bg-blue-600 text-white py-2 px-5 rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-sm flex items-center">
                <Droplets size={18} className="mr-2" /> Fuel Transaction
              </button>
              <button onClick={() => { setShowPaymentForm(!showPaymentForm); setShowFuelForm(false); }} className="bg-emerald-600 text-white py-2 px-5 rounded-xl hover:bg-emerald-700 transition-colors font-semibold shadow-sm">
                Record Payment
              </button>
            </div>
          )}

          {showFuelForm && selectedParty && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Fuel Transaction</h2>
              <form onSubmit={handleFuelSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Transaction Type</label>
                    <select required value={fuelForm.type} onChange={e => setFuelForm({...fuelForm, type: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors">
                      <option value="sale">Sale (Party buys from us)</option>
                      <option value="purchase">Purchase (We buy from Party)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Method</label>
                    <select required value={fuelForm.payment_method} onChange={e => setFuelForm({...fuelForm, payment_method: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors">
                      <option value="credit">Credit (Add to Ledger)</option>
                      <option value="cash">Cash (No Ledger Impact)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Fuel Type</label>
                    <select required value={fuelForm.fuel_id} onChange={e => handleFuelChange(e.target.value)} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors">
                      <option value="">Select Fuel</option>
                      {fuels.map(f => <option key={f.id} value={f.id}>{f.name} (Default: ৳{f.price_per_litre}/{f.unit || 'L'})</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Rate (৳)</label>
                    <input type="number" step="0.01" value={fuelForm.rate} onChange={e => handleFuelCalculate('rate', e.target.value)} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Quantity {fuelForm.fuel_id ? `(${fuels.find(f => f.id.toString() === fuelForm.fuel_id)?.unit || 'L'})` : ''}
                    </label>
                    <input type="number" step="0.01" value={fuelForm.quantity} onChange={e => handleFuelCalculate('quantity', e.target.value)} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Total Amount (৳)</label>
                    <input type="number" step="0.01" value={fuelForm.total_amount} onChange={e => handleFuelCalculate('total_amount', e.target.value)} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" placeholder="0.00" />
                  </div>
                </div>
                <div className="flex space-x-2 pt-2">
                  <button type="submit" disabled={!fuelForm.fuel_id || (!fuelForm.quantity && !fuelForm.total_amount)} className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-sm disabled:opacity-50">Save Transaction</button>
                  <button type="button" onClick={() => setShowFuelForm(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 px-4 rounded-xl hover:bg-slate-200 transition-colors font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {showPaymentForm && selectedParty && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Record Payment</h2>
              <form onSubmit={handlePaymentSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Type</label>
                  <select required value={paymentForm.type} onChange={e => setPaymentForm({...paymentForm, type: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors">
                    <option value="received">Received (from Customer)</option>
                    <option value="given">Given (to Supplier)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Amount (৳)</label>
                  <input type="number" step="0.01" required value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                  <input type="text" value={paymentForm.description} onChange={e => setPaymentForm({...paymentForm, description: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" placeholder="e.g., Cash payment" />
                </div>
                <div className="flex space-x-2">
                  <button type="submit" className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-xl hover:bg-emerald-700 transition-colors font-semibold shadow-sm">Save</button>
                  <button type="button" onClick={() => setShowPaymentForm(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 px-4 rounded-xl hover:bg-slate-200 transition-colors font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Party</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Description</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Quantity</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Amount</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Type</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {ledger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(entry.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{entry.Party?.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDescription(entry.description, entry.Transaction?.Fuel?.unit)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600">
                        {entry.Transaction?.quantity ? `${Number(entry.Transaction.quantity).toFixed(2)} ${entry.Transaction.Fuel?.unit || 'L'}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right text-slate-900">৳{Number(entry.amount).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {(() => {
                          let label = '';
                          let colorClass = '';
                          if (entry.transaction_id) {
                            if (entry.type === 'debit') { label = 'Sale'; colorClass = 'bg-blue-100 text-blue-800'; }
                            else { label = 'Purchase'; colorClass = 'bg-purple-100 text-purple-800'; }
                          } else {
                            if (entry.type === 'credit') { label = 'Received'; colorClass = 'bg-emerald-100 text-emerald-800'; }
                            else { label = 'Given'; colorClass = 'bg-orange-100 text-orange-800'; }
                          }
                          return (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${colorClass}`}>
                              {label.toUpperCase()}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">No ledger entries found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Party"
        message="Are you sure you want to delete this party? All associated ledger entries will be permanently deleted."
        onConfirm={handleDeleteParty}
        onCancel={() => {
          setDeleteModalOpen(false);
          setPartyToDelete(null);
        }}
      />
    </div>
  );
};

export default PartyLedger;
