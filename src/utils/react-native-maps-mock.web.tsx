import React from 'react';
import { View } from 'react-native';

const MapView = (props: any) => {
  return (
    <View style={[{ backgroundColor: '#E5E7EB', position: 'relative', overflow: 'hidden' }, props.style]}>
      {props.children}
    </View>
  );
};

export const Marker = (props: any) => {
  return (
    <View style={{ position: 'absolute', left: '50%', top: '50%', transform: [{ translateX: -14 }, { translateY: -14 }] }}>
      {props.children}
    </View>
  );
};

export const Polyline = () => null;

export default MapView;
