import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface StatusBadgeProps {
  type: 'lost' | 'found';
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, style }) => {
  const isLost = type === 'lost';
  
  return (
    <View style={[isLost ? styles.statusLost : styles.statusFound, style]}>
      <View style={isLost ? styles.dotLost : styles.dotFound} />
      <Text style={isLost ? styles.statusTextLost : styles.statusTextFound}>
        {type.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  statusLost: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 113, 107, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dotLost: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff716b',
    marginRight: 6,
  },
  statusTextLost: {
    color: '#ff716b',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statusFound: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(63, 255, 139, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dotFound: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3fff8b',
    marginRight: 6,
  },
  statusTextFound: {
    color: '#3fff8b',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
