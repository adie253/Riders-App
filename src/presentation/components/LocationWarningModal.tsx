import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, ActivityIndicator, Dimensions } from 'react-native';
import { useDelivery } from '../context/DeliveryContext';
import { AlertTriangle, MapPin, Power } from 'lucide-react-native';

export const LocationWarningModal = () => {
    const { isOnline, isLocationOff, checkLocationStatus, toggleDutyStatus } = useDelivery();
    const [isChecking, setIsChecking] = useState(false);
    const [isGoingOffline, setIsGoingOffline] = useState(false);

    // Only show modal when online and location is detected as off/permission missing
    if (!isOnline || !isLocationOff) return null;

    const handleRetry = async () => {
        setIsChecking(true);
        try {
            await checkLocationStatus();
        } catch (e) {
            console.warn(e);
        } finally {
            setIsChecking(false);
        }
    };

    const handleGoOffline = async () => {
        setIsGoingOffline(true);
        try {
            await toggleDutyStatus();
        } catch (e) {
            console.error("Failed to go offline from location modal:", e);
        } finally {
            setIsGoingOffline(false);
        }
    };

    const handleOpenSettings = async () => {
        try {
            await Linking.openSettings();
        } catch (e) {
            console.error("Could not open system settings:", e);
        }
    };

    return (
        <Modal
            visible={isOnline && isLocationOff}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
        >
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    {/* Icon Header */}
                    <View style={styles.iconContainer}>
                        <View style={styles.pulseRing}>
                            <MapPin size={40} color="#EF4444" />
                            <View style={styles.errorIndicator}>
                                <AlertTriangle size={12} color="#FFFFFF" fill="#EF4444" />
                            </View>
                        </View>
                    </View>

                    {/* Text Details */}
                    <Text style={styles.title}>Location Services Off</Text>
                    
                    <Text style={styles.description}>
                        Hivago requires precise location tracking to dispatch orders, calculate delivery routes, and update delivery status. 
                    </Text>

                    <View style={styles.instructionsBox}>
                        <Text style={styles.instructionItem}>
                            • Check if your device's GPS/Location is turned on.
                        </Text>
                        <Text style={styles.instructionItem}>
                            • Ensure location permission is set to "Allow all the time" or "While using the app".
                        </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        <TouchableOpacity 
                            style={styles.settingsButton}
                            onPress={handleOpenSettings}
                        >
                            <Text style={styles.settingsButtonText}>Enable in Settings</Text>
                        </TouchableOpacity>

                        <View style={styles.secondaryRow}>
                            <TouchableOpacity 
                                style={styles.offlineButton}
                                onPress={handleGoOffline}
                                disabled={isGoingOffline || isChecking}
                            >
                                {isGoingOffline ? (
                                    <ActivityIndicator size="small" color="#4B5563" />
                                ) : (
                                    <>
                                        <Power size={14} color="#4B5563" style={{ marginRight: 6 }} />
                                        <Text style={styles.offlineButtonText}>Go Offline</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.retryButton}
                                onPress={handleRetry}
                                disabled={isChecking || isGoingOffline}
                            >
                                {isChecking ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.retryButtonText}>Retry</Text>
                                )}
                            </TouchableOpacity>
                        </View>
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
        backgroundColor: 'rgba(15, 23, 42, 0.75)', // Elegant dark slate backdrop
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    modalCard: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    iconContainer: {
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    errorIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        padding: 4,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 10,
    },
    description: {
        fontSize: 14,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    instructionsBox: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 24,
    },
    instructionItem: {
        fontSize: 12.5,
        color: '#4B5563',
        lineHeight: 18,
        marginBottom: 8,
    },
    actions: {
        width: '100%',
        gap: 12,
    },
    settingsButton: {
        width: '100%',
        height: 50,
        backgroundColor: '#FF4732', // Matches primary Hivago branding
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF4732',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 2,
    },
    settingsButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    offlineButton: {
        flex: 1,
        height: 48,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    offlineButtonText: {
        color: '#4B5563',
        fontSize: 14,
        fontWeight: '600',
    },
    retryButton: {
        flex: 1,
        height: 48,
        backgroundColor: '#111827',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
