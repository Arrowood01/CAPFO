'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface Community {
  id: string;
  name: string;
  unit_count: number | null;
  monthly_deposit: number | null;
  current_balance: number | null;
}

const CommunitiesManagement: React.FC = () => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    units: '',
    monthlyDeposit: '',
    balance: ''
  });
  const [saving, setSaving] = useState(false);

  // Fetch communities from Supabase
  const fetchCommunities = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('communities')
        .select('id, name, unit_count, monthly_deposit, current_balance')
        .order('name');

      if (error) throw error;
      setCommunities(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching communities:', err);
      setError('Failed to load communities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const calculatePerUnitMonth = (monthlyDeposit: number | null, units: number | null): number => {
    if (!monthlyDeposit || !units || units <= 0) return 0;
    return monthlyDeposit / units;
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null || amount === undefined) return '$0';
    return `$${amount.toLocaleString()}`;
  };

  const openAddModal = () => {
    setEditingCommunity(null);
    setFormData({ name: '', units: '', monthlyDeposit: '', balance: '' });
    setShowModal(true);
  };

  const openEditModal = (community: Community) => {
    setEditingCommunity(community);
    setFormData({
      name: community.name,
      units: community.unit_count?.toString() || '',
      monthlyDeposit: community.monthly_deposit?.toString() || '',
      balance: community.current_balance?.toString() || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCommunity(null);
    setFormData({ name: '', units: '', monthlyDeposit: '', balance: '' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    // Validate form
    if (!formData.name.trim()) {
      alert('Community name is required');
      return;
    }

    const units = parseInt(formData.units);
    const monthlyDeposit = parseFloat(formData.monthlyDeposit);
    const balance = parseFloat(formData.balance);

    if (isNaN(units) || units <= 0) {
      alert('Number of units must be a positive number');
      return;
    }

    if (isNaN(monthlyDeposit) || monthlyDeposit < 0) {
      alert('Monthly deposit must be a non-negative number');
      return;
    }

    if (isNaN(balance)) {
      alert('Current balance must be a valid number');
      return;
    }

    setSaving(true);
    try {
      const communityData = {
        name: formData.name.trim(),
        unit_count: units,
        monthly_deposit: monthlyDeposit,
        current_balance: balance
      };

      if (editingCommunity) {
        // Update existing community
        const { error } = await supabase
          .from('communities')
          .update(communityData)
          .eq('id', editingCommunity.id);

        if (error) throw error;
      } else {
        // Add new community
        const { error } = await supabase
          .from('communities')
          .insert([communityData]);

        if (error) throw error;
      }

      // Refresh the communities list
      await fetchCommunities();
      closeModal();
    } catch (err) {
      console.error('Error saving community:', err);
      alert('Failed to save community. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const community = communities.find(c => c.id === id);
    if (community && window.confirm(`Are you sure you want to delete "${community.name}"?`)) {
      try {
        const { error } = await supabase
          .from('communities')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        // Refresh the communities list
        await fetchCommunities();
      } catch (err) {
        console.error('Error deleting community:', err);
        alert('Failed to delete community. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">Loading communities...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
            <button 
              onClick={fetchCommunities}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Communities</h1>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Plus className="w-5 h-5" />
            Add Community
          </button>
        </div>

        {/* Communities Grid */}
        {communities.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">No communities found</div>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Your First Community
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communities.map((community) => (
              <div key={community.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">{community.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(community)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(community.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Number of units:</span>
                    <span className="font-medium">{community.unit_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly deposit:</span>
                    <span className="font-medium">{formatCurrency(community.monthly_deposit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current balance:</span>
                    <span className="font-medium">{formatCurrency(community.current_balance)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-3">
                    <span className="text-gray-600">Per unit/month:</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(calculatePerUnitMonth(community.monthly_deposit, community.unit_count))}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingCommunity ? 'Edit Community' : 'Add New Community'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Community Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter community name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Units
                  </label>
                  <input
                    type="number"
                    name="units"
                    value={formData.units}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter number of units"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Deposit
                  </label>
                  <input
                    type="number"
                    name="monthlyDeposit"
                    value={formData.monthlyDeposit}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter monthly deposit amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Balance
                  </label>
                  <input
                    type="number"
                    name="balance"
                    value={formData.balance}
                    onChange={handleInputChange}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter current balance"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 p-6 border-t">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : (editingCommunity ? 'Update' : 'Save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunitiesManagement;