/**
 * CouponBarChart — small react-native-svg bar chart for per-coupon usage trend
 * Renders 7 bars (e.g. last 7 events or breakdown across uses/orders/discount/avg).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { fontSize, fontWeight } from '../../styles/theme';

export default function CouponBarChart({ data = [], labels = [], height = 80, color = '#6366f1', textColor = '#9ca3af' }) {
  const width = 220;
  const padding = 8;
  const barAreaH = height - 18;
  const max = Math.max(1, ...data.map((d) => Number(d) || 0));
  const barCount = data.length || 1;
  const slot = (width - padding * 2) / barCount;
  const barW = Math.max(6, slot * 0.6);

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Svg width={width} height={height}>
        {/* baseline */}
        <Line x1={padding} y1={barAreaH} x2={width - padding} y2={barAreaH} stroke={textColor} strokeOpacity={0.25} strokeWidth={1} />
        {data.map((v, i) => {
          const value = Number(v) || 0;
          const h = max > 0 ? (value / max) * (barAreaH - 8) : 0;
          const x = padding + slot * i + (slot - barW) / 2;
          const y = barAreaH - h;
          return (
            <React.Fragment key={i}>
              <Rect x={x} y={y} width={barW} height={h} rx={3} fill={color} fillOpacity={0.85} />
              {labels[i] ? (
                <SvgText x={x + barW / 2} y={height - 2} fontSize="9" fill={textColor} textAnchor="middle">
                  {labels[i]}
                </SvgText>
              ) : null}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

export const MetricRow = ({ items = [], palette }) => (
  <View style={styles.metricRow}>
    {items.map((it, i) => (
      <View key={i} style={styles.metric}>
        <Text style={[styles.metricValue, { color: palette?.colors?.text || '#111' }]} numberOfLines={1}>{it.value}</Text>
        <Text style={[styles.metricLabel, { color: palette?.colors?.textSecondary || '#6b7280' }]}>{it.label}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  metricRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginVertical: 6 },
  metric: { alignItems: 'center', flex: 1 },
  metricValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  metricLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' },
});
