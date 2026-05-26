import React from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

type GlassSurfaceProps = ViewProps & {
  children: React.ReactNode;
  interactive?: boolean;
  tintColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function GlassSurface({
  children,
  interactive = false,
  tintColor = 'rgba(255,255,255,0.12)',
  style,
  ...viewProps
}: GlassSurfaceProps) {
  const baseStyle: StyleProp<ViewStyle> = [
    {
      overflow: 'hidden',
      backgroundColor: 'rgba(28,28,30,0.72)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
    },
    style,
  ];

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        {...viewProps}
        isInteractive={interactive}
        tintColor={tintColor}
        glassEffectStyle="regular"
        style={baseStyle}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View {...viewProps} style={baseStyle}>
      {children}
    </View>
  );
}
