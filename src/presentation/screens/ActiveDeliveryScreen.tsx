import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Modal, Linking, Dimensions, Platform, PanResponder, Animated, Keyboard, TouchableWithoutFeedback, StatusBar } from 'react-native';
import * as Location from 'expo-location';
import { useDelivery } from '../context/DeliveryContext';
import { useToast } from '../context/ToastContext';
import MapView, { Marker, Polyline, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { localStorage } from '../../utils/storage';
import {
    Phone, MapPin, Check, AlertTriangle, ArrowRight, Clipboard, X,
    ChevronDown, ChevronUp, Navigation, Play, Pause, Volume2, ArrowLeft, Shield, Clock, User, Maximize2, Minimize2,
    CornerUpLeft, CornerUpRight, ArrowUp
} from 'lucide-react-native';

const SwipeButton = ({ text, onSwipeSuccess, color = '#A31D1D' }: { text: string; onSwipeSuccess: () => void; color?: string }) => {
    const pan = useRef(new Animated.ValueXY()).current;
    const containerWidthRef = useRef(0);
    const handleWidth = 56;
    const threshold = 0.7;
    const panX = pan.x as any;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({ x: panX._value, y: 0 });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: (e, gestureState) => {
                const maxX = containerWidthRef.current - handleWidth - 4;
                let nextX = gestureState.dx;
                if (panX._offset + nextX < 0) {
                    nextX = -panX._offset;
                } else if (panX._offset + nextX > maxX) {
                    nextX = maxX - panX._offset;
                }
                pan.x.setValue(nextX);
            },
            onPanResponderRelease: (e, gestureState) => {
                pan.flattenOffset();
                const maxX = containerWidthRef.current - handleWidth - 4;
                const currentX = panX._value;

                if (currentX >= maxX * threshold) {
                    Animated.timing(pan.x, {
                        toValue: maxX,
                        duration: 150,
                        useNativeDriver: false,
                    }).start(() => {
                        onSwipeSuccess();
                        setTimeout(() => {
                            Animated.spring(pan.x, {
                                toValue: 0,
                                useNativeDriver: false,
                            }).start();
                        }, 1000);
                    });
                } else {
                    Animated.spring(pan.x, {
                        toValue: 0,
                        useNativeDriver: false,
                    }).start();
                }
            },
        })
    ).current;

    return (
        <View
            style={styles.swipeTrack}
            onLayout={(e) => {
                containerWidthRef.current = e.nativeEvent.layout.width;
            }}
        >
            <Text style={styles.swipeText}>{text}</Text>

            <Animated.View
                style={[
                    styles.swipeHandle,
                    {
                        backgroundColor: color,
                        transform: [{ translateX: pan.x }]
                    }
                ]}
                {...panResponder.panHandlers}
            >
                <Text style={styles.swipeHandleText}>&gt;&gt;</Text>
            </Animated.View>
        </View>
    );
};

