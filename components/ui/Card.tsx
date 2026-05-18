import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'flat' | 'elevated';
}

export const Card: React.FC<CardProps> = ({ children, style, onPress, variant = 'flat' }) => {
  const Container = onPress ? TouchableOpacity : View;
  
  return (
    <Container 
      style={[
        styles.card, 
        variant === 'elevated' ? styles.elevated : null,
        style
      ]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
