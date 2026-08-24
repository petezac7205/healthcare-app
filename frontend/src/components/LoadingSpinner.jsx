import React from 'react';

export function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem', width: '100%' }}>
      <div className="spinner"></div>
    </div>
  );
}

export default LoadingSpinner;
