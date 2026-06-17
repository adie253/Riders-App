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
    markFailed 
} from '../../data/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

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
}

interface DeliveryContextType {
    isOnline: boolean;
    pendingOffer: DeliveryOffer | null;
    activeDelivery: ActiveDelivery | null;
    currentCoords: { latitude: number; longitude: number } | null;
    offerCountdown: number;
    isProcessingOffer: boolean;
    isUpdatingStatus: boolean;
    toggleDutyStatus: () => Promise<boolean>;
    acceptActiveOffer: () => Promise<boolean>;
    rejectActiveOffer: (reason?: string) => Promise<boolean>;
    arrivedRestaurant: () => Promise<boolean>;
    confirmOrderPickup: (pickupCode: string) => Promise<boolean>;
    arrivedCustomer: () => Promise<boolean>;
    completeDelivery: (dropCode: string) => Promise<boolean>;
    abortDelivery: (reason: string, notes?: string) => Promise<boolean>;
    refreshActiveStatus: () => Promise<void>;
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

    const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
    const pollingTimerRef = useRef<any>(null);
    const locationUploadTimerRef = useRef<any>(null);
    const countdownTimerRef = useRef<any>(null);

    // Fetch initial active delivery if authenticated
    const fetchCurrentState = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const active = await getActiveDelivery();
            if (active) {
                // Map API response keys to ActiveDelivery structure
                setActiveDelivery({
                    id: active.id || active.deliveryId,
                    deliveryRequestId: active.deliveryRequestId,
                    orderId: active.orderId,
                    orderNumber: active.orderNumber || active.orderId?.substring(0, 8),
                    restaurantName: active.restaurantName || 'Restaurant',
                    restaurantAddress: active.pickupAddress || active.restaurantAddress || 'Pickup address',
                    restaurantPhone: active.restaurantPhone || '',
                    restaurantLatitude: active.pickupLatitude || active.restaurantLatitude,
                    restaurantLongitude: active.pickupLongitude || active.restaurantLongitude,
                    customerName: active.customerName || 'Customer',
                    customerAddress: active.dropAddress || active.customerAddress || 'Drop address',
                    customerPhone: active.customerPhone || '',
                    customerLatitude: active.dropLatitude || active.customerLatitude,
                    customerLongitude: active.dropLongitude || active.customerLongitude,
                    earnings: active.earnings || 0,
                    distanceKm: active.distanceKm || active.totalDistanceKm || 0,
                    status: active.status || 'ASSIGNED',
                    items: active.items || []
                });
            } else {
                setActiveDelivery(null);
            }

