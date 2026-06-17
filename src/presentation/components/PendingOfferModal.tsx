import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, ActivityIndicator, Dimensions } from 'react-native';
import { useDelivery } from '../context/DeliveryContext';
import { AlertCircle, Clock, MapPin, Navigation, TrendingUp } from 'lucide-react-native';

export const PendingOfferModal = () => {
    const { 
        pendingOffer, 
        offerCountdown, 
        acceptActiveOffer, 
        rejectActiveOffer, 
        isProcessingOffer 
    } = useDelivery();

    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse effect animation
    useEffect(() => {
        if (pendingOffer) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.15,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [pendingOffer]);

    if (!pendingOffer) return null;

    return (
        <Modal
            visible={!!pendingOffer}
            transparent={true}
            animationType="fade"
        >
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    {/* Ringing / Pulsing Header */}
                    <View style={styles.pulseContainer}>
                        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
                            <View style={styles.innerCircle}>
                                <Navigation size={28} color="white" />
                            </View>
                        </Animated.View>
                        <Text style={styles.ringingTitle}>New Delivery Offer!</Text>
                        <Text style={styles.ringingSub}>Immediate response required</Text>
                    </View>

                    {/* Earnings Segment */}
                    <View style={styles.earningsBlock}>
                        <Text style={styles.earningsLabel}>Guaranteed Earnings</Text>
                        <Text style={styles.earningsAmount}>₹{pendingOffer.earnings}</Text>
                    </View>

                    {/* Route Details */}
                    <View style={styles.routeDetails}>
                        <View style={styles.routeRow}>
                            <View style={styles.routePinWrapper}>
                                <MapPin size={18} color="#FF4732" />
                                <View style={styles.dottedLine} />
                            </View>
                            <View style={styles.routeTexts}>
                                <Text style={styles.routeHeader}>Restaurant Pickup</Text>
                                <Text style={styles.routePlace}>{pendingOffer.restaurantName}</Text>
                                <Text style={styles.routeAddress} numberOfLines={1}>
                                    {pendingOffer.pickupAddress}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.routeRow, { marginTop: 12 }]}>
                            <View style={styles.routePinWrapper}>
                                <MapPin size={18} color="#10B981" />
                            </View>
                            <View style={styles.routeTexts}>
                                <Text style={styles.routeHeader}>Customer Drop</Text>
                                <Text style={styles.routeAddress} numberOfLines={1}>
                                    {pendingOffer.dropAddress}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Trip Statistics */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <TrendingUp size={16} color="#4B5563" />
                            <Text style={styles.statVal}>{pendingOffer.totalDistanceKm} km</Text>
                            <Text style={styles.statLabel}>Trip Distance</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Clock size={16} color="#4B5563" />
                            <Text style={styles.statVal}>{offerCountdown}s</Text>
                            <Text style={styles.statLabel}>Time Left</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        <TouchableOpacity 
                            style={styles.rejectButton}
                            onPress={() => rejectActiveOffer()}
                            disabled={isProcessingOffer}
                        >
                            <Text style={styles.rejectButtonText}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.acceptButton}
                            onPress={acceptActiveOffer}
                            disabled={isProcessingOffer}
                        >
                            {isProcessingOffer ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.acceptButtonText}>Accept Offer</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        backgroundColor: 'white',
        borderRadius: 28,
        width: width - 48,
        maxWidth: 400,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
    },
    pulseContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    pulseCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 71, 50, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    innerCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FF4732',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringingTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1F2937',
    },
    ringingSub: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 4,
        fontWeight: '500',
    },
    earningsBlock: {
        backgroundColor: '#F9FAFB',
        width: '100%',
        borderRadius: 20,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    earningsLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    earningsAmount: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FF4732',
        marginTop: 4,
    },
    routeDetails: {
        width: '100%',
        marginBottom: 20,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    routePinWrapper: {
        alignItems: 'center',
        marginRight: 12,
        width: 20,
    },
    dottedLine: {
        width: 1.5,
        height: 28,
        backgroundColor: '#D1D5DB',
        borderStyle: 'dashed',
        marginTop: 4,
    },
    routeTexts: {
        flex: 1,
    },
    routeHeader: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#9CA3AF',
        textTransform: 'uppercase',
    },
    routePlace: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
        marginTop: 2,
    },
    routeAddress: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 1,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderRadius: 14,
        paddingVertical: 10,
        alignItems: 'center',
        marginHorizontal: 4,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    statVal: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
        marginLeft: 6,
    },
    statLabel: {
        fontSize: 10,
        color: '#9CA3AF',
        marginLeft: 6,
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row',
        width: '100%',
    },
    rejectButton: {
        flex: 1,
        height: 52,
        backgroundColor: '#F3F4F6',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    rejectButtonText: {
        color: '#4B5563',
        fontSize: 15,
        fontWeight: 'bold',
    },
    acceptButton: {
        flex: 2,
        height: 52,
        backgroundColor: '#10B981',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    acceptButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
});
