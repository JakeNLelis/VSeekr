import React from 'react';
import { Text, StyleSheet, TextProps, Platform } from 'react-native';

interface ThemedTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'subtitle' | 'label' | 'body' | 'small';
  color?: string;
  weight?: 'normal' | 'bold' | 'semi-bold';
}

export const Typography: React.FC<ThemedTextProps> = ({ 
  style, 
  variant = 'body', 
  color, 
  weight, 
  children, 
  ...props 
}) => {
  const getStyle = () => {
    switch (variant) {
      case 'h1': return styles.h1;
      case 'h2': return styles.h2;
      case 'h3': return styles.h3;
      case 'subtitle': return styles.subtitle;
      case 'label': return styles.label;
      case 'small': return styles.small;
      default: return styles.body;
    }
  };

  return (
    <Text 
      style={[
        getStyle(), 
        color ? { color } : null, 
        weight ? { fontWeight: weight === 'semi-bold' ? '600' : weight } : null,
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  h1: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 48,
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
  },
  h2: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
  },
  h3: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 16,
    color: '#adaaaa',
    marginTop: 8,
  },
  label: {
    color: '#adaaaa',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    color: '#ffffff',
  },
  small: {
    fontSize: 13,
    color: '#adaaaa',
  },
});
