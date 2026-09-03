import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Modal, ScrollView, SafeAreaView, Animated } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useDelivery } from '../context/DeliveryContext';
import { useToast } from '../context/ToastContext';
import { Bell, Menu, Gift, ShieldCheck, AlertCircle, Lightbulb, Star } from 'lucide-react-native';
import { SwipeButton } from '../components/SwipeButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getDeliveryHistory } from '../../data/api';
import { useLanguage } from '../context/LanguageContext';

import { DashboardSkeleton } from '../components/SkeletonLoader';

export const DashboardScreen = ({ navigation }: { navigation: any }) => {
    const { riderProfile, isLoading: isAuthLoading } = useAuth();
    const {
        isOnline,
        toggleDutyStatus,
        activeDelivery,
        isUpdatingStatus,
        isInitialLoading: isDeliveryLoading,
    } = useDelivery();
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();

    const [isOfflineModalVisible, setOfflineModalVisible] = useState(false);
    const [todayEarnings, setTodayEarnings] = useState(0);
    const [todayOrdersCount, setTodayOrdersCount] = useState(0);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const scrollViewRef = useRef<ScrollView>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, []);

    const fetchPerformance = async (showSkeleton = false) => {
        if (showSkeleton) {
            setIsLoadingStats(true);
        }
        try {
            const history = await getDeliveryHistory(1, 50);
            if (history && history.items) {
                const today = new Date();
                const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

                const todayDeliveries = history.items.filter((item: any) => {
                    const completedDate = new Date(item.completedAt).getTime();
                    return completedDate >= startOfToday;
                });

                const earningsSum = todayDeliveries.reduce((sum: number, item: any) => sum + (item.earnings || 0), 0);
                setTodayEarnings(earningsSum);
                setTodayOrdersCount(todayDeliveries.length);
            }
        } catch (error) {
            console.error('Error fetching today\'s performance:', error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchPerformance(false);
        }, [])
    );

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


    if (isLoadingStats || isAuthLoading || isDeliveryLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4F6', paddingTop: insets.top }}>
                <DashboardSkeleton />
            </SafeAreaView>
        );
    }

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity>
                    <Menu size={24} color="#111827" />
                </TouchableOpacity>
                <TouchableOpacity>
                    <Bell size={24} color="#111827" />
                </TouchableOpacity>
            </View>

            <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Greeting */}
                <Text style={styles.greetingText}>{t('hello')}, {riderProfile?.name?.split(' ')[0] || 'Rider'}</Text>

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
                                You're <Text style={{ color: isOnline ? '#65A30D' : '#B91C1C' }}>{isOnline ? t('online') : t('offline')}</Text>
                            </Text>
                            <Text style={styles.statusSubtitle}>
                                {isOnline ? t('readyToReceive') : t('slideToStart')}
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
                                    title={t('slideToGoOffline')}
                                    actionType="goOffline"
                                    onSwipeComplete={handleRequestGoOffline}
                                />
                            ) : (
                                <SwipeButton
                                    key="go-online"
                                    title={t('slideToGoOnline')}
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
                            <Text style={styles.bonusTitle}>{t('todayBonus')}</Text>
                        </View>
                        <Text style={styles.bonusSubtitle}>
                            {Math.max(0, 10 - todayOrdersCount) > 0
                                ? t('moreOrdersToEarn', { count: Math.max(0, 10 - todayOrdersCount) })
                                : t('targetAchieved')}
                        </Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${Math.min(100, (todayOrdersCount / 10) * 100)}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{t('ordersCompleted', { count: todayOrdersCount })}</Text>
                    </View>
                ) : (
                    <View style={styles.offlineInfoStrip}>
                        <Lightbulb size={16} color="#FBBF24" style={{ marginRight: 6 }} />
                        <Text style={styles.offlineInfoText}>{t('stayOnlineToReceive')}</Text>
                    </View>
                )}

                {/* Today's Performance */}
                <Text style={styles.sectionTitle}>{t('todaysPerformance')}</Text>
                <View style={styles.performanceRow}>
                    <View style={styles.performanceCard}>
                        <View style={styles.perfHeader}>
                            <View style={styles.perfIconWrapperRed}>
                                <Text style={styles.rupeeIconRed}>₹</Text>
                            </View>
                            <Text style={styles.perfLabel}>{t('earnings')}</Text>
                        </View>
                        <Text style={styles.perfValue}>₹{todayEarnings}</Text>
                    </View>

                    <View style={styles.performanceCard}>
                        <View style={styles.perfHeader}>
                            <View style={styles.perfIconWrapperRed}>
                                <Gift size={12} color="#B91C1C" />
                            </View>
                            <Text style={styles.perfLabel}>{t('orders')}</Text>
                        </View>
                        <Text style={styles.perfValue}>{todayOrdersCount}</Text>
                    </View>
                </View>

                {/* Safety First (only visible when offline based on Figma) */}
                {!isOnline && (
                    <View style={styles.safetyCard}>
                        <View style={styles.safetyHeader}>
                            <ShieldCheck size={20} color="#3B82F6" style={{ marginRight: 8 }} />
                            <Text style={styles.safetyTitle}>{t('safetyFirst')}</Text>
                        </View>
                        <Text style={styles.safetyText}>
                            {t('needHelpSos')}
                        </Text>
                    </View>
                )}
            </ScrollView>

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
                        <Text style={styles.modalTitle}>{t('goOfflineQuestion')}</Text>
                        <Text style={styles.modalText}>
                            {t('goOfflineWarning')}
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalBtnCancel}
                                onPress={() => setOfflineModalVisible(false)}
                            >
                                <Text style={styles.modalBtnCancelText}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalBtnConfirm}
                                onPress={confirmGoOffline}
                            >
                                <Text style={styles.modalBtnConfirmText}>{t('confirmGoOffline')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </Animated.View>
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
        paddingBottom: 100, // Space for absolute bottom tab bar
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

