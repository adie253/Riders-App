import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Globe } from 'lucide-react-native';
import { useLanguage, LanguageType } from '../context/LanguageContext';
import { localStorage } from '../../utils/storage';

export const LanguageSelectionModal = () => {
    const { language, setLanguage, t } = useLanguage();
    const [visible, setVisible] = useState(false);
    const [selected, setSelected] = useState<LanguageType>('English');

    useEffect(() => {
        // Show modal if the language key hasn't been set in localStorage
        const storedLang = localStorage.getItem('rider_language');
        if (!storedLang) {
            setVisible(true);
        } else {
            setVisible(false);
        }
    }, [language]);

    const handleContinue = () => {
        setLanguage(selected);
        setVisible(false);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
        >
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    <View style={styles.headerIconWrapper}>
                        <Globe size={24} color="white" />
                    </View>
                    <Text style={styles.titleText}>{t('chooseLanguage')}</Text>
                    <Text style={styles.subtitleText}>{t('selectPreferredLanguage')}</Text>

                    <View style={styles.langListContainer}>
                        {[
                            { name: 'English', sub: 'English' },
                            { name: 'Hindi', sub: 'हिंदी' }
                        ].map((lang) => (
                            <TouchableOpacity 
                                key={lang.name} 
                                style={[
                                    styles.langItem, 
                                    selected === lang.name && styles.activeLangItem
                                ]}
                                onPress={() => setSelected(lang.name as LanguageType)}
                            >
                                <View style={styles.langLeft}>
                                    <View style={[
                                        styles.langIndicator,
                                        selected === lang.name && styles.activeLangIndicator
                                    ]}>
                                        {selected === lang.name && (
                                            <View style={styles.langIndicatorDot} />
                                        )}
                                    </View>
                                    <Text style={[
                                        styles.langNameText,
                                        selected === lang.name && styles.activeLangNameText
                                    ]}>
                                        {lang.name}
                                    </Text>
                                </View>
                                <Text style={styles.langSubText}>{lang.sub}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoBoxText}>
                            {t('languageInfo')}
                        </Text>
                    </View>

                    <TouchableOpacity 
                        style={styles.primaryButton}
                        onPress={handleContinue}
                    >
                        <Text style={styles.primaryButtonText}>{t('continue')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 35,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    headerIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#A30D11',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    titleText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 6,
    },
    subtitleText: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 20,
    },
    langListContainer: {
        marginBottom: 14,
    },
    langItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 48,
        paddingHorizontal: 14,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1.2,
        borderColor: '#E5E7EB',
    },
    activeLangItem: {
        backgroundColor: '#ECFDF5',
        borderColor: '#10B981',
    },
    langLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    langIndicator: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeLangIndicator: {
        borderColor: '#10B981',
        backgroundColor: '#10B981',
    },
    langIndicatorDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'white',
    },
    langNameText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
    },
    activeLangNameText: {
        color: '#111827',
        fontWeight: '700',
    },
    langSubText: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    infoBox: {
        backgroundColor: '#EEF2FF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E0E7FF',
    },
    infoBoxText: {
        fontSize: 11,
        color: '#4F46E5',
        textAlign: 'center',
        lineHeight: 16,
        fontWeight: '500',
    },
    primaryButton: {
        backgroundColor: '#A30D11',
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#A30D11',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
});
