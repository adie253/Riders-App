import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, User, Phone, Mail, Award, Truck, ShieldCheck, ChevronRight, LogOut, Save } from 'lucide-react-native';

export const ProfileScreen = ({ navigation }: { navigation: any }) => {
    const { riderProfile, updateProfile, isUpdatingProfile, logout } = useAuth();
    const { showToast } = useToast();

    const [name, setName] = useState(riderProfile?.name || '');
    const [email, setEmail] = useState(riderProfile?.email || '');
    const [vehicleNumber, setVehicleNumber] = useState(riderProfile?.vehicleNumber || '');
    const [vehicleType, setVehicleType] = useState(riderProfile?.vehicleType || 'Motorcycle');

    const handleSave = async () => {
        if (!name.trim() || !email.trim() || !vehicleNumber.trim()) {
            showToast('Please fill all fields', 'warning');
            return;
        }
        const success = await updateProfile({ name, email, vehicleNumber });
        if (success) {
            showToast('Profile updated', 'success');
        }
    };

    const getKycStatusLabel = (status: string) => {
        switch (status) {
            case 'Approved': return 'Verified Rider';
            case 'Pending': return 'Verification Pending';
            case 'Rejected': return 'Verification Failed';
            default: return 'Verification Required';
        }
    };

    const getKycStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return '#10B981';
            case 'Pending': return '#F59E0B';
            case 'Rejected': return '#EF4444';
            default: return '#9CA3AF';
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Dashboard')}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rider Profile</Text>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isUpdatingProfile}>
                    {isUpdatingProfile ? (
                        <ActivityIndicator size="small" color="#FF4732" />
                    ) : (
                        <Save size={20} color="#FF4732" />
                    )}
                </TouchableOpacity>
            </View>

            {/* Rider Identity Header */}
            <View style={styles.profileHeaderCard}>
                <View style={styles.avatarCircle}>
                    <User size={40} color="#FF4732" />
                </View>
                <Text style={styles.riderName}>{riderProfile?.name || 'Hivago Rider'}</Text>
                <Text style={styles.riderPhone}>+91 {riderProfile?.phone || ''}</Text>

                {/* KYC Verification Badge */}
                <View style={[styles.kycBadge, { borderColor: getKycStatusColor(riderProfile?.kycStatus || 'None') }]}>
                    <View style={[styles.kycDot, { backgroundColor: getKycStatusColor(riderProfile?.kycStatus || 'None') }]} />
                    <Text style={[styles.kycText, { color: getKycStatusColor(riderProfile?.kycStatus || 'None') }]}>
                        {getKycStatusLabel(riderProfile?.kycStatus || 'None')}
                    </Text>
                </View>
            </View>

            {/* Personal Details Form */}
            <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Account Information</Text>

                <View style={styles.inputBlock}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <View style={styles.inputWrapper}>
                        <User size={18} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Full Name"
                        />
                    </View>
                </View>

                <View style={styles.inputBlock}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <View style={styles.inputWrapper}>
                        <Mail size={18} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Email Address"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </View>
            </View>

            {/* Vehicle Details Form */}
            <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Vehicle Information</Text>

                <View style={styles.vehicleTypeSelector}>
                    <Text style={styles.inputLabel}>Vehicle Type</Text>
                    <View style={styles.typesRow}>
                        {['Bicycle', 'Motorcycle', 'Scooter'].map((t) => (
                            <TouchableOpacity 
                                key={t}
                                style={[styles.typeBadge, vehicleType === t && styles.activeTypeBadge]}
                                onPress={() => setVehicleType(t)}
                            >
                                <Text style={[styles.typeBadgeText, vehicleType === t && styles.activeTypeBadgeText]}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.inputBlock}>
                    <Text style={styles.inputLabel}>Plate Number / ID</Text>
                    <View style={styles.inputWrapper}>
                        <Truck size={18} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={vehicleNumber}
                            onChangeText={setVehicleNumber}
                            placeholder="MH-12-AB-1234"
                            autoCapitalize="characters"
                        />
                    </View>
                </View>
            </View>

            {/* Operations Actions List */}
            <View style={styles.actionList}>
                <TouchableOpacity 
                    style={styles.actionItem} 
                    onPress={() => navigation.navigate('Kyc')}
                >
                    <View style={styles.actionLeft}>
                        <ShieldCheck size={20} color="#4B5563" />
                        <Text style={styles.actionText}>KYC Documents</Text>
                    </View>
                    <ChevronRight size={16} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.actionItem}
                    onPress={logout}
                >
                    <View style={styles.actionLeft}>
                        <LogOut size={20} color="#EF4444" />
                        <Text style={[styles.actionText, { color: '#EF4444' }]}>Sign Out</Text>
                    </View>
                    <ChevronRight size={16} color="#9CA3AF" />
                </TouchableOpacity>
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
    saveButton: {
        padding: 6,
        backgroundColor: 'white',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    profileHeaderCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFEBE9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    riderName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    riderPhone: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    kycBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        marginTop: 12,
    },
    kycDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    kycText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    formSection: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    inputBlock: {
        marginBottom: 14,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: '#1F2937',
        fontSize: 14,
        fontWeight: '500',
    },
    vehicleTypeSelector: {
        marginBottom: 14,
    },
    typesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    typeBadge: {
        flex: 1,
        height: 38,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 3,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    activeTypeBadge: {
        backgroundColor: '#FFEBE9',
        borderColor: '#FFC7C2',
    },
    typeBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
    },
    activeTypeBadgeText: {
        color: '#FF4732',
    },
    actionList: {
        backgroundColor: 'white',
        borderRadius: 20,
        paddingVertical: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    actionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    actionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginLeft: 12,
    },
});
