'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  color?: "red" | "yellow" | "green" | "gray";
}

const StatCard: React.FC<StatCardProps> = ({ title, value, color = "gray" }) => {
  const colorMap = {
    red: "text-red-600",
    yellow: "text-yellow-600",
    green: "text-green-600",
    gray: "text-gray-600"
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h4 className="text-sm text-gray-500 mb-2">{title}</h4>
      <p className={`text-2xl font-semibold ${colorMap[color]}`}>{value}</p>
    </div>
  );
};

export default StatCard;