import QRCode from 'qrcode';

export interface QrCodeOptions {
  size?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Generates an ISO/IEC 18004 compliant SVG QR Code.
 * Uses official QRCode library ensuring 100% readability across smartphone cameras and scanners.
 */
export async function generateQrCodeSvg(
  text: string,
  options: QrCodeOptions = {}
): Promise<string> {
  const margin = options.margin !== undefined ? options.margin : 2;
  const errorCorrectionLevel = options.errorCorrectionLevel || 'M';
  const width = options.size || 200;

  return QRCode.toString(text, {
    type: 'svg',
    margin,
    errorCorrectionLevel,
    width,
  });
}
