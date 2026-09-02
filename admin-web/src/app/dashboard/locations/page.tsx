"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { MapPin, Plus } from 'lucide-react';

export default function LocationsPage() {
  const [cities, setCities] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newCityName, setNewCityName] = useState('');
  const [showCityForm, setShowCityForm] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);

  const [newBranch, setNewBranch] = useState({
    city_id: '',
    name: '',
    address: '',
    contact_number: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [citiesRes, branchesRes] = await Promise.all([
        api.get('/locations/cities'),
        api.get('/locations/branches')
      ]);
      setCities(citiesRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/locations/cities', { name: newCityName });
      toast.success('City added successfully!');
      setNewCityName('');
      setShowCityForm(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add city');
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/locations/branches', newBranch);
      toast.success('Branch added successfully!');
      setNewBranch({ city_id: '', name: '', address: '', contact_number: '' });
      setShowBranchForm(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add branch');
    }
  };

  if (loading) return <p>Loading locations...</p>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <MapPin className="mr-2" /> Manage Locations
        </h2>
        <div className="space-x-3">
          <button 
            onClick={() => setShowCityForm(!showCityForm)}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
          >
            + Add City
          </button>
          <button 
            onClick={() => setShowBranchForm(!showBranchForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Add Branch
          </button>
        </div>
      </div>

      {/* Forms */}
      {showCityForm && (
        <form onSubmit={handleCreateCity} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">City Name</label>
            <input 
              required
              type="text" 
              className="w-full border-gray-300 rounded-md shadow-sm border p-2"
              value={newCityName}
              onChange={(e) => setNewCityName(e.target.value)}
            />
          </div>
          <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700">Save City</button>
        </form>
      )}

      {showBranchForm && (
        <form onSubmit={handleCreateBranch} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select City</label>
            <select 
              required
              className="w-full border-gray-300 rounded-md shadow-sm border p-2"
              value={newBranch.city_id}
              onChange={(e) => setNewBranch({...newBranch, city_id: e.target.value})}
            >
              <option value="">-- Choose City --</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
            <input 
              required
              type="text" 
              className="w-full border-gray-300 rounded-md shadow-sm border p-2"
              value={newBranch.name}
              onChange={(e) => setNewBranch({...newBranch, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
            <input 
              required
              type="text" 
              className="w-full border-gray-300 rounded-md shadow-sm border p-2"
              value={newBranch.contact_number}
              onChange={(e) => setNewBranch({...newBranch, contact_number: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
            <input 
              required
              type="text" 
              className="w-full border-gray-300 rounded-md shadow-sm border p-2"
              value={newBranch.address}
              onChange={(e) => setNewBranch({...newBranch, address: e.target.value})}
            />
          </div>
          <div className="col-span-2 flex justify-end">
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700">Save Branch</button>
          </div>
        </form>
      )}

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Cities List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-medium text-gray-800">Cities List</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {cities.map(city => (
              <li key={city.id} className="px-6 py-4 text-sm text-gray-600 flex justify-between">
                <span>{city.name}</span>
                <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded">Active</span>
              </li>
            ))}
            {cities.length === 0 && <li className="px-6 py-4 text-sm text-gray-400">No cities added yet.</li>}
          </ul>
        </div>

        {/* Branches List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-medium text-gray-800">Branches List</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 font-medium">Branch Name</th>
                  <th className="px-6 py-3 font-medium">City</th>
                  <th className="px-6 py-3 font-medium">Contact</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {branches.map(branch => (
                  <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{branch.name}</td>
                    <td className="px-6 py-4">{branch.city?.name}</td>
                    <td className="px-6 py-4">{branch.contact_number}</td>
                    <td className="px-6 py-4">
                      <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {branches.length === 0 && <div className="px-6 py-4 text-sm text-gray-400">No branches added yet.</div>}
          </div>
        </div>

      </div>
    </div>
  );
}
