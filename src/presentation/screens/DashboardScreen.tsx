import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useDelivery } from '../context/DeliveryContext';
import { useToast } from '../context/ToastContext';
import MapView, { Marker } from 'react-native-maps';
import { Power, MapPin, DollarSign, ShoppingBag, Clock, Navigation, Shield, User } from 'lucide-react-native';

export const DashboardScreen = ({ navigation }: { navigation: any }) => {
    const { riderProfile } = useAuth();
    const { 
        isOnline, 
        toggleDutyStatus, 
        currentCoords, 
        activeDelivery, 
        isUpdatingStatus,
        refreshActiveStatus
    } = useDelivery();
    const { showToast } = useToast();

    // Check if rider has active delivery and navigate if so
    useEffect(() => {
        if (activeDelivery) {
            navigation.navigate('ActiveDelivery');
        }
    }, [activeDelivery]);

    const handleToggleDuty = async () => {
        const success = await toggleDutyStatus();
        if (success && !isOnline) {
            showToast('You are now offline', 'info');
        }
    };

    // Region of the map
    const defaultRegion = {
        latitude: currentCoords?.latitude || 12.9716, // Bangalore fallback
        longitude: currentCoords?.longitude || 77.5946,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.riderInfo}>
                    <TouchableOpacity 
                        style={styles.avatarButton}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <View style={styles.avatarCircle}>
                            <User size={24} color="#FF4732" />
                        </View>
                    </TouchableOpacity>
                    <View style={styles.textDetails}>
                        <Text style={styles.welcomeText}>Hello,</Text>
                        <Text style={styles.nameText}>{riderProfile?.name || 'Rider'}</Text>
                    </View>
                </View>

                {/* Duty Toggle Card */}
                <View style={[styles.statusCard, isOnline ? styles.onlineCard : styles.offlineCard]}>
                    <View style={styles.statusLabelContainer}>
                        <Power size={18} color={isOnline ? '#10B981' : '#9CA3AF'} style={styles.powerIcon} />
                        <Text style={[styles.statusLabelText, isOnline ? styles.onlineText : styles.offlineText]}>
                            {isOnline ? 'Online' : 'Offline'}
                        </Text>
                    </View>
                    {isUpdatingStatus ? (
                        <ActivityIndicator size="small" color="#FF4732" style={styles.statusLoader} />
                    ) : (
                        <Switch
                            trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
                            thumbColor={isOnline ? '#10B981' : '#F3F4F6'}
                            ios_backgroundColor="#D1D5DB"
                            onValueChange={handleToggleDuty}
                            value={isOnline}
                        />
                    )}
                </View>
            </View>

            {/* Map / Duty State Container */}
            <View style={styles.mapContainer}>
                {isOnline ? (
                    currentCoords ? (
                        <MapView
                            style={styles.map}
                            initialRegion={defaultRegion}
                            region={defaultRegion}
                            showsUserLocation={true}
                            showsMyLocationButton={true}
                        >
                            <Marker
                                coordinate={{
                                    latitude: currentCoords.latitude,
                                    longitude: currentCoords.longitude
                                }}
                                title="Your Location"
                                description="Looking for delivery offers..."
                            >
                                <View style={styles.markerContainer}>
                                    <View style={styles.markerCircle}>
                                        <Navigation size={14} color="white" style={styles.navArrow} />
                                    </View>
                                </View>
                            </Marker>
                        </MapView>
                    ) : (
                        <View style={styles.mapFallback}>
                            <ActivityIndicator size="large" color="#FF4732" />
                            <Text style={styles.fallbackText}>Acquiring GPS location...</Text>
                        </View>
                    )
                ) : (
                    <View style={styles.offlineOverlay}>
                        <Power size={64} color="#9CA3AF" style={styles.offlineIcon} />
                        <Text style={styles.offlineTitle}>You are Offline</Text>
                        <Text style={styles.offlineSub}>Go online to start receiving delivery offers near you.</Text>
                        <TouchableOpacity style={styles.goOnlineButton} onPress={handleToggleDuty} disabled={isUpdatingStatus}>
                            <Text style={styles.goOnlineButtonText}>Go Online Now</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Pulsing indicator when searching */}
                {isOnline && !activeDelivery && (
                    <View style={styles.searchOverlay}>
                        <View style={styles.pulseIndicator} />
                        <Text style={styles.searchText}>Searching for delivery offers...</Text>
                    </View>
                )}
            </View>

            {/* Daily Stats Summary */}
            <View style={styles.statsPanel}>
                <Text style={styles.sectionTitle}>Today's Summary</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconWrapper, { backgroundColor: '#E0F2FE' }]}>
                            <DollarSign size={20} color="#0284C7" />
                        </View>
                        <Text style={styles.statVal}>₹250</Text>
                        <Text style={styles.statLabel}>Earnings</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconWrapper, { backgroundColor: '#DCFCE7' }]}>
                            <ShoppingBag size={20} color="#15803D" />
                        </View>
                        <Text style={styles.statVal}>3</Text>
                        <Text style={styles.statLabel}>Trips Done</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconWrapper, { backgroundColor: '#F3E8FF' }]}>
                            <Clock size={20} color="#6B21A8" />
                        </View>
                        <Text style={styles.statVal}>2.4h</Text>
                        <Text style={styles.statLabel}>On Duty</Text>
                    </View>
                </View>

                {/* Bottom Navigation shortcuts */}
                <View style={styles.navShortcuts}>
                    <TouchableOpacity 
                        style={styles.shortcutBtn}
                        onPress={() => navigation.navigate('Earnings')}
                    >
                        <DollarSign size={20} color="#FF4732" />
                        <Text style={styles.shortcutText}>Earnings</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.shortcutBtn}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <User size={20} color="#FF4732" />
                        <Text style={styles.shortcutText}>Profile</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    riderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarButton: {
        marginRight: 12,
    },
    avatarCircle: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#FFEBE9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textDetails: {
        justifyContent: 'center',
    },
    welcomeText: {
        fontSize: 12,
        color: '#6B7280',
    },
    nameText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    onlineCard: {
        backgroundColor: '#ECFDF5',
        borderColor: '#A7F3D0',
    },
    offlineCard: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
    },
    statusLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    powerIcon: {
        marginRight: 6,
    },
    statusLabelText: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    onlineText: {
        color: '#065F46',
    },
    offlineText: {
        color: '#4B5563',
    },
    statusLoader: {
        marginLeft: 4,
    },
    mapContainer: {
        flex: 1,
        backgroundColor: '#E5E7EB',
        position: 'relative',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    mapFallback: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    fallbackText: {
        marginTop: 12,
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '500',
    },
    offlineOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 40,
    },
    offlineIcon: {
        marginBottom: 16,
    },
    offlineTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    offlineSub: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    goOnlineButton: {
        backgroundColor: '#FF4732',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 16,
        shadowColor: '#FF4732',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    goOnlineButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
    searchOverlay: {
        position: 'absolute',
        top: 20,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    pulseIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        marginRight: 8,
    },
    searchText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    statsPanel: {
        backgroundColor: 'white',
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.03,
        shadowRadius: 16,
        elevation: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 14,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    statIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statVal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    statLabel: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
    },
    navShortcuts: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 14,
    },
    shortcutBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFEBE9',
        height: 44,
        borderRadius: 10,
        marginHorizontal: 4,
    },
    shortcutText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FF4732',
        marginLeft: 8,
    },
    markerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    markerCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FF4732',
        borderWidth: 2,
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    navArrow: {
        transform: [{ rotate: '45deg' }],
    },
});
