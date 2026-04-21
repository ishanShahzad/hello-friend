/**
 * RozareLogo — gem-tile R monogram with orbital arc
 * Modern, distinctive brand mark matching website indigo-purple theme.
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle, Text as SvgText } from 'react-native-svg';

export default function RozareLogo({ width = 140, height = 36, showText = true }) {
  const iconSize = height;
  const viewBoxW = showText ? 220 : 56;

  return (
    <View style={{ width: showText ? width : iconSize, height: iconSize }}>
      <Svg
        viewBox={`0 0 ${viewBoxW} 56`}
        width={showText ? width : iconSize}
        height={iconSize}
      >
        <Defs>
          <LinearGradient id="rzGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4F46E5" />
            <Stop offset="55%" stopColor="#6366F1" />
            <Stop offset="100%" stopColor="#8B5CF6" />
          </LinearGradient>
          <LinearGradient id="rzGradSoft" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4F46E5" stopOpacity="0.18" />
            <Stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.18" />
          </LinearGradient>
        </Defs>

        {/* Mark */}
        <Rect x="6" y="6" width="44" height="44" rx="12" fill="url(#rzGradSoft)" />
        <Rect x="8" y="8" width="40" height="40" rx="11" fill="url(#rzGrad)" />
        <Path
          d="M44 18 a16 16 0 0 1 -26 22"
          fill="none"
          stroke="white"
          strokeOpacity="0.35"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <Path
          d="M21 18 h11 a7 7 0 0 1 0 14 h-7 l9 6 M25 18 v20"
          fill="none"
          stroke="white"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx="40" cy="18" r="2" fill="white" />

        {showText && (
          <SvgText
            x="62"
            y="38"
            fontFamily="System"
            fontSize="28"
            fontWeight="800"
            letterSpacing="-1.1"
            fill="url(#rzGrad)"
          >
            Rozare
          </SvgText>
        )}
      </Svg>
    </View>
  );
}
