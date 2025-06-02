import { Variants } from 'framer-motion';

// Easing functions
export const easing = {
  easeInOut: [0.4, 0, 0.2, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  sharp: [0.4, 0, 0.6, 1],
  spring: { type: 'spring', stiffness: 300, damping: 20 },
} as const;

// Common animation variants
export const fadeInUp: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: easing.easeIn,
    },
  },
};

export const fadeIn: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: easing.easeIn,
    },
  },
};

export const scaleIn: Variants = {
  initial: {
    scale: 0.9,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: easing.easeOut,
    },
  },
  exit: {
    scale: 0.9,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: easing.easeIn,
    },
  },
};

// Stagger children animation
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

// Slide animations
export const slideInFromLeft: Variants = {
  initial: {
    x: -60,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: easing.easeOut,
    },
  },
};

export const slideInFromRight: Variants = {
  initial: {
    x: 60,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: easing.easeOut,
    },
  },
};

// Hover animations
export const hoverScale = {
  scale: 1.05,
  transition: {
    duration: 0.2,
    ease: easing.easeOut,
  },
};

export const hoverGlow = {
  boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
  transition: {
    duration: 0.3,
    ease: easing.easeOut,
  },
};

// Utility functions
export const getDelayedAnimation = (delay: number): Variants => ({
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay,
      ease: easing.easeOut,
    },
  },
});

export const getStaggeredAnimation = (index: number, baseDelay: number = 0.1): { animate: { transition: { delay: number } } } => ({
  animate: {
    transition: {
      delay: index * baseDelay,
    },
  },
});

// Reduced motion utilities
export const shouldReduceMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const getReducedMotionVariants = (variants: Variants): Variants => {
  if (!shouldReduceMotion()) return variants;
  
  // Return instant transitions for reduced motion
  return {
    initial: variants.initial,
    animate: {
      ...variants.animate,
      transition: { duration: 0 },
    },
    exit: variants.exit ? {
      ...variants.exit,
      transition: { duration: 0 },
    } : undefined,
  };
};