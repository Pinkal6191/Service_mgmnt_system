"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    COMPANY_NAME: '',
    GST_NUMBER: '',
    CONTACT_EMAIL: '',
    INVOICE_PREFIX: 'INV-'
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data) {
        setSettings({ ...settings, ...res.data });
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (key: string, value: string) => {
    try {
      await api.post('/settings', { key, value });
      toast.success(`${key.replace('_', ' ')} saved!`);
    } catch (error) {
      toast.error(`Failed to save ${key}`);
    }
  };

  if (loading) return <p>Loading settings...</p>;

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Settings className="mr-2" /> System Settings
        </h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {key.replace('_', ' ')}
              </label>
              <input 
                type="text" 
                className="w-full border-gray-300 rounded-md shadow-sm border p-2"
                value={value}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
              />
            </div>
            <button 
              onClick={() => handleSave(key, value)}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
            >
              Save
            </button>
          </div>
        ))}
        
      </div>
    </div>
  );
}
