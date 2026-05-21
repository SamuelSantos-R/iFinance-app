import React from 'react';
import { View, Text } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';

export interface CategorySlice {
  category: string;
  amount: number;
  color: string;
}

interface Props {
  data: CategorySlice[];
  size?: number;
  thickness?: number;
  total: number;
  formatTotal?: (value: number) => string;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, rIn: number, start: number, end: number) {
  // ensure single tiny arc renders correctly
  const sweep = end - start;
  const largeArc = sweep > 180 ? 1 : 0;
  const p1 = polarToCartesian(cx, cy, r, start);
  const p2 = polarToCartesian(cx, cy, r, end);
  const p3 = polarToCartesian(cx, cy, rIn, end);
  const p4 = polarToCartesian(cx, cy, rIn, start);

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rIn} ${rIn} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

export function CategoryPieChart({
  data,
  size = 200,
  thickness = 28,
  total,
  formatTotal,
}: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const rIn = r - thickness;

  let cursor = 0;
  const slices = data
    .filter((d) => d.amount > 0)
    .map((d) => {
      const angle = (d.amount / total) * 360;
      const start = cursor;
      const end = cursor + angle;
      cursor = end;
      return { ...d, start, end };
    });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G>
          {slices.length === 0 ? (
            <Circle
              cx={cx}
              cy={cy}
              r={(r + rIn) / 2}
              stroke="#1C1C1E"
              strokeWidth={thickness}
              fill="none"
            />
          ) : (
            slices.map((slice, i) => {
              // gap of 2 deg between slices for visual breathing
              const gap = slices.length > 1 ? 1.5 : 0;
              const s = slice.start + gap;
              const e = slice.end - gap;
              if (e <= s) return null;
              return (
                <Path
                  key={i}
                  d={arcPath(cx, cy, r, rIn, s, e)}
                  fill={slice.color}
                />
              );
            })
          )}
        </G>
      </Svg>
      <View
        style={{
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#8E8E93', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }}>
          GASTO
        </Text>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginTop: 2 }}>
          {formatTotal ? formatTotal(total) : total.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}
