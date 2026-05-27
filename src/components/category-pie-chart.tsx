import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

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
  centerValue: string;
  centerLabel?: string;
}

function pointOnCircle(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

export function CategoryPieChart({
  data,
  size = 300,
  thickness = 15,
  total,
  centerValue,
  centerLabel = 'disponível',
}: Props) {
  const center = size / 2;
  const radius = size / 2 - thickness;
  const markersRadius = radius - 35;
  const circumference = 2 * Math.PI * radius;
  const slices = data.filter((slice) => slice.amount > 0 && total > 0);
  const segmentGap = slices.length > 1 ? 7 : 0;

  let offset = 0;
  const segments = slices.map((slice) => {
    const length = (slice.amount / total) * circumference;
    const segment = { ...slice, length, offset };
    offset += length;
    return segment;
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(22,52,82,0.76)"
          strokeWidth={thickness}
          fill="none"
        />
        {segments.map((segment) => (
          <Circle
            key={segment.category}
            cx={center}
            cy={center}
            r={radius}
            stroke={segment.color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(segment.length - segmentGap, 0)} ${circumference}`}
            strokeDashoffset={-segment.offset}
            fill="none"
            transform={`rotate(-90 ${center} ${center})`}
          />
        ))}
        {Array.from({ length: 24 }, (_, index) => {
          const marker = pointOnCircle(center, center, markersRadius, index * 15);
          const active = index === 0;

          return (
            <Circle
              key={`marker-${index}`}
              cx={marker.x}
              cy={marker.y}
              r={active ? 3.4 : 2.7}
              fill={active ? '#0A84FF' : 'rgba(255,255,255,0.22)'}
            />
          );
        })}
      </Svg>
      <View
        style={{
          position: 'absolute',
          width: size * 0.72,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          style={{
            color: '#F5F5F7',
            fontSize: size >= 280 ? 42 : 25,
            fontWeight: '500',
            letterSpacing: -1.2,
            fontVariant: ['tabular-nums'],
          }}
        >
          {centerValue}
        </Text>
        <Text
          style={{
            color: '#949AA6',
            fontSize: size >= 280 ? 16 : 12,
            fontWeight: '400',
            marginTop: 8,
          }}
        >
          {centerLabel}
        </Text>
      </View>
    </View>
  );
}
