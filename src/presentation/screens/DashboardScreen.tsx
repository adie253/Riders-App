import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Modal, ScrollView, SafeAreaView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useDelivery } from '../context/DeliveryContext';
import { useToast } from '../context/ToastContext';
import { Bell, Menu, Home, TrendingUp, Gift, Clock, User, ShieldCheck, AlertCircle, Lightbulb, Star } from 'lucide-react-native';
import { SwipeButton } from '../components/SwipeButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const DashboardScreen = ({ navigation }: { navigation: any }) => {
    const { riderProfile } = useAuth();
    const { 
        isOnline, 
        toggleDutyStatus, 
        activeDelivery, 
        isUpdatingStatus,
    } = useDelivery();
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();

    const [isOfflineModalVisible, setOfflineModalVisible] = useState(false);

    // Check if rider has active delivery and navigate if so
    useEffect(() => {
        if (activeDelivery) {
            navigation.navigate('ActiveDelivery');
        }
    }, [activeDelivery, navigation]);

    const handleGoOnline = async () => {
        if (isOnline) return;
        await toggleDutyStatus();
    };

    const handleRequestGoOffline = () => {
        if (!isOnline) return;
        setOfflineModalVisible(true);
    };

    const confirmGoOffline = async () => {
        setOfflineModalVisible(false);
        await toggleDutyStatus();
    };

    // Bottom Navigation Component
    const BottomTabBar = () => (
        <View style={[styles.bottomTabBar, { paddingBottom: insets.bottom || 16 }]}>
            <TouchableOpacity style={styles.tabItem} onPress={() => {}}>
                <Home size={24} color="#B91C1C" />
                <Text style={[styles.tabText, styles.tabTextActive]}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Earnings')}>
                <TrendingUp size={24} color="#6B7280" />
                <Text style={styles.tabText}>Earnings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => {}}>
                <Gift size={24} color="#6B7280" />
                <Text style={styles.tabText}>Offers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => {}}>
                <Clock size={24} color="#6B7280" />
                <Text style={styles.tabText}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Profile')}>
                <User size={24} color="#6B7280" />
                <Text style={styles.tabText}>Profile</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity>
                    <Menu size={24} color="#111827" />
                </TouchableOpacity>
                <TouchableOpacity>
                    <Bell size={24} color="#111827" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Greeting */}
                <Text style={styles.greetingText}>Hello, {riderProfile?.name?.split(' ')[0] || 'Rider'}</Text>

                {/* Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusContent}>
                        <View style={styles.illustrationPlaceholder}>
                            {/* Placeholder for illustration */}
                            <View style={styles.mockIllustration}>
                                {isOnline ? (
                                    <ShieldCheck size={40} color="#10B981" />
                                ) : (
                                    <AlertCircle size={40} color="#9CA3AF" />
                                )}
                            </View>
                        </View>
                        <View style={styles.statusTextContainer}>
                            <Text style={styles.statusTitle}>
                                You're <Text style={{ color: isOnline ? '#65A30D' : '#B91C1C' }}>{isOnline ? 'Online' : 'Offline'}</Text>
                            </Text>
                            <Text style={styles.statusSubtitle}>
                                {isOnline ? 'Ready to receive delivery requests' : 'Slide to start receiving orders & earn money.'}
                            </Text>
                        </View>
                    </View>

                    {isUpdatingStatus ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={isOnline ? '#65A30D' : '#B91C1C'} />
                        </View>
                    ) : (
                        <View style={styles.swipeContainer}>
                            {isOnline ? (
                                <SwipeButton 
                                    key="go-offline"
                                    title="Slide to Go Offline" 
                                    actionType="goOffline" 
                                    onSwipeComplete={handleRequestGoOffline} 
                                />
                            ) : (
                                <SwipeButton 
                                    key="go-online"
                                    title="Slide to Go Online" 
                                    actionType="goOnline" 
                                    onSwipeComplete={handleGoOnline} 
                                />
                            )}
                        </View>
                    )}
                </View>

                {/* Info / Bonus Strip */}
                {isOnline ? (
                    <View style={styles.bonusCard}>
                        <View style={styles.bonusHeader}>
                            <Star size={16} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 6 }} />
                            <Text style={styles.bonusTitle}>Today's Bonus</Text>
                        </View>
                        <Text style={styles.bonusSubtitle}>2 more orders to earn ₹50</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: '80%' }]} />
                        </View>
                        <Text style={styles.progressText}>8 of 10 orders completed</Text>
                    </View>
                ) : (
                    <View style={styles.offlineInfoStrip}>
                        <Lightbulb size={16} color="#FBBF24" style={{ marginRight: 6 }} />
                        <Text style={styles.offlineInfoText}>Stay online to receive delivery requests</Text>
                    </View>
                )}

                {/* Today's Performance */}
                <Text style={styles.sectionTitle}>Today's Performance</Text>
                <View style={styles.performanceRow}>
                    <View style={styles.performanceCard}>
                        <View style={styles.perfHeader}>
                            <View style={styles.perfIconWrapperRed}>
                                <Text style={styles.rupeeIconRed}>₹</Text>
                            </View>
                            <Text style={styles.perfLabel}>Earnings</Text>
                        </View>
                        <Text style={styles.perfValue}>₹450</Text>
                    </View>

                    <View style={styles.performanceCard}>
                        <View style={styles.perfHeader}>
                            <View style={styles.perfIconWrapperRed}>
                                <Gift size={12} color="#B91C1C" />
                            </View>
                            <Text style={styles.perfLabel}>Orders</Text>
                        </View>
                        <Text style={styles.perfValue}>8</Text>
                    </View>
                </View>

                {/* Safety First (only visible when offline based on Figma) */}
                {!isOnline && (
                    <View style={styles.safetyCard}>
                        <View style={styles.safetyHeader}>
                            <ShieldCheck size={20} color="#3B82F6" style={{ marginRight: 8 }} />
                            <Text style={styles.safetyTitle}>Safety First</Text>
                        </View>
                        <Text style={styles.safetyText}>
                            Need help during delivery? Tap the SOS button on the top right corner of the screen.
                        </Text>
                    </View>
                )}
            </ScrollView>

            <BottomTabBar />

            {/* Go Offline Modal */}
            <Modal
                visible={isOfflineModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setOfflineModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconContainer}>
                            <AlertCircle size={48} color="#F59E0B" />
                        </View>
                        <Text style={styles.modalTitle}>Go Offline?</Text>
                        <Text style={styles.modalText}>
                            You won't receive new orders while offline. Your current earnings will be saved.
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={styles.modalBtnCancel} 
                                onPress={() => setOfflineModalVisible(false)}
                            >
                                <Text style={styles.modalBtnCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.modalBtnConfirm} 
                                onPress={confirmGoOffline}
                            >
                                <Text style={styles.modalBtnConfirmText}>Go Offline</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6', // Light gray background to match design
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: '#F3F4F6',
        paddingBottom: 16,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100, // Space for bottom tab bar
    },
    greetingText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 20,
    },
    statusCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    statusContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    illustrationPlaceholder: {
        width: 100,
        height: 100,
        marginRight: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mockIllustration: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusTextContainer: {
        flex: 1,
    },
    statusTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 6,
    },
    statusSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    loadingContainer: {
        height: 64,
        justifyContent: 'center',
        alignItems: 'center',
    },
    swipeContainer: {
        width: '100%',
    },
    offlineInfoStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    offlineInfoText: {
        fontSize: 13,
        color: '#3B82F6',
        fontWeight: '500',
    },
    bonusCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FDE68A',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    bonusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    bonusTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#D97706',
    },
    bonusSubtitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#F3F4F6',
        borderRadius: 3,
        marginBottom: 6,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#F59E0B',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    performanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    performanceCard: {
        width: (width - 56) / 2, // Accounting for paddings and gap
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    perfHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    perfIconWrapperRed: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    rupeeIconRed: {
        color: '#B91C1C',
        fontSize: 12,
        fontWeight: 'bold',
    },
    perfLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#111827',
    },
    perfValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    safetyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E0F2FE',
        marginBottom: 20,
    },
    safetyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    safetyTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#3B82F6',
    },
    safetyText: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    
    // Bottom Tab Bar Styles
    bottomTabBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 4,
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#B91C1C',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    modalIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    modalText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
    },
    modalBtnCancel: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    modalBtnCancelText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#374151',
    },
    modalBtnConfirm: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#EF4444',
    },
    modalBtnConfirmText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
});

