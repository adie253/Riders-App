import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Home, TrendingUp, Gift, Clock, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
    const insets = useSafeAreaInsets();

    const activeRouteName = state.routes[state.index].name;

    const getActiveTabKey = (routeName: string) => {
        switch (routeName) {
            case 'Dashboard': return 'home';
            case 'Earnings': return 'earnings';
            case 'Offers': return 'offers';
            case 'History': return 'history';
            case 'Profile': return 'profile';
            default: return 'home';
        }
    };

    const activeTab = getActiveTabKey(activeRouteName);

    const handlePress = (tabName: string, screenName: string) => {
        const isFocused = activeTab === tabName;
        const targetRoute = state.routes.find(r => r.name === screenName);

        const event = navigation.emit({
            type: 'tabPress',
            target: targetRoute?.key,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
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
            <TouchableOpacity style={styles.tabItem} onPress={() => handlePress('offers', 'Offers')}>
                <Gift size={24} color={getTabColor('offers')} />
                <Text style={[styles.tabText, activeTab === 'offers' && styles.tabTextActive]}>Offers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => handlePress('history', 'History')}>
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
