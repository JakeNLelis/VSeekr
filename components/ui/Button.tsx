import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ButtonProps {
  onPress: () => void;
  title: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: ViewStyle;
  textStyle?: TextStyle;
  colors?: string[];
}

export const Button: React.FC<ButtonProps> = ({ 
  onPress, 
  title, 
  loading = false, 
  disabled = false, 
  variant = 'primary',
  style,
  textStyle,
  colors
}) => {
  const isPrimary = variant === 'primary';
  const defaultColors = (colors || ['#b6a0ff', '#7e51ff']) as [string, string, ...string[]];

  if (isPrimary) {
    return (
      <TouchableOpacity 
        style={[styles.wrapper, style]} 
        onPress={onPress} 
        disabled={loading || disabled}
      >
        <LinearGradient
          colors={defaultColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={[styles.text, textStyle]}>{title}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[
        styles.secondary, 
        variant === 'outline' ? styles.outline : null,
        style
      ]} 
      onPress={onPress} 
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color="#adaaaa" />
      ) : (
        <Text style={[
          variant === 'outline' ? styles.outlineText : styles.secondaryText, 
          textStyle
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    shadowColor: '#b6a0ff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    height: 56,
  },
  gradient: {
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondary: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  secondaryText: {
    color: '#adaaaa',
    fontSize: 16,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: '#b6a0ff',
  },
  outlineText: {
    color: '#b6a0ff',
    fontWeight: 'bold',
  }
});
