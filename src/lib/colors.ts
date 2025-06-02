// Gradient definitions for consistent theming
export const GRADIENTS = {
  primary: 'from-blue-500 to-purple-600',
  danger: 'from-red-500 to-red-600',
  warning: 'from-yellow-500 to-orange-600',
  success: 'from-emerald-500 to-emerald-600',
  info: 'from-cyan-500 to-blue-600',
  
  // Chart specific gradients
  chart1: 'from-blue-500 to-purple-600',
  chart2: 'from-emerald-500 to-teal-600',
  chart3: 'from-orange-500 to-red-600',
  chart4: 'from-purple-500 to-pink-600',
  chart5: 'from-yellow-500 to-orange-600',
  chart6: 'from-indigo-500 to-blue-600',
} as const;

// Severity color mapping
export const SEVERITY_COLORS = {
  critical: {
    bg: 'bg-red-50/50',
    text: 'text-red-700',
    gradient: GRADIENTS.danger,
  },
  warning: {
    bg: 'bg-yellow-50/50',
    text: 'text-yellow-700',
    gradient: GRADIENTS.warning,
  },
  good: {
    bg: 'bg-green-50/50',
    text: 'text-green-700',
    gradient: GRADIENTS.success,
  },
  neutral: {
    bg: 'bg-gray-50/50',
    text: 'text-gray-700',
    gradient: 'from-gray-400 to-gray-600',
  },
} as const;

// Chart color palette (hex values for SVG/Canvas)
export const CHART_COLORS = {
  primary: ['#3b82f6', '#8b5cf6'],
  secondary: ['#10b981', '#14b8a6'],
  danger: ['#ef4444', '#dc2626'],
  warning: ['#f59e0b', '#f97316'],
  purple: ['#a855f7', '#ec4899'],
  indigo: ['#6366f1', '#3b82f6'],
};

// Animation durations
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 1000,
} as const;

// Animation delays for staggered effects
export const getStaggerDelay = (index: number, baseDelay: number = 100) => {
  return index * baseDelay;
};

// Utility function to get gradient by severity
export const getGradientBySeverity = (value: number, threshold: { critical: number; warning: number }) => {
  if (value >= threshold.critical) return GRADIENTS.danger;
  if (value >= threshold.warning) return GRADIENTS.warning;
  return GRADIENTS.success;
};