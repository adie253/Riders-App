import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getRiderEarnings } from '../../data/api';
import { ArrowLeft, DollarSign, Calendar, TrendingUp, ChevronRight, CheckCircle } from 'lucide-react-native';

interface EarningStats {
    totalEarnings: number;
    weeklyEarnings: number;
    monthlyEarnings: number;
    pendingPayout: number;
    recentDeliveries: {
        id: string;
        orderNumber: string;
        completedAt: string;
        earnings: number;
        distanceKm: number;
        restaurantName: string;
    }[];
}

export const EarningsScreen = ({ navigation }: { navigation: any }) => {
    const [stats, setStats] = useState<EarningStats | null>(null);
    const [loading, setLoading] = useState(true);

    const loadEarnings = async () => {
        setLoading(true);
        try {
            const data = await getRiderEarnings();
            setStats(data);
        } catch (e) {
            console.warn('Failed to load earnings:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEarnings();
    }, []);

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#FF4732" />
            </View>
        );
    }

    const recentDeliveries = stats?.recentDeliveries || [
        { id: '1', orderNumber: 'HIV-8472', completedAt: 'Today, 02:30 PM', earnings: 75, distanceKm: 4.2, restaurantName: 'Burger King' },
        { id: '2', orderNumber: 'HIV-9382', completedAt: 'Today, 11:15 AM', earnings: 90, distanceKm: 5.6, restaurantName: 'Pizza Hut' },
        { id: '3', orderNumber: 'HIV-3829', completedAt: 'Yesterday, 08:20 PM', earnings: 85, distanceKm: 3.8, restaurantName: 'Chai Point' },
    ];

    // Mock weekly chart bars
    const weeklyChartData = [
        { day: 'Mon', amount: 320, height: 40 },
        { day: 'Tue', amount: 480, height: 60 },
        { day: 'Wed', amount: 620, height: 80 },
        { day: 'Thu', amount: 390, height: 50 },
        { day: 'Fri', amount: 750, height: 95 },
        { day: 'Sat', amount: 900, height: 110 },
        { day: 'Sun', amount: 120, height: 15 },
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Dashboard')}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Earnings</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Total Balance Card */}
            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Total Earnings</Text>
                <Text style={styles.balanceAmount}>₹{stats?.totalEarnings || 2500}</Text>
                
                <View style={styles.breakdownRow}>
                    <View style={styles.breakdownItem}>
                        <Text style={styles.bdLabel}>Weekly</Text>
                        <Text style={styles.bdValue}>₹{stats?.weeklyEarnings || 1640}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.breakdownItem}>
                        <Text style={styles.bdLabel}>Pending Payout</Text>
                        <Text style={styles.bdValue}>₹{stats?.pendingPayout || 860}</Text>
                    </View>
                </View>
            </View>

            {/* Weekly Overview Chart */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                    <TrendingUp size={18} color="#FF4732" />
                    <Text style={styles.sectionTitle}>Weekly Activity</Text>
                </View>

                {/* Custom bar chart */}
                <View style={styles.chartContainer}>
                    <View style={styles.barsRow}>
                        {weeklyChartData.map((data, index) => (
                            <View key={index} style={styles.chartColumn}>
                                <Text style={styles.barValueText}>₹{data.amount}</Text>
                                <View style={[styles.chartBar, { height: data.height }]} />
                                <Text style={styles.barDayLabel}>{data.day}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {/* Recent Completed Deliveries */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                    <Calendar size={18} color="#FF4732" />
                    <Text style={styles.sectionTitle}>Recent Deliveries</Text>
                </View>

                {recentDeliveries.map((delivery) => (
                    <View key={delivery.id} style={styles.deliveryRow}>
                        <View style={styles.checkCircleWrapper}>
                            <CheckCircle size={20} color="#10B981" />
                        </View>
                        <View style={styles.deliveryDetails}>
                            <Text style={styles.deliveryOrder}>Order #{delivery.orderNumber}</Text>
                            <Text style={styles.deliveryRest}>{delivery.restaurantName}</Text>
                            <Text style={styles.deliveryMeta}>{delivery.completedAt} • {delivery.distanceKm} km</Text>
                        </View>
                        <View style={styles.deliveryAmountWrapper}>
                            <Text style={styles.deliveryPrice}>+₹{delivery.earnings}</Text>
                            <ChevronRight size={14} color="#9CA3AF" />
                        </View>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    contentContainer: {
        padding: 20,
        paddingTop: 50,
        paddingBottom: 40,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        padding: 6,
        backgroundColor: 'white',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    placeholder: {
        width: 36,
    },
    balanceCard: {
        backgroundColor: '#FF4732',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#FF4732',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
    balanceLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFEBE9',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    balanceAmount: {
        fontSize: 36,
        fontWeight: '900',
        color: 'white',
        marginTop: 6,
    },
    breakdownRow: {
        flexDirection: 'row',
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.15)',
        marginTop: 20,
        paddingTop: 16,
    },
    breakdownItem: {
        flex: 1,
        alignItems: 'center',
    },
    bdLabel: {
        fontSize: 11,
        color: '#FFEBE9',
    },
    bdValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        marginTop: 4,
    },
    divider: {
        width: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        height: '100%',
    },
    sectionCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1F2937',
        marginLeft: 8,
    },
    chartContainer: {
        alignItems: 'center',
        paddingTop: 12,
    },
    barsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        width: '100%',
        height: 140,
        paddingHorizontal: 4,
    },
    chartColumn: {
        alignItems: 'center',
        width: '12%',
    },
    barValueText: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#6B7280',
        marginBottom: 4,
    },
    chartBar: {
        backgroundColor: '#FFEBE9',
        width: '100%',
        borderRadius: 4,
        borderTopWidth: 2,
        borderTopColor: '#FF4732',
    },
    barDayLabel: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 6,
        fontWeight: '600',
    },
    deliveryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    checkCircleWrapper: {
        marginRight: 12,
    },
    deliveryDetails: {
        flex: 1,
    },
    deliveryOrder: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    deliveryRest: {
        fontSize: 12,
        color: '#4B5563',
        marginTop: 2,
    },
    deliveryMeta: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
    deliveryAmountWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deliveryPrice: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#10B981',
        marginRight: 6,
    },
});
