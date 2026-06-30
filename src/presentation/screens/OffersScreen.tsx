import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Gift, Clock, TrendingUp, ChevronRight, Calendar, Zap, Star } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

type Segment = 'active' | 'upcoming' | 'completed';

export const OffersScreen = ({ navigation }: { navigation: any }) => {
    const [activeSegment, setActiveSegment] = useState<Segment>('active');
    const insets = useSafeAreaInsets();
    
    const scrollViewRef = useRef<ScrollView>(null);

    useFocusEffect(
        useCallback(() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        }, [])
    );

    const renderActiveOffers = () => (
        <View style={styles.tabContentContainer}>
            {/* Potential Earnings Card */}
            <View style={styles.potentialCard}>
                <View style={styles.potentialIconWrapper}>
                    <TrendingUp size={20} color="#7C3AED" />
                </View>
                <View style={styles.potentialTextWrapper}>
                    <Text style={styles.potentialLabel}>Potential Earnings</Text>
                    <Text style={styles.potentialAmountText}>
                        Complete all active offers to earn up to <Text style={styles.boldText}>₹1,450</Text>
                    </Text>
                </View>
            </View>

            {/* Peak Hour Bonus Card */}
            <View style={styles.offerCard}>
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIconCircle, { backgroundColor: '#FFFBEB' }]}>
                        <Clock size={20} color="#D97706" />
                    </View>
                    <View style={styles.cardTitleWrapper}>
                        <Text style={styles.cardTitle}>Peak Hour Bonus</Text>
                        <Text style={styles.cardDescription}>
                            Complete deliveries during lunch (12-2pm) and dinner (7-10pm) hours
                        </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
                        <Text style={[styles.badgeText, { color: '#2563EB' }]}>Active</Text>
                    </View>
                </View>
                <View style={[styles.rewardBanner, { backgroundColor: '#FFFBEB' }]}>
                    <Text style={[styles.rewardText, { color: '#B45309' }]}>%  ₹50 extra per order</Text>
                </View>
                <View style={styles.cardFooter}>
                    <Calendar size={14} color="#9CA3AF" />
                    <Text style={styles.footerStatusText}>Today</Text>
                </View>
                <TouchableOpacity style={styles.viewDetailsButton}>
                    <Text style={styles.viewDetailsText}>View Details</Text>
                    <ChevronRight size={14} color="#6D28D9" />
                </TouchableOpacity>
            </View>

            {/* Weekend Warrior Card */}
            <View style={styles.offerCard}>
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIconCircle, { backgroundColor: '#F5F3FF' }]}>
                        <Gift size={20} color="#7C3AED" />
                    </View>
                    <View style={styles.cardTitleWrapper}>
                        <Text style={styles.cardTitle}>Weekend Warrior</Text>
                        <Text style={styles.cardDescription}>
                            Complete 20 orders this weekend (Sat-Sun)
                        </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
                        <Text style={[styles.badgeText, { color: '#2563EB' }]}>Active</Text>
                    </View>
                </View>
                <View style={[styles.rewardBanner, { backgroundColor: '#F5F3FF' }]}>
                    <Text style={[styles.rewardText, { color: '#6D28D9' }]}>%  ₹500 bonus</Text>
                </View>
                <View style={styles.progressSection}>
                    <View style={styles.progressLabelRow}>
                        <Text style={styles.progressLabel}>Progress</Text>
                        <Text style={styles.progressValue}>12 / 20 orders</Text>
                    </View>
                    <View style={[styles.progressBarContainer, { backgroundColor: '#EDE9FE' }]}>
                        <View style={[styles.progressBar, { width: '60%', backgroundColor: '#7C3AED' }]} />
                    </View>
                </View>
                <View style={styles.cardFooter}>
                    <Clock size={14} color="#9CA3AF" />
                    <Text style={styles.footerStatusText}>Ends Sunday 11:59 PM</Text>
                </View>
                <TouchableOpacity style={styles.viewDetailsButton}>
                    <Text style={styles.viewDetailsText}>View Details</Text>
                    <ChevronRight size={14} color="#6D28D9" />
                </TouchableOpacity>
            </View>

            {/* Streak Bonus Card */}
            <View style={styles.offerCard}>
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIconCircle, { backgroundColor: '#EFF6FF' }]}>
                        <Zap size={20} color="#2563EB" />
                    </View>
                    <View style={styles.cardTitleWrapper}>
                        <Text style={styles.cardTitle}>Streak Bonus</Text>
                        <Text style={styles.cardDescription}>
                            Work 5 consecutive days this week
                        </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
                        <Text style={[styles.badgeText, { color: '#2563EB' }]}>Active</Text>
                    </View>
                </View>
                <View style={[styles.rewardBanner, { backgroundColor: '#EFF6FF' }]}>
                    <Text style={[styles.rewardText, { color: '#1D4ED8' }]}>%  ₹300 bonus</Text>
                </View>
                <View style={styles.progressSection}>
                    <View style={styles.progressLabelRow}>
                        <Text style={styles.progressLabel}>Progress</Text>
                        <Text style={styles.progressValue}>3 / 5 days</Text>
                    </View>
                    <View style={[styles.progressBarContainer, { backgroundColor: '#DBEAFE' }]}>
                        <View style={[styles.progressBar, { width: '60%', backgroundColor: '#2563EB' }]} />
                    </View>
                </View>
                <View style={styles.cardFooter}>
                    <Clock size={14} color="#9CA3AF" />
                    <Text style={styles.footerStatusText}>Ends in 3 days</Text>
                </View>
                <TouchableOpacity style={styles.viewDetailsButton}>
                    <Text style={styles.viewDetailsText}>View Details</Text>
                    <ChevronRight size={14} color="#6D28D9" />
                </TouchableOpacity>
            </View>

            {/* High Rating Reward Card */}
            <View style={styles.offerCard}>
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIconCircle, { backgroundColor: '#ECFDF5' }]}>
                        <Star size={20} color="#059669" />
                    </View>
                    <View style={styles.cardTitleWrapper}>
                        <Text style={styles.cardTitle}>High Rating Reward</Text>
                        <Text style={styles.cardDescription}>
                            Maintain 4.5+ rating for the week
                        </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
                        <Text style={[styles.badgeText, { color: '#2563EB' }]}>Active</Text>
                    </View>
                </View>
                <View style={[styles.rewardBanner, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={[styles.rewardText, { color: '#047857' }]}>%  ₹200 bonus</Text>
                </View>
                <View style={styles.progressSection}>
                    <View style={styles.progressLabelRow}>
                        <Text style={styles.progressLabel}>Progress</Text>
                        <Text style={styles.progressValue}>4.7 / 4.5 rating</Text>
                    </View>
                    <View style={[styles.progressBarContainer, { backgroundColor: '#D1FAE5' }]}>
                        <View style={[styles.progressBar, { width: '100%', backgroundColor: '#059669' }]} />
                    </View>
                </View>
                <View style={styles.cardFooter}>
                    <Clock size={14} color="#9CA3AF" />
                    <Text style={styles.footerStatusText}>Ends Sunday</Text>
                </View>
                <TouchableOpacity style={styles.viewDetailsButton}>
                    <Text style={styles.viewDetailsText}>View Details</Text>
                    <ChevronRight size={14} color="#6D28D9" />
                </TouchableOpacity>
            </View>

            {/* How It Works Section */}
            <View style={styles.howItWorksBox}>
                <Text style={styles.howTitle}>How it works:</Text>
                <Text style={styles.howBullet}>• Complete the required tasks to unlock rewards</Text>
                <Text style={styles.howBullet}>• Bonuses are added to your earnings automatically</Text>
                <Text style={styles.howBullet}>• Track your progress in real-time</Text>
                <Text style={styles.howBullet}>• New offers are added regularly</Text>
            </View>
        </View>
    );

    const renderUpcomingOffers = () => (
        <View style={styles.tabContentContainer}>
            {/* New Year Special Card */}
            <View style={styles.offerCard}>
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIconCircle, { backgroundColor: '#FFFBEB' }]}>
                        <Gift size={20} color="#D97706" />
                    </View>
                    <View style={styles.cardTitleWrapper}>
                        <Text style={styles.cardTitle}>New Year Special</Text>
                        <Text style={styles.cardDescription}>
                            Complete 50 orders this month
                        </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.badgeText, { color: '#D97706' }]}>Upcoming</Text>
                    </View>
                </View>
                <View style={[styles.rewardBanner, { backgroundColor: '#FFFBEB' }]}>
                    <Text style={[styles.rewardText, { color: '#B45309' }]}>%  ₹1000 bonus</Text>
                </View>
                <View style={styles.cardFooter}>
                    <Calendar size={14} color="#9CA3AF" />
                    <Text style={styles.footerStatusText}>Starts Feb 1</Text>
                </View>
            </View>

            {/* Night Owl Bonus Card */}
            <View style={styles.offerCard}>
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIconCircle, { backgroundColor: '#EFF6FF' }]}>
                        <Clock size={20} color="#2563EB" />
                    </View>
                    <View style={styles.cardTitleWrapper}>
                        <Text style={styles.cardTitle}>Night Owl Bonus</Text>
                        <Text style={styles.cardDescription}>
                            Complete 10 orders after 9 PM
                        </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
                        <Text style={[styles.badgeText, { color: '#2563EB' }]}>Upcoming</Text>
                    </View>
                </View>
                <View style={[styles.rewardBanner, { backgroundColor: '#EFF6FF' }]}>
                    <Text style={[styles.rewardText, { color: '#1D4ED8' }]}>%  ₹400 bonus</Text>
                </View>
                <View style={styles.cardFooter}>
                    <Calendar size={14} color="#9CA3AF" />
                    <Text style={styles.footerStatusText}>Starts Tomorrow</Text>
                </View>
            </View>
        </View>
    );

    const renderCompletedOffers = () => (
        <View style={styles.tabContentContainer}>
            {/* January Champion Card */}
            <View style={styles.offerCard}>
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIconCircle, { backgroundColor: '#F3F4F6' }]}>
                        <Award size={20} color="#4B5563" />
                    </View>
                    <View style={styles.cardTitleWrapper}>
                        <Text style={styles.cardTitle}>January Champion</Text>
                        <Text style={styles.cardDescription}>
                            Completed 100 orders in January
                        </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#E5E7EB' }]}>
                        <Text style={[styles.badgeText, { color: '#4B5563' }]}>Completed</Text>
                    </View>
                </View>
                <View style={[styles.rewardBanner, { backgroundColor: '#F3F4F6' }]}>
                    <Text style={[styles.rewardText, { color: '#374151' }]}>%  ₹200 earned</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.mainContainer}>
            {/* Orange-Red Header with Tab Navigation */}
            <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 16) }]}>
                <View style={styles.headerInfoRow}>
                    <View style={styles.headerIconCircle}>
                        <Gift size={24} color="#D32815" />
                    </View>
                    <View style={styles.headerTextWrapper}>
                        <Text style={styles.headerTitle}>Offers & Rewards</Text>
                        <Text style={styles.headerSubtitle}>Unlock bonuses and incentives</Text>
                    </View>
                </View>

                {/* Segmented Tab Switcher */}
                <View style={styles.segmentContainer}>
                    <TouchableOpacity
                        style={[styles.segmentButton, activeSegment === 'active' && styles.segmentButtonActive]}
                        onPress={() => setActiveSegment('active')}
                    >
                        <Text style={[styles.segmentText, activeSegment === 'active' && styles.segmentTextActive]}>
                            Active
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentButton, activeSegment === 'upcoming' && styles.segmentButtonActive]}
                        onPress={() => setActiveSegment('upcoming')}
                    >
                        <Text style={[styles.segmentText, activeSegment === 'upcoming' && styles.segmentTextActive]}>
                            Upcoming
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentButton, activeSegment === 'completed' && styles.segmentButtonActive]}
                        onPress={() => setActiveSegment('completed')}
                    >
                        <Text style={[styles.segmentText, activeSegment === 'completed' && styles.segmentTextActive]}>
                            Completed
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Scrollable Contents */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollStyle}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {activeSegment === 'active' && renderActiveOffers()}
                {activeSegment === 'upcoming' && renderUpcomingOffers()}
                {activeSegment === 'completed' && renderCompletedOffers()}
            </ScrollView>
        </View>
    );
};

