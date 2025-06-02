'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient?: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  gradient = 'from-blue-500 to-purple-600',
  delay = 0,
}) => {
  return (
    <div
      className="group relative overflow-hidden"
    >
      <div className="glass rounded-xl p-4 hover:shadow-lg transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600 font-medium">{title}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
            
            {trend && (
              <div className="flex items-center mt-2">
                {trend.isPositive ? (
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ml-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(trend.value)}%
                </span>
              </div>
            )}
          </div>
          
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        {/* Subtle gradient overlay on hover */}
        <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-xl`} />
      </div>
    </div>
  );
};

export default StatCard;