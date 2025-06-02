'use client';

import React from 'react';

interface VisualSeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  gradient?: string;
  className?: string;
}

const VisualSeparator: React.FC<VisualSeparatorProps> = ({
  orientation = 'horizontal',
  gradient = 'from-blue-500 to-purple-600',
  className = '',
}) => {
  const baseClasses = orientation === 'horizontal' 
    ? 'w-full h-1' 
    : 'w-1 h-full';

  return (
    <div
      className={`${baseClasses} bg-gradient-to-r ${gradient} rounded-full ${className}`}
    />
  );
};

export default VisualSeparator;