            // Restore online status from local storage
            const storedOnline = localStorage.getItem('rider_online') === 'true';
            if (storedOnline) {
                setIsOnline(true);
            }
        } catch (e) {
            console.error('Error fetching current active delivery:', e);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchCurrentState();
    }, [fetchCurrentState]);

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
                    showToast('You are now offline', 'info');
                    return true;
                }
            } else {
                // Request location permissions before going online
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    showToast('Location permissions are required to go online.', 'error');
                    setIsUpdatingStatus(false);
                    return false;
                }

                const ok = await setStatusOnline();
                if (ok) {
                    setIsOnline(true);
                    localStorage.setItem('rider_online', 'true');
                    showToast('You are now online and looking for orders', 'success');
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

        const startLocationTracking = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;

                // Subscribe to fast local location changes
                locationSubscriptionRef.current = await Location.watchPositionAsync(
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
                        }
                    }
                );
            } catch (err) {
                console.error('Error starting location tracking watch:', err);
            }
        };

        if (isOnline && isAuthenticated) {
            startLocationTracking();
        } else {
            if (locationSubscriptionRef.current) {
                locationSubscriptionRef.current.remove();
                locationSubscriptionRef.current = null;
            }
            setCurrentCoords(null);
        }

        return () => {
            isMounted = false;
            if (locationSubscriptionRef.current) {
                locationSubscriptionRef.current.remove();
            }
        };
    }, [isOnline, isAuthenticated]);

    // Periodically post coordinates to backend
    useEffect(() => {
        if (isOnline && isAuthenticated && currentCoords) {
            // Upload immediately on coordinates change or every 15 seconds
            const uploadLocation = async () => {
                await updateRiderLocation(currentCoords.latitude, currentCoords.longitude);
            };

            uploadLocation();
            locationUploadTimerRef.current = setInterval(uploadLocation, 15000);
        }

        return () => {
            if (locationUploadTimerRef.current) {
                clearInterval(locationUploadTimerRef.current);
                locationUploadTimerRef.current = null;
            }
        };
    }, [isOnline, isAuthenticated, currentCoords]);

    // Periodic Pending Offer Polling
    useEffect(() => {
        const checkOffers = async () => {
            if (!isOnline || activeDelivery || pendingOffer || !isAuthenticated) return;
            try {
                const offer = await getPendingOffer();
                if (offer) {
                    setPendingOffer({
                        offerId: offer.offerId || offer.id,
                        deliveryRequestId: offer.deliveryRequestId,
                        orderNumber: offer.orderNumber || 'HIVAGO-ORD',
                        restaurantName: offer.restaurantName || 'Restaurant Name',
                        pickupAddress: offer.pickupAddress || 'Restaurant Address',
                        pickupLatitude: offer.pickupLatitude,
                        pickupLongitude: offer.pickupLongitude,
                        dropAddress: offer.dropAddress || 'Customer Address',
                        dropLatitude: offer.dropLatitude,
                        dropLongitude: offer.dropLongitude,
                        distanceToPickupKm: offer.distanceToPickupKm || 1.2,
                        distanceToDropKm: offer.distanceToDropKm || 3.5,
                        totalDistanceKm: offer.totalDistanceKm || 4.7,
                        earnings: offer.earnings || 45,
                        expiresInSeconds: offer.expiresInSeconds || 45,
                        expiresAt: offer.expiresAt || new Date(Date.now() + 45000).toISOString()
                    });
                    setOfferCountdown(offer.expiresInSeconds || 45);
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
                        setPendingOffer(null);
                        clearInterval(countdownTimerRef.current!);
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
                showToast('Arrived at restaurant. Verify pickup code.', 'success');
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
                showToast('Pickup verified! Out for delivery.', 'success');
                setActiveDelivery(prev => prev ? { ...prev, status: 'PICKED_UP' } : null);
                return true;
            }
            showToast('Invalid pickup code', 'error');
            return false;
        } catch (e: any) {
            showToast(e.message || 'Invalid pickup code. Check with restaurant.', 'error');
            return false;
        }
    };

    const arrivedCustomer = async (): Promise<boolean> => {
        if (!activeDelivery) return false;
        try {
            const success = await markArrivedDrop(activeDelivery.id);
            if (success) {
                showToast('Arrived at customer location. Request drop code.', 'success');
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
        try {
            const success = await markDelivered(activeDelivery.id, dropCode);
            if (success) {
                showToast('Delivery completed! Earnings added.', 'success');
                setActiveDelivery(null);
                return true;
            }
            showToast('Invalid delivery verification code', 'error');
            return false;
        } catch (e: any) {
            showToast(e.message || 'Invalid code. Ask customer for the delivery code.', 'error');
            return false;
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

    return (
        <DeliveryContext.Provider value={{
            isOnline,
            pendingOffer,
            activeDelivery,
            currentCoords,
            offerCountdown,
            isProcessingOffer,
            isUpdatingStatus,
            toggleDutyStatus,
            acceptActiveOffer,
            rejectActiveOffer,
            arrivedRestaurant,
            confirmOrderPickup,
            arrivedCustomer,
            completeDelivery,
            abortDelivery,
            refreshActiveStatus
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
