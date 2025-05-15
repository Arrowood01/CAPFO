'use client';

import React from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  // For now, this component will simply render its children.
  // Actual authentication logic can be added here later.
  return <>{children}</>;
};

export default AuthGuard;