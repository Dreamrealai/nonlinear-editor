import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 32,
  height: 32,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#60a5fa', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          <path
            d="M 75 45 C 75 35 67 27 57 27 C 55 27 53 27.5 51 28 C 48 18 39 11 28 11 C 15 11 5 21 5 34 C 5 35 5 36 5.2 37 C 2 39 0 43 0 47 C 0 53 4.5 58 10 58 L 70 58 C 78 58 85 51 85 43 C 85 37 81 32 75 30 Z"
            fill="url(#cloudGradient)"
            stroke="#1e40af"
            strokeWidth="2"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
