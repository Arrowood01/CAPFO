'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  bgColorClass?: string;
  textColorClass?: string;
  valueTextColorClass?: string;
  // The 'color' prop is no longer used directly for text, but can be kept for other conditional logic if needed
  // or removed if all styling is now driven by the specific *ColorClass props.
  // For now, let's remove it to avoid confusion with the new props.
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  bgColorClass = "bg-whiteCardBg", // Default to white card background
  textColorClass = "text-defaultText",
  valueTextColorClass = "text-titleText"
}) => {

  // Base card classes
  const cardClasses = `shadow-md rounded-xl p-6 border border-tableDivider flex items-center`; // Match reference image card style

  return (
    <div className={`${cardClasses} ${bgColorClass}`}>
      {icon && <div className="mr-4 p-2 rounded-lg">{icon}</div>}
      <div className="flex-1">
        <h4 className={`text-sm font-medium mb-1 ${textColorClass}`}>{title}</h4>
        <p className={`font-semibold ${valueTextColorClass}`}>{value}</p>
      </div>
    </div>
  );
};

export default StatCard;