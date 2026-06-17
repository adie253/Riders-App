import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Modal, Linking } from 'react-native';
import { useDelivery } from '../context/DeliveryContext';
import { useToast } from '../context/ToastContext';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Phone, MapPin, Check, AlertTriangle, ArrowRight, ShieldCheck, Clipboard, X } from 'lucide-react-native';

export const ActiveDeliveryScreen = ({ navigation }: { navigation: any }) => {
    const { 
        activeDelivery, 
        currentCoords,
        arrivedRestaurant, 
        confirmOrderPickup, 
        arrivedCustomer, 
        completeDelivery, 
        abortDelivery 
    } = useDelivery();
    const { showToast } = useToast();

    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('Customer unavailable');
    const [cancelNotes, setCancelNotes] = useState('');

    // If there is no active delivery, navigate back to Dashboard
    useEffect(() => {
        if (!activeDelivery) {
            navigation.navigate('Dashboard');
        }
    }, [activeDelivery]);

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

    const handleStepAction = async () => {
        setLoading(true);
        try {
            if (activeDelivery.status === 'ASSIGNED') {
                const ok = await arrivedRestaurant();
                if (ok) setOtpCode('');
            } else if (activeDelivery.status === 'ARRIVED_PICKUP') {
                if (otpCode.length < 4) {
                    showToast('Please enter a valid 4-digit pickup code', 'warning');
                    setLoading(false);
                    return;
                }
                const ok = await confirmOrderPickup(otpCode);
                if (ok) setOtpCode('');
            } else if (activeDelivery.status === 'PICKED_UP') {
                const ok = await arrivedCustomer();
                if (ok) setOtpCode('');
            } else if (activeDelivery.status === 'ARRIVED_DROP') {
                if (otpCode.length < 4) {
                    showToast('Please enter a valid 4-digit delivery code', 'warning');
                    setLoading(false);
                    return;
                }
                await completeDelivery(otpCode);
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
        const riderLat = currentCoords?.latitude || 12.9716;
        const riderLng = currentCoords?.longitude || 77.5946;

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

    const isHeadingToRestaurant = activeDelivery.status === 'ASSIGNED' || activeDelivery.status === 'ARRIVED_PICKUP';

    return (
        <View style={styles.container}>
            {/* Map Area */}
            <View style={styles.mapContainer}>
                <MapView
                    style={styles.map}
                    region={getMapRegion()}
                    showsUserLocation={true}
                >
                    {/* Rider Marker */}
                    {currentCoords && (
                        <Marker 
                            coordinate={{ latitude: currentCoords.latitude, longitude: currentCoords.longitude }}
                            title="Your Location"
                            pinColor="blue"
                        />
                    )}

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

                    {/* Route line mock */}
                    {currentCoords && (
                        <Polyline
                            coordinates={[
                                { latitude: currentCoords.latitude, longitude: currentCoords.longitude },
                                isHeadingToRestaurant 
                                    ? { latitude: activeDelivery.restaurantLatitude, longitude: activeDelivery.restaurantLongitude }
                                    : { latitude: activeDelivery.customerLatitude, longitude: activeDelivery.customerLongitude }
                            ]}
                            strokeColor="#FF4732"
                            strokeWidth={3}
                            lineDashPattern={[5, 5]}
                        />
                    )}
                </MapView>
            </View>

            {/* Stepper Card */}
            <View style={styles.stepperCard}>
                {/* Stage Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.statusIndicator}>
                        <View style={[styles.statusBullet, { backgroundColor: isHeadingToRestaurant ? '#FF4732' : '#10B981' }]} />
                        <Text style={styles.statusTitle}>
                            {activeDelivery.status === 'ASSIGNED' && 'Heading to Restaurant'}
                            {activeDelivery.status === 'ARRIVED_PICKUP' && 'Arrived at Restaurant'}
                            {activeDelivery.status === 'PICKED_UP' && 'Heading to Customer'}
                            {activeDelivery.status === 'ARRIVED_DROP' && 'Arrived at Customer'}
                        </Text>
                    </View>
                    <Text style={styles.orderLabel}>Order #{activeDelivery.orderNumber}</Text>
                </View>

                {/* Main Content Scroll Area */}
                <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.scrollContent}>
                    {/* Location Panel */}
                    <View style={styles.addressBlock}>
                        <MapPin size={20} color="#FF4732" style={styles.iconMargin} />
                        <View style={styles.addressTextWrapper}>
                            <Text style={styles.addressHeader}>
                                {isHeadingToRestaurant ? 'Pickup Location' : 'Delivery Location'}
                            </Text>
                            <Text style={styles.targetName}>
                                {isHeadingToRestaurant ? activeDelivery.restaurantName : activeDelivery.customerName}
                            </Text>
                            <Text style={styles.targetAddress}>
                                {isHeadingToRestaurant ? activeDelivery.restaurantAddress : activeDelivery.customerAddress}
                            </Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.phoneButton}
                            onPress={() => handleCall(isHeadingToRestaurant ? activeDelivery.restaurantPhone : activeDelivery.customerPhone)}
                        >
                            <Phone size={18} color="#FF4732" />
                        </TouchableOpacity>
                    </View>

                    {/* Order items list when out for delivery */}
                    {!isHeadingToRestaurant && activeDelivery.items && activeDelivery.items.length > 0 && (
                        <View style={styles.itemsBlock}>
                            <View style={styles.itemsTitleContainer}>
                                <Clipboard size={16} color="#4B5563" />
                                <Text style={styles.itemsTitle}>Item Checklist</Text>
                            </View>
                            {activeDelivery.items.map((item, idx) => (
                                <View key={idx} style={styles.itemRow}>
                                    <Text style={styles.itemQty}>{item.quantity}x</Text>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Verification OTP Inputs */}
                    {(activeDelivery.status === 'ARRIVED_PICKUP' || activeDelivery.status === 'ARRIVED_DROP') && (
                        <View style={styles.otpBlock}>
                            <View style={styles.otpHeader}>
                                <ShieldCheck size={18} color="#FF4732" />
                                <Text style={styles.otpLabel}>
                                    {activeDelivery.status === 'ARRIVED_PICKUP' ? 'Enter Restaurant Pickup OTP' : 'Enter Customer Drop OTP'}
                                </Text>
                            </View>
                            <TextInput
                                style={styles.otpInput}
                                placeholder="----"
                                keyboardType="number-pad"
                                maxLength={6}
                                value={otpCode}
                                onChangeText={setOtpCode}
                            />
                            <Text style={styles.otpHint}>
                                {activeDelivery.status === 'ARRIVED_PICKUP' 
                                    ? 'Request the pickup verification code from the restaurant staff.' 
                                    : 'Request the delivery verification code from the customer.'}
                            </Text>
                        </View>
                    )}
                </ScrollView>

                {/* Bottom Buttons */}
                <View style={styles.buttonFooter}>
                    <TouchableOpacity 
                        style={styles.primaryActionButton}
                        onPress={handleStepAction}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text style={styles.primaryActionText}>
                                    {activeDelivery.status === 'ASSIGNED' && 'I Have Arrived at Restaurant'}
                                    {activeDelivery.status === 'ARRIVED_PICKUP' && 'Verify & Pick Up'}
                                    {activeDelivery.status === 'PICKED_UP' && 'I Have Arrived at Customer'}
                                    {activeDelivery.status === 'ARRIVED_DROP' && 'Verify & Complete'}
                                </Text>
                                <ArrowRight size={18} color="white" style={{ marginLeft: 8 }} />
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.cancelLink}
                        onPress={() => setShowCancelModal(true)}
                    >
                        <AlertTriangle size={14} color="#9CA3AF" />
                        <Text style={styles.cancelLinkText}>Report Issue / Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Cancel Modal */}
            <Modal
                visible={showCancelModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCancelModal(false)}
            >
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
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    fallbackContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    mapContainer: {
        flex: 1,
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
        height: 380,
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
    phoneButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFEBE9',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
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
    otpBlock: {
        backgroundColor: '#FFFBEB',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
        alignItems: 'center',
    },
    otpHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    otpLabel: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#92400E',
        marginLeft: 6,
    },
    otpInput: {
        backgroundColor: 'white',
        width: 140,
        height: 46,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#F59E0B',
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 4,
        color: '#1F2937',
    },
    otpHint: {
        fontSize: 11,
        color: '#B45309',
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 14,
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
});
