import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, ActivityIndicator, Dimensions } from 'react-native';
import { useDelivery } from '../context/DeliveryContext';
import { useNavigation } from '@react-navigation/native';
import { MapPin, X, AlertTriangle } from 'lucide-react-native';

export const PendingOfferModal = () => {
    const { 
        pendingOffer, 
        offerCountdown, 
        acceptActiveOffer, 
        rejectActiveOffer, 
        isProcessingOffer 
    } = useDelivery();
    const navigation = useNavigation<any>();

    const progressAnim = useRef(new Animated.Value(1)).current;

    // Animate progress bar smoothly when countdown updates
    useEffect(() => {
        if (pendingOffer) {
            Animated.timing(progressAnim, {
                toValue: offerCountdown / (pendingOffer.expiresInSeconds || 30),
                duration: 1000,
                useNativeDriver: false, // width/flex layout animations don't support native driver
            }).start();
        } else {
            progressAnim.setValue(1);
        }
    }, [offerCountdown, pendingOffer]);

    if (!pendingOffer) return null;

    const handleAccept = async () => {
        const success = await acceptActiveOffer();
        if (success) {
            navigation.navigate('ActiveDelivery');
        }
    };

    const widthPercent = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    return (
        <Modal
            visible={!!pendingOffer}
            transparent={true}
            animationType="slide"
        >
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    {/* Header */}
                    <View style={styles.headerRow}>
                        <Text style={styles.modalTitle}>New Order Request</Text>
                        <TouchableOpacity 
                            style={styles.closeButton} 
                            onPress={() => rejectActiveOffer()}
                            disabled={isProcessingOffer}
                        >
                            <X size={20} color="#1F2937" />
                        </TouchableOpacity>
                    </View>

                    {/* Respond timer */}
                    <View style={styles.timerContainer}>
                        <View style={styles.timerHeader}>
                            <AlertTriangle size={14} color="#EF4444" style={styles.timerIcon} />
                            <Text style={styles.timerText}>Respond within {offerCountdown}s</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <Animated.View style={[styles.progressBarFill, { width: widthPercent }]} />
                        </View>
                    </View>

                    {/* Details Card */}
                    <View style={styles.detailsCard}>
                        <Text style={styles.restaurantName}>{pendingOffer.restaurantName}</Text>
                        <Text style={styles.orderNumber}>Order #{pendingOffer.orderNumber}</Text>
                        
                        <View style={styles.routeContainer}>
                            <View style={styles.routeRow}>
                                <MapPin size={16} color="#FF4732" style={styles.pinIcon} />
                                <Text style={styles.routeText}>
                                    Pickup: <Text style={styles.routeTextBold}>{pendingOffer.distanceToPickupKm} km away</Text>
                                </Text>
                            </View>
                            <View style={styles.routeRow}>
                                <MapPin size={16} color="#10B981" style={styles.pinIcon} />
                                <Text style={styles.routeText}>
                                    Drop: <Text style={styles.routeTextBold}>{pendingOffer.distanceToDropKm} km total</Text>
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Total Distance Box */}
                    <View style={styles.distanceBlock}>
                        <Text style={styles.distanceLabel}>Total Distance</Text>
                        <Text style={styles.distanceValue}>{pendingOffer.totalDistanceKm} km</Text>
                    </View>

                    {/* Earnings Banner */}
                    <View style={styles.earningsBanner}>
                        <View>
                            <Text style={styles.earningsLabel}>Your Earnings</Text>
                            <Text style={styles.earningsSub}>for this order</Text>
                        </View>
                        <Text style={styles.earningsValue}>₹ {pendingOffer.earnings}</Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity 
                            style={styles.rejectButton}
                            onPress={() => rejectActiveOffer()}
                            disabled={isProcessingOffer}
                        >
                            <Text style={styles.rejectButtonText}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.acceptButton}
                            onPress={handleAccept}
                            disabled={isProcessingOffer}
                        >
                            {isProcessingOffer ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.acceptButtonText}>Accept Order</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Footer Warning */}
                    <Text style={styles.warningFooter}>Frequent rejections may reduce order priority</Text>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 35,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1F2937',
    },
    closeButton: {
        padding: 4,
    },
    timerContainer: {
        marginBottom: 16,
    },
    timerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    timerIcon: {
        marginRight: 6,
    },
    timerText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#EF4444',
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#EF4444',
        borderRadius: 2,
    },
    detailsCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        marginBottom: 14,
    },
    restaurantName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1F2937',
    },
    orderNumber: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '600',
        marginTop: 2,
    },
    routeContainer: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 12,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    pinIcon: {
        marginRight: 8,
    },
    routeText: {
        fontSize: 13,
        color: '#4B5563',
    },
    routeTextBold: {
        fontWeight: '700',
        color: '#1F2937',
    },
    distanceBlock: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 14,
    },
    distanceLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    distanceValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1F2937',
        marginTop: 2,
    },
    earningsBanner: {
        backgroundColor: '#FF4732',
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        marginBottom: 18,
    },
    earningsLabel: {
        color: 'white',
        fontSize: 15,
        fontWeight: '800',
    },
    earningsSub: {
        color: 'rgba(255, 255, 255, 0.75)',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 1,
    },
    earningsValue: {
        color: 'white',
        fontSize: 24,
        fontWeight: '900',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    rejectButton: {
        flex: 1,
        height: 48,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        backgroundColor: 'white',
    },
    rejectButtonText: {
        color: '#4B5563',
        fontSize: 15,
        fontWeight: '700',
    },
    acceptButton: {
        flex: 2,
        height: 48,
        backgroundColor: '#10B981',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '700',
    },
    warningFooter: {
        textAlign: 'center',
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '600',
    },
});

