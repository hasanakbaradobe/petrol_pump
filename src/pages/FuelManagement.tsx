import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Edit2, Trash2, Lock, Unlock, Plus } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const FuelManagement = () => {
  const [fuels, setFuels] = useState<any[]>([]);
  const { user } = useContext(AuthContext) || {};
  const isAdmin = user?.role === 'admin';

  const [formData, setFormData] = useState({ name: '', price_per_litre: '', current_stock: '', unit: 'L' });
  const [editingId, setEditingId] = useState<number | null>(null);

  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [stockForm, setStockForm] = useState({ fuel_id: '', quantity: '', type: 'in' });

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fuelToDelete, setFuelToDelete] = useState<number | null>(null);

  const fetchFuels = async () => {
    try {
      const res = await api.get('/fuels');
      setFuels(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchFuels();
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    try {
      const res = await api.post('/auth/verify-password', { password });
      if (res.data.success) {
        setIsUnlocked(true);
        setPassword('');
      }
    } catch (error: any) {
      setUnlockError(error.response?.data?.message || 'Incorrect password');
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setEditingId(null);
    setFormData({ name: '', price_per_litre: '', current_stock: '', unit: 'L' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/fuels/${editingId}`, formData);
      } else {
        await api.post('/fuels', formData);
      }
      setFormData({ name: '', price_per_litre: '', current_stock: '', unit: 'L' });
      setEditingId(null);
      fetchFuels();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error saving fuel');
    }
  };

  const confirmDelete = (id: number) => {
    setFuelToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!fuelToDelete) return;
    try {
      await api.delete(`/fuels/${fuelToDelete}`);
      fetchFuels();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (fuel: any) => {
    setEditingId(fuel.id);
    setFormData({ name: fuel.name, price_per_litre: fuel.price_per_litre, current_stock: fuel.current_stock, unit: fuel.unit || 'L' });
  };

  const handleAddStockClick = (fuel: any) => {
    setStockForm({ fuel_id: fuel.id, quantity: '', type: 'in' });
    setShowAddStockModal(true);
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/inventory/opening-stock', stockForm);
      setShowAddStockModal(false);
      setStockForm({ fuel_id: '', quantity: '', type: 'in' });
      fetchFuels();
      alert('Stock adjusted successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error adjusting stock');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Fuel Management</h1>
        <p className="text-slate-500 mt-1">Manage fuel types, prices, and stock.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {isAdmin && !isUnlocked && (
          <div className="xl:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-6">
              <div className="flex items-center justify-center w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full mb-4">
                <Lock size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Unlock to Edit</h2>
              <p className="text-sm text-slate-500 mb-6">Please enter your admin password to add, edit, or delete fuels.</p>
              
              <form onSubmit={handleUnlock} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                  <input 
                    type="password" 
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" 
                    placeholder="Enter password" 
                  />
                  {unlockError && <p className="text-red-500 text-sm mt-1">{unlockError}</p>}
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-sm flex justify-center items-center">
                  <Unlock size={18} className="mr-2" /> Unlock
                </button>
              </form>
            </div>
          </div>
        )}

        {isAdmin && isUnlocked && (
          <div className="xl:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Fuel' : 'Add New Fuel'}</h2>
                <button onClick={handleLock} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors" title="Lock Editing">
                  <Lock size={18} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Fuel Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" placeholder="e.g., Petrol 95" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Price (৳)</label>
                    <input type="number" step="0.01" required value={formData.price_per_litre} onChange={e => setFormData({...formData, price_per_litre: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Unit</label>
                    <input type="text" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" placeholder="e.g., L, kg, m³" />
                  </div>
                </div>
                {!editingId && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Initial Stock</label>
                    <input type="number" step="0.01" required value={formData.current_stock} onChange={e => setFormData({...formData, current_stock: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" placeholder="0.00" />
                  </div>
                )}
                <div className="flex space-x-3 pt-2">
                  <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-sm">
                    {editingId ? 'Update Fuel' : 'Add Fuel'}
                  </button>
                  {editingId && (
                    <button type="button" onClick={() => { setEditingId(null); setFormData({name:'', price_per_litre:'', current_stock:'', unit: 'L'}); }} className="flex-1 bg-slate-100 text-slate-700 py-3 px-4 rounded-xl hover:bg-slate-200 transition-colors font-semibold">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ${isAdmin ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                  {isAdmin && <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {fuels.map((fuel) => (
                  <tr key={fuel.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{fuel.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">৳{Number(fuel.price_per_litre).toFixed(2)} / {fuel.unit || 'L'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <span className="bg-slate-100 text-slate-700 py-1 px-3 rounded-full font-medium">
                        {Number(fuel.current_stock).toFixed(2)} {fuel.unit || 'L'}
                      </span>
                    </td>
                    {isAdmin && isUnlocked && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleAddStockClick(fuel)} className="text-emerald-600 hover:text-emerald-900 mr-4 p-2 hover:bg-emerald-50 rounded-lg transition-colors inline-flex" title="Add/Reduce Stock"><Plus size={18} /></button>
                        <button onClick={() => handleEdit(fuel)} className="text-indigo-600 hover:text-indigo-900 mr-4 p-2 hover:bg-indigo-50 rounded-lg transition-colors inline-flex" title="Edit Fuel"><Edit2 size={18} /></button>
                        <button onClick={() => confirmDelete(fuel.id)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors inline-flex" title="Delete Fuel"><Trash2 size={18} /></button>
                      </td>
                    )}
                    {isAdmin && !isUnlocked && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <span className="text-slate-400 text-xs italic">Locked</span>
                      </td>
                    )}
                  </tr>
                ))}
                {fuels.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 4 : 3} className="px-6 py-8 text-center text-sm text-slate-500">No fuels found. Add one to get started.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Fuel"
        message="Are you sure you want to delete this fuel? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setFuelToDelete(null);
        }}
      />

      {/* Add Stock Modal */}
      {showAddStockModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Adjust Fuel Stock</h3>
              <p className="text-sm text-slate-500 mt-1">
                {fuels.find(f => f.id === stockForm.fuel_id)?.name}
              </p>
            </div>
            
            <form onSubmit={handleStockSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Adjustment Type</label>
                <select required value={stockForm.type} onChange={e => setStockForm({...stockForm, type: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors">
                  <option value="in">Add Stock (In)</option>
                  <option value="out">Reduce Stock (Out)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Quantity</label>
                <input type="number" step="0.01" required value={stockForm.quantity} onChange={e => setStockForm({...stockForm, quantity: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" placeholder="0.00" />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddStockModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 px-4 rounded-xl hover:bg-slate-200 transition-colors font-semibold">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-sm">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelManagement;
