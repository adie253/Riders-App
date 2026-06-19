import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Home, TrendingUp, Gift, Clock, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomTabBarProps {
    navigation: any;
    activeTab: 'home' | 'earnings' | 'offers' | 'history' | 'profile';
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ navigation, activeTab }) => {
    const insets = useSafeAreaInsets();

    const handlePress = (tabName: string, screenName?: string) => {
        if (activeTab === tabName) return;
        if (screenName) {
            navigation.navigate(screenName);
        }
    };

    const getTabColor = (tabName: string) => {
        return activeTab === tabName ? '#c12514ff' : '#6B7280';
    };

    return (
        <View style={[styles.bottomTabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <TouchableOpacity style={styles.tabItem} onPress={() => handlePress('home', 'Dashboard')}>
                <Home size={24} color={getTabColor('home')} />
                <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => handlePress('earnings', 'Earnings')}>
                <TrendingUp size={24} color={getTabColor('earnings')} />
                <Text style={[styles.tabText, activeTab === 'earnings' && styles.tabTextActive]}>Earnings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => handlePress('offers')}>
                <Gift size={24} color={getTabColor('offers')} />
                <Text style={[styles.tabText, activeTab === 'offers' && styles.tabTextActive]}>Offers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => handlePress('history')}>
                <Clock size={24} color={getTabColor('history')} />
                <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => handlePress('profile', 'Profile')}>
                <User size={24} color={getTabColor('profile')} />
                <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profile</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    bottomTabBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 8,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        flex: 1,
    },
    tabText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 4,
    },
    tabTextActive: {
        color: '#d32815ff',
    },
});
