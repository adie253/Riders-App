import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { getRiderEarnings, getDeliveryHistory } from '../../data/api';
import { ArrowLeft, Calendar, TrendingUp, ChevronDown, ChevronUp, Download, CheckCircle, Info, Landmark } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../context/ToastContext';
import { EarningsSkeleton } from '../components/SkeletonLoader';

interface EarningStats {
    totalEarnings: number;
    weeklyEarnings: number;
    monthlyEarnings: number;
    pendingPayout: number;
}

export const EarningsScreen = ({ navigation }: { navigation: any }) => {
    const [stats, setStats] = useState<EarningStats | null>(null);
    const [historyItems, setHistoryItems] = useState<any[]>([]);
    const [localWithdrawals, setLocalWithdrawals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();

    const scrollViewRef = useRef<ScrollView>(null);

    useFocusEffect(
        useCallback(() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });
            loadEarnings();
        }, [])
    );

    // Collapsible sections state
    const [isWithdrawExpanded, setIsWithdrawExpanded] = useState(false);
    const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(true);
 
    // Withdrawal flow state
    const [showWithdrawForm, setShowWithdrawForm] = useState(false);
    const [withdrawType, setWithdrawType] = useState<'full' | 'partial'>('full');
    const [withdrawAmount, setWithdrawAmount] = useState('500');

    // Breakdown view type
    const [viewType, setViewType] = useState<'daily' | 'weekly'>('daily');

    // Transaction list filtering state
    const [transactionType, setTransactionType] = useState<'credited' | 'deposited'>('credited');

    const availableWithdrawBalance = stats?.pendingPayout || 0;

    const loadEarnings = async () => {
        setLoading(true);
        try {
            const [earningsData, historyData] = await Promise.all([
                getRiderEarnings(),
                getDeliveryHistory(1, 100).catch(() => ({ items: [] }))
            ]);
            setStats(earningsData);
            if (historyData && historyData.items) {
                setHistoryItems(historyData.items);
            }
        } catch (e) {
            console.warn('Failed to load earnings:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEarnings();
    }, []);

    const handleConfirmWithdrawal = () => {
        const amount = withdrawType === 'full' ? availableWithdrawBalance : parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            showToast('Please enter a valid amount', 'error');
            return;
        }
        if (amount > availableWithdrawBalance) {
            showToast('Amount exceeds available balance', 'error');
            return;
        }

        showToast(`Withdrawal of ₹${amount} initiated successfully!`, 'success');
        
        const newTx = {
            id: `TXN-${Date.now()}`,
            ref: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
            date: new Date().toLocaleString([], {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(',', ' •'),
            amount: `₹${amount}`,
            status: 'Processing'
        };
        setLocalWithdrawals(prev => [newTx, ...prev]);

        // Deduct from local pending payout display
        setStats(prev => prev ? { ...prev, pendingPayout: Math.max(0, prev.pendingPayout - amount) } : null);

        setShowWithdrawForm(false);
        setIsWithdrawExpanded(false);
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top }}>
                <EarningsSkeleton />
            </View>
        );
    }

    const totalWeeklyEarnings = stats?.weeklyEarnings || 0;
    const weeklyProgressPercent = Math.min(100, Math.round((totalWeeklyEarnings / 5000) * 100));

    // Calculate today's deliveries count and earnings
    const todayDeliveries = historyItems.filter(item => {
        const date = new Date(item.completedAt);
        const now = new Date();
        return date.getDate() === now.getDate() &&
               date.getMonth() === now.getMonth() &&
               date.getFullYear() === now.getFullYear();
    });
    
    const todayDeliveriesCount = todayDeliveries.length;
    const todayEarnings = todayDeliveries.reduce((sum, item) => sum + (item.earnings || 0), 0);

    // Dynamic Daily Breakdown
    const dailyMap: { [key: string]: { count: number, earnings: number, dateObj: Date } } = {};
    historyItems.forEach(item => {
        const date = new Date(item.completedAt);
        let key = '';
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0 && now.getDate() === date.getDate()) {
            key = 'Today';
        } else if (diffDays === 1 || (diffDays === 0 && now.getDate() !== date.getDate())) {
            key = 'Yesterday';
        } else {
            key = date.toLocaleDateString([], { day: '2-digit', month: 'short' });
        }
        
        if (!dailyMap[key]) {
            dailyMap[key] = { count: 0, earnings: 0, dateObj: date };
        }
        dailyMap[key].count += 1;
        dailyMap[key].earnings += (item.earnings || 0);
    });
    
    const dailyBreakdown = Object.keys(dailyMap).map((key, index) => ({
        id: String(index),
        date: key,
        orders: `${dailyMap[key].count} ${dailyMap[key].count === 1 ? 'order' : 'orders'}`,
        amount: `₹${dailyMap[key].earnings}`,
        dateObj: dailyMap[key].dateObj
    })).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

    // Dynamic Weekly Breakdown
    const weeklyMap: { [key: string]: { count: number, earnings: number, order: number } } = {
        'This Week': { count: 0, earnings: 0, order: 0 },
        'Last Week': { count: 0, earnings: 0, order: 1 },
        '2 Weeks Ago': { count: 0, earnings: 0, order: 2 },
        'Older': { count: 0, earnings: 0, order: 3 },
    };
    
    historyItems.forEach(item => {
        const date = new Date(item.completedAt);
        const now = new Date();
        
        const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOfTwoWeeksAgo = new Date(startOfLastWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const t = date.getTime();
        if (t >= startOfThisWeek.getTime()) {
            weeklyMap['This Week'].count += 1;
            weeklyMap['This Week'].earnings += (item.earnings || 0);
        } else if (t >= startOfLastWeek.getTime()) {
            weeklyMap['Last Week'].count += 1;
            weeklyMap['Last Week'].earnings += (item.earnings || 0);
        } else if (t >= startOfTwoWeeksAgo.getTime()) {
            weeklyMap['2 Weeks Ago'].count += 1;
            weeklyMap['2 Weeks Ago'].earnings += (item.earnings || 0);
        } else {
            weeklyMap['Older'].count += 1;
            weeklyMap['Older'].earnings += (item.earnings || 0);
        }
    });
    
    const weeklyBreakdown = Object.keys(weeklyMap)
        .filter(key => weeklyMap[key].count > 0)
        .map((key) => ({
            id: key,
            date: key,
            orders: `${weeklyMap[key].count} ${weeklyMap[key].count === 1 ? 'order' : 'orders'}`,
            amount: `₹${weeklyMap[key].earnings}`,
            order: weeklyMap[key].order
        })).sort((a, b) => a.order - b.order);

    // Dynamic Credited Transactions
    const creditedTransactions = historyItems.map((item, index) => ({
        id: item.deliveryRequestId || String(index),
        type: 'order',
        ref: item.orderNumber || 'ORD-UNKNOWN',
        date: new Date(item.completedAt).toLocaleString([], {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).replace(',', ' •'),
        amount: `+₹${item.earnings || 0}`,
        isBonus: false
    }));

    // Dynamic Deposited Transactions (from local withdrawals list + any fallback)
    const depositedTransactions = localWithdrawals;

    return (
        <View style={styles.mainContainer}>
            <ScrollView
                ref={scrollViewRef}
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
                    <Text style={styles.balanceAmount}>₹{stats?.totalEarnings || 0}</Text>
                    <Text style={styles.balanceSubtext}>
                        {todayDeliveriesCount} {todayDeliveriesCount === 1 ? 'order' : 'orders'} today
                    </Text>
                </View>

                {/* Accordion 1: Withdraw Money */}
                <View style={styles.accordionCard}>
                    <TouchableOpacity
                        style={styles.accordionHeader}
                        onPress={() => setIsWithdrawExpanded(!isWithdrawExpanded)}
                    >
                        <View style={styles.accordionHeaderLeft}>
                            <View style={[styles.accordionIconCircle, { backgroundColor: '#ECFDF5' }]}>
                                <Download size={20} color="#10B981" />
                            </View>
                            <View>
                                <Text style={styles.accordionTitle}>Withdraw Money</Text>
                                <Text style={[styles.accordionSubtext, { color: '#059669', fontWeight: 'bold' }]}>
                                    Available: ₹{availableWithdrawBalance}
                                </Text>
                            </View>
                        </View>
                        {isWithdrawExpanded ? <ChevronUp size={20} color="#9CA3AF" /> : <ChevronDown size={20} color="#9CA3AF" />}
                    </TouchableOpacity>

                    {isWithdrawExpanded && (
                        <View style={styles.accordionContent}>
                            {!showWithdrawForm ? (
                                <View style={styles.withdrawSummaryRow}>
                                    <View>
                                        <Text style={styles.withdrawSummaryLabel}>Available to Withdraw</Text>
                                        <Text style={styles.withdrawSummaryAmount}>₹{availableWithdrawBalance}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.withdrawBtn}
                                        onPress={() => setShowWithdrawForm(true)}
                                    >
                                        <Download size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                                        <Text style={styles.withdrawBtnText}>Withdraw</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.withdrawFormPanel}>
                                    <Text style={styles.formTitle}>Withdraw Money</Text>

                                    {/* Tab Switcher: Full Amount vs Partial */}
                                    <View style={styles.formSegmentContainer}>
                                        <TouchableOpacity
                                            style={[styles.formSegmentButton, withdrawType === 'full' && styles.formSegmentActive]}
                                            onPress={() => setWithdrawType('full')}
                                        >
                                            <Text style={[styles.formSegmentText, withdrawType === 'full' && styles.formSegmentTextActive]}>
                                                Full Amount
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.formSegmentButton, withdrawType === 'partial' && styles.formSegmentActive]}
                                            onPress={() => setWithdrawType('partial')}
                                        >
                                            <Text style={[styles.formSegmentText, withdrawType === 'partial' && styles.formSegmentTextActive]}>
                                                Partial
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Amount display / Input */}
                                    {withdrawType === 'full' ? (
                                        <View style={styles.fullAmountDisplay}>
                                            <Text style={styles.fullAmountValue}>₹{availableWithdrawBalance}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.partialInputContainer}>
                                            <Text style={styles.inputLabel}>Enter Amount</Text>
                                            <View style={styles.inputWrapper}>
                                                <Text style={styles.inputPrefix}>₹ </Text>
                                                <TextInput
                                                    style={styles.amountTextInput}
                                                    keyboardType="numeric"
                                                    value={withdrawAmount}
                                                    onChangeText={setWithdrawAmount}
                                                />
                                            </View>
                                            <Text style={styles.inputHelperText}>Maximum: ₹{availableWithdrawBalance}</Text>
                                        </View>
                                    )}

                                    {/* Bank Account Info Card */}
                                    <View style={styles.bankInfoCard}>
                                        <Info size={16} color="#2563EB" style={{ marginRight: 10, marginTop: 2 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.bankTitleText}>Bank Account</Text>
                                            <Text style={styles.bankDescText}>
                                                Money will be deposited to <Text style={{ fontWeight: 'bold' }}>****1234 (HDFC Bank)</Text>
                                            </Text>
                                            <Text style={styles.bankTimeText}>Processing time: 2-4 business days</Text>
                                        </View>
                                    </View>

                                    {/* Action buttons */}
                                    <View style={styles.formActionRow}>
                                        <TouchableOpacity
                                            style={styles.cancelBtn}
                                            onPress={() => setShowWithdrawForm(false)}
                                        >
                                            <Text style={styles.cancelBtnText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.confirmBtn}
                                            onPress={handleConfirmWithdrawal}
                                        >
                                            <Text style={styles.confirmBtnText}>Confirm</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Accordion 2: Daily & Weekly Breakdown */}
                <View style={styles.accordionCard}>
                    <TouchableOpacity
                        style={styles.accordionHeader}
                        onPress={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
                    >
                        <View style={styles.accordionHeaderLeft}>
                            <View style={[styles.accordionIconCircle, { backgroundColor: '#EFF6FF' }]}>
                                <TrendingUp size={20} color="#2563EB" />
                            </View>
                            <View>
                                <Text style={styles.accordionTitle}>Daily & Weekly Breakdown</Text>
                                <Text style={styles.accordionSubtext}>View detailed earnings</Text>
                            </View>
                        </View>
                        {isBreakdownExpanded ? <ChevronUp size={20} color="#9CA3AF" /> : <ChevronDown size={20} color="#9CA3AF" />}
                    </TouchableOpacity>

                    {isBreakdownExpanded && (
                        <View style={styles.accordionContent}>
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
                                        <Text style={styles.gridValue}>₹{(todayDeliveriesCount > 0 ? todayEarnings / todayDeliveriesCount : 0).toFixed(2)}</Text>
                                    </View>
                                    <View style={styles.gridCard}>
                                        <Text style={styles.gridLabel}>Distance</Text>
                                        <Text style={styles.gridValue}>
                                            {todayDeliveries.reduce((sum, item) => sum + (item.distanceKm || 0), 0).toFixed(1)} <Text style={styles.gridUnit}>km</Text>
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
                        </View>
                    )}
                </View>

                {/* Section Toggle: Money Credited vs Money Deposited */}
                <View style={styles.switcherContainer}>
                    <TouchableOpacity
                        style={[styles.switcherBtn, transactionType === 'credited' && styles.switcherBtnActive]}
                        onPress={() => setTransactionType('credited')}
                    >
                        <Download size={16} color={transactionType === 'credited' ? '#1F2937' : '#9CA3AF'} style={{ marginRight: 6 }} />
                        <Text style={[styles.switcherText, transactionType === 'credited' && styles.switcherTextActive]}>
                            Money Credited
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.switcherBtn, transactionType === 'deposited' && styles.switcherBtnActive]}
                        onPress={() => setTransactionType('deposited')}
                    >
                        <Landmark size={16} color={transactionType === 'deposited' ? '#1F2937' : '#9CA3AF'} style={{ marginRight: 6 }} />
                        <Text style={[styles.switcherText, transactionType === 'deposited' && styles.switcherTextActive]}>
                            Money Deposited
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Dropdown Transaction Selector & Summary Header */}
                <View style={styles.transactionHeaderRow}>
                    <View style={styles.dropdownSelector}>
                        <Text style={styles.dropdownText}>All Transactions</Text>
                        <ChevronDown size={14} color="#6B7280" style={{ marginLeft: 6 }} />
                    </View>
                    {transactionType === 'credited' ? (
                        <View style={[styles.summaryBadge, { backgroundColor: '#ECFDF5' }]}>
                            <Text style={[styles.summaryBadgeText, { color: '#047857' }]}>
                                Total Credited: ₹{historyItems.reduce((sum, item) => sum + (item.earnings || 0), 0)} ({historyItems.length} {historyItems.length === 1 ? 'transaction' : 'transactions'})
                            </Text>
                        </View>
                    ) : (
                        <View style={[styles.summaryBadge, { backgroundColor: '#EFF6FF' }]}>
                            <Text style={[styles.summaryBadgeText, { color: '#1D4ED8' }]}>
                                Total Deposited: ₹{localWithdrawals.reduce((sum, tx) => sum + parseFloat(tx.amount.replace('₹', '')), 0)} ({localWithdrawals.length} {localWithdrawals.length === 1 ? 'transaction' : 'transactions'})
                            </Text>
                        </View>
                    )}
                </View>

                {/* Transactions list */}
                {transactionType === 'credited' ? (
                    <View>
                        {creditedTransactions.map(tx => (
                            <View key={tx.id} style={styles.transactionCard}>
                                <View style={styles.txIconCircle}>
                                    <Landmark size={18} color="#4B5563" />
                                </View>
                                <View style={styles.txDetails}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.txRef}>{tx.ref}</Text>
                                        {tx.isBonus && (
                                            <View style={styles.bonusBadge}>
                                                <Text style={styles.bonusBadgeText}>BONUS</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.txDate}>{tx.date}</Text>
                                </View>
                                <View style={styles.txAmountWrapper}>
                                    <Text style={[styles.txAmount, { color: '#10B981' }]}>{tx.amount}</Text>
                                    <Text style={styles.txStatusText}>Credited</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View>
                        {depositedTransactions.map(tx => (
                            <View key={tx.id} style={styles.transactionCard}>
                                <View style={[styles.txIconCircle, { backgroundColor: '#F3F4F6' }]}>
                                    <CheckCircle size={18} color="#10B981" />
                                </View>
                                <View style={styles.txDetails}>
                                    <Text style={styles.txRef}>{tx.ref}</Text>
                                    <Text style={styles.txDate}>{tx.date}</Text>
                                </View>
                                <View style={styles.txAmountWrapper}>
                                    <Text style={[styles.txAmount, { color: '#1F2937' }]}>{tx.amount}</Text>
                                    <View style={styles.statusCompletedBadge}>
                                        <Text style={styles.statusCompletedText}>{tx.status}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
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
    accordionCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        marginBottom: 16,
        overflow: 'hidden',
    },
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    accordionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    accordionIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    accordionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
    },
    accordionSubtext: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    accordionContent: {
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        padding: 16,
    },
    withdrawSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    withdrawSummaryLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '600',
    },
    withdrawSummaryAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#10B981',
        marginTop: 2,
    },
    withdrawBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3B82F6',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    withdrawBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    withdrawFormPanel: {
        width: '100%',
    },
    formTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    formSegmentContainer: {
        flexDirection: 'row',
        backgroundColor: '#EEF2F6',
        borderRadius: 12,
        padding: 3,
        marginBottom: 16,
    },
    formSegmentButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 9,
    },
    formSegmentActive: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    formSegmentText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    formSegmentTextActive: {
        color: '#1F2937',
    },
    fullAmountDisplay: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        marginBottom: 16,
    },
    fullAmountValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1D4ED8',
    },
    partialInputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '600',
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    inputPrefix: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    amountTextInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        padding: 0,
    },
    inputHelperText: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 4,
    },
    bankInfoCard: {
        flexDirection: 'row',
        backgroundColor: '#EFF6FF',
        borderColor: '#DBEAFE',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    bankTitleText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#1E40AF',
    },
    bankDescText: {
        fontSize: 12,
        color: '#1E40AF',
        marginTop: 2,
    },
    bankTimeText: {
        fontSize: 10,
        color: '#2563EB',
        marginTop: 4,
    },
    formActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cancelBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
        marginRight: 10,
    },
    cancelBtnText: {
        color: '#4B5563',
        fontWeight: 'bold',
        fontSize: 14,
    },
    confirmBtn: {
        flex: 1,
        backgroundColor: '#10B981',
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    confirmBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
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
        marginBottom: 20,
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
        marginBottom: 20,
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
    switcherContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        marginBottom: 16,
        marginTop: 10,
    },
    switcherBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        marginRight: 20,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    switcherBtnActive: {
        borderBottomColor: '#1F2937',
    },
    switcherText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    switcherTextActive: {
        color: '#1F2937',
    },
    transactionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    dropdownSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    dropdownText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
    },
    summaryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    summaryBadgeText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    transactionCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    txIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFEBE9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    txDetails: {
        flex: 1,
    },
    txRef: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    txDate: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
    txAmountWrapper: {
        alignItems: 'flex-end',
    },
    txAmount: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    txStatusText: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 2,
        fontWeight: '600',
    },
    bonusBadge: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 6,
    },
    bonusBadgeText: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold',
    },
    statusCompletedBadge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginTop: 2,
    },
    statusCompletedText: {
        color: '#059669',
        fontSize: 9,
        fontWeight: 'bold',
    },
});
