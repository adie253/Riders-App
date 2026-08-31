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

export const DashboardSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Header Skeleton */}
            <View style={styles.headerRow}>
                <Skeleton width={120} height={28} borderRadius={6} />
                <Skeleton width={40} height={40} borderRadius={20} />
            </View>

            {/* Main Status Card Skeleton */}
            <View style={styles.card}>
                <View style={styles.row}>
                    <Skeleton width={80} height={80} borderRadius={40} />
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Skeleton width="60%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                        <Skeleton width="90%" height={24} borderRadius={6} />
                    </View>
                </View>
                <Skeleton width="100%" height={54} borderRadius={16} style={{ marginTop: 16 }} />
            </View>

            {/* Performance Stats Grid Skeleton */}
            <View style={styles.gridRow}>
                <View style={[styles.statBox, { marginRight: 10 }]}>
                    <Skeleton width={40} height={40} borderRadius={20} style={{ marginBottom: 12 }} />
                    <Skeleton width="50%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                    <Skeleton width="75%" height={22} borderRadius={6} />
                </View>
                <View style={[styles.statBox, { marginLeft: 10 }]}>
                    <Skeleton width={40} height={40} borderRadius={20} style={{ marginBottom: 12 }} />
                    <Skeleton width="50%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                    <Skeleton width="75%" height={22} borderRadius={6} />
                </View>
            </View>

            {/* Bonus Banner Skeleton */}
            <View style={styles.card}>
                <Skeleton width="40%" height={16} borderRadius={4} style={{ marginBottom: 10 }} />
                <Skeleton width="80%" height={20} borderRadius={6} style={{ marginBottom: 16 }} />
                <Skeleton width="100%" height={8} borderRadius={4} />
            </View>
        </View>
    );
};

export const EarningsSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Header Title */}
            <Skeleton width={140} height={28} borderRadius={6} style={{ marginBottom: 20 }} />

            {/* Total Balance Card Skeleton */}
            <View style={styles.card}>
                <Skeleton width="35%" height={14} borderRadius={4} style={{ marginBottom: 10 }} />
                <Skeleton width="60%" height={36} borderRadius={8} style={{ marginBottom: 16 }} />
                <Skeleton width="100%" height={44} borderRadius={12} />
            </View>

            {/* Weekly Goal Progress Skeleton */}
            <View style={styles.card}>
                <Skeleton width="50%" height={18} borderRadius={6} style={{ marginBottom: 12 }} />
                <Skeleton width="100%" height={10} borderRadius={5} style={{ marginBottom: 10 }} />
                <Skeleton width="30%" height={14} borderRadius={4} />
            </View>

            {/* History List Skeletons */}
            <Skeleton width="45%" height={20} borderRadius={6} style={{ marginVertical: 16 }} />
            {[1, 2, 3].map((item) => (
                <View key={item} style={styles.listItem}>
                    <Skeleton width={42} height={42} borderRadius={21} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Skeleton width="60%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                        <Skeleton width="40%" height={12} borderRadius={4} />
                    </View>
                    <Skeleton width={60} height={20} borderRadius={6} />
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    skeleton: {
        backgroundColor: '#E5E7EB',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    row: {
        flexDirection: 'row',
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
});