// Lucide replacement check: just define simple SVG style or local wrapper if Award or info doesn't resolve
const Award = ({ size, color }: { size: number; color: string }) => {
    return <Star size={size} color={color} />; // Fallback wrapper just in case Award doesn't compile
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    headerContainer: {
        backgroundColor: '#D32815',
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    headerInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    headerIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    headerTextWrapper: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
        borderRadius: 12,
        padding: 4,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    segmentButtonActive: {
        backgroundColor: '#FFFFFF',
    },
    segmentText: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.8)',
    },
    segmentTextActive: {
        color: '#D32815',
    },
    scrollStyle: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 100, // Safe offset for the bottom navigation bar
    },
    tabContentContainer: {
        width: '100%',
    },
    potentialCard: {
        flexDirection: 'row',
        backgroundColor: '#F5F3FF',
        borderRadius: 18,
        padding: 16,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#EDE9FE',
    },
    potentialIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EDE9FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    potentialTextWrapper: {
        flex: 1,
    },
    potentialLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#7C3AED',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    potentialAmountText: {
        fontSize: 14,
        color: '#6D28D9',
        fontWeight: '500',
        marginTop: 2,
        lineHeight: 18,
    },
    boldText: {
        fontWeight: 'bold',
    },
    offerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    cardIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardTitleWrapper: {
        flex: 1,
        paddingRight: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    cardDescription: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
        lineHeight: 16,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    rewardBanner: {
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 14,
    },
    rewardText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    progressSection: {
        marginBottom: 14,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    progressLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '600',
    },
    progressValue: {
        fontSize: 12,
        color: '#1F2937',
        fontWeight: '700',
    },
    progressBarContainer: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 12,
    },
    footerStatusText: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '600',
        marginLeft: 6,
    },
    viewDetailsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        backgroundColor: '#F9FAFB',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    viewDetailsText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6D28D9',
    },
    howItWorksBox: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        marginTop: 8,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    howTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 10,
    },
    howBullet: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 6,
        lineHeight: 16,
    },
});
