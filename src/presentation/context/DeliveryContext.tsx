import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import {
    setStatusOnline,
    setStatusOffline,
    updateRiderLocation,
    getPendingOffer,
    acceptOffer,
    rejectOffer,
    getActiveDelivery,
    markArrivedPickup,
    markPickedUp,
    markArrivedDrop,
    markDelivered,
    markFailed,
    getOrderDetails
} from '../../data/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { localStorage } from '../../utils/storage';

const formatAddress = (addr: any): string => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    const parts = [
        addr.addressLine1 || addr.addressLine,
        addr.addressLine2,
        addr.street,
        addr.landmark,
        addr.city
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
    return addr.formattedAddress || addr.fullAddress || addr.address || '';
};

const safeNum = (val: any, fallback: number): number => {
    if (val === undefined || val === null) return fallback;
    const num = Number(val);
    return isNaN(num) || num === 0 ? fallback : num;
};

const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return isNaN(dist) ? 0 : dist;
};

export interface DeliveryOffer {
    offerId: string;
    deliveryRequestId: string;
    orderNumber: string;
    restaurantName: string;
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropAddress: string;
    dropLatitude: number;
    dropLongitude: number;
    distanceToPickupKm: number;
    distanceToDropKm: number;
    totalDistanceKm: number;
    earnings: number;
    expiresInSeconds: number;
    expiresAt: string;
}

export interface ActiveDelivery {
    id: string;
    deliveryRequestId: string;
    orderId: string;
    orderNumber: string;
    restaurantName: string;
    restaurantAddress: string;
    restaurantPhone: string;
    restaurantLatitude: number;
    restaurantLongitude: number;
    customerName: string;
    customerAddress: string;
    customerPhone: string;
    customerLatitude: number;
    customerLongitude: number;
    earnings: number;
    distanceKm: number;
    status: 'ASSIGNED' | 'ARRIVED_PICKUP' | 'PICKED_UP' | 'ARRIVED_DROP' | 'DELIVERED' | 'FAILED' | string;
    items?: { name: string; quantity: number }[];
    specialInstructions?: string;
    deliveryInstructions?: string;
    paymentMethod?: string;
    totalAmount?: number;
}

interface DeliveryContextType {
    isOnline: boolean;
    pendingOffer: DeliveryOffer | null;
    activeDelivery: ActiveDelivery | null;
    currentCoords: { latitude: number; longitude: number } | null;
    offerCountdown: number;
    isProcessingOffer: boolean;
    isUpdatingStatus: boolean;
    isLocationOff: boolean;
    isInitialLoading: boolean;
    checkLocationStatus: () => Promise<boolean>;
    toggleDutyStatus: () => Promise<boolean>;
    acceptActiveOffer: () => Promise<boolean>;
    rejectActiveOffer: (reason?: string) => Promise<boolean>;
    arrivedRestaurant: () => Promise<boolean>;
    confirmOrderPickup: (pickupCode: string) => Promise<boolean>;
    arrivedCustomer: () => Promise<boolean>;
    completeDelivery: (dropCode: string) => Promise<boolean>;
    abortDelivery: (reason: string, notes?: string) => Promise<boolean>;
    refreshActiveStatus: () => Promise<void>;
    clearActiveDelivery: () => void;
}

const DeliveryContext = createContext<DeliveryContextType | undefined>(undefined);

