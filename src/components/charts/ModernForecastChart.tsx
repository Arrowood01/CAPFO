'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface DataPoint {
  name: string;
  totalCost: number;
}

interface ModernForecastChartProps {
  data: DataPoint[];
  height?: number;
}

const ModernForecastChart: React.FC<ModernForecastChartProps> = ({ data, height = 300 }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const { width } = svgRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [height]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        No data available
      </div>
    );
  }

  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const innerWidth = dimensions.width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const maxValue = Math.max(...data.map(d => d.totalCost));
  const yScale = (value: number) => innerHeight - (value / maxValue) * innerHeight;
  const xScale = (index: number) => (index / (data.length - 1)) * innerWidth;

  // Create path data for the line
  const pathData = data
    .map((point, i) => {
      const x = xScale(i);
      const y = yScale(point.totalCost);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Create area path
  const areaData = `${pathData} L ${innerWidth} ${innerHeight} L 0 ${innerHeight} Z`;

  return (
    <div className="w-full">
      <svg ref={svgRef} width="100%" height={height}>
        <defs>
          {/* Gradient for the area fill */}
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
          </linearGradient>
          
          {/* Gradient for the line */}
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = innerHeight - tick * innerHeight;
            return (
              <g key={tick}>
                <line
                  x1={0}
                  y1={y}
                  x2={innerWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="2,2"
                  opacity={0.5}
                />
                <text
                  x={-10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#6b7280"
                >
                  ${((tick * maxValue) / 1000).toFixed(0)}k
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path
            d={areaData}
            fill="url(#areaGradient)"
            opacity="1"
          />

          {/* Main line */}
          <path
            d={pathData}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            filter="url(#glow)"
          />

          {/* Data points */}
          {data.map((point, i) => {
            const x = xScale(i);
            const y = yScale(point.totalCost);
            const isHovered = hoveredIndex === i;
            const cost = point.totalCost;
            const isHighCost = cost > maxValue * 0.75;

            return (
              <g key={i}>
                {/* Interactive area */}
                <rect
                  x={x - 20}
                  y={0}
                  width={40}
                  height={innerHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Point */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 8 : 5}
                  fill={isHighCost ? '#ef4444' : '#3b82f6'}
                  stroke="white"
                  strokeWidth="2"
                  style={{ 
                    filter: isHovered ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                />

                {/* Tooltip */}
                {isHovered && (
                  <motion.g
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <rect
                      x={x - 40}
                      y={y - 50}
                      width={80}
                      height={40}
                      rx={4}
                      fill="rgba(0, 0, 0, 0.8)"
                    />
                    <text
                      x={x}
                      y={y - 30}
                      textAnchor="middle"
                      fontSize="12"
                      fill="white"
                      fontWeight="600"
                    >
                      {point.name}
                    </text>
                    <text
                      x={x}
                      y={y - 15}
                      textAnchor="middle"
                      fontSize="11"
                      fill="white"
                    >
                      ${(cost / 1000).toFixed(1)}k
                    </text>
                  </motion.g>
                )}

                {/* X-axis label */}
                <text
                  x={x}
                  y={innerHeight + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {point.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default ModernForecastChart;