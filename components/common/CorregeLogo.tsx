import React from 'react';

export const CorregeLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width="30"
        height="30"
        viewBox="0 0 30 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <rect width="30" height="30" rx="4" fill="#9E0B1A" />
        <path
          d="M20.4012 19.2144L9 25V20.9459H10.0141V23.3358L19.9473 18.2952L20.4012 19.2144ZM19.3932 17.885L15.1789 20.0066V15.0995L19.3932 12.9779V17.885ZM16.193 15.7368V18.3483L18.3791 17.2476V14.6361L16.193 15.7368ZM14.8143 14.82L10.6 16.9416V12.0347L14.8143 9.91308V14.82ZM11.6141 12.6718V15.2832L13.8002 14.1827V11.5712L11.6141 12.6718ZM21 9.81856H19.9859V6.67339L9.7363 11.9395L9.27778 11.0227L21 5V9.81856Z"
          fill="white"
        />
        <path
          d="M15.1789 9.72766V14.6347L19.3932 12.5131V7.60606L15.1789 9.72766Z"
          fill="white"
        />
        <path
          d="M10.6 22.3133V17.4062L14.8143 15.2846V20.1917L10.6 22.3133ZM11.6141 18.0435L13.8002 16.9428V19.5543L11.6141 20.655V18.0435Z"
          fill="white"
        />
      </svg>
      <span className="font-bold text-xl text-slate-900 tracking-tight">Correge</span>
    </div>
  );
};
