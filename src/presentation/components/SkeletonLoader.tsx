import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    style?: ViewStyle | ViewStyle[];
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 8,
    style
}) => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.85,
                    duration: 650,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 650,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width,
                    height,
                    borderRadius,
                    opacity,
                },
                style,
            ]}
        />
    );
};

// 1. Dashboard Skeleton (1-to-1 match with DashboardScreen layout)
export const DashboardSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Greeting */}
            <Skeleton width={160} height={26} borderRadius={6} style={{ marginBottom: 20 }} />

            {/* Main Status Card */}
            <View style={styles.card}>
                <View style={styles.row}>
                    <Skeleton width={80} height={80} borderRadius={40} />
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Skeleton width="50%" height={14} borderRadius={4} style={{ marginBottom: 8 }} />
                        <Skeleton width="80%" height={22} borderRadius={6} />
                    </View>
                </View>
                <Skeleton width="100%" height={54} borderRadius={16} style={{ marginTop: 24 }} />
            </View>

            {/* Performance Title */}
            <Skeleton width={180} height={20} borderRadius={6} style={{ marginVertical: 16 }} />

            {/* Performance Grid (2 Stat Boxes) */}
            <View style={styles.gridRow}>
                <View style={[styles.statBox, { marginRight: 8 }]}>
                    <Skeleton width={36} height={36} borderRadius={18} style={{ marginBottom: 12 }} />
                    <Skeleton width="60%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
                    <Skeleton width="80%" height={24} borderRadius={6} />
                </View>
                <View style={[styles.statBox, { marginLeft: 8 }]}>
                    <Skeleton width={36} height={36} borderRadius={18} style={{ marginBottom: 12 }} />
                    <Skeleton width="60%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
                    <Skeleton width="80%" height={24} borderRadius={6} />
                </View>
            </View>

            {/* Bonus Incentives Card */}
            <View style={styles.bonusCard}>
                <Skeleton width="40%" height={14} borderRadius={4} style={{ marginBottom: 10 }} />
                <Skeleton width="85%" height={18} borderRadius={6} style={{ marginBottom: 14 }} />
                <Skeleton width="100%" height={8} borderRadius={4} />
            </View>
        </View>
    );
};

// 2. Earnings Skeleton (1-to-1 match with EarningsScreen layout)
export const EarningsSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Balance Banner Card */}
            <View style={styles.card}>
                <Skeleton width="40%" height={14} borderRadius={4} style={{ marginBottom: 8 }} />
                <Skeleton width="65%" height={38} borderRadius={8} style={{ marginBottom: 16 }} />
                <Skeleton width="100%" height={48} borderRadius={14} />
            </View>

            {/* Goal Progress Card */}
            <View style={styles.card}>
                <Skeleton width="50%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />
                <Skeleton width="100%" height={8} borderRadius={4} style={{ marginBottom: 10 }} />
                <Skeleton width="30%" height={14} borderRadius={4} />
            </View>

            {/* Section Header */}
            <Skeleton width={160} height={20} borderRadius={6} style={{ marginVertical: 16 }} />

            {/* History Items */}
            {[1, 2, 3, 4].map((key) => (
                <View key={key} style={styles.listItem}>
                    <Skeleton width={40} height={40} borderRadius={20} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Skeleton width="65%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                        <Skeleton width="45%" height={12} borderRadius={4} />
                    </View>
                    <Skeleton width={60} height={22} borderRadius={6} />
                </View>
            ))}
        </View>
    );
};

// 3. History Skeleton (1-to-1 match with HistoryScreen card list)
export const HistorySkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {[1, 2, 3, 4].map((key) => (
                <View key={key} style={styles.historyCard}>
                    <View style={styles.rowBetween}>
                        <Skeleton width="55%" height={18} borderRadius={6} />
                        <Skeleton width={70} height={22} borderRadius={12} />
                    </View>
                    <Skeleton width="40%" height={13} borderRadius={4} style={{ marginVertical: 8 }} />
                    <View style={styles.divider} />
                    <View style={styles.rowBetween}>
                        <Skeleton width="30%" height={14} borderRadius={4} />
                        <Skeleton width={80} height={16} borderRadius={4} />
                    </View>
                </View>
            ))}
        </View>
    );
};

// 4. Profile Skeleton (1-to-1 match with ProfileScreen layout)
export const ProfileSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Header Avatar Circle */}
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
                <Skeleton width={80} height={80} borderRadius={40} style={{ marginBottom: 12 }} />
                <Skeleton width={140} height={22} borderRadius={6} style={{ marginBottom: 6 }} />
                <Skeleton width={100} height={14} borderRadius={4} style={{ marginBottom: 12 }} />
                <Skeleton width={120} height={26} borderRadius={13} />
            </View>

            {/* Form Input Skeletons */}
            {[1, 2, 3, 4].map((key) => (
                <View key={key} style={{ marginBottom: 16 }}>
                    <Skeleton width={100} height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                    <Skeleton width="100%" height={50} borderRadius={12} />
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    skeleton: {
        backgroundColor: '#E5E7EB',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    bonusCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    historyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 12,
    },
});
