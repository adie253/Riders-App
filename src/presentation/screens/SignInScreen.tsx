import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import HivagoIcon from '../../../assets/hivago_icon.svg';
import RiderIcon from '../../../assets/rider_icon.svg';
import { ArrowLeft, Phone, Lock, User, Mail, ShieldAlert, Truck, ChevronRight, CheckCircle2, Globe, MapPin, Clock, RotateCw } from 'lucide-react-native';

type AuthStep = 'welcome' | 'language' | 'phone_signup' | 'phone_login' | 'otp' | 'verified' | 'register';

export const SignInScreen = ({ navigation }: { navigation: any }) => {
    const { sendOtpCode, verifyOtpCode, updateProfile, riderProfile } = useAuth();
    const { showToast } = useToast();

    const [step, setStep] = useState<AuthStep>('welcome');
    const [phone, setPhone] = useState('');
    const [otpArray, setOtpArray] = useState<string[]>(['', '', '', '', '', '']); // 6-digit OTP
    const [otpError, setOtpError] = useState<string | null>(null);
    
    // Registration details
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [vehicleType, setVehicleType] = useState('Motorcycle');
    
    // Language Selection
    const [selectedLanguage, setSelectedLanguage] = useState('English');

    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(0);

    // Refs for 6 OTP input boxes
    const otpRefs = useRef<Array<TextInput | null>>([]);

    // Animations
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const checkScale = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        let interval: any;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev: number) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    // Transition step helper with a subtle fade animation
    const transitionTo = (nextStep: AuthStep) => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true
        }).start(() => {
            setStep(nextStep);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true
            }).start();
        });
    };

    const handleSendOtp = async () => {
        if (phone.length < 10) {
            showToast("Please enter a valid 10-digit phone number", "warning");
            return;
        }
        setLoading(true);
        const success = await sendOtpCode(phone);
        setLoading(false);
        if (success) {
            setOtpArray(['', '', '', '', '', '']);
            setOtpError(null);
            setTimer(59); // 59 seconds countdown
            transitionTo('otp');
        }
    };

    const handleResendOtp = async () => {
        if (timer > 0) return;
        setLoading(true);
        const success = await sendOtpCode(phone);
        setLoading(false);
        if (success) {
            setOtpArray(['', '', '', '', '', '']);
            setOtpError(null);
            setTimer(59);
        }
    };

    const handleOtpChange = (text: string, index: number) => {
        const cleanText = text.replace(/[^0-9]/g, '');
        const newOtp = [...otpArray];
        
        if (cleanText.length > 1) {
            // Check if this is a paste/autofill event (typically 5 or 6 digits)
            if (cleanText.length >= 5) {
                const startIdx = cleanText.length === 6 ? 0 : index;
                for (let i = 0; i < cleanText.length; i++) {
                    if (startIdx + i < 6) {
                        newOtp[startIdx + i] = cleanText[i];
                    }
                }
                setOtpArray(newOtp);
                setOtpError(null);
                
                // Focus the last input box
                otpRefs.current[5]?.focus();
                
                const fullOtp = newOtp.join('');
                if (fullOtp.length === 6) {
                    verifyOtpCodeCall(fullOtp);
                }
                return;
            } else {
                // If it's just typing another digit in the same slot, overwrite with the latest character
                newOtp[index] = cleanText[cleanText.length - 1];
            }
        } else {
            newOtp[index] = cleanText;
        }

        setOtpArray(newOtp);
        setOtpError(null);

        // Auto-focus next box
        if (cleanText !== '' && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }

        // Check if full OTP is entered
        const fullOtp = newOtp.join('');
        if (fullOtp.length === 6) {
            verifyOtpCodeCall(fullOtp);
        }
    };

    const handleOtpKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace') {
            if (otpArray[index] === '' && index > 0) {
                const newOtp = [...otpArray];
                newOtp[index - 1] = '';
                setOtpArray(newOtp);
                otpRefs.current[index - 1]?.focus();
            }
        }
    };

    const verifyOtpCodeCall = async (code: string) => {
        setLoading(true);
        try {
            const success = await verifyOtpCode(phone, code);
            setLoading(false);
            if (success) {
                // Animate checkmark transition
                transitionTo('verified');
                Animated.spring(checkScale, {
                    toValue: 1,
                    friction: 4,
                    useNativeDriver: true
                }).start();

                // Wait for verified feedback screen to show
                setTimeout(() => {
                    if (riderProfile) {
                        if (!riderProfile.name || !riderProfile.vehicleNumber) {
                            transitionTo('register');
                        } else if (riderProfile.kycStatus === 'None' || !riderProfile.kycStatus) {
                            navigation.navigate('Kyc');
                        } else {
                            navigation.navigate('Dashboard');
                        }
                    } else {
                        transitionTo('register');
                    }
                }, 1800);
            } else {
                setOtpError('Wrong Code, Please try again');
            }
        } catch (e) {
            setLoading(false);
            setOtpError('Wrong Code, Please try again');
        }
    };

    const handleRegisterSubmit = async () => {
        if (!name.trim() || !email.trim() || !vehicleNumber.trim()) {
            showToast("All fields are required", "warning");
            return;
        }
        setLoading(true);
        const success = await updateProfile({ name, email, vehicleNumber });
        setLoading(false);
        if (success) {
            navigation.navigate('Kyc');
        }
    };

    const isPhoneValid = phone.length === 10;

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={[
                styles.container, 
                step === 'welcome' ? styles.welcomeContainerBg : styles.normalContainerBg
            ]}
        >
            <Animated.View style={[styles.innerContainer, { opacity: fadeAnim }]}>
                <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                    
                    {/* Back Button */}
                    {['phone_signup', 'phone_login', 'otp'].includes(step) && (
                        <TouchableOpacity 
                            style={styles.backButton} 
                            onPress={() => {
                                if (step === 'phone_signup') transitionTo('welcome');
                                else if (step === 'phone_login') transitionTo('welcome');
                                else if (step === 'otp') transitionTo('phone_login');
                            }}
                        >
                            <ArrowLeft size={24} color="#1F2937" />
                        </TouchableOpacity>
                    )}

                    {/* Step 1: Splash/Welcome (Frame 2826) */}
                    {step === 'welcome' && (
                        <View style={styles.splashWrapper}>
                            <View style={styles.splashImageBlock}>
                                <View style={styles.brandLogoWrapper}>
                                    <HivagoIcon width={180} height={58} fill="white" />
                                </View>
                                <View style={styles.riderIllustrationWrapper}>
                                    <RiderIcon width={220} height={220} />
                                </View>
                                <Text style={styles.splashTagline}>Deliver with pride</Text>
                            </View>
                            
                            <View style={styles.splashBottomWrapper}>
                                <TouchableOpacity 
                                    style={styles.splashButton}
                                    onPress={() => transitionTo('phone_login')}
                                >
                                    <Text style={styles.splashButtonText}>Start Riding</Text>
                                    <ChevronRight size={18} color="#1F2937" />
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.refreshBtn}
                                    onPress={() => transitionTo('welcome')}
                                >
                                    <RotateCw size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Step 2: Language Selection (Frame 2821) */}
                    {step === 'language' && (
                        <View style={styles.cardContainer}>
                            <View style={styles.headerIconWrapper}>
                                <Globe size={24} color="white" />
                            </View>
                            <Text style={styles.titleText}>Choose Your Language</Text>
                            <Text style={styles.subtitleText}>Select your preferred language</Text>

                            <ScrollView style={styles.langListScroll} showsVerticalScrollIndicator={false}>
                                {[
                                    { name: 'English', sub: 'English' },
                                    { name: 'Hindi', sub: 'हिंदी' },
                                    { name: 'Kannada', sub: 'ಕನ್ನಡ' },
                                    { name: 'Telugu', sub: 'తెలుగు' },
                                    { name: 'Tamil', sub: 'தமிழ்' },
                                    { name: 'Malayalam', sub: 'മലയാളം' },
                                    { name: 'Bengali', sub: 'বাঙালি' },
                                    { name: 'Marathi', sub: 'मರಾಠಿ' }
                                ].map((lang) => (
                                    <TouchableOpacity 
                                        key={lang.name} 
                                        style={[
                                            styles.langItem, 
                                            selectedLanguage === lang.name && styles.activeLangItem
                                        ]}
                                        onPress={() => setSelectedLanguage(lang.name)}
                                    >
                                        <View style={styles.langLeft}>
                                            <View style={[
                                                styles.langIndicator,
                                                selectedLanguage === lang.name && styles.activeLangIndicator
                                            ]}>
                                                {selectedLanguage === lang.name && (
                                                    <View style={styles.langIndicatorDot} />
                                                )}
                                            </View>
                                            <Text style={[
                                                styles.langNameText,
                                                selectedLanguage === lang.name && styles.activeLangNameText
                                            ]}>
                                                {lang.name}
                                            </Text>
                                        </View>
                                        <Text style={styles.langSubText}>{lang.sub}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Info Box */}
                            <View style={styles.infoBox}>
                                <Text style={styles.infoBoxText}>
                                    You can change the language anytime from your profile settings
                                </Text>
                            </View>

                            <TouchableOpacity 
                                style={styles.primaryButton}
                                onPress={() => transitionTo('phone_signup')}
                            >
                                <Text style={styles.primaryButtonText}>Continue</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Step 3a: New Rider Sign Up (Frame 2814) */}
                    {step === 'phone_signup' && (
                        <View style={styles.cardContainer}>
                            <View style={styles.headerIconWrapper}>
                                <Phone size={24} color="white" />
                            </View>
                            
                            <Text style={styles.titleText}>Welcome</Text>
                            <Text style={styles.subtitleText}>Enter your phone number to continue</Text>

                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>Phone Number</Text>
                            </View>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.prefixText}>🇮🇳 +91</Text>
                                <View style={styles.inputDivider} />
                                <TextInput 
                                    style={styles.input}
                                    placeholder="10-digit mobile number"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={setPhone}
                                    maxLength={10}
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                            
                            <Text style={styles.helperInputText}>
                                We'll send you an OTP to verify your number
                            </Text>

                            <TouchableOpacity 
                                style={[
                                    styles.primaryButton, 
                                    !isPhoneValid && styles.disabledButton
                                ]} 
                                onPress={handleSendOtp}
                                disabled={!isPhoneValid || loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Send OTP</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.switchStepLink}
                                onPress={() => transitionTo('phone_login')}
                            >
                                <Text style={styles.switchStepLinkText}>Already a rider? Login here</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Step 3b: Existing Rider Login (Frame 51157) */}
                    {step === 'phone_login' && (
                        <View style={styles.cardContainer}>
                            <View style={styles.headerIconWrapper}>
                                <Phone size={24} color="white" />
                            </View>
                            
                            <Text style={styles.titleText}>Welcome Back</Text>
                            <Text style={styles.subtitleText}>Enter your phone number to continue</Text>

                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>Phone Number</Text>
                            </View>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.prefixText}>🇮🇳 +91</Text>
                                <View style={styles.inputDivider} />
                                <TextInput 
                                    style={styles.input}
                                    placeholder="10-digit mobile number"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={setPhone}
                                    maxLength={10}
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>

                            <Text style={styles.helperInputText}>
                                We'll send you an OTP to verify your number
                            </Text>

                            <TouchableOpacity 
                                style={[
                                    styles.primaryButton, 
                                    !isPhoneValid && styles.disabledButton
                                ]} 
                                onPress={handleSendOtp}
                                disabled={!isPhoneValid || loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Send OTP</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.switchStepLink}
                                onPress={() => transitionTo('phone_signup')}
                            >
                                <Text style={styles.switchStepLinkText}>New Rider? Sign up here</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Step 4: OTP Screen (Frame 2817 & 2827) */}
                    {step === 'otp' && (
                        <View style={styles.cardContainer}>
                            <View style={styles.headerIconWrapper}>
                                <Lock size={24} color="white" />
                            </View>

                            <Text style={styles.titleText}>OTP</Text>
                            <Text style={styles.subtitleText}>Enter the 6 digit OTP sent to your phone</Text>

                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>Enter OTP</Text>
                            </View>

                            {/* 6 Digit Input Slots */}
                            <View style={styles.otpSlotsContainer}>
                                {otpArray.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => { otpRefs.current[index] = ref; }}
                                        style={[
                                            styles.otpSlotInput,
                                            otpError ? styles.otpSlotInputError : null
                                        ]}
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        value={digit}
                                        onChangeText={(text) => handleOtpChange(text, index)}
                                        onKeyPress={(e) => handleOtpKeyPress(e, index)}
                                        placeholderTextColor="#D1D5DB"
                                        textContentType="oneTimeCode"
                                        autoComplete="sms-otp"
                                    />
                                ))}
                            </View>

                            {/* Sent details & timer */}
                            <View style={styles.otpMetaRow}>
                                <Text style={styles.otpSentToLabel}>
                                    Sent to <Text style={{ color: '#111827', fontWeight: 'bold' }}>+91 {phone}</Text>
                                </Text>
                                <View style={styles.timerWrapper}>
                                    <Clock size={14} color="#EF4444" style={{ marginRight: 4 }} />
                                    <Text style={styles.timerLabel}>
                                        {timer > 0 ? `0:${timer < 10 ? '0' + timer : timer}` : '0:00'}
                                    </Text>
                                </View>
                            </View>

                            {/* Validation Error Message */}
                            {otpError && (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorText}>{otpError}</Text>
                                </View>
                            )}

                            {/* Resend Link */}
                            <TouchableOpacity 
                                style={[styles.resendLinkBtn, timer > 0 && styles.disabledResendLink]}
                                onPress={handleResendOtp}
                                disabled={timer > 0 || loading}
                            >
                                <Text style={[styles.resendLinkText, timer > 0 && styles.disabledResendLinkText]}>
                                    Didn't receive OTP? <Text style={{ color: '#FF4732', fontWeight: 'bold' }}>Resend</Text>
                                </Text>
                            </TouchableOpacity>

                            {/* Change Phone Number link */}
                            <TouchableOpacity 
                                style={styles.changePhoneLink}
                                onPress={() => transitionTo('phone_login')}
                            >
                                <Text style={styles.changePhoneLinkText}>Change phone number</Text>
                            </TouchableOpacity>
                            
                            <Text style={styles.bottomAutoVerifyText}>
                                OTP will be verified automatically when entered
                            </Text>
                        </View>
                    )}

                    {/* Step 5: Verified Animation Screen (Frame 2820) */}
                    {step === 'verified' && (
                        <View style={styles.verifiedScreen}>
                            <Animated.View style={[styles.checkCircleWrapper, { transform: [{ scale: checkScale }] }]}>
                                <CheckCircle2 size={80} color="#10B981" />
                            </Animated.View>
                            <Text style={styles.verifiedTitleText}>Verified!</Text>
                        </View>
                    )}

                    {/* Step 6: Registration */}
                    {step === 'register' && (
                        <View style={styles.cardContainer}>
                            <View style={styles.headerIconWrapper}>
                                <User size={24} color="white" />
                            </View>
                            
                            <Text style={styles.titleText}>Profile Setup</Text>
                            <Text style={styles.subtitleText}>Complete details to register as a Hivago Rider</Text>

                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>Full Name</Text>
                            </View>
                            <View style={styles.inputWrapper}>
                                <User size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput 
                                    style={styles.input}
                                    placeholder="Enter your full name"
                                    value={name}
                                    onChangeText={setName}
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>

                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>Email Address</Text>
                            </View>
                            <View style={styles.inputWrapper}>
                                <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput 
                                    style={styles.input}
                                    placeholder="Enter email address"
                                    keyboardType="email-address"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>

                            <View style={styles.vehicleTypeSelector}>
                                <Text style={styles.sectionLabel}>Vehicle Type</Text>
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

                            <View style={styles.inputLabelContainer}>
                                <Text style={styles.inputLabel}>Vehicle Plate Number</Text>
                            </View>
                            <View style={styles.inputWrapper}>
                                <ShieldAlert size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput 
                                    style={styles.input}
                                    placeholder="Plate number (e.g. MH-12-AB-1234)"
                                    value={vehicleNumber}
                                    onChangeText={setVehicleNumber}
                                    autoCapitalize="characters"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>

                            <TouchableOpacity 
                                style={styles.primaryButton} 
                                onPress={handleRegisterSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Register Details</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </Animated.View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    welcomeContainerBg: {
        backgroundColor: '#A30D11', // Rich crimson background for splash
    },
    normalContainerBg: {
        backgroundColor: '#F9FAFB', // White/Off-white background for inputs
    },
    innerContainer: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        padding: 8,
        borderRadius: 50,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        zIndex: 10,
    },
    
    // Splash Welcome Screen Styles (Frame 2826)
    splashWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 30,
        minHeight: 520,
    },
    splashImageBlock: {
        alignItems: 'center',
        marginTop: 60,
    },
    brandLogoWrapper: {
        marginTop: 40,
        marginBottom: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    riderIllustrationWrapper: {
        marginTop: 20,
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    splashTagline: {
        fontSize: 14,
        color: '#FCA5A5',
        fontWeight: '600',
        marginTop: 20,
        letterSpacing: 0.5,
    },
    splashBottomWrapper: {
        width: '100%',
        alignItems: 'center',
    },
    splashButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        width: '100%',
        height: 52,
        borderRadius: 26, // Fully rounded pill shape
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        marginBottom: 20,
    },
    splashButtonText: {
        color: '#111827',
        fontSize: 15,
        fontWeight: 'bold',
        marginRight: 6,
    },
    refreshBtn: {
        marginTop: 10,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.8,
    },

    // Card Standard Layouts
    cardContainer: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.03,
        shadowRadius: 16,
        elevation: 1.5,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        marginTop: 40,
    },
    headerIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#A30D11', // Crimson background for icon circles
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
        marginBottom: 24,
    },

    // Form inputs
    inputLabelContainer: {
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4B5563',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1.2,
        borderColor: '#E5E7EB',
    },
    inputIcon: {
        marginRight: 10,
    },
    prefixText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    inputDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#D1D5DB',
        marginHorizontal: 12,
    },
    input: {
        flex: 1,
        height: '100%',
        color: '#111827',
        fontSize: 14,
        fontWeight: '600',
    },
    helperInputText: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 8,
        marginBottom: 16,
    },

    // Language list scroll (Frame 2821)
    langListScroll: {
        maxHeight: 280,
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
        marginBottom: 6,
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

    // Buttons & Links
    primaryButton: {
        backgroundColor: '#A30D11', // Figma dark crimson red button
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 6,
        shadowColor: '#A30D11',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
    },
    disabledButton: {
        backgroundColor: '#F2A9A9', // Figma disabled pink color
        shadowOpacity: 0,
        elevation: 0,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
    switchStepLink: {
        alignItems: 'center',
        marginTop: 18,
    },
    switchStepLinkText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
    },

    // OTP Slots Styles
    otpSlotsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16,
    },
    otpSlotInput: {
        width: '14%',
        height: 48,
        backgroundColor: '#F9FAFB',
        borderWidth: 1.2,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    otpSlotInputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEE2E2',
    },
    otpMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 12,
    },
    otpSentToLabel: {
        fontSize: 12,
        color: '#6B7280',
    },
    timerWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timerLabel: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: 'bold',
    },
    errorContainer: {
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        fontWeight: '600',
    },
    resendLinkBtn: {
        alignItems: 'flex-start',
        marginTop: 4,
        marginBottom: 16,
    },
    resendLinkText: {
        fontSize: 13,
        color: '#6B7280',
    },
    disabledResendLink: {
        opacity: 0.7,
    },
    disabledResendLinkText: {
        color: '#9CA3AF',
    },
    changePhoneLink: {
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    changePhoneLinkText: {
        fontSize: 13,
        color: '#EF4444',
        fontWeight: '600',
    },
    bottomAutoVerifyText: {
        fontSize: 11,
        color: '#9CA3AF',
        textAlign: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 14,
        marginTop: 10,
    },

    // Verified screen feedback
    verifiedScreen: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 16,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        minHeight: 280,
    },
    checkCircleWrapper: {
        marginBottom: 16,
    },
    verifiedTitleText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#10B981',
    },

    // Register vehicle selector
    vehicleTypeSelector: {
        marginBottom: 16,
        alignSelf: 'stretch',
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4B5563',
        marginBottom: 8,
    },
    typesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    typeBadge: {
        flex: 1,
        height: 40,
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
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
        fontSize: 13,
        fontWeight: '600',
        color: '#4B5563',
    },
    activeTypeBadgeText: {
        color: '#FF4732',
    },

});