export const DeliveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, riderProfile } = useAuth();
    const { showToast } = useToast();

    const [isOnline, setIsOnline] = useState(false);
    const [pendingOffer, setPendingOffer] = useState<DeliveryOffer | null>(null);
    const [activeDelivery, setActiveDelivery] = useState<ActiveDelivery | null>(null);
    const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [offerCountdown, setOfferCountdown] = useState(0);
    const [isProcessingOffer, setIsProcessingOffer] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isLocationOff, setIsLocationOff] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
    const pollingTimerRef = useRef<any>(null);
    const locationUploadTimerRef = useRef<any>(null);
    const countdownTimerRef = useRef<any>(null);
    const currentCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
    const isCompletingDeliveryRef = useRef(false);


    // Fetch initial active delivery if authenticated
    const fetchCurrentState = useCallback(async () => {
        if (!isAuthenticated) {
            setIsInitialLoading(false);
            return;
        }
        try {
            const active = await getActiveDelivery();
            console.log('ACTIVE DELIVERY RESPONSE:', active);
            if (active) {
                // Map status robustly (e.g. RiderAssigned -> ASSIGNED)
                const rawStatus = active.status || 'ASSIGNED';
                let mappedStatus = 'ASSIGNED';
                const statusUpper = String(rawStatus).toUpperCase().replace(/_/g, '');
                if (
                    statusUpper === 'RIDERASSIGNED' ||
                    statusUpper === 'ASSIGNED' ||
                    statusUpper === 'RIDERENROUTEPICKUP' ||
                    statusUpper === 'ENROUTEPICKUP' ||
                    statusUpper === 'ENROUTE'
                ) {
                    mappedStatus = 'ASSIGNED';
                } else if (
                    statusUpper === 'RIDERARRIVEDPICKUP' ||
                    statusUpper === 'RIDERARRIVEDATPICKUP' ||
                    statusUpper === 'ARRIVEDATPICKUP' ||
                    statusUpper === 'ARRIVEDPICKUP'
                ) {
                    mappedStatus = 'ARRIVED_PICKUP';
                } else if (
                    statusUpper === 'RIDERPICKEDUP' ||
                    statusUpper === 'PICKEDUP'
                ) {
                    mappedStatus = 'PICKED_UP';
                } else if (
                    statusUpper === 'RIDERARRIVEDDROP' ||
                    statusUpper === 'RIDERARRIVEDATDROP' ||
                    statusUpper === 'ARRIVEDATDROP' ||
                    statusUpper === 'ARRIVEDDROP'
                ) {
                    mappedStatus = 'ARRIVED_DROP';
                } else if (statusUpper === 'DELIVERED' || statusUpper === 'RIDERDELIVERED') {
                    mappedStatus = 'DELIVERED';
                } else if (statusUpper === 'FAILED' || statusUpper === 'RIDERFAILED') {
                    mappedStatus = 'FAILED';
                } else {
                    mappedStatus = rawStatus;
                }

                // Detect the active delivery's orderId
                const orderId = active.orderId || active.order?.id || active.deliveryRequest?.orderId;
                let orderDetails: any = null;

                if (orderId) {
                    try {
                        orderDetails = await getOrderDetails(orderId);
                        console.log('HYDRATED ORDER DETAILS:', orderDetails);
                    } catch (err) {
                        console.warn('Failed to fetch detailed order metadata, falling back to basic delivery request:', err);
                    }
                }

                // Hydrate items list correctly: from orderDetails.items or active delivery response
                const itemsList = orderDetails?.items || active.items || active.order?.items || active.deliveryRequest?.items || [];
                const mappedItems = itemsList.map((item: any) => ({
                    name: item.itemName || item.name || item.menuItemName || 'Item',
                    quantity: item.quantity || 1
                }));

                // Map API response keys to ActiveDelivery structure, checking root, deliveryRequest, or order sub-properties
                const orderPickupLat = orderDetails?.pickupLatitude || orderDetails?.restaurantLatitude || orderDetails?.deliveryInfo?.pickupLatitude;
                const orderPickupLng = orderDetails?.pickupLongitude || orderDetails?.restaurantLongitude || orderDetails?.deliveryInfo?.pickupLongitude;
                const orderDropLat = orderDetails?.deliveryAddress?.latitude || orderDetails?.deliveryInfo?.deliveryAddress?.latitude || orderDetails?.customerLatitude;
                const orderDropLng = orderDetails?.deliveryAddress?.longitude || orderDetails?.deliveryInfo?.deliveryAddress?.longitude || orderDetails?.customerLongitude;

                const activeResLat = safeNum(active.pickupLatitude || active.restaurantLatitude || active.order?.latitude || active.deliveryRequest?.pickupLatitude || orderPickupLat || localStorage.getItem('active_restaurant_lat'), 18.5204);
                const activeResLng = safeNum(active.pickupLongitude || active.restaurantLongitude || active.order?.longitude || active.deliveryRequest?.pickupLongitude || orderPickupLng || localStorage.getItem('active_restaurant_lng'), 73.8567);
                const activeCustLat = safeNum(active.dropLatitude || active.customerLatitude || active.order?.latitude || active.deliveryRequest?.dropLatitude || orderDropLat || localStorage.getItem('active_customer_lat'), 18.5204);
                const activeCustLng = safeNum(active.dropLongitude || active.customerLongitude || active.order?.longitude || active.deliveryRequest?.dropLongitude || orderDropLng || localStorage.getItem('active_customer_lng'), 73.8567);

                const rawRestaurantAddress =
                    orderDetails?.deliveryInfo?.pickupAddress ||
                    orderDetails?.pickupAddress ||
                    orderDetails?.restaurant?.addressLine ||
                    orderDetails?.restaurant?.address ||
                    orderDetails?.restaurantAddress ||
                    active.pickupAddress ||
                    active.restaurantAddress ||
                    active.restaurant?.addressLine ||
                    active.restaurant?.address ||
                    active.order?.restaurantAddress ||
                    active.deliveryRequest?.pickupAddress;

                const restaurantAddressString = formatAddress(rawRestaurantAddress) || 'Pickup address';

                const rawCustomerAddress =
                    orderDetails?.deliveryInfo?.deliveryAddress ||
                    orderDetails?.deliveryAddress ||
                    orderDetails?.customerAddress ||
                    active.dropAddress ||
                    active.customerAddress ||
                    active.order?.customerAddress ||
                    active.deliveryRequest?.dropAddress;

                const customerAddressString = formatAddress(rawCustomerAddress) || 'Drop address';

                if (active && !localStorage.getItem('active_delivery_start_time')) {
                    localStorage.setItem('active_delivery_start_time', String(Date.now() - 5 * 60 * 1000));
                }

                setActiveDelivery(prev => {
                    if (prev?.status === 'DELIVERED') {
                        return prev;
                    }
                    return {
                        id: active.id || active.deliveryId,
                        deliveryRequestId: active.deliveryRequestId || active.deliveryRequest?.id,
                        orderId: orderId,
                        orderNumber: orderDetails?.orderNumber || active.orderNumber || active.order?.orderNumber || active.deliveryRequest?.orderNumber || (orderId ? orderId.substring(0, 8) : ''),
                        restaurantName: orderDetails?.restaurantName || active.restaurantName || active.order?.restaurantName || active.deliveryRequest?.restaurantName || 'Restaurant',
                        restaurantAddress: restaurantAddressString,
                        restaurantPhone: orderDetails?.restaurantPhone || active.restaurantPhone || active.order?.restaurantPhone || active.deliveryRequest?.restaurantPhone || '',
                        restaurantLatitude: safeNum(orderDetails?.pickupLatitude || orderDetails?.restaurantLatitude || activeResLat, 18.5204),
                        restaurantLongitude: safeNum(orderDetails?.pickupLongitude || orderDetails?.restaurantLongitude || activeResLng, 73.8567),
                        customerName: orderDetails?.customerName || active.customerName || active.order?.customerName || active.deliveryRequest?.customerName || 'Customer',
                        customerAddress: customerAddressString,
                        customerPhone: orderDetails?.customerPhone || active.customerPhone || active.order?.customerPhone || active.deliveryRequest?.customerPhone || '',
                        customerLatitude: safeNum(orderDetails?.deliveryAddress?.latitude || orderDetails?.deliveryInfo?.deliveryAddress?.latitude || orderDetails?.customerLatitude || activeCustLat, 18.5204),
                        customerLongitude: safeNum(orderDetails?.deliveryAddress?.longitude || orderDetails?.deliveryInfo?.deliveryAddress?.longitude || orderDetails?.customerLongitude || activeCustLng, 73.8567),
                        earnings: active.earnings || active.deliveryRequest?.earnings || 0,
                        distanceKm: parseFloat(Number(active.distanceKm || active.totalDistanceKm || active.deliveryRequest?.totalDistanceKm || getHaversineDistance(
                            safeNum(orderDetails?.pickupLatitude || orderDetails?.restaurantLatitude || activeResLat, 18.5204),
                            safeNum(orderDetails?.pickupLongitude || orderDetails?.restaurantLongitude || activeResLng, 73.8567),
                            safeNum(orderDetails?.deliveryAddress?.latitude || orderDetails?.deliveryInfo?.deliveryAddress?.latitude || orderDetails?.customerLatitude || activeCustLat, 18.5204),
                            safeNum(orderDetails?.deliveryAddress?.longitude || orderDetails?.deliveryInfo?.deliveryAddress?.longitude || orderDetails?.customerLongitude || activeCustLng, 73.8567)
                        )).toFixed(1)),
                        status: mappedStatus,
                        items: mappedItems,
                        specialInstructions: orderDetails?.specialInstructions || active.specialInstructions || active.order?.specialInstructions || active.deliveryRequest?.specialInstructions || '',
                        deliveryInstructions: rawCustomerAddress?.instructions || orderDetails?.deliveryAddress?.instructions || orderDetails?.deliveryInfo?.deliveryAddress?.instructions || active.deliveryAddress?.instructions || active.deliveryRequest?.deliveryAddress?.instructions || active.order?.deliveryAddress?.instructions || active.deliveryRequest?.instructions || active.instructions || '',
                        paymentMethod: orderDetails?.paymentMethod || active.paymentMethod || active.deliveryRequest?.paymentMethod || 'COD',
                        totalAmount: orderDetails?.totalAmount || orderDetails?.totalPrice || active.totalAmount || active.deliveryRequest?.totalAmount || 450,
                    };
                });
            } else {
                setActiveDelivery(prev => {
                    if (isCompletingDeliveryRef.current || prev?.status === 'DELIVERED') {
                        return prev;
                    }
                    localStorage.removeItem('active_restaurant_lat');
                    localStorage.removeItem('active_restaurant_lng');
                    localStorage.removeItem('active_customer_lat');
                    localStorage.removeItem('active_customer_lng');
                    return null;
                });
            }

            // Restore online status from local storage
            const storedOnline = localStorage.getItem('rider_online') === 'true';
            if (storedOnline) {
                setIsOnline(true);
            }
        } catch (e) {
            console.error('Error fetching current active delivery:', e);
        } finally {
            setIsInitialLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchCurrentState();
    }, [fetchCurrentState]);

    const checkLocationStatus = useCallback(async (): Promise<boolean> => {
        try {
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                setIsLocationOff(true);
                return false;
            }

            const { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                const requestRes = await Location.requestForegroundPermissionsAsync();
                if (requestRes.status !== 'granted') {
                    setIsLocationOff(true);
                    return false;
                }
            }

            setIsLocationOff(false);

            const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const coords = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };

            setCurrentCoords(coords);
            currentCoordsRef.current = coords;
            return true;
        } catch (e) {
            console.warn("Failed checking location status:", e);
            setIsLocationOff(true);
            return false;
        }
    }, []);

    // Handle duty status transition
    const toggleDutyStatus = async (): Promise<boolean> => {
        if (!isAuthenticated) return false;
        setIsUpdatingStatus(true);
        try {
            if (isOnline) {
                const ok = await setStatusOffline();
                if (ok) {
                    setIsOnline(false);
                    localStorage.setItem('rider_online', 'false');
                    setPendingOffer(null);
                    setIsLocationOff(false);
                    showToast('You are now offline', 'info');
                    return true;
                }
            } else {
                const servicesEnabled = await Location.hasServicesEnabledAsync();
                if (!servicesEnabled) {
                    setIsLocationOff(true);
                    showToast('Please turn on your location services (GPS).', 'error');
                    setIsUpdatingStatus(false);
                    return false;
                }

                // Request location permissions before going online
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setIsLocationOff(true);
                    showToast('Location permissions are required to go online.', 'error');
                    setIsUpdatingStatus(false);
                    return false;
                }

                setIsLocationOff(false);
                const ok = await setStatusOnline();
                if (ok) {
                    setIsOnline(true);
                    localStorage.setItem('rider_online', 'true');
                    showToast('You are now online and looking for orders', 'success');

                    // Immediately try to get initial location and upload
                    try {
                        const position = await Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Balanced,
                        });
                        const coords = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        };
                        setCurrentCoords(coords);
                        currentCoordsRef.current = coords;
                        await updateRiderLocation(coords.latitude, coords.longitude);
                    } catch (err) {
                        console.warn("Failed to get initial location after going online:", err);
                    }

                    return true;
                }
            }
            showToast('Failed to update status', 'error');
            return false;
        } catch (e: any) {
            showToast(e.message || 'Failed to update status', 'error');
            return false;
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // Location Tracking Loop (using Expo Location)
    useEffect(() => {
        let isMounted = true;
        let subscription: Location.LocationSubscription | null = null;

        const startLocationTracking = async () => {
            try {
                const servicesEnabled = await Location.hasServicesEnabledAsync();
                if (!servicesEnabled) {
                    setIsLocationOff(true);
                    return;
                }

                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setIsLocationOff(true);
                    return;
                }

                setIsLocationOff(false);

                // Subscribe to fast local location changes
                const sub = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 10000,
                        distanceInterval: 10
                    },
                    (location) => {
                        if (isMounted) {
                            setCurrentCoords({
                                latitude: location.coords.latitude,
                                longitude: location.coords.longitude
                            });
                            setIsLocationOff(false);
                        }
                    }
                );

                if (isMounted) {
                    subscription = sub;
                    locationSubscriptionRef.current = sub;
                } else {
                    // If component unmounted or effect cleaned up before watchPositionAsync resolved
                    try {
                        sub.remove();
                    } catch (e) {
                        console.warn('Failed to remove subscription on late resolve:', e);
                    }
                }
            } catch (err) {
                console.error('Error starting location tracking watch:', err);
                setIsLocationOff(true);
            }
        };

        if (isOnline && isAuthenticated) {
            startLocationTracking();
        } else {
            setCurrentCoords(null);
            setIsLocationOff(false);
        }

        return () => {
            isMounted = false;
            setCurrentCoords(null);

            if (subscription) {
                try {
                    subscription.remove();
                } catch (e) {
                    console.warn('Failed to remove local location subscription:', e);
                }
                subscription = null;
            }

            if (locationSubscriptionRef.current) {
                try {
                    locationSubscriptionRef.current.remove();
                } catch (e) {
                    console.warn('Failed to remove ref location subscription:', e);
                }
                locationSubscriptionRef.current = null;
            }
        };
    }, [isOnline, isAuthenticated]);

    // Sync currentCoords with ref to avoid resetting the interval
    useEffect(() => {
        currentCoordsRef.current = currentCoords;
    }, [currentCoords]);

    // Periodically post coordinates to backend
    useEffect(() => {
        if (!isOnline || !isAuthenticated) return;

        const uploadLocation = async () => {
            try {
                const servicesEnabled = await Location.hasServicesEnabledAsync();
                if (!servicesEnabled) {
                    setIsLocationOff(true);
                    return;
                }

                const { status } = await Location.getForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setIsLocationOff(true);
                    return;
                }

                setIsLocationOff(false);

                let coords = currentCoordsRef.current;
                if (!coords) {
                    try {
                        const position = await Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Balanced,
                        });
                        coords = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        };
                        setCurrentCoords(coords);
                    } catch (err) {
                        console.warn("getCurrentPositionAsync failed in upload interval:", err);
                    }
                }

                if (coords) {
                    await updateRiderLocation(coords.latitude, coords.longitude);
                }
            } catch (e) {
                console.warn("Error in uploadLocation loop:", e);
                setIsLocationOff(true);
            }
        };

        // Upload immediately on status toggle
        uploadLocation();

        // Strictly upload on a 15-second interval
        locationUploadTimerRef.current = setInterval(uploadLocation, 15000);

        return () => {
            if (locationUploadTimerRef.current) {
                clearInterval(locationUploadTimerRef.current);
                locationUploadTimerRef.current = null;
            }
        };
    }, [isOnline, isAuthenticated]);

    // Periodic Active Delivery State Polling (every 10 seconds)
    useEffect(() => {
        let activePollingTimer: any = null;

        const pollActiveDelivery = async () => {
            if (!isAuthenticated) return;
            // If offline and no active delivery (or it's already delivered), we don't need to poll
            if (!isOnline && (!activeDelivery || activeDelivery.status === 'DELIVERED')) return;
            try {
                await fetchCurrentState();
            } catch (err) {
                console.warn('Failed to poll active delivery status:', err);
            }
        };

        const shouldPoll = isAuthenticated && (isOnline || (activeDelivery && activeDelivery.status !== 'DELIVERED'));

        if (shouldPoll) {
            // Poll immediately when active delivery or online status is detected
            pollActiveDelivery();
            activePollingTimer = setInterval(pollActiveDelivery, 10000);
        }

        return () => {
            if (activePollingTimer) {
                clearInterval(activePollingTimer);
            }
        };
    }, [isAuthenticated, isOnline, activeDelivery?.status, fetchCurrentState]);

    // Periodic Pending Offer Polling
    useEffect(() => {
        const checkOffers = async () => {
            if (!isOnline || activeDelivery || pendingOffer || !isAuthenticated) return;
            try {
                const offer = await getPendingOffer();
                if (offer) {
                    // Use actual remaining seconds from backend, fallback to 30 if null/undefined
                    const remainingSeconds = typeof offer.expiresInSeconds === 'number'
                        ? Math.max(0, offer.expiresInSeconds)
                        : 30;

                    // If the offer is already expired on the backend, do not display it
                    if (remainingSeconds <= 0) {
                        return;
                    }

                    const parsedPickLat = safeNum(offer.pickupLatitude, 18.5204);
                    const parsedPickLng = safeNum(offer.pickupLongitude, 73.8567);
                    const parsedDropLat = safeNum(offer.dropLatitude, 18.5204);
                    const parsedDropLng = safeNum(offer.dropLongitude, 73.8567);

                    localStorage.setItem('active_restaurant_lat', String(parsedPickLat));
                    localStorage.setItem('active_restaurant_lng', String(parsedPickLng));
                    localStorage.setItem('active_customer_lat', String(parsedDropLat));
                    localStorage.setItem('active_customer_lng', String(parsedDropLng));

                    setPendingOffer({
                        offerId: offer.offerId || offer.id,
                        deliveryRequestId: offer.deliveryRequestId,
                        orderNumber: offer.orderNumber || 'HIVAGO-ORD',
                        restaurantName: offer.restaurantName || 'Restaurant Name',
                        pickupAddress: offer.pickupAddress || 'Restaurant Address',
                        pickupLatitude: parsedPickLat,
                        pickupLongitude: parsedPickLng,
                        dropAddress: offer.dropAddress || 'Customer Address',
                        dropLatitude: parsedDropLat,
                        dropLongitude: parsedDropLng,
                        distanceToPickupKm: typeof offer.distanceToPickupKm === 'number' ? offer.distanceToPickupKm : 1.2,
                        distanceToDropKm: typeof offer.distanceToDropKm === 'number' ? offer.distanceToDropKm : 3.5,
                        totalDistanceKm: typeof offer.totalDistanceKm === 'number' ? offer.totalDistanceKm : 3.7,
                        earnings: typeof offer.earnings === 'number' ? offer.earnings : 85,
                        expiresInSeconds: remainingSeconds,
                        expiresAt: offer.expiresAt || new Date(Date.now() + remainingSeconds * 1000).toISOString()
                    });
                    setOfferCountdown(remainingSeconds);
                }
            } catch (err) {
                console.warn('Failed to poll for offer:', err);
            }
        };

        if (isOnline && !activeDelivery && isAuthenticated) {
            checkOffers();
            pollingTimerRef.current = setInterval(checkOffers, 5000);
        }

        return () => {
            if (pollingTimerRef.current) {
                clearInterval(pollingTimerRef.current);
                pollingTimerRef.current = null;
            }
        };
    }, [isOnline, activeDelivery, pendingOffer, isAuthenticated]);

    // Offer Expiry Countdown Timer
    useEffect(() => {
        if (pendingOffer && offerCountdown > 0) {
            countdownTimerRef.current = setInterval(() => {
                setOfferCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(countdownTimerRef.current!);
                        rejectActiveOffer('Expired');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
            }
        };
    }, [pendingOffer, offerCountdown]);

    // Active workflow actions
    const acceptActiveOffer = async (): Promise<boolean> => {
        if (!pendingOffer) return false;
        setIsProcessingOffer(true);
        try {
            const success = await acceptOffer(pendingOffer.offerId);
            if (success) {
                localStorage.setItem('active_restaurant_lat', String(pendingOffer.pickupLatitude));
                localStorage.setItem('active_restaurant_lng', String(pendingOffer.pickupLongitude));
                localStorage.setItem('active_customer_lat', String(pendingOffer.dropLatitude));
                localStorage.setItem('active_customer_lng', String(pendingOffer.dropLongitude));
                localStorage.setItem('active_delivery_start_time', String(Date.now()));
                showToast('Offer accepted! Head to restaurant.', 'success');
                setPendingOffer(null);
                await fetchCurrentState();
                return true;
            }
            showToast('Failed to accept offer. It may have expired.', 'error');
            setPendingOffer(null);
            return false;
        } catch (e: any) {
            showToast(e.message || 'Error accepting offer', 'error');
            setPendingOffer(null);
            return false;
        } finally {
            setIsProcessingOffer(false);
        }
    };

    const rejectActiveOffer = async (reason: string = 'Rider rejected'): Promise<boolean> => {
        if (!pendingOffer) return false;
        setIsProcessingOffer(true);
        try {
            const success = await rejectOffer(pendingOffer.offerId, reason);
            if (success) {
                showToast('Offer rejected', 'info');
                setPendingOffer(null);
                return true;
            }
            setPendingOffer(null);
            return false;
        } catch (e: any) {
            console.error('Reject offer error:', e);
            setPendingOffer(null);
            return false;
        } finally {
            setIsProcessingOffer(false);
        }
    };

    const arrivedRestaurant = async (): Promise<boolean> => {
        if (!activeDelivery) return false;
        try {
            const success = await markArrivedPickup(activeDelivery.id);
            if (success) {
                setActiveDelivery(prev => prev ? { ...prev, status: 'ARRIVED_PICKUP' } : null);
                return true;
            }
            showToast('Failed to record arrival', 'error');
            return false;
        } catch (e) {
            showToast('Network error, try again', 'error');
            return false;
        }
    };

    const confirmOrderPickup = async (pickupCode: string): Promise<boolean> => {
        if (!activeDelivery) return false;
        try {
            const success = await markPickedUp(activeDelivery.id, pickupCode);
            if (success) {
                setActiveDelivery(prev => prev ? { ...prev, status: 'PICKED_UP' } : null);
                return true;
            }
            showToast('Invalid pickup code', 'error');
            return false;
        } catch (e: any) {
            showToast(e.message || 'Invalid pickup code', 'error');
            return false;
        }
    };

    const arrivedCustomer = async (): Promise<boolean> => {
        if (!activeDelivery) return false;
        try {
            const success = await markArrivedDrop(activeDelivery.id);
            if (success) {
                setActiveDelivery(prev => prev ? { ...prev, status: 'ARRIVED_DROP' } : null);
                return true;
            }
            showToast('Failed to record arrival', 'error');
            return false;
        } catch (e) {
            showToast('Network error, try again', 'error');
            return false;
        }
    };

    const completeDelivery = async (dropCode: string): Promise<boolean> => {
        if (!activeDelivery) return false;
        isCompletingDeliveryRef.current = true;
        try {
            const success = await markDelivered(activeDelivery.id, dropCode);
            if (success) {
                const startTime = Number(localStorage.getItem('active_delivery_start_time'));
                if (startTime) {
                    const diffMs = Date.now() - startTime;
                    const diffMins = Math.max(1, Math.round(diffMs / 60000));
                    localStorage.setItem(`delivery_time_${activeDelivery.id}`, `${diffMins} mins`);
                } else {
                    localStorage.setItem(`delivery_time_${activeDelivery.id}`, '12 mins');
                }
                setActiveDelivery(prev => prev ? { ...prev, status: 'DELIVERED' } : null);
                return true;
            }
            showToast('Invalid delivery verification code', 'error');
            return false;
        } catch (e: any) {
            showToast(e.message || 'Invalid delivery code', 'error');
            return false;
        } finally {
            isCompletingDeliveryRef.current = false;
        }
    };

    const abortDelivery = async (reason: string, notes: string = ''): Promise<boolean> => {
        if (!activeDelivery) return false;
        try {
            const success = await markFailed(activeDelivery.id, reason, notes);
            if (success) {
                showToast('Delivery cancelled', 'warning');
                setActiveDelivery(null);
                return true;
            }
            showToast('Failed to cancel delivery', 'error');
            return false;
        } catch (e) {
            showToast('Network error, try again', 'error');
            return false;
        }
    };

    const refreshActiveStatus = async () => {
        await fetchCurrentState();
    };

    const clearActiveDelivery = () => {
        setActiveDelivery(null);
        localStorage.removeItem('active_restaurant_lat');
        localStorage.removeItem('active_restaurant_lng');
        localStorage.removeItem('active_customer_lat');
        localStorage.removeItem('active_customer_lng');
    };

    return (
        <DeliveryContext.Provider value={{
            isOnline,
            pendingOffer,
            activeDelivery,
            currentCoords,
            offerCountdown,
            isProcessingOffer,
            isUpdatingStatus,
            isLocationOff,
            isInitialLoading,
            checkLocationStatus,
            toggleDutyStatus,
            acceptActiveOffer,
            rejectActiveOffer,
            arrivedRestaurant,
            confirmOrderPickup,
            arrivedCustomer,
            completeDelivery,
            abortDelivery,
            refreshActiveStatus,
            clearActiveDelivery
        }}>
            {children}
        </DeliveryContext.Provider>
    );
};

export const useDelivery = () => {
    const context = useContext(DeliveryContext);
    if (!context) {
        throw new Error('useDelivery must be used within a DeliveryProvider');
    }
    return context;
};
