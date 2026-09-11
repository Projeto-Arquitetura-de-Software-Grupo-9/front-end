'use client';

import React from 'react';

interface QrCodeGraphicProps {
  value?: string;
  size?: number;
  className?: string;
}

export const QrCodeGraphic: React.FC<QrCodeGraphicProps> = ({
  value = 'PROVA-FACIL-2024',
  size = 64,
  className = '',
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center p-1 bg-white border-2 border-slate-900 rounded ${className}`}
      style={{ width: size, height: size }}
      title={`QR Code de Alinhamento: ${value}`}
    >
      <svg
        viewBox="0 0 33 33"
        fill="currentColor"
        className="w-full h-full text-slate-900"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top Left Finder Pattern */}
        <rect x="0" y="0" width="7" height="7" fill="black" />
        <rect x="1" y="1" width="5" height="5" fill="white" />
        <rect x="2" y="2" width="3" height="3" fill="black" />

        {/* Top Right Finder Pattern */}
        <rect x="26" y="0" width="7" height="7" fill="black" />
        <rect x="27" y="1" width="5" height="5" fill="white" />
        <rect x="28" y="2" width="3" height="3" fill="black" />

        {/* Bottom Left Finder Pattern */}
        <rect x="0" y="26" width="7" height="7" fill="black" />
        <rect x="1" y="27" width="5" height="5" fill="white" />
        <rect x="2" y="28" width="3" height="3" fill="black" />

        {/* Timing Patterns */}
        <rect x="8" y="6" width="2" height="1" fill="black" />
        <rect x="12" y="6" width="2" height="1" fill="black" />
        <rect x="16" y="6" width="2" height="1" fill="black" />
        <rect x="20" y="6" width="2" height="1" fill="black" />
        <rect x="24" y="6" width="1" height="1" fill="black" />

        <rect x="6" y="8" width="1" height="2" fill="black" />
        <rect x="6" y="12" width="1" height="2" fill="black" />
        <rect x="6" y="16" width="1" height="2" fill="black" />
        <rect x="6" y="20" width="1" height="2" fill="black" />
        <rect x="6" y="24" width="1" height="1" fill="black" />

        {/* Alignment Pattern */}
        <rect x="20" y="20" width="5" height="5" fill="black" />
        <rect x="21" y="21" width="3" height="3" fill="white" />
        <rect x="22" y="22" width="1" height="1" fill="black" />

        {/* Data bits representation */}
        <rect x="9" y="9" width="3" height="2" fill="black" />
        <rect x="14" y="9" width="2" height="3" fill="black" />
        <rect x="18" y="10" width="2" height="2" fill="black" />
        <rect x="10" y="13" width="2" height="2" fill="black" />
        <rect x="13" y="14" width="3" height="1" fill="black" />
        <rect x="10" y="18" width="2" height="3" fill="black" />
        <rect x="14" y="18" width="2" height="2" fill="black" />
        <rect x="17" y="15" width="2" height="3" fill="black" />
        <rect x="22" y="10" width="2" height="2" fill="black" />
        <rect x="26" y="9" width="2" height="2" fill="black" />
        <rect x="29" y="11" width="2" height="3" fill="black" />
        <rect x="26" y="15" width="3" height="2" fill="black" />
        <rect x="10" y="23" width="3" height="2" fill="black" />
        <rect x="15" y="23" width="2" height="3" fill="black" />
        <rect x="10" y="28" width="2" height="2" fill="black" />
        <rect x="14" y="28" width="3" height="2" fill="black" />
        <rect x="18" y="27" width="2" height="3" fill="black" />
        <rect x="27" y="26" width="3" height="2" fill="black" />
        <rect x="28" y="29" width="2" height="2" fill="black" />
      </svg>
    </div>
  );
};
