import React from 'react';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

interface AppIconProps {
  size?: number;
}

export default function AppIcon({ size = 40 }: AppIconProps) {
  const corner = size * 0.24;
  const stroke = size * 0.065;

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <Defs>
        <LinearGradient id="bgGradient" x1="64" y1="32" x2="448" y2="480" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#14b8a6" />
          <Stop offset="1" stopColor="#0f766e" />
        </LinearGradient>
      </Defs>

      <Rect x="24" y="24" width="464" height="464" rx="112" fill="url(#bgGradient)" />

      <G>
        <Path
          d="M256 146c-39 0-70 31-70 70 0 54 70 126 70 126s70-72 70-126c0-39-31-70-70-70Zm0 102a32 32 0 1 1 0-64 32 32 0 0 1 0 64Z"
          fill="#f8fafc"
        />
        <Path
          d="M256 146c-39 0-70 31-70 70 0 54 70 126 70 126s70-72 70-126c0-39-31-70-70-70Z"
          stroke="#0f172a"
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
        <Path
          d="M220 390h72"
          stroke="#0f172a"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <Path
          d="M256 354v72"
          stroke="#0f172a"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </G>

      <Rect
        x="24"
        y="24"
        width="464"
        height="464"
        rx="112"
        stroke="#0f172a"
        strokeOpacity="0.2"
        strokeWidth={corner * 0.18}
      />
    </Svg>
  );
}
