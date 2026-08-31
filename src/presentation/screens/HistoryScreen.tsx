import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { ArrowLeft, Clock, MapPin, Package, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getDeliveryHistory } from '../../data/api';

import { HistorySkeleton } from '../components/SkeletonLoader';

type OrderStatus = 'completed' | 'cancelled';
type PeriodScope = 'month' | 'year';

interface OrderItem {
    id: string;
    merchantName: string;
    dateTime: string;
    orderNumber: string;
    distance?: string;
    payout?: string;
    reason?: string;
    status: OrderStatus;
    rawDate: Date;
}

const formatCompletedAt = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (diffDays === 0 && now.getDate() === date.getDate()) {
            return `Today, ${timeStr}`;
        } else if (diffDays === 1 || (diffDays === 0 && now.getDate() !== date.getDate())) {
            return `Yesterday, ${timeStr}`;
        } else {
            return `${date.toLocaleDateString([], { day: '2-digit', month: 'short' })}, ${timeStr}`;
        }
    } catch (e) {
        return dateStr;
    }
};

export const HistoryScreen = ({ navigation }: { navigation: any }) => {
    const [statusFilter, setStatusFilter] = useState<OrderStatus>('completed');
    const [periodFilter, setPeriodFilter] = useState<PeriodScope>('month');
    const insets = useSafeAreaInsets();

    const [historyItems, setHistoryItems] = useState<OrderItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const scrollViewRef = useRef<ScrollView>(null);

    const fetchHistory = useCallback(async (showRefreshIndicator = false) => {
        if (showRefreshIndicator) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setError(null);
        try {
            const data = await getDeliveryHistory(1, 50);
            if (data && data.items) {
                const mapped: OrderItem[] = data.items.map((item: any) => ({
                    id: item.deliveryRequestId,
                    merchantName: item.restaurantName || 'Restaurant',
                    dateTime: formatCompletedAt(item.completedAt),
                    orderNumber: item.orderNumber,
                    distance: item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : undefined,
                    payout: `₹ ${item.earnings || 0}`,
                    status: 'completed',
                    rawDate: new Date(item.completedAt)
                }));
                setHistoryItems(mapped);
            } else {
                setHistoryItems([]);
            }
        } catch (err: any) {
            console.error('Failed to load history:', err);
            setError(err.message || 'Failed to load history');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchHistory();
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        }, [fetchHistory])
    );

    const filteredOrders = historyItems.filter(order => {
        if (order.status !== statusFilter) return false;
        
        const now = new Date();
        const orderDate = order.rawDate;
        
        if (periodFilter === 'month') {
            return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        } else if (periodFilter === 'year') {
            return orderDate.getFullYear() === now.getFullYear();
        }
        return true;
    });

    return (
        <View style={styles.mainContainer}>
            {/* Header section with safe-area insets */}
            <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 16) }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Dashboard')}>
                        <ArrowLeft size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Order History</Text>
                    <View style={styles.headerPlaceholder} />
                </View>

                {/* Primary Segment Control (Completed vs Cancelled) */}
                <View style={styles.statusSegmentContainer}>
                    <TouchableOpacity
                        style={[styles.statusSegmentButton, statusFilter === 'completed' && styles.statusSegmentActive]}
                        onPress={() => setStatusFilter('completed')}
                    >
                        <Text style={[styles.statusSegmentText, statusFilter === 'completed' && styles.statusSegmentTextActive]}>
                            Completed
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.statusSegmentButton, statusFilter === 'cancelled' && styles.statusSegmentActive]}
                        onPress={() => setStatusFilter('cancelled')}
                    >
                        <Text style={[styles.statusSegmentText, statusFilter === 'cancelled' && styles.statusSegmentTextActive]}>
                            Cancelled
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Secondary Scope Control (Month vs Year) */}
                <View style={styles.periodRow}>
                    <View style={styles.periodSegmentContainer}>
                        <TouchableOpacity
                            style={[styles.periodSegmentButton, periodFilter === 'month' && styles.periodSegmentActive]}
                            onPress={() => setPeriodFilter('month')}
                        >
                            <Text style={[styles.periodSegmentText, periodFilter === 'month' && styles.periodSegmentTextActive]}>
                                Month
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.periodSegmentButton, periodFilter === 'year' && styles.periodSegmentActive]}
                            onPress={() => setPeriodFilter('year')}
                        >
                            <Text style={[styles.periodSegmentText, periodFilter === 'year' && styles.periodSegmentTextActive]}>
                                Year
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Scrollable Orders List */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollStyle}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => fetchHistory(true)}
                        colors={['#FF4732']}
                    />
                }
            >
                {isLoading ? (
                    <HistorySkeleton />
                ) : error ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={() => fetchHistory()}>
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : filteredOrders.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        {statusFilter === 'completed' ? (
                            <>
                                <Package size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
                                <Text style={styles.emptyStateTitle}>No completed deliveries</Text>
                                <Text style={styles.emptyStateSub}>Completed deliveries will show up here.</Text>
                            </>
                        ) : (
                            <>
                                <X size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
                                <Text style={styles.emptyStateTitle}>No cancelled deliveries</Text>
                                <Text style={styles.emptyStateSub}>You have no cancelled deliveries.</Text>
                            </>
                        )}
                    </View>
                ) : (
                    filteredOrders.map(order => (
                        <View key={order.id} style={styles.orderCard}>
                            <View style={styles.cardMainRow}>
                                <View style={[styles.iconCircle, { backgroundColor: '#FFEBE9' }]}>
                                    {order.status === 'completed' ? (
                                        <Package size={20} color="#D32815" />
                                    ) : (
                                        <X size={20} color="#EF4444" />
                                    )}
                                </View>
                                <View style={styles.cardDetailsWrapper}>
                                    <Text style={styles.merchantName}>{order.merchantName}</Text>
                                    <Text style={styles.cardSubtext}>{order.dateTime}</Text>
                                    <Text style={styles.orderNumberText}>Order #{order.orderNumber}</Text>
                                </View>
                                <View style={styles.badgeWrapper}>
                                    {order.status === 'completed' ? (
                                        <View style={styles.payoutBadge}>
                                            <Text style={styles.payoutText}>{order.payout}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.cancelledBadge}>
                                            <Text style={styles.cancelledText}>Cancelled</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Bottom Row / Section based on Status */}
                            {order.status === 'completed' && order.distance && (
                                <View style={styles.cardFooterRow}>
                                    <MapPin size={14} color="#9CA3AF" />
                                    <Text style={styles.distanceText}>{order.distance}</Text>
                                </View>
                            )}

                            {order.status === 'cancelled' && order.reason && (
                                <View style={styles.reasonContainer}>
                                    <Text style={styles.reasonLabel}>Reason:</Text>
                                    <Text style={styles.reasonValue}>{order.reason}</Text>
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    headerContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 48,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    headerPlaceholder: {
        width: 32,
    },
    statusSegmentContainer: {
        flexDirection: 'row',
        backgroundColor: '#EEF2F6',
        borderRadius: 16,
        padding: 4,
        marginTop: 16,
    },
    statusSegmentButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    statusSegmentActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statusSegmentText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    statusSegmentTextActive: {
        color: '#1F2937',
    },
    periodRow: {
        alignItems: 'center',
        marginTop: 16,
    },
    periodSegmentContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        padding: 2,
        width: 160,
    },
    periodSegmentButton: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: 8,
    },
    periodSegmentActive: {
        backgroundColor: '#FFFFFF',
    },
    periodSegmentText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    periodSegmentTextActive: {
        color: '#2563EB',
    },
    scrollStyle: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 100, // Offset for absolute bottom tab bar
    },
    orderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    cardMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    cardDetailsWrapper: {
        flex: 1,
    },
    merchantName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    cardSubtext: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    orderNumberText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    badgeWrapper: {
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    payoutBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    payoutText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 13,
    },
    cancelledBadge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    cancelledText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 11,
    },
    cardFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    distanceText: {
        fontSize: 12,
        color: '#6B7280',
        marginLeft: 6,
    },
    reasonContainer: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 12,
        marginTop: 14,
    },
    reasonLabel: {
        fontSize: 11,
        color: '#6B7280',
    },
    reasonValue: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#1F2937',
        marginTop: 2,
    },
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyStateTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 4,
    },
    emptyStateSub: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    errorText: {
        fontSize: 14,
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 12,
    },
    retryButton: {
        backgroundColor: '#FF4732',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