export const ActiveDeliveryScreen = ({ navigation }: { navigation: any }) => {
    const {
        activeDelivery,
        currentCoords,
        arrivedRestaurant,
        confirmOrderPickup,
        arrivedCustomer,
        completeDelivery,
        abortDelivery,
        clearActiveDelivery
    } = useDelivery();
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();

    const formatShowToRestaurantCode = (orderNumber: string) => {
        if (!orderNumber) return { line1: '', line2: '' };
        if (orderNumber.includes('-')) {
            const parts = orderNumber.split('-');
            if (parts.length === 2) {
                const code = parts[1];
                if (code.length > 1) {
                    return {
                        line1: `${parts[0]}-${code[0]}`,
                        line2: code.slice(1)
                    };
                }
            } else if (parts.length > 2) {
                return {
                    line1: `${parts[0]}-${parts[1]}`,
                    line2: parts.slice(2).join('-')
                };
            }
        }
        const mid = Math.ceil(orderNumber.length / 2);
        return {
            line1: orderNumber.slice(0, mid),
            line2: orderNumber.slice(mid)
        };
    };

    // OTP mode state (renders full-screen OTP view for pickup)
    const [isOtpMode, setIsOtpMode] = useState(false);
    // Checklist state
    const [itemsChecked, setItemsChecked] = useState(false);
    // Help dropdown state
    const [showHelpHolder, setShowHelpHolder] = useState(false);

    // Audio Message Simulator State
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const audioTimerRef = useRef<any>(null);
    const isNavigatingRef = useRef(false);

    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('Customer unavailable');
    const [cancelNotes, setCancelNotes] = useState('');
    const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
    const [isMapFullscreen, setIsMapFullscreen] = useState(false);
    const [navSteps, setNavSteps] = useState<{ instruction: string; distance: number; modifier: string }[]>([]);
    const otpInputRef = useRef<TextInput>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
        }).start();
    }, []);

    // Get real GPS location on mount if context coords not available yet
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    if (loc && loc.coords) {
                        setLocalGpsCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                    }
                }
            } catch (e) {
                console.warn('GPS location fetch warning:', e);
            }
        })();
    }, []);

    const effectiveRiderLat = currentCoords?.latitude || localGpsCoords?.latitude || activeDelivery?.restaurantLatitude || 18.5204;
    const effectiveRiderLng = currentCoords?.longitude || localGpsCoords?.longitude || activeDelivery?.restaurantLongitude || 73.8567;

    // Fetch real driving route from OSRM router
    useEffect(() => {
        if (!activeDelivery) return;

        const startLat = effectiveRiderLat;
        const startLng = effectiveRiderLng;

        const isHeadingToRes = activeDelivery.status === 'ASSIGNED' || activeDelivery.status === 'ARRIVED_PICKUP';
        const destLat = isHeadingToRes ? activeDelivery.restaurantLatitude : activeDelivery.customerLatitude;
        const destLng = isHeadingToRes ? activeDelivery.restaurantLongitude : activeDelivery.customerLongitude;

        if (!destLat || !destLng) return;

        let active = true;

        const fetchRoute = async () => {
            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data.code === 'Ok' && data.routes && data.routes[0]) {
                        const coords = data.routes[0].geometry.coordinates.map((coord: [number, number]) => ({
                            latitude: coord[1],
                            longitude: coord[0],
                        }));
                        if (active) {
                            setRouteCoords(coords);
                            if (data.routes[0].legs && data.routes[0].legs[0] && data.routes[0].legs[0].steps) {
                                const parsed = data.routes[0].legs[0].steps.map((step: any) => {
                                    const dist = Math.round(step.distance);
                                    const street = step.name ? ` onto ${step.name}` : '';
                                    const type = step.maneuver.type;
                                    const modifier = step.maneuver.modifier;

                                    let instruction = '';
                                    if (type === 'depart') {
                                        instruction = `Head towards destination`;
                                    } else if (type === 'arrive') {
                                        instruction = `Arrive at destination`;
                                    } else if (type === 'turn' || type === 'ramp' || type === 'fork') {
                                        if (modifier?.includes('left')) {
                                            instruction = `Turn left${street}`;
                                        } else if (modifier?.includes('right')) {
                                            instruction = `Turn right${street}`;
                                        } else if (modifier === 'straight') {
                                            instruction = `Continue straight${street}`;
                                        } else if (modifier === 'uturn') {
                                            instruction = `Make a U-Turn${street}`;
                                        } else {
                                            instruction = `Turn ${modifier || ''}${street}`;
                                        }
                                    } else if (type === 'roundabout') {
                                        instruction = `Take roundabout exit${street}`;
                                    } else {
                                        instruction = `Continue${street}`;
                                    }

                                    return {
                                        instruction,
                                        distance: dist,
                                        modifier: modifier || ''
                                    };
                                });
                                setNavSteps(parsed);
                            } else {
                                setNavSteps([]);
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch route from OSRM:', error);
            }
        };

        fetchRoute();

        return () => {
            active = false;
        };
    }, [
        currentCoords?.latitude,
        currentCoords?.longitude,
        activeDelivery?.status,
        activeDelivery?.restaurantLatitude,
        activeDelivery?.restaurantLongitude,
        activeDelivery?.customerLatitude,
        activeDelivery?.customerLongitude
    ]);

    if (!activeDelivery) {
        return (
            <View style={styles.fallbackContainer}>
                <ActivityIndicator size="large" color="#FF4732" />
            </View>
        );
    }

    const handleCall = (phone: string) => {
        if (phone) {
            Linking.openURL(`tel:${phone}`);
        } else {
            showToast('Phone number not available', 'warning');
        }
    };

    const handleOpenMaps = async () => {
        const destLat = activeDelivery.status === 'PICKED_UP' || activeDelivery.status === 'ARRIVED_DROP'
            ? activeDelivery.customerLatitude
            : activeDelivery.restaurantLatitude;
        const destLng = activeDelivery.status === 'PICKED_UP' || activeDelivery.status === 'ARRIVED_DROP'
            ? activeDelivery.customerLongitude
            : activeDelivery.restaurantLongitude;

        const nativeUrl = Platform.select({
            ios: `googlemaps://?daddr=${destLat},${destLng}&directionsmode=driving`,
            android: `google.navigation:q=${destLat},${destLng}&mode=d`,
            default: `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`
        });

        const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;

        try {
            const supported = await Linking.canOpenURL(nativeUrl);
            if (supported) {
                await Linking.openURL(nativeUrl);
            } else {
                await Linking.openURL(fallbackUrl);
            }
        } catch (error) {
            Linking.openURL(fallbackUrl).catch(() => {
                showToast('Failed to open navigation', 'error');
            });
        }
    };

    const handleStepAction = async () => {
        setLoading(true);
        try {
            if (activeDelivery.status === 'ASSIGNED') {
                const ok = await arrivedRestaurant();
                if (ok) {
                    setItemsChecked(false);
                    setIsOtpMode(false);
                }
            } else if (activeDelivery.status === 'ARRIVED_PICKUP') {
                if (otpCode.length < 4) {
                    showToast('Please enter a valid 4-digit code', 'warning');
                    setLoading(false);
                    return;
                }
                const ok = await confirmOrderPickup(otpCode);
                if (ok) {
                    setOtpCode('');
                    setIsOtpMode(false);
                }
            } else if (activeDelivery.status === 'PICKED_UP') {
                const ok = await arrivedCustomer();
                if (ok) {
                    setOtpCode('');
                    setIsOtpMode(false);
                }
            } else if (activeDelivery.status === 'ARRIVED_DROP') {
                if (otpCode.length < 4) {
                    showToast('Please enter a valid 4-digit code', 'warning');
                    setLoading(false);
                    return;
                }
                const ok = await completeDelivery(otpCode);
                if (ok) {
                    setOtpCode('');
                }
            }
        } catch (e: any) {
            showToast(e.message || 'Operation failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAbort = async () => {
        if (!cancelNotes.trim()) {
            showToast('Please add comments explaining the issue', 'warning');
            return;
        }
        setLoading(true);
        const ok = await abortDelivery(cancelReason, cancelNotes);
        setLoading(false);
        if (ok) {
            setShowCancelModal(false);
        }
    };

    // Calculate map region containing rider and target
    const getMapRegion = () => {
        const riderLat = effectiveRiderLat;
        const riderLng = effectiveRiderLng;

        let destLat = activeDelivery.restaurantLatitude;
        let destLng = activeDelivery.restaurantLongitude;

        if (activeDelivery.status === 'PICKED_UP' || activeDelivery.status === 'ARRIVED_DROP') {
            destLat = activeDelivery.customerLatitude;
            destLng = activeDelivery.customerLongitude;
        }

        const avgLat = (riderLat + destLat) / 2;
        const avgLng = (riderLng + destLng) / 2;

        const deltaLat = Math.max(Math.abs(riderLat - destLat) * 1.5, 0.02);
        const deltaLng = Math.max(Math.abs(riderLng - destLng) * 1.5, 0.02);

        return {
            latitude: avgLat,
            longitude: avgLng,
            latitudeDelta: deltaLat,
            longitudeDelta: deltaLng
        };
    };

    // Render pickup 6 digit OTP boxes
    const renderOtpBoxes6 = () => {
        const boxes = [];
        for (let i = 0; i < 6; i++) {
            const digit = otpCode[i] || '';
            const isFocused = i === otpCode.length;
            boxes.push(
                <TouchableOpacity
                    key={i}
                    activeOpacity={1}
                    onPress={() => otpInputRef.current?.focus()}
                    style={[
                        styles.otpBox,
                        digit !== '' && styles.otpBoxFilled,
                        isFocused && styles.otpBoxFocused
                    ]}
                >
                    <Text style={styles.otpBoxText}>{digit}</Text>
                </TouchableOpacity>
            );
        }
        return (
            <TouchableOpacity
                activeOpacity={1}
                onPress={() => otpInputRef.current?.focus()}
                style={styles.otpBoxesContainer}
            >
                {boxes}
                <TextInput
                    ref={otpInputRef}
                    style={styles.hiddenTextInput}
                    value={otpCode}
                    onChangeText={(text) => {
                        const cleanText = text.replace(/[^0-9]/g, '');
                        if (cleanText.length <= 6) {
                            setOtpCode(cleanText);
                            if (cleanText.length === 6) {
                                Keyboard.dismiss();
                            }
                        }
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus={true}
                    caretHidden={true}
                />
            </TouchableOpacity>
        );
    };

    // Render drop-off 4 digit OTP boxes
    const renderOtpBoxes4 = () => {
        const boxes = [];
        for (let i = 0; i < 4; i++) {
            const digit = otpCode[i] || '';
            const isFocused = i === otpCode.length;
            boxes.push(
                <TouchableOpacity
                    key={i}
                    activeOpacity={1}
                    onPress={() => otpInputRef.current?.focus()}
                    style={[
                        styles.otpBox,
                        styles.otpBox4,
                        digit !== '' && styles.otpBoxFilled,
                        isFocused && styles.otpBoxFocused
                    ]}
                >
                    <Text style={styles.otpBoxText}>{digit}</Text>
                </TouchableOpacity>
            );
        }
        return (
            <TouchableOpacity
                activeOpacity={1}
                onPress={() => otpInputRef.current?.focus()}
                style={styles.otpBoxesContainer}
            >
                {boxes}
                <TextInput
                    ref={otpInputRef}
                    style={styles.hiddenTextInput}
                    value={otpCode}
                    onChangeText={(text) => {
                        const cleanText = text.replace(/[^0-9]/g, '');
                        if (cleanText.length <= 4) {
                            setOtpCode(cleanText);
                            if (cleanText.length === 4) {
                                Keyboard.dismiss();
                            }
                        }
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                    autoFocus={true}
                    caretHidden={true}
                />
            </TouchableOpacity>
        );
    };

    // STAGE 5: Delivery Successful Screen (Column 6)
    if (activeDelivery.status === 'DELIVERED') {
        return (
            <ScrollView style={styles.successScreen} contentContainerStyle={styles.successScroll}>
                {/* Check Circle Badge */}
                <View style={styles.successBadgeContainer}>
                    <View style={styles.successBadgeOuter}>
                        <View style={styles.successBadgeInner}>
                            <Check size={48} color="white" />
                        </View>
                    </View>
                    <Text style={styles.successBadgeTitle}>Delivery Successful!</Text>
                    <Text style={styles.successBadgeSub}>Great Job! Order #{activeDelivery.orderNumber} delivered</Text>
                </View>

                {/* Earnings Card */}
                <View style={styles.successEarningsCard}>
                    <Text style={styles.successEarningsStars}>★ You Earned ★</Text>
                    <Text style={styles.successEarningsVal}>₹ {activeDelivery.earnings}</Text>
                    <Text style={styles.successEarningsSubText}>Added to your wallet</Text>
                </View>

                {/* Trip Stats */}
                <View style={styles.successStatsRow}>
                    <View style={styles.successStatBox}>
                        <Text style={styles.successStatVal}>
                            {localStorage.getItem(`delivery_time_${activeDelivery.id}`) || '12 mins'}
                        </Text>
                        <Text style={styles.successStatLabel}>Delivery Time</Text>
                    </View>
                    <View style={styles.successStatBox}>
                        <Text style={styles.successStatVal}>
                            {activeDelivery.distanceKm && Number(activeDelivery.distanceKm) > 0
                                ? activeDelivery.distanceKm
                                : '3.5'} km
                        </Text>
                        <Text style={styles.successStatLabel}>Distance</Text>
                    </View>
                </View>

                {/* Excellence Text */}
                <View style={styles.successExcellenceCard}>
                    <Text style={styles.successExcellenceTitle}>🎉 Excellent Work!</Text>
                    <Text style={styles.successExcellenceSub}>You're making customers happy. Keep up the great work!</Text>
                </View>

                {/* Buttons */}
                <View style={styles.successActions}>
                    <TouchableOpacity
                        style={styles.successHomeButton}
                        onPress={() => {
                            isNavigatingRef.current = true;
                            clearActiveDelivery();
                            navigation.navigate('MainTabs', { screen: 'Dashboard' });
                        }}
                    >
                        <Text style={styles.successHomeButtonText}>Back to Home</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.successViewEarningsButton}
                        onPress={() => {
                            isNavigatingRef.current = true;
                            clearActiveDelivery();
                            navigation.navigate('MainTabs', { screen: 'Earnings' });
                        }}
                    >
                        <Text style={styles.successViewEarningsText}>View Earnings</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    // STAGE 4: Verify Delivery Screen (Columns 4 & 5)
    if (activeDelivery.status === 'ARRIVED_DROP') {
        const otpCompleted = otpCode.length === 4;

        return (
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={styles.otpFullScreenContainer}>
                    {/* Success Toast if correct OTP digits are typed */}
                    {otpCompleted && (
                        <View style={styles.successToast}>
                            <Check size={18} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.successToastText}>Ready for delivery!</Text>
                        </View>
                    )}

                    {/* Header */}
                    <View style={styles.otpHeaderArea}>
                        <TouchableOpacity
                            style={styles.otpBackButtonPill}
                            onPress={() => {
                                setOtpCode('');
                                showToast('Please enter the customer code to complete delivery.', 'info');
                            }}
                        >
                            <ArrowLeft size={16} color="#374151" style={{ marginRight: 6 }} />
                            <Text style={styles.otpBackButtonText}>Back to Delivery</Text>
                        </TouchableOpacity>

                        <Text style={styles.otpSubLabel}>VERIFY DELIVERY</Text>
                        <Text style={styles.otpMainTitle}>Enter Customer OTP</Text>
                        <Text style={styles.otpBillHint}>Ask customer for the 4-digit OTP shown in their app</Text>
                    </View>

                    <ScrollView
                        style={styles.otpFormScroll}
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Hero OTP Card */}
                        <View style={styles.otpCardContainer}>
                            <Text style={styles.otpCardTitle}>Enter 4-Digit OTP</Text>
                            {renderOtpBoxes4()}
                            <View style={styles.demoOtpContainer}>
                                <Text style={styles.demoOtpText}>Demo OTP for testing: 1234</Text>
                            </View>
                        </View>

                        {/* Customer Instructions */}
                        {(activeDelivery.specialInstructions || activeDelivery.deliveryInstructions) ? (
                            <View style={[styles.customerInstructionsCard, { marginBottom: 16 }]}>
                                <Text style={styles.instructionsTitle}>DELIVERY INSTRUCTIONS</Text>
                                {activeDelivery.deliveryInstructions ? (
                                    <Text style={[styles.instructionsText, { fontWeight: '800', color: '#D97706', marginBottom: activeDelivery.specialInstructions ? 6 : 0 }]}>
                                        📢 Option Chosen: {activeDelivery.deliveryInstructions}
                                    </Text>
                                ) : null}
                                {activeDelivery.specialInstructions ? (
                                    <Text style={styles.instructionsText}>{activeDelivery.specialInstructions}</Text>
                                ) : null}
                            </View>
                        ) : null}

                        {/* Collapsible How to get OTP Card */}
                        <View style={styles.helpCardContainer}>
                            <TouchableOpacity
                                style={styles.helpToggle}
                                onPress={() => setShowHelpHolder(!showHelpHolder)}
                            >
                                <Text style={styles.helpToggleText}>How to get OTP?</Text>
                                {showHelpHolder ? <ChevronUp size={16} color="#4B5563" /> : <ChevronDown size={16} color="#4B5563" />}
                            </TouchableOpacity>
                            {showHelpHolder && (
                                <View style={styles.helpContent}>
                                    <View style={styles.helpStepRow}>
                                        <View style={styles.helpStepNum}><Text style={styles.helpStepNumText}>1</Text></View>
                                        <Text style={styles.helpStepText}>Ring doorbell or knock on door to meet customer</Text>
                                    </View>
                                    <View style={styles.helpStepRow}>
                                        <View style={styles.helpStepNum}><Text style={styles.helpStepNumText}>2</Text></View>
                                        <Text style={styles.helpStepText}>Politely ask customer for the 4-digit OTP from their app</Text>
                                    </View>
                                    <View style={styles.helpStepRow}>
                                        <View style={styles.helpStepNum}><Text style={styles.helpStepNumText}>3</Text></View>
                                        <Text style={styles.helpStepText}>Enter the OTP above to confirm successful delivery</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Customer Unreachable & Support Block */}
                        <View style={styles.unreachableBlock}>
                            <AlertTriangle size={18} color="#EF4444" style={{ marginRight: 8, marginTop: 2 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.unreachableTitle}>Customer Not Responding?</Text>
                                <Text style={styles.unreachableText}>If customer is not answering calls or door, use options below</Text>
                                <View style={styles.unreachableActionsRow}>
                                    <TouchableOpacity
                                        style={styles.unreachableButtonInline}
                                        onPress={() => handleCall(activeDelivery.customerPhone)}
                                    >
                                        <Phone size={12} color="#EF4444" style={{ marginRight: 6 }} />
                                        <Text style={styles.unreachableButtonText}>Call Customer</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.leaveDoorButtonInline}
                                        onPress={() => showToast('Left at door logs saved. Customer notified.', 'info')}
                                    >
                                        <MapPin size={12} color="#4B5563" style={{ marginRight: 6 }} />
                                        <Text style={styles.leaveDoorButtonText}>Leave at Door</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Sticky Action Button */}
                    <View style={styles.otpFooter}>
                        <TouchableOpacity
                            style={[styles.otpSubmitButton, !otpCompleted && styles.otpSubmitButtonDisabled]}
                            onPress={handleStepAction}
                            disabled={loading || !otpCompleted}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.otpSubmitText}>
                                    {otpCompleted ? 'Complete Delivery' : 'Enter Complete OTP'}
                                </Text>
                            )}
                        </TouchableOpacity>
                        {!otpCompleted && (
                            <Text style={styles.otpProgressLabel}>Enter all 4 digits to continue</Text>
                        )}
                    </View>
                </View>
            </TouchableWithoutFeedback>
        );
    }

    // STAGE 2 OTP: Verify Pickup Overlay (Frame 51141 & 51149)
    if (isOtpMode && activeDelivery.status === 'ARRIVED_PICKUP') {
        const otpCompleted = otpCode.length === 4;

        return (
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={styles.otpFullScreenContainer}>
                    {/* Header */}
                    <View style={styles.otpHeaderArea}>
                        <TouchableOpacity
                            style={styles.otpBackButton}
                            onPress={() => {
                                setIsOtpMode(false);
                                setOtpCode('');
                            }}
                        >
                            <Text style={styles.otpBackButtonText}>← Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.otpSubLabel}>VERIFY PICKUP</Text>
                        <Text style={styles.otpMainTitle}>Enter Restaurant OTP</Text>
                        <Text style={styles.otpBillHint}>OTP is printed on the food bill/receipt</Text>
                    </View>

                    {/* Inputs Card (Figma Style) */}
                    <View style={styles.otpCardContainer}>
                        <Text style={styles.otpCardTitle}>Enter 4-Digit OTP</Text>
                        {renderOtpBoxes4()}
                        <View style={styles.demoOtpContainer}>
                            <Text style={styles.demoOtpText}>Demo OTP for testing: 1234</Text>
                        </View>
                    </View>

                    {/* Collapsible Help Card */}
                    <View style={styles.helpCardContainer}>
                        <TouchableOpacity
                            style={styles.helpToggle}
                            onPress={() => setShowHelpHolder(!showHelpHolder)}
                        >
                            <Text style={styles.helpToggleText}>How to find OTP?</Text>
                            {showHelpHolder ? <ChevronUp size={16} color="#4B5563" /> : <ChevronDown size={16} color="#4B5563" />}
                        </TouchableOpacity>
                        {showHelpHolder && (
                            <View style={styles.helpContent}>
                                <Text style={styles.helpText}>
                                    1. Ask restaurant staff for the food bill/receipt.{"\n"}
                                    2. Check the bottom/top of the printed receipt for the 4-digit OTP code.{"\n"}
                                    3. Enter the code in the boxes above to confirm pickup.
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Map Link */}
                    <TouchableOpacity style={styles.mapsLinkButton} onPress={handleOpenMaps}>
                        <Navigation size={16} color="#1F2937" style={{ marginRight: 6 }} />
                        <Text style={styles.mapsLinkText}>Open in Google Maps</Text>
                    </TouchableOpacity>

                    {/* Sticky Action Button */}
                    <View style={styles.otpFooter}>
                        <TouchableOpacity
                            style={[styles.otpSubmitButton, !otpCompleted && styles.otpSubmitButtonDisabled]}
                            onPress={handleStepAction}
                            disabled={loading || !otpCompleted}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.otpSubmitText}>Picked Up Order</Text>
                            )}
                        </TouchableOpacity>
                        {!otpCompleted && (
                            <Text style={styles.otpProgressLabel}>Enter all 4 digits to continue</Text>
                        )}
                    </View>
                </View>
            </TouchableWithoutFeedback>
        );
    }

    const nextStep = navSteps.length > 0 ? navSteps[0] : null;

    const renderNavIcon = (modifier: string, size = 22) => {
        const lower = (modifier || '').toLowerCase();
        if (lower.includes('left')) {
            return <CornerUpLeft size={size} color="#10B981" style={{ marginRight: size === 22 ? 10 : 6 }} />;
        } else if (lower.includes('right')) {
            return <CornerUpRight size={size} color="#10B981" style={{ marginRight: size === 22 ? 10 : 6 }} />;
        } else {
            return <ArrowUp size={size} color="#10B981" style={{ marginRight: size === 22 ? 10 : 6 }} />;
        }
    };

    const isHeadingToRestaurant = activeDelivery.status === 'ASSIGNED' || activeDelivery.status === 'ARRIVED_PICKUP';

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            {/* Map Area */}
            <View style={isMapFullscreen ? styles.mapContainerFullscreen : styles.mapContainer}>
                <MapView
                    style={styles.map}
                    provider={PROVIDER_GOOGLE}
                    region={getMapRegion()}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                >

                    {/* Outer glow polyline (Uber effect) */}
                    <Polyline
                        coordinates={routeCoords.length > 0 ? routeCoords : [
                            {
                                latitude: effectiveRiderLat,
                                longitude: effectiveRiderLng
                            },
                            isHeadingToRestaurant
                                ? { latitude: activeDelivery.restaurantLatitude, longitude: activeDelivery.restaurantLongitude }
                                : { latitude: activeDelivery.customerLatitude, longitude: activeDelivery.customerLongitude }
                        ]}
                        strokeColor="rgba(255, 71, 50, 0.25)"
                        strokeWidth={8}
                    />

                    {/* Main route polyline */}
                    <Polyline
                        coordinates={routeCoords.length > 0 ? routeCoords : [
                            {
                                latitude: effectiveRiderLat,
                                longitude: effectiveRiderLng
                            },
                            isHeadingToRestaurant
                                ? { latitude: activeDelivery.restaurantLatitude, longitude: activeDelivery.restaurantLongitude }
                                : { latitude: activeDelivery.customerLatitude, longitude: activeDelivery.customerLongitude }
                        ]}
                        strokeColor="#FF4732"
                        strokeWidth={4}
                    />

                    {/* Restaurant Marker */}
                    <Marker
                        coordinate={{ latitude: activeDelivery.restaurantLatitude, longitude: activeDelivery.restaurantLongitude }}
                        title={activeDelivery.restaurantName}
                        description={activeDelivery.restaurantAddress}
                        pinColor="red"
                    />

                    {/* Customer Marker */}
                    <Marker
                        coordinate={{ latitude: activeDelivery.customerLatitude, longitude: activeDelivery.customerLongitude }}
                        title={activeDelivery.customerName}
                        description={activeDelivery.customerAddress}
                        pinColor="green"
                    />
                </MapView>

                {/* Floating Fullscreen / Minimize Toggle Button */}
                <TouchableOpacity
                    style={[
                        styles.floatingMapButton,
                        isMapFullscreen ? styles.floatingMapButtonFullscreen : null
                    ]}
                    onPress={() => setIsMapFullscreen(!isMapFullscreen)}
                >
                    {isMapFullscreen ? <Minimize2 size={20} color="#1F2937" /> : <Maximize2 size={20} color="#1F2937" />}
                </TouchableOpacity>

                {/* Floating Map Navigation Header */}
                {isMapFullscreen && (
                    <View style={[styles.floatingMapHeader, { top: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 12 : insets.top + 8 }]}>
                        <TouchableOpacity
                            style={styles.floatingMapHeaderBack}
                            onPress={() => setIsMapFullscreen(false)}
                        >
                            <ArrowLeft size={18} color="#1F2937" />
                        </TouchableOpacity>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                            {nextStep ? renderNavIcon(nextStep.modifier, 22) : <Navigation size={22} color="#10B981" style={{ marginRight: 10 }} />}
                            <View style={{ flex: 1 }}>
                                <Text style={styles.floatingMapHeaderTitle} numberOfLines={1}>
                                    {nextStep ? nextStep.instruction : 'Follow route to destination'}
                                </Text>
                                {nextStep && nextStep.distance > 0 && (
                                    <Text style={styles.floatingMapHeaderSubtitle}>
                                        In {nextStep.distance} meters
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>
                )}

                {/* Floating Mini Map Navigation Banner */}
                {!isMapFullscreen && (
                    <View style={[styles.miniMapNavBanner, { top: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 12 : insets.top + 8 }]}>
                        {nextStep ? renderNavIcon(nextStep.modifier, 14) : <Navigation size={14} color="#10B981" style={{ marginRight: 6 }} />}
                        <Text style={styles.miniMapNavText} numberOfLines={1}>
                            {nextStep
                                ? `${nextStep.distance > 0 ? `In ${nextStep.distance}m: ` : ''}${nextStep.instruction}`
                                : 'Follow route to destination'
                            }
                        </Text>
                    </View>
                )}
            </View>

            {/* Stepper Card */}
            {!isMapFullscreen && (
                <View style={styles.stepperCard}>
                    {/* Stage Header */}
                    <View style={styles.cardHeaderMockup}>
                        <TouchableOpacity
                            style={styles.headerIconButton}
                            onPress={() => navigation.goBack()}
                        >
                            <ArrowLeft size={18} color="#1F2937" />
                        </TouchableOpacity>

                        <View style={styles.headerCenter}>
                            <Text style={styles.headerOrderTitle}>Order #{activeDelivery.orderNumber}</Text>
                            <View style={[
                                styles.statusBadge,
                                {
                                    backgroundColor: isHeadingToRestaurant ? '#EFF6FF' : '#EEF2FF'
                                }
                            ]}>
                                <Text style={[
                                    styles.statusBadgeText,
                                    {
                                        color: isHeadingToRestaurant ? '#1E40AF' : '#4F46E5'
                                    }
                                ]}>
                                    {activeDelivery.status === 'ASSIGNED' && 'Heading to Pickup'}
                                    {activeDelivery.status === 'ARRIVED_PICKUP' && 'At Restaurant'}
                                    {activeDelivery.status === 'PICKED_UP' && 'Delivering'}
                                    {activeDelivery.status === 'ARRIVED_DROP' && 'At Customer Location'}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.headerIconButton}
                            onPress={() => showToast('Emergency support team notified.', 'info')}
                        >
                            <Shield size={18} color="#EF4444" />
                        </TouchableOpacity>
                    </View>

                    {/* Main Content Scroll Area */}
                    <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Location Panel */}
                        <View style={styles.mockupLocationCard}>
                            <View style={styles.locationHeaderRow}>
                                <View style={[
                                    styles.locationIconWrapper,
                                    { backgroundColor: isHeadingToRestaurant ? '#FEF2F2' : '#FDF2F2' }
                                ]}>
                                    {isHeadingToRestaurant ? (
                                        <MapPin size={24} color="#EF4444" />
                                    ) : (
                                        <User size={24} color="#EF4444" />
                                    )}
                                </View>
                                <View style={styles.locationDetails}>
                                    <Text style={styles.locationTypeLabel}>
                                        {isHeadingToRestaurant ? 'Pickup Location' : 'Drop Location'}
                                    </Text>
                                    <Text style={styles.locationNameText}>
                                        {isHeadingToRestaurant ? activeDelivery.restaurantName : activeDelivery.customerName}
                                    </Text>
                                    <Text style={styles.locationAddressText}>
                                        {isHeadingToRestaurant ? activeDelivery.restaurantAddress : activeDelivery.customerAddress}
                                    </Text>
                                    <View style={styles.locationInfoRow}>
                                        <Clock size={14} color="#6B7280" style={{ marginRight: 4 }} />
                                        <Text style={styles.locationInfoText}>
                                            {activeDelivery.distanceKm} km away {isHeadingToRestaurant && '• Prep time: 10 mins'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            {activeDelivery.status !== 'PICKED_UP' && (
                                <>
                                    <View style={styles.cardDivider} />
                                    <TouchableOpacity
                                        style={styles.cardActionButton}
                                        onPress={() => handleCall(isHeadingToRestaurant ? activeDelivery.restaurantPhone : activeDelivery.customerPhone)}
                                    >
                                        <Phone size={16} color="#1F2937" />
                                        <Text style={styles.cardActionButtonText}>
                                            {isHeadingToRestaurant ? 'Call Restaurant' : 'Call Customer'}
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        {/* Customer Instructions - delivering state */}
                        {activeDelivery.status === 'PICKED_UP' && (activeDelivery.specialInstructions || activeDelivery.deliveryInstructions) ? (
                            <View style={styles.customerInstructionsCard}>
                                <Text style={styles.instructionsTitle}>DELIVERY INSTRUCTIONS</Text>
                                {activeDelivery.deliveryInstructions ? (
                                    <Text style={[styles.instructionsText, { fontWeight: '800', color: '#D97706', marginBottom: activeDelivery.specialInstructions ? 6 : 0 }]}>
                                        📢 Option Chosen: {activeDelivery.deliveryInstructions}
                                    </Text>
                                ) : null}
                                {activeDelivery.specialInstructions ? (
                                    <Text style={styles.instructionsText}>{activeDelivery.specialInstructions}</Text>
                                ) : null}
                            </View>
                        ) : null}

                        {/* Standalone Call Customer Row Button (mockup style) */}
                        {activeDelivery.status === 'PICKED_UP' && (
                            <TouchableOpacity
                                style={styles.mockupCallRowButton}
                                onPress={() => handleCall(activeDelivery.customerPhone)}
                            >
                                <Phone size={16} color="#1F2937" style={{ marginRight: 8 }} />
                                <Text style={styles.mockupCallRowText}>
                                    Call Customer<Text style={styles.mockupCallRowTextMasked}> (Masked Number)</Text>
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Stage 2: At Restaurant - Show Badge page (Frame 51148) */}
                        {activeDelivery.status === 'ARRIVED_PICKUP' && (
                            <View style={styles.mockupShowRestaurantCard}>
                                <Text style={styles.showRestaurantLabel}>SHOW THIS TO RESTAURANT</Text>
                                <Text style={styles.showRestaurantCodeLarge}>
                                    {(() => {
                                        const code = formatShowToRestaurantCode(activeDelivery.orderNumber);
                                        return `${code.line1}\n${code.line2}`;
                                    })()}
                                </Text>

                                {/* Item Checklist */}
                                <TouchableOpacity
                                    style={[styles.checklistCard, itemsChecked && styles.checklistCardChecked]}
                                    onPress={() => setItemsChecked(!itemsChecked)}
                                >
                                    {itemsChecked ? (
                                        <View style={styles.checkRow}>
                                            <Check size={18} color="#10B981" style={{ marginRight: 8 }} />
                                            <Text style={[styles.checkText, styles.checkTextChecked]}>All items checked</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.checkRow}>
                                            <AlertTriangle size={18} color="#EF4444" style={{ marginRight: 8 }} />
                                            <Text style={styles.checkText}>Check all items before pickup</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Order items list (when heading to restaurant, or delivering) */}
                        {activeDelivery.status !== 'ARRIVED_PICKUP' && activeDelivery.items && activeDelivery.items.length > 0 && (
                            <View style={styles.mockupItemsContainer}>
                                <Text style={styles.mockupItemsTitle}>Order Items</Text>
                                {activeDelivery.items.map((item, idx) => (
                                    <View key={idx} style={styles.mockupItemRow}>
                                        <Text style={styles.mockupItemText}>
                                            <Text style={styles.mockupItemQty}>{item.quantity}x</Text> {item.name}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Your Earnings display - delivering state (Column 2 & 3) */}
                        {activeDelivery.status === 'PICKED_UP' && (
                            <View style={styles.earningsBlockRow}>
                                <View style={styles.earningsIconBadge}>
                                    <Text style={styles.earningsIconBadgeText}>₹</Text>
                                </View>
                                <Text style={styles.earningsRowLabel}>Your Earnings</Text>
                                <Text style={styles.earningsRowVal}>₹ {activeDelivery.earnings}</Text>
                            </View>
                        )}

                        {/* Maps Button */}
                        <TouchableOpacity style={styles.mockupMapsButton} onPress={handleOpenMaps}>
                            <Navigation size={16} color="#1F2937" style={{ marginRight: 8 }} />
                            <Text style={styles.mockupMapsButtonText}>Open in Google Maps</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Bottom Actions Footer */}
                    <View style={styles.buttonFooter}>
                        {loading ? (
                            <ActivityIndicator color="#A31D1D" style={{ marginVertical: 18 }} />
                        ) : activeDelivery.status === 'ARRIVED_PICKUP' ? (
                            <TouchableOpacity
                                style={[
                                    styles.mockupEnterOtpButton,
                                    !itemsChecked && styles.mockupEnterOtpButtonDisabled
                                ]}
                                onPress={() => {
                                    if (itemsChecked) {
                                        setIsOtpMode(true);
                                    } else {
                                        showToast('Please check and verify all items first.', 'warning');
                                    }
                                }}
                            >
                                <Check size={18} color="white" style={{ marginRight: 8 }} />
                                <Text style={styles.mockupEnterOtpButtonText}>Enter OTP</Text>
                            </TouchableOpacity>
                        ) : activeDelivery.status === 'ASSIGNED' ? (
                            <SwipeButton
                                text="Arrived at Restaurant"
                                color="#A31D1D"
                                onSwipeSuccess={handleStepAction}
                            />
                        ) : activeDelivery.status === 'PICKED_UP' ? (
                            <SwipeButton
                                text="Reached Customer Location"
                                color="#A31D1D"
                                onSwipeSuccess={handleStepAction}
                            />
                        ) : null}

                        <TouchableOpacity
                            style={styles.cancelLink}
                            onPress={() => setShowCancelModal(true)}
                        >
                            <AlertTriangle size={14} color="#9CA3AF" />
                            <Text style={styles.cancelLinkText}>Report Issue / Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Cancel Modal */}
            <Modal
                visible={showCancelModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCancelModal(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Cancel Delivery</Text>
                                <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                                    <X size={20} color="#4B5563" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.modalLabel}>Select Reason</Text>
                            {['Customer unavailable', 'Vehicle issue/Accident', 'Restaurant closed', 'Order damaged'].map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    style={[styles.reasonBadge, cancelReason === r && styles.activeReasonBadge]}
                                    onPress={() => setCancelReason(r)}
                                >
                                    <Text style={[styles.reasonBadgeText, cancelReason === r && styles.activeReasonBadgeText]}>
                                        {r}
                                    </Text>
                                </TouchableOpacity>
                            ))}

                            <Text style={[styles.modalLabel, { marginTop: 16 }]}>Additional Details</Text>
                            <TextInput
                                style={styles.modalTextInput}
                                multiline
                                numberOfLines={3}
                                placeholder="Explain the situation in details (required)..."
                                value={cancelNotes}
                                onChangeText={setCancelNotes}
                            />

                            <TouchableOpacity
                                style={styles.submitCancelButton}
                                onPress={handleAbort}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.submitCancelText}>Confirm Cancellation</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    mockupShowRestaurantCard: {
        backgroundColor: '#F5F3FF',
        borderWidth: 1.5,
        borderColor: '#C7D2FE',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
    },
    showRestaurantLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#4F46E5',
        letterSpacing: 1,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    showRestaurantCodeLarge: {
        fontSize: 52,
        fontWeight: '900',
        color: '#111827',
        textAlign: 'center',
        lineHeight: 58,
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    mockupEnterOtpButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#A31D1D',
        borderRadius: 16,
        height: 54,
        width: '100%',
        shadowColor: '#A31D1D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
        marginBottom: 12,
    },
    mockupEnterOtpButtonDisabled: {
        backgroundColor: '#E5E7EB',
        shadowOpacity: 0,
        elevation: 0,
    },
    mockupEnterOtpButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    otpCardContainer: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#F5F3FF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 20,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    otpCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 18,
    },
    demoOtpContainer: {
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 18,
        marginTop: 20,
        width: '100%',
        alignItems: 'center',
    },
    demoOtpText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E40AF',
    },
    helpCardContainer: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#F3F4F6',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 20,
        overflow: 'hidden',
        padding: 10,
    },
    swipeTrack: {
        height: 60,
        width: '100%',
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        marginTop: 8,
        marginBottom: 16,
    },
    swipeText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        zIndex: 1,
    },
    swipeHandle: {
        position: 'absolute',
        left: 2,
        top: 2,
        bottom: 2,
        width: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    swipeHandleText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cardHeaderMockup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingBottom: 16,
        marginBottom: 16,
    },
    headerIconButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        alignItems: 'center',
        flex: 1,
    },
    headerOrderTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    statusBadge: {
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 3,
        marginTop: 4,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    mockupLocationCard: {
        borderWidth: 1.5,
        borderColor: '#F5F3FF',
        borderRadius: 20,
        padding: 20,
        backgroundColor: '#FFFFFF',
        marginBottom: 16,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    locationHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    locationIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    locationDetails: {
        flex: 1,
        marginLeft: 16,
    },
    locationTypeLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    locationNameText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 4,
    },
    locationAddressText: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 6,
        lineHeight: 20,
    },
    locationInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    locationInfoText: {
        fontSize: 13,
        color: '#6B7280',
        marginLeft: 6,
        fontWeight: '500',
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 16,
    },
    cardActionButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        height: 48,
    },
    cardActionButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginLeft: 8,
    },
    mockupItemsContainer: {
        marginBottom: 16,
    },
    mockupItemsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
    },
    mockupItemRow: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1,
    },
    mockupItemText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    mockupItemQty: {
        fontWeight: '700',
        color: '#FF4732',
    },
    mockupMapsButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        height: 48,
        marginBottom: 20,
    },
    mockupMapsButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
    },
    fallbackContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    mapContainer: {
        height: 280,
        position: 'relative',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    stepperCard: {
        backgroundColor: 'white',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingVertical: 18,
        flex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingBottom: 12,
        marginBottom: 12,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusBullet: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    orderLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deliveringPill: {
        backgroundColor: '#EEF2FF',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 6,
    },
    deliveringPillText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#4F46E5',
    },
    orderLabel: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
    },
    detailsScroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 16,
    },
    addressBlock: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    iconMargin: {
        marginRight: 10,
        marginTop: 2,
    },
    addressTextWrapper: {
        flex: 1,
    },
    addressHeader: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    targetName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
        marginTop: 4,
    },
    targetAddress: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
        lineHeight: 16,
    },
    distanceInfo: {
        fontSize: 12,
        color: '#FF4732',
        fontWeight: '700',
        marginTop: 4,
    },
    phoneButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFEBE9',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    callAltButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingVertical: 12,
        backgroundColor: 'white',
        marginBottom: 12,
    },
    callAltButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
    },
    customerInstructionsCard: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
    },
    instructionsTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#D97706',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    instructionsText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
        lineHeight: 18,
    },
    voiceMessageCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#DBEAFE',
        padding: 16,
        marginBottom: 16,
    },
    voicePlayButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#2563EB',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    voiceTextWrapper: {
        flex: 1,
    },
    voiceTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E40AF',
    },
    voiceSubtitle: {
        fontSize: 12,
        color: '#2563EB',
        fontWeight: '600',
        marginTop: 2,
    },
    voiceProgressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    voiceSubPlaying: {
        fontSize: 11,
        color: '#4B5563',
        fontWeight: '600',
        marginRight: 8,
    },
    seekBarBg: {
        flex: 1,
        height: 4,
        backgroundColor: '#D1D5DB',
        borderRadius: 2,
    },
    seekBarFill: {
        height: '100%',
        backgroundColor: '#4F46E5',
        borderRadius: 2,
    },
    codCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F3FF',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#C7D2FE',
        padding: 18,
        marginBottom: 16,
    },
    codBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#DDD6FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    codBadgeText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#6D28D9',
    },
    codLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#6D28D9',
        letterSpacing: 0.5,
    },
    codValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111827',
        marginTop: 4,
    },
    mockupCallRowButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#F3F4F6',
        borderRadius: 16,
        paddingVertical: 14,
        width: '100%',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    mockupCallRowText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
    },
    mockupCallRowTextMasked: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    earningsBlockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
    },
    earningsIconBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    earningsIconBadgeText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#4F46E5',
    },
    earningsRowLabel: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        color: '#4B5563',
    },
    earningsRowVal: {
        fontSize: 16,
        fontWeight: '800',
        color: '#4F46E5',
    },
    badgeContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        alignItems: 'center',
        marginBottom: 12,
    },
    badgeSubLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    badgeWrapper: {
        backgroundColor: '#EEF2FF',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#C7D2FE',
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginVertical: 12,
    },
    badgeTextSmall: {
        fontSize: 20,
        fontWeight: '700',
        color: '#4F46E5',
    },
    badgeTextLarge: {
        fontSize: 20,
        fontWeight: '900',
        color: '#4F46E5',
    },
    checklistCard: {
        backgroundColor: '#FFF5F5',
        borderWidth: 1,
        borderColor: '#FEB2B2',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        width: '100%',
        alignItems: 'center',
    },
    checklistCardChecked: {
        backgroundColor: '#F0FDF4',
        borderColor: '#BBF7D0',
    },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#E53E3E',
    },
    checkTextChecked: {
        color: '#38A169',
    },
    itemsBlock: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    itemsTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemsTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#4B5563',
        marginLeft: 6,
    },
    itemRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    itemQty: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#FF4732',
        marginRight: 6,
    },
    itemName: {
        fontSize: 13,
        color: '#4B5563',
    },
    mapsButtonFlat: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
    },
    mapsButtonFlatText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4B5563',
    },
    buttonFooter: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    primaryActionButton: {
        backgroundColor: '#FF4732',
        height: 52,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF4732',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    primaryActionButtonDisabled: {
        backgroundColor: '#EF4444',
        opacity: 0.4,
    },
    primaryActionText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
    cancelLink: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        padding: 4,
    },
    cancelLinkText: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
        marginLeft: 6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingBottom: 14,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4B5563',
        marginBottom: 10,
    },
    reasonBadge: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    activeReasonBadge: {
        backgroundColor: '#FEE2E2',
        borderColor: '#FCA5A5',
    },
    reasonBadgeText: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '600',
    },
    activeReasonBadgeText: {
        color: '#EF4444',
    },
    modalTextInput: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 10,
        fontSize: 13,
        color: '#1F2937',
        textAlignVertical: 'top',
        backgroundColor: '#F9FAFB',
        marginBottom: 20,
    },
    submitCancelButton: {
        backgroundColor: '#EF4444',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitCancelText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },

    //     // OTP Full Screen Styles
    otpFullScreenContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        position: 'relative',
    },
    otpFormScroll: {
        flex: 1,
    },
    successToast: {
        backgroundColor: '#10B981',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
        top: 40,
        left: 20,
        right: 20,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 5,
    },
    successToastText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
    },
    otpHeaderArea: {
        marginTop: 10,
        marginBottom: 16,
    },
    otpBackButtonPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 14,
        alignSelf: 'flex-start',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    otpBackButton: {
        marginBottom: 16,
    },
    otpBackButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
    },
    otpSubLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FF4732',
        letterSpacing: 0.5,
    },
    otpMainTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1F2937',
        marginTop: 4,
    },
    otpBillHint: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
        marginTop: 4,
    },
    phoneIllustrationCard: {
        alignItems: 'center',
        marginVertical: 16,
    },
    phoneIllustrationInner: {
        width: 100,
        height: 100,
        borderRadius: 20,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#C7D2FE',
    },
    helpStepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    helpStepNum: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        marginTop: 2,
    },
    helpStepNumText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#4F46E5',
    },
    helpStepText: {
        flex: 1,
        fontSize: 13,
        color: '#4B5563',
        lineHeight: 18,
    },
    otpEntryBlock: {
        marginBottom: 24,
    },
    enterCodeLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: '#4B5563',
        marginBottom: 14,
    },
    otpBoxesContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        position: 'relative',
        marginVertical: 4,
    },
    otpBox: {
        width: 48,
        height: 56,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    otpBox4: {
        width: 58,
        height: 62,
    },
    otpBoxFilled: {
        borderColor: '#1F2937',
        backgroundColor: '#FFFFFF',
    },
    otpBoxFocused: {
        borderColor: '#FF4732',
        borderWidth: 2,
        backgroundColor: '#FFFFFF',
        shadowColor: '#FF4732',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    otpBoxText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1F2937',
    },
    hiddenTextInput: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0,
    },
    demoOtpLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '600',
        marginTop: 12,
        textAlign: 'center',
    },
    helpBlock: {
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        padding: 14,
        marginBottom: 20,
    },
    helpToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    helpToggleText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
    },
    helpContent: {
        marginTop: 12,
    },
    helpText: {
        fontSize: 12,
        color: '#4B5563',
        lineHeight: 18,
    },
    mapsLinkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingVertical: 12,
        backgroundColor: 'white',
        marginBottom: 30,
    },
    mapsLinkText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
    },
    noticeImportantBlock: {
        flexDirection: 'row',
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        marginBottom: 16,
    },
    noticeImportantTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#B45309',
    },
    noticeImportantText: {
        fontSize: 12,
        color: '#B45309',
        marginTop: 2,
        lineHeight: 16,
    },
    unreachableBlock: {
        flexDirection: 'row',
        backgroundColor: '#FFF5F5',
        borderColor: '#FEB2B2',
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
    },
    unreachableTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#C53030',
    },
    unreachableText: {
        fontSize: 12,
        color: '#C53030',
        marginTop: 2,
        lineHeight: 16,
    },
    unreachableActionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
    },
    unreachableButtonInline: {
        flex: 1,
        backgroundColor: 'white',
        borderWidth: 1.5,
        borderColor: '#FEB2B2',
        borderRadius: 10,
        paddingVertical: 9,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    unreachableButton: {
        marginTop: 10,
        backgroundColor: 'white',
        borderWidth: 1.5,
        borderColor: '#FEB2B2',
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    unreachableButtonText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '700',
    },
    leaveDoorBlock: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        marginBottom: 16,
    },
    leaveDoorTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#4B5563',
    },
    leaveDoorText: {
        fontSize: 12,
        color: '#4B5563',
        marginTop: 2,
        lineHeight: 16,
    },
    leaveDoorButtonInline: {
        flex: 1,
        backgroundColor: 'white',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingVertical: 9,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    leaveDoorButton: {
        marginTop: 10,
        backgroundColor: 'white',
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
    },
    leaveDoorButtonText: {
        color: '#4B5563',
        fontSize: 12,
        fontWeight: '700',
    },
    otpFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 100,
    },
    otpSubmitButton: {
        backgroundColor: '#FF4732',
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    otpSubmitButtonDisabled: {
        backgroundColor: '#E5E7EB',
    },
    otpSubmitText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '800',
    },
    otpProgressLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 8,
    },

    // Success Screen Styles
    successScreen: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    successScroll: {
        paddingHorizontal: 24,
        paddingTop: 50,
        paddingBottom: 40,
        alignItems: 'center',
    },
    successBadgeContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    successBadgeOuter: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#D1FAE5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    successBadgeInner: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
    },
    successBadgeTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#111827',
    },
    successBadgeSub: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
        marginTop: 6,
        textAlign: 'center',
    },
    successEarningsCard: {
        backgroundColor: '#4F46E5',
        borderRadius: 20,
        width: '100%',
        paddingVertical: 20,
        alignItems: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 16,
    },
    successEarningsStars: {
        fontSize: 12,
        fontWeight: '800',
        color: '#C7D2FE',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    successEarningsVal: {
        fontSize: 36,
        fontWeight: '900',
        color: 'white',
        marginVertical: 4,
    },
    successEarningsSubText: {
        fontSize: 12,
        color: '#E0E7FF',
        fontWeight: '500',
    },
    successStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16,
    },
    successStatBox: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        paddingVertical: 14,
        alignItems: 'center',
        marginHorizontal: 6,
    },
    successStatVal: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1F2937',
    },
    successStatLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '600',
        marginTop: 2,
    },
    successExcellenceCard: {
        backgroundColor: 'white',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        width: '100%',
        padding: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    successExcellenceTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#10B981',
    },
    successExcellenceSub: {
        fontSize: 12,
        color: '#4B5563',
        fontWeight: '500',
        marginTop: 4,
        textAlign: 'center',
    },
    successActions: {
        width: '100%',
    },
    successHomeButton: {
        backgroundColor: '#EF4444',
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginBottom: 12,
    },
    successHomeButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '800',
    },
    successViewEarningsButton: {
        backgroundColor: 'white',
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    successViewEarningsText: {
        color: '#4B5563',
        fontSize: 15,
        fontWeight: '800',
    },
    mapContainerFullscreen: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
        backgroundColor: '#FFFFFF',
    },
    floatingMapButton: {
        position: 'absolute',
        bottom: 20,
        right: 10,
        backgroundColor: '#FFFFFF',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 11,
    },
    floatingMapButtonFullscreen: {
        bottom: 20,
        right: 10,
    },
    floatingMapHeader: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 12,
    },
    floatingMapHeaderBack: {
        marginRight: 12,
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingMapHeaderTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
    },
    floatingMapHeaderSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
        marginTop: 2,
    },
    miniMapNavBanner: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 16,
        left: 12,
        right: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 11,
    },
    miniMapNavText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1F2937',
        flex: 1,
    },
    riderMarkerOuter: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(37, 99, 235, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    riderMarkerInner: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#2563EB',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
        elevation: 6,
    },
    markerWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 6,
    },
    restaurantPillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF4732',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        minWidth: 70,
        minHeight: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    restaurantPinDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        marginRight: 6,
    },
    restaurantMarkerText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFFFFF',
        includeFontPadding: false,
    },
    customerPillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10B981',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        minWidth: 70,
        minHeight: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    customerPinDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        marginRight: 6,
    },
    customerMarkerText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFFFFF',
        includeFontPadding: false,
    },
    pinTailRed: {
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 7,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#FF4732',
        marginTop: -1,
    },
    pinTailGreen: {
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 7,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#10B981',
        marginTop: -1,
    },
});
