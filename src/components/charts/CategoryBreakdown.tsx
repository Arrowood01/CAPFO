'use client';

import React from 'react';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';

interface CategoryData {
  name: string;
  value: number;
}

interface CategoryBreakdownProps {
  data: CategoryData[];
  totalAssets?: number;
}

const GRADIENT_COLORS = [
  'from-blue-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-purple-500 to-pink-600',
  'from-yellow-500 to-orange-600',
  'from-indigo-500 to-blue-600',
];

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ data, totalAssets = 0 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        No category data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      {sortedData.map((category, index) => {
        const percentage = (category.value / maxValue) * 100;
        const gradient = GRADIENT_COLORS[index % GRADIENT_COLORS.length];
        
        return (
          <div
            key={category.name}
            className="group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                {category.name}
              </span>
              <div className="flex items-center space-x-3">
                <AnimatedCost value={category.value} />
                {totalAssets > 0 && (
                  <span className="text-xs text-gray-500">
                    ({((category.value / totalAssets) * 100).toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
            
            <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
              {/* Background with subtle pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="h-full w-full bg-gradient-to-r from-gray-200 to-gray-300" />
              </div>
              
              {/* Progress bar */}
              <div
                className={`absolute top-0 left-0 h-full bg-gradient-to-r ${gradient} rounded-full`}
                style={{ width: `${percentage}%` }}
              >
              </div>
              
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-full" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Animated cost component
const AnimatedCost: React.FC<{ value: number }> = ({ value }) => {
  const { formattedValue } = useAnimatedCounter(value, {
    duration: 1000,
    prefix: '$',
    decimals: 0,
  });

  return (
    <span className="text-sm font-semibold text-gray-900">
      {formattedValue}
    </span>
  );
};

export default CategoryBreakdown;