import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Chip: React.FC<ChipProps> = ({ label, active, onPress, style, textStyle }) => {
  return (
    <TouchableOpacity
      style={[active ? styles.chipActive : styles.chipIdle, style]}
      onPress={onPress}
    >
      <Text style={[active ? styles.chipTextActive : styles.chipTextIdle, textStyle]}>
        {label.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chipActive: {
    backgroundColor: '#b6a0ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  chipTextActive: {
    color: '#280072',
    fontWeight: 'bold',
    fontSize: 12,
  },
  chipIdle: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#262626',
  },
  chipTextIdle: {
    color: '#adaaaa',
    fontSize: 12,
  },
});
