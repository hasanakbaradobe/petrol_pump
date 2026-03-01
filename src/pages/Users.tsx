import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Plus, Trash2, Shield, User as UserIcon, Edit2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const Users = () => {
  const { user } = useContext(AuthContext) || {};
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'operator' });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        // Only send password if it's not empty
        const payload = { ...formData };
        if (!payload.password) {
          delete (payload as any).password;
        }
        await api.put(`/auth/users/${editingUserId}`, payload);
        alert('User updated successfully!');
      } else {
        await api.post('/auth/register', formData);
        alert('User created successfully!');
      }
      setShowForm(false);
      setEditingUserId(null);
      setFormData({ username: '', password: '', role: 'operator' });
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error saving user');
    }
  };

  const handleEdit = (userToEdit: any) => {
    setFormData({ username: userToEdit.username, password: '', role: userToEdit.role });
    setEditingUserId(userToEdit.id);
    setShowForm(true);
  };

  const confirmDelete = (id: number) => {
    if (id === user?.id) {
      alert('You cannot delete your own account.');
      return;
    }
    setUserToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/auth/users/${userToDelete}`);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error deleting user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Users</h1>
          <p className="text-slate-500 mt-1">Manage system access and roles.</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingUserId(null); setFormData({ username: '', password: '', role: 'operator' }); }} className="bg-indigo-600 text-white py-2 px-4 rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-sm flex items-center">
          <Plus size={20} className="mr-2" /> Add User
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-4">{editingUserId ? 'Edit User' : 'Add New User'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Username</label>
              <input type="text" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">{editingUserId ? 'New Password (Optional)' : 'Password'}</label>
              <input type="password" required={!editingUserId} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors" placeholder={editingUserId ? "Leave blank to keep current" : ""} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
              <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-slate-50 focus:bg-white transition-colors">
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-sm">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 px-4 rounded-xl hover:bg-slate-200 transition-colors font-semibold">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Username</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Created At</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 flex items-center">
                    <div className={`p-2 rounded-full mr-3 ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                      {u.role === 'admin' ? <Shield size={16} /> : <UserIcon size={16} />}
                    </div>
                    {u.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(u)} className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-lg transition-colors inline-flex mr-2">
                      <Edit2 size={18} />
                    </button>
                    {u.id !== user?.id && (
                      <button onClick={() => confirmDelete(u.id)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors inline-flex">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setUserToDelete(null);
        }}
      />
    </div>
  );
};

export default Users;
