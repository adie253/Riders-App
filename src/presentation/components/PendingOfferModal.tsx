import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, ActivityIndicator, Dimensions, Vibration } from 'react-native';
import { useDelivery } from '../context/DeliveryContext';
import { useNavigation } from '@react-navigation/native';
import { MapPin, X, AlertTriangle } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { useLanguage } from '../context/LanguageContext';

export const PendingOfferModal = () => {
    const { 
        pendingOffer, 
        offerCountdown, 
        acceptActiveOffer, 
        rejectActiveOffer, 
        isProcessingOffer 
    } = useDelivery();
    const navigation = useNavigation<any>();
    const { t } = useLanguage();

    const progressAnim = useRef(new Animated.Value(1)).current;
    const soundRef = useRef<Audio.Sound | null>(null);
    const audioCtxRef = useRef<any>(null);
    const intervalIdRef = useRef<any>(null);

    // Continuous Ringtone Playback & Native Vibration (Swiggy / Zomato Style)
    useEffect(() => {
        let isMounted = true;

        const startRingtone = async () => {
            // Trigger native Swiggy/Zomato rapid vibration pattern
            try {
                Vibration.vibrate([0, 500, 200, 500, 200, 800, 300], true);
            } catch (vibErr) {
                console.warn('Vibration failed:', vibErr);
            }

            try {
                // Request/set audio category for Expo AV with full mobile support
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    staysActiveInBackground: true,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: false,
                    playThroughEarpieceAndroid: false
                }).catch(() => {});

                // Swiggy / Zomato high-priority ringtone audio sources
                const audioUrls = [
                    'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
                    'https://assets.mixkit.co/active_storage/sfx/2013/2013-84.wav',
                    'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm.ogg'
                ];

                let loadedSound: Audio.Sound | null = null;

                for (const url of audioUrls) {
                    if (!isMounted) break;
                    try {
                        const { sound } = await Audio.Sound.createAsync(
                            { uri: url },
                            { shouldPlay: false, isLooping: true, volume: 1.0 }
                        );
                        await sound.setVolumeAsync(1.0).catch(() => {});
                        await sound.setIsLoopingAsync(true).catch(() => {});
                        await sound.playAsync().catch(() => {});
                        loadedSound = sound;
                        break;
                    } catch (urlErr) {
                        console.warn(`Audio playback failed for ${url}:`, urlErr);
                    }
                }

                // Local asset fallback if network audio failed
                if (!loadedSound) {
                    try {
                        const ringtoneAsset = require('../../../assets/sounds/phone_ringtone.wav');
                        const { sound } = await Audio.Sound.createAsync(
                            ringtoneAsset,
                            { shouldPlay: false, isLooping: true, volume: 1.0 }
                        );
                        await sound.setVolumeAsync(1.0).catch(() => {});
                        await sound.setIsLoopingAsync(true).catch(() => {});
                        await sound.playAsync().catch(() => {});
                        loadedSound = sound;
                    } catch (localErr) {
                        console.warn('Local ringtone asset fallback failed:', localErr);
                    }
                }

                if (isMounted && loadedSound) {
                    soundRef.current = loadedSound;
                } else if (loadedSound) {
                    await loadedSound.unloadAsync().catch(() => {});
                }
            } catch (err) {
                console.warn('Expo Audio playback failed, using Swiggy/Zomato Web Audio synthesizer:', err);
                
                // Swiggy / Zomato Dual-Beep Loud Chime Synthesizer
                if (isMounted && typeof window !== 'undefined') {
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    if (AudioContextClass) {
                        try {
                            const ctx = new AudioContextClass();
                            audioCtxRef.current = ctx;

                            const playSwiggyZomatoRing = () => {
                                if (!ctx || ctx.state === 'suspended') return;
                                const now = ctx.currentTime;
                                
                                // High chime 1 (A5)
                                const osc1 = ctx.createOscillator();
                                const gain1 = ctx.createGain();
                                osc1.type = 'sine';
                                osc1.frequency.setValueAtTime(880, now);
                                gain1.gain.setValueAtTime(0, now);
                                gain1.gain.linearRampToValueAtTime(0.35, now + 0.04);
                                gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                                osc1.connect(gain1);
                                gain1.connect(ctx.destination);
                                osc1.start(now);
                                osc1.stop(now + 0.35);

                                // High chime 2 (D6 - Zomato signature tone)
                                const osc2 = ctx.createOscillator();
                                const gain2 = ctx.createGain();
                                osc2.type = 'sine';
                                osc2.frequency.setValueAtTime(1174.66, now + 0.12);
                                gain2.gain.setValueAtTime(0, now + 0.12);
                                gain2.gain.linearRampToValueAtTime(0.4, now + 0.16);
                                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                                osc2.connect(gain2);
                                gain2.connect(ctx.destination);
                                osc2.start(now + 0.12);
                                osc2.stop(now + 0.55);
                            };

                            playSwiggyZomatoRing();
                            intervalIdRef.current = setInterval(playSwiggyZomatoRing, 650);
                        } catch (webAudioErr) {
                            console.warn('Web Audio fallback failed:', webAudioErr);
                        }
                    }
                }
            }
        };

        if (pendingOffer) {
            startRingtone();
        }

        return () => {
            isMounted = false;
            // Stop native vibration
            try {
                Vibration.cancel();
            } catch (vibErr) {
                console.warn('Vibration cancel failed:', vibErr);
            }

            // Stop and unload Expo AV sound
            if (soundRef.current) {
                const snd = soundRef.current;
                soundRef.current = null;
                snd.stopAsync()
                    .then(() => snd.unloadAsync())
                    .catch(() => {});
            }
            // Stop Web Audio interval and close context
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
                intervalIdRef.current = null;
            }
            if (audioCtxRef.current) {
                audioCtxRef.current.close().catch(() => {});
                audioCtxRef.current = null;
            }
        };
    }, [pendingOffer]);

    // Animate progress bar smoothly when countdown updates
    useEffect(() => {
        if (pendingOffer) {
            Animated.timing(progressAnim, {
                toValue: offerCountdown / (pendingOffer.expiresInSeconds || 30),
                duration: 1000,
                useNativeDriver: false, // width/flex layout animations don't support native driver
            }).start();
        } else {
            progressAnim.setValue(1);
        }
    }, [offerCountdown, pendingOffer]);

    if (!pendingOffer) return null;

    const handleAccept = async () => {
        const success = await acceptActiveOffer();
        if (success) {
            navigation.navigate('ActiveDelivery');
        }
    };

    const widthPercent = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    return (
        <Modal
            visible={!!pendingOffer}
            transparent={true}
            animationType="slide"
        >
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    {/* Header */}
                    <View style={styles.headerRow}>
                        <Text style={styles.modalTitle}>{t('newOrderRequest')}</Text>
                        <TouchableOpacity 
                            style={styles.closeButton} 
                            onPress={() => rejectActiveOffer()}
                            disabled={isProcessingOffer}
                        >
                            <X size={20} color="#1F2937" />
                        </TouchableOpacity>
                    </View>

                    {/* Respond timer */}
                    <View style={styles.timerContainer}>
                        <View style={styles.timerHeader}>
                            <AlertTriangle size={14} color="#EF4444" style={styles.timerIcon} />
                            <Text style={styles.timerText}>{t('respondWithin', { time: offerCountdown })}</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <Animated.View style={[styles.progressBarFill, { width: widthPercent }]} />
                        </View>
                    </View>

                    {/* Details Card */}
                    <View style={styles.detailsCard}>
                        <Text style={styles.restaurantName}>{pendingOffer.restaurantName}</Text>
                        <Text style={styles.orderNumber}>Order #{pendingOffer.orderNumber}</Text>
                        
                        <View style={styles.routeContainer}>
                            <View style={styles.routeRow}>
                                <MapPin size={16} color="#FF4732" style={styles.pinIcon} />
                                <Text style={styles.routeText}>
                                    {t('pickup')}: <Text style={styles.routeTextBold}>{pendingOffer.distanceToPickupKm} km away</Text>
                                </Text>
                            </View>
                            <View style={styles.routeRow}>
                                <MapPin size={16} color="#10B981" style={styles.pinIcon} />
                                <Text style={styles.routeText}>
                                    {t('drop')}: <Text style={styles.routeTextBold}>{pendingOffer.distanceToDropKm} km total</Text>
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Total Distance Box */}
                    <View style={styles.distanceBlock}>
                        <Text style={styles.distanceLabel}>{t('totalDistance')}</Text>
                        <Text style={styles.distanceValue}>{pendingOffer.totalDistanceKm} km</Text>
                    </View>

                    {/* Earnings Banner */}
                    <View style={styles.earningsBanner}>
                        <View>
                            <Text style={styles.earningsLabel}>{t('yourEarnings')}</Text>
                            <Text style={styles.earningsSub}>{t('forThisOrder')}</Text>
                        </View>
                        <Text style={styles.earningsValue}>₹ {pendingOffer.earnings}</Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity 
                            style={styles.rejectButton}
                            onPress={() => rejectActiveOffer()}
                            disabled={isProcessingOffer}
                        >
                            <Text style={styles.rejectButtonText}>{t('reject')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.acceptButton}
                            onPress={handleAccept}
                            disabled={isProcessingOffer}
                        >
                            {isProcessingOffer ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.acceptButtonText}>{t('acceptOrder')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Footer Warning */}
                    <Text style={styles.warningFooter}>{t('rejectionWarning')}</Text>
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
        paddingTop: 20,
        paddingBottom: 35,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1F2937',
    },
    closeButton: {
        padding: 4,
    },
    timerContainer: {
        marginBottom: 16,
    },
    timerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    timerIcon: {
        marginRight: 6,
    },
    timerText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#EF4444',
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#EF4444',
        borderRadius: 2,
    },
    detailsCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        marginBottom: 14,
    },
    restaurantName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1F2937',
    },
    orderNumber: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '600',
        marginTop: 2,
    },
    routeContainer: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 12,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    pinIcon: {
        marginRight: 8,
    },
    routeText: {
        fontSize: 13,
        color: '#4B5563',
    },
    routeTextBold: {
        fontWeight: '700',
        color: '#1F2937',
    },
    distanceBlock: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 14,
    },
    distanceLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    distanceValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1F2937',
        marginTop: 2,
    },
    earningsBanner: {
        backgroundColor: '#FF4732',
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        marginBottom: 18,
    },
    earningsLabel: {
        color: 'white',
        fontSize: 15,
        fontWeight: '800',
    },
    earningsSub: {
        color: 'rgba(255, 255, 255, 0.75)',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 1,
    },
    earningsValue: {
        color: 'white',
        fontSize: 24,
        fontWeight: '900',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    rejectButton: {
        flex: 1,
        height: 48,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        backgroundColor: 'white',
    },
    rejectButtonText: {
        color: '#4B5563',
        fontSize: 15,
        fontWeight: '700',
    },
    acceptButton: {
        flex: 2,
        height: 48,
        backgroundColor: '#10B981',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '700',
    },
    warningFooter: {
        textAlign: 'center',
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '600',
    },
});

