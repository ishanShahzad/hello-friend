/**
 * RozareLogo — SVG brand mark for mobile app
 * Modern diamond-bloom mark with coral→magenta→purple gradient
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, Text as SvgText } from 'react-native-svg';

export default function RozareLogo({ width = 140, height = 32, showText = true }) {
  const iconSize = height;
  const viewBoxW = showText ? 240 : 50;

  return (
    <View style={{ width: showText ? width : iconSize, height: iconSize }}>
      <Svg
        viewBox={`0 0 ${viewBoxW} 50`}
        width={showText ? width : iconSize}
        height={iconSize}
      >
        <Defs>
          <LinearGradient id="rzGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FF6B6B" />
            <Stop offset="50%" stopColor="#E94B7C" />
            <Stop offset="100%" stopColor="#7C3AED" />
          </LinearGradient>
          <LinearGradient id="rzCoral" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FF8A8A" />
            <Stop offset="100%" stopColor="#FF6B6B" />
          </LinearGradient>
          <LinearGradient id="rzMagenta" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#F062A0" />
            <Stop offset="100%" stopColor="#E94B7C" />
          </LinearGradient>
          <LinearGradient id="rzPurple" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#A855F7" />
            <Stop offset="100%" stopColor="#7C3AED" />
          </LinearGradient>
        </Defs>

        {/* Diamond bloom mark, padded by 4 */}
        <Path d="M25 6 C33 12 34 20 25 26 C16 20 17 12 25 6 Z" fill="url(#rzCoral)" />
        <Path d="M44 25 C38 33 30 34 24 25 C30 16 38 17 44 25 Z" fill="url(#rzMagenta)" />
        <Path d="M25 44 C17 38 16 30 25 24 C34 30 33 38 25 44 Z" fill="url(#rzPurple)" />
        <Path d="M6 25 C12 17 20 16 26 25 C20 34 12 33 6 25 Z" fill="url(#rzMagenta)" opacity="0.85" />
        <Circle cx="25" cy="25" r="6" fill="white" opacity="0.95" />
        <SvgText
          x="25"
          y="29"
          fontFamily="System"
          fontSize="9"
          fontWeight="900"
          fill="url(#rzGrad)"
          textAnchor="middle"
        >
          R
        </SvgText>

        {showText && (
          <SvgText
            x="58"
            y="33"
            fontFamily="System"
            fontSize="26"
            fontWeight="800"
            letterSpacing="-0.8"
            fill="url(#rzGrad)"
          >
            Rozare
          </SvgText>
        )}
      </Svg>
    </View>
  );
}
