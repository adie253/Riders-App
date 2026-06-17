import * as Location from 'expo-location';

export interface GeolocationOptions {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
}

export const getCurrentPositionWithFallback = (
    onSuccess: (position: any) => void,
    onError: (error: any, message: string) => void,
    options?: GeolocationOptions
) => {
    (async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                onError(
                    { code: 1, message: "Permission Denied" },
                    "Location access is required to track your deliveries. Please enable location services in your device settings."
                );
                return;
            }

            // Balanced accuracy is recommended for fast & battery-efficient location fetching
            const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            onSuccess({
                coords: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                },
                timestamp: position.timestamp,
            });
        } catch (e: any) {
            console.warn("Native Geolocation failed", e);
            onError(
                { code: 2, message: e.message || "Position Unavailable" },
                "Unable to detect your location. Please check your GPS settings and try again."
            );
        }
    })();
};

export const isMobileDevice = (): boolean => {
    return true; 
};
