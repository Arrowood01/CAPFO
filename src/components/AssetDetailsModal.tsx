'use client';

import React from 'react';
import { X } from 'lucide-react';

interface AssetDetails {
  id: string;
  make?: string;
  model?: string;
  serial_number?: string;
  unit_number?: string;
  install_date?: string;
  purchase_price?: number;
  prior_replace?: string;
  notes?: string;
  description?: string;
  category_name?: string;
  community_name?: string;
}

interface AssetDetailsModalProps {
  asset: AssetDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

const AssetDetailsModal: React.FC<AssetDetailsModalProps> = ({ asset, isOpen, onClose }) => {
  if (!isOpen || !asset) return null;

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null) return 'N/A';
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <h2 className="text-2xl font-semibold">Asset Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-md transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Asset Description */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {asset.description || 'No Description'}
            </h3>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>Community: <strong>{asset.community_name || 'N/A'}</strong></span>
              <span>Category: <strong>{asset.category_name || 'N/A'}</strong></span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identification Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 border-b pb-2">Identification</h4>
              
              <div>
                <label className="text-sm text-gray-500">Make</label>
                <p className="font-medium text-gray-900">{asset.make || 'N/A'}</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Model</label>
                <p className="font-medium text-gray-900">{asset.model || 'N/A'}</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Serial Number</label>
                <p className="font-medium text-gray-900">{asset.serial_number || 'N/A'}</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Unit Number</label>
                <p className="font-medium text-gray-900">{asset.unit_number || 'N/A'}</p>
              </div>
            </div>

            {/* Financial & Date Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 border-b pb-2">Financial & Dates</h4>
              
              <div>
                <label className="text-sm text-gray-500">Install Date</label>
                <p className="font-medium text-gray-900">{formatDate(asset.install_date)}</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Purchase Price</label>
                <p className="font-medium text-gray-900">{formatCurrency(asset.purchase_price)}</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Prior Replacement Date</label>
                <p className="font-medium text-gray-900">{formatDate(asset.prior_replace)}</p>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {asset.notes && (
            <div className="mt-6 space-y-2">
              <h4 className="font-semibold text-gray-700 border-b pb-2">Notes</h4>
              <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-md">
                {asset.notes}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetDetailsModal;