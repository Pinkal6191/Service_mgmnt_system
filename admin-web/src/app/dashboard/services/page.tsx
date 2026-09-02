"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Wrench } from 'lucide-react';

export default function ServicesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCatForm, setShowCatForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);

  const [newCat, setNewCat] = useState({ name: '', description: '' });
  const [newService, setNewService] = useState({ category_id: '', name: '', description: '', base_price: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, srvRes] = await Promise.all([
        api.get('/services/categories'),
        api.get('/services')
      ]);
      setCategories(catRes.data);
      setServices(srvRes.data);
    } catch (error) {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/services/categories', newCat);
      toast.success('Category added!');
      setNewCat({ name: '', description: '' });
      setShowCatForm(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add category');
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/services', newService);
      toast.success('Service added!');
      setNewService({ category_id: '', name: '', description: '', base_price: '' });
      setShowServiceForm(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add service');
    }
  };

  if (loading) return <p>Loading catalog...</p>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Wrench className="mr-2" /> Service Catalog
        </h2>
        <div className="space-x-3">
          <button 
            onClick={() => setShowCatForm(!showCatForm)}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
          >
            + Add Category
          </button>
          <button 
            onClick={() => setShowServiceForm(!showServiceForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Add Service
          </button>
        </div>
      </div>

      {showCatForm && (
        <form onSubmit={handleCreateCategory} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
            <input required type="text" className="w-full border p-2 rounded-md" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" className="w-full border p-2 rounded-md" value={newCat.description} onChange={e => setNewCat({...newCat, description: e.target.value})} />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700">Save Category</button>
          </div>
        </form>
      )}

      {showServiceForm && (
        <form onSubmit={handleCreateService} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select required className="w-full border p-2 rounded-md bg-white" value={newService.category_id} onChange={e => setNewService({...newService, category_id: e.target.value})}>
              <option value="">-- Select Category --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
            <input required type="text" className="w-full border p-2 rounded-md" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" className="w-full border p-2 rounded-md" value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (₹)</label>
            <input required type="number" step="0.01" className="w-full border p-2 rounded-md" value={newService.base_price} onChange={e => setNewService({...newService, base_price: e.target.value})} />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700">Save Service</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Categories */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-medium text-gray-800">Categories</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {categories.map(cat => (
              <li key={cat.id} className="px-6 py-4 text-sm text-gray-700">
                <div className="font-medium">{cat.name}</div>
                <div className="text-xs text-gray-400 mt-1">{cat.description}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-medium text-gray-800">Services</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 font-medium">Service Name</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Base Price</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{s.name}</td>
                    <td className="px-6 py-4">{s.category?.name}</td>
                    <td className="px-6 py-4 font-medium">₹{Number(s.base_price).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      {s.is_active ? <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded">Active</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
