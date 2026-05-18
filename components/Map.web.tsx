import React from 'react';
import { View, Text } from 'react-native';

export default function MapView(props: any) {
  return (
    <View style={[{ backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }, props.style]}>
      <Text style={{ color: '#adaaaa' }}>Map not supported on Web</Text>
    </View>
  );
}

export const Marker = (props: any) => <View>{props.children}</View>;
export const PROVIDER_GOOGLE = null;
