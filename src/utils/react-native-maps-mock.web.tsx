import React from 'react';
import { View } from 'react-native';

const MapContext = React.createContext<{
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}>({
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
});

const MapView = (props: any) => {
  const latitude = props.region?.latitude || 12.9716;
  const longitude = props.region?.longitude || 77.5946;
  const latitudeDelta = props.region?.latitudeDelta || 0.02;
  const longitudeDelta = props.region?.longitudeDelta || 0.02;

  // Extract marker coordinates from children
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

  let mapUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`;

  if (markers.length >= 2) {
    const origin = `${markers[0].latitude},${markers[0].longitude}`;
    const destination = `${markers[markers.length - 1].latitude},${markers[markers.length - 1].longitude}`;
    mapUrl = `https://www.google.com/maps?saddr=${origin}&daddr=${destination}&dirflg=d&output=embed`;
  }

  return (
    <MapContext.Provider value={{ latitude, longitude, latitudeDelta, longitudeDelta }}>
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
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          {props.children}
        </View>
      </View>
    </MapContext.Provider>
  );
};

export const Marker = (props: any) => {
  const mapCtx = React.useContext(MapContext);

  let leftPercent = 50;
  let topPercent = 50;

  if (props.coordinate && mapCtx && mapCtx.latitudeDelta && mapCtx.longitudeDelta) {
    const dLat = props.coordinate.latitude - mapCtx.latitude;
    const dLng = props.coordinate.longitude - mapCtx.longitude;

    // Calculate percentage offset from map center
    topPercent = 50 - (dLat / (mapCtx.latitudeDelta || 0.02)) * 40;
    leftPercent = 50 + (dLng / (mapCtx.longitudeDelta || 0.02)) * 40;

    // Clamp within visible bounds
    topPercent = Math.max(15, Math.min(85, topPercent));
    leftPercent = Math.max(15, Math.min(85, leftPercent));
  }

  return (
    <View style={{ position: 'absolute', left: `${leftPercent}%`, top: `${topPercent}%`, transform: [{ translateX: -20 }, { translateY: -40 }], zIndex: 10 }}>
      {props.children}
    </View>
  );
};

export const Polyline = () => null;
export const UrlTile = () => null;
export const Callout = () => null;
export const Polygon = () => null;
export const Circle = () => null;

export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

export default MapView;
