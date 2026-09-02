"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Users as UsersIcon } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'TECHNICIAN',
    branch_id: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, branchesRes] = await Promise.all([
        api.get('/users'), // Master/Branch admins get to see users
        api.get('/locations/branches')
      ]);
      setUsers(usersRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', newUser);
      toast.success('User registered successfully!');
      setNewUser({ full_name: '', email: '', phone: '', password: '', role: 'TECHNICIAN', branch_id: '' });
      setShowForm(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add user');
    }
  };

  if (loading) return <p>Loading users...</p>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <UsersIcon className="mr-2" /> Manage Users & Techs
        </h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Add New User
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateUser} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input required type="text" className="w-full border p-2 rounded-md" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input required type="email" className="w-full border p-2 rounded-md" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input required type="text" className="w-full border p-2 rounded-md" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input required type="password" className="w-full border p-2 rounded-md" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select required className="w-full border p-2 rounded-md bg-white" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
              <option value="TECHNICIAN">Technician</option>
              <option value="BRANCH_ADMIN">Branch Admin</option>
              <option value="MASTER_ADMIN">Master Admin</option>
            </select>
          </div>
          {newUser.role !== 'MASTER_ADMIN' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Branch</label>
              <select required className="w-full border p-2 rounded-md bg-white" value={newUser.branch_id} onChange={e => setNewUser({...newUser, branch_id: e.target.value})}>
                <option value="">-- Select Branch --</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          
          <div className="md:col-span-2 flex justify-end mt-2">
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700">Save User</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Branch</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => {
                const userBranch = branches.find(b => b.id === u.branch_id);
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{u.full_name}</td>
                    <td className="px-6 py-4">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        u.role === 'MASTER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'BRANCH_ADMIN' ? 'bg-blue-100 text-blue-700' :
                        u.role === 'CUSTOMER' ? 'bg-gray-100 text-gray-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">{userBranch ? userBranch.name : '-'}</td>
                    <td className="px-6 py-4">
                      {u.is_active ? 
                        <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded">Active</span> :
                        <span className="text-red-600 text-xs bg-red-50 px-2 py-1 rounded">Disabled</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
