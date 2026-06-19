import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getRiderEarnings } from '../../data/api';
import { ArrowLeft, Calendar, TrendingUp, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBar } from '../components/BottomTabBar';

interface EarningStats {
    totalEarnings: number;
    weeklyEarnings: number;
    monthlyEarnings: number;
    pendingPayout: number;
}

export const EarningsScreen = ({ navigation }: { navigation: any }) => {
    const [stats, setStats] = useState<EarningStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewType, setViewType] = useState<'daily' | 'weekly'>('daily');
    const insets = useSafeAreaInsets();

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

    // Dynamic data based on API stats + realistic fallback
    const totalWeeklyEarnings = stats?.weeklyEarnings || 3240;
    const weeklyProgressPercent = Math.min(100, Math.round((totalWeeklyEarnings / 5000) * 1000) / 10);

    const dailyBreakdown = [
        { id: '1', date: 'Today', orders: '8 orders', amount: '₹450' },
        { id: '2', date: 'Yesterday', orders: '10 orders', amount: '₹520' },
        { id: '3', date: '27 Jan', orders: '7 orders', amount: '₹380' },
        { id: '4', date: '26 Jan', orders: '9 orders', amount: '₹490' },
    ];

    const weeklyBreakdown = [
        { id: '1', date: 'This Week', orders: '58 orders', amount: `₹${totalWeeklyEarnings}` },
        { id: '2', date: 'Last Week', orders: '87 orders', amount: '₹4890' },
        { id: '3', date: '2 Weeks Ago', orders: '81 orders', amount: '₹4520' },
    ];

    return (
        <View style={styles.mainContainer}>
            <ScrollView 
                style={styles.container} 
                contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Dashboard')}>
                        <ArrowLeft size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Earnings</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <View style={styles.cardHeader}>
                        <View style={styles.rupeeCircle}>
                            <Text style={styles.rupeeText}>₹</Text>
                        </View>
                        <Text style={styles.balanceLabel}>Total Earnings</Text>
                    </View>
                    <Text style={styles.balanceAmount}>
                        {viewType === 'daily' ? '₹450' : `₹${totalWeeklyEarnings}`}
                    </Text>
                    <Text style={styles.balanceSubtext}>
                        {viewType === 'daily' ? '8 orders today' : '58 orders this week'}
                    </Text>
                </View>

                {/* Daily / Weekly Toggle Switcher */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity 
                        style={[styles.toggleButton, viewType === 'daily' && styles.toggleButtonActive]} 
                        onPress={() => setViewType('daily')}
                    >
                        <Text style={[styles.toggleText, viewType === 'daily' && styles.toggleTextActive]}>Daily</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.toggleButton, viewType === 'weekly' && styles.toggleButtonActive]} 
                        onPress={() => setViewType('weekly')}
                    >
                        <Text style={[styles.toggleText, viewType === 'weekly' && styles.toggleTextActive]}>Weekly</Text>
                    </TouchableOpacity>
                </View>

                {/* Dynamic Content Grid/Target */}
                {viewType === 'daily' ? (
                    <View style={styles.gridRow}>
                        <View style={styles.gridCard}>
                            <Text style={styles.gridLabel}>Avg per Order</Text>
                            <Text style={styles.gridValue}>₹56.25</Text>
                        </View>
                        <View style={styles.gridCard}>
                            <Text style={styles.gridLabel}>Distance</Text>
                            <Text style={styles.gridValue}>
                                28.5 <Text style={styles.gridUnit}>km</Text>
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.targetCard}>
                        <View style={styles.targetHeader}>
                            <Text style={styles.targetLabel}>Weekly Target</Text>
                            <View style={styles.percentBadge}>
                                <Text style={styles.percentBadgeText}>{weeklyProgressPercent}%</Text>
                            </View>
                        </View>
                        <View style={styles.targetAmountRow}>
                            <Text style={styles.targetAmount}>₹{totalWeeklyEarnings}</Text>
                            <Text style={styles.targetLimit}>/ ₹5000</Text>
                        </View>
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: `${weeklyProgressPercent}%` }]} />
                        </View>
                    </View>
                )}

                {/* Breakdown List Section */}
                <Text style={styles.sectionTitle}>
                    {viewType === 'daily' ? 'Daily Breakdown' : 'Weekly Breakdown'}
                </Text>

                {(viewType === 'daily' ? dailyBreakdown : weeklyBreakdown).map((item) => (
                    <View key={item.id} style={styles.breakdownRow}>
                        <View style={styles.iconWrapper}>
                            {viewType === 'daily' ? (
                                <Calendar size={20} color="#6B7280" />
                            ) : (
                                <TrendingUp size={20} color="#6B7280" />
                            )}
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowTitle}>{item.date}</Text>
                            <Text style={styles.rowSubtitle}>{item.orders}</Text>
                        </View>
                        <View style={styles.rowAmountWrapper}>
                            <Text style={styles.rowAmount}>{item.amount}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <BottomTabBar navigation={navigation} activeTab="earnings" />
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 100, // Space for absolute bottom tab bar
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
        padding: 8,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    placeholder: {
        width: 42,
    },
    balanceCard: {
        backgroundColor: '#B91C1C',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#B91C1C',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    rupeeCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    rupeeText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    balanceLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.85)',
    },
    balanceAmount: {
        fontSize: 36,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 12,
    },
    balanceSubtext: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '500',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#EEF2F6',
        borderRadius: 16,
        padding: 4,
        marginBottom: 20,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    toggleButtonActive: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    toggleTextActive: {
        color: '#1F2937',
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    gridCard: {
        width: '48%',
        backgroundColor: 'white',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    gridLabel: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    gridValue: {
        color: '#111827',
        fontSize: 20,
        fontWeight: 'bold',
    },
    gridUnit: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '500',
    },
    targetCard: {
        backgroundColor: 'white',
        borderRadius: 18,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    targetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    targetLabel: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    percentBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    percentBadgeText: {
        color: '#1F2937',
        fontSize: 11,
        fontWeight: 'bold',
    },
    targetAmountRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 16,
    },
    targetAmount: {
        color: '#111827',
        fontSize: 24,
        fontWeight: 'bold',
    },
    targetLimit: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 4,
    },
    progressContainer: {
        height: 8,
        backgroundColor: '#EDE9FE',
        borderRadius: 4,
        width: '100%',
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#7C3AED',
        borderRadius: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    breakdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 18,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    rowContent: {
        flex: 1,
    },
    rowTitle: {
        color: '#1F2937',
        fontSize: 14,
        fontWeight: 'bold',
    },
    rowSubtitle: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 2,
    },
    rowAmountWrapper: {
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    rowAmount: {
        color: '#7C3AED',
        fontSize: 15,
        fontWeight: 'bold',
    },

});
