import React from 'react';
import { View } from 'react-native';

const MapView = (props: any) => {
  const latitude = props.region?.latitude || 12.9716;
  const longitude = props.region?.longitude || 77.5946;

  // Extract marker coordinates and route polyline from children
  const markers: any[] = [];
  
  const extractCoordinates = (childrenList: any) => {
    React.Children.forEach(childrenList, (child: any) => {
      if (!child) return;
      if (child.props) {
        if (child.props.coordinate) {
          markers.push(child.props.coordinate);
        }
        if (child.props.children) {
          extractCoordinates(child.props.children);
        }
      }
    });
  };

  extractCoordinates(props.children);

  let mapUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;

  if (markers.length >= 2) {
    const origin = `${markers[0].latitude},${markers[0].longitude}`;
    const destination = `${markers[markers.length - 1].latitude},${markers[markers.length - 1].longitude}`;
    if (markers.length === 3) {
      const waypoint = `${markers[1].latitude},${markers[1].longitude}`;
      mapUrl = `https://www.google.com/maps?saddr=${origin}&daddr=${waypoint}+to:${destination}&dirflg=d&output=embed`;
    } else {
      mapUrl = `https://www.google.com/maps?saddr=${origin}&daddr=${destination}&dirflg=d&output=embed`;
    }
  }

  return (
    <View style={[{ backgroundColor: '#E5E7EB', position: 'relative', overflow: 'hidden' }, props.style]}>
      <iframe
        src={mapUrl}
        width="100%"
        height="calc(100% + 150px)"
        style={{
          border: 0,
          position: 'absolute',
          top: '-150px',
          left: 0,
          right: 0,
          width: '100%',
          height: 'calc(100% + 150px)',
        }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {props.children}
      </View>
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

export const PROVIDER_GOOGLE = 'google';

export default MapView;
