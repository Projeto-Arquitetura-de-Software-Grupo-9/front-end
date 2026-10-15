'use client';

import React, { useState, useEffect } from 'react';
import { generateQrCodeSvg } from '@/lib/qrCode';

export interface QrCodeGraphicProps {
  value?: string;
  size?: number;
  className?: string;
  versionLetter?: 'A' | 'B' | 'C' | 'D';
  examCode?: string;
  studentRegistration?: string;
  showBadge?: boolean;
  showCodeLabel?: boolean;
}

export const QrCodeGraphic: React.FC<QrCodeGraphicProps> = ({
  value = '{"appId":"app-cal-1","vId":"ver-a","ver":"A","code":"#CAL-1-2024.2"}',
  size = 80,
  className = '',
  versionLetter,
  examCode,
  showBadge = true,
  showCodeLabel = false,
}) => {
  const [svgMarkup, setSvgMarkup] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    generateQrCodeSvg(value, {
      size: size * 2, // 2x resolution for ultra-crisp rendering
      margin: 2,
      errorCorrectionLevel: 'M',
    })
      .then((svg) => {
        if (isMounted) {
          setSvgMarkup(svg);
        }
      })
      .catch((err) => {
        console.error('Erro ao gerar SVG do QR Code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      {/* 
        Container do QR Code 100% livre de sobreposições para leitura perfeita da câmera.
        Quiet Zone (margem branca) preservada sem nenhum elemento por cima.
      */}
      <div
        className="bg-white p-1 rounded-sm border-2 border-slate-900 shadow-sm flex items-center justify-center transition-transform hover:scale-105"
        style={{ width: size, height: size }}
        title={`QR Code de Alinhamento OMR\nPayload: ${value}`}
      >
        {svgMarkup ? (
          <div
            className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
        ) : (
          <div className="w-full h-full bg-slate-100 animate-pulse rounded-xs" />
        )}
      </div>

      {/* 
        Etiqueta de versão posicionada ESTRITAMENTE ABAIXO do QR Code, 
        sem tampar nenhum módulo ou margem do código.
      */}
      {showBadge && versionLetter && (
        <span className="mt-1.5 inline-flex items-center justify-center bg-blue-700 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-xs tracking-wider">
          Caderno {versionLetter}
        </span>
      )}

      {showCodeLabel && examCode && (
        <span className="text-[9px] font-mono text-slate-500 font-bold mt-0.5 tracking-tighter">
          {examCode}
        </span>
      )}
    </div>
  );
};
