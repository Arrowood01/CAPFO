'use client';

import React from 'react';
import { AlertTriangle, TrendingDown, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

interface HealthAlertBannerProps {
  overdueAssetsCount: number;
  isYebBelowTarget: boolean;
  isUnderfunded: boolean;
  finalReserveBalance?: number;
  totalDeposits?: number;
  totalExpenses?: number;
  suggestedMonthlyDeposit?: number;
}

const HealthAlertBanner: React.FC<HealthAlertBannerProps> = ({
  overdueAssetsCount,
  isYebBelowTarget,
  isUnderfunded,
  finalReserveBalance = 0,
  totalDeposits = 0,
  totalExpenses = 0,
  suggestedMonthlyDeposit = 0,
}) => {
  const hasIssues = overdueAssetsCount > 0 || isYebBelowTarget || isUnderfunded;

  if (!hasIssues) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-xl p-6 text-white shadow-xl"
      >
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold">All Systems Healthy</h3>
            <p className="text-emerald-100">Your forecast looks great! No immediate concerns detected.</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-r from-red-500 via-orange-500 to-red-600 rounded-xl p-6 text-white shadow-xl"
    >
      <div className="flex items-start space-x-4">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0"
        >
          <AlertTriangle className="w-6 h-6" />
        </motion.div>
        
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-4">Attention Required</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Overdue Assets Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-red-100">Overdue Assets</span>
                <AlertTriangle className="w-4 h-4 text-red-200" />
              </div>
              <div className="text-2xl font-bold">{overdueAssetsCount}</div>
              <p className="text-xs text-red-100 mt-1">Need immediate attention</p>
            </motion.div>

            {/* Reserve Balance Card */}
            {isYebBelowTarget && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-orange-100">Reserve Status</span>
                  <TrendingDown className="w-4 h-4 text-orange-200" />
                </div>
                <div className="text-2xl font-bold">${(finalReserveBalance / 1000).toFixed(1)}k</div>
                <p className="text-xs text-orange-100 mt-1">Below target threshold</p>
              </motion.div>
            )}

            {/* Funding Gap Card */}
            {isUnderfunded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-yellow-100">Funding Gap</span>
                  <DollarSign className="w-4 h-4 text-yellow-200" />
                </div>
                <div className="text-2xl font-bold">${((totalExpenses - totalDeposits) / 1000).toFixed(1)}k</div>
                <p className="text-xs text-yellow-100 mt-1">Additional funding needed</p>
              </motion.div>
            )}
          </div>

          {suggestedMonthlyDeposit > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4 pt-4 border-t border-white/20"
            >
              <p className="text-sm">
                Suggested monthly deposit: <span className="font-bold text-lg">${suggestedMonthlyDeposit.toFixed(2)}</span> per unit
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default HealthAlertBanner;