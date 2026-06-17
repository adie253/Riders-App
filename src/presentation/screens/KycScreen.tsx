import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FileText, CheckCircle2, Clock, AlertTriangle, Upload, ArrowRight, ShieldCheck, Landmark, User, CreditCard, HelpCircle, FileCheck, LogOut, RefreshCw } from 'lucide-react-native';
import { getKycDocuments } from '../../data/api';
import * as ImagePicker from 'expo-image-picker';

type KycStep = 'documents' | 'bank' | 'review' | 'approved';

export const KycScreen = ({ navigation }: { navigation: any }) => {
    const { riderProfile, uploadKyc, refreshProfile, logout } = useAuth();
    const { showToast } = useToast();

    const [currentScreen, setCurrentScreen] = useState<KycStep>('documents');
    const [uploadStep, setUploadStep] = useState<number>(1); // 1: Aadhaar, 2: PAN, 3: Driving Licence

    // Document upload success flags (local simulation/mapping to backend)
    const [aadhaarUploaded, setAadhaarUploaded] = useState(false);
    const [panUploaded, setPanUploaded] = useState(false);
    const [licenceUploaded, setLicenceUploaded] = useState(false);

    // Bank account fields
    const [accountNumber, setAccountNumber] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [bankName, setBankName] = useState('');

    const [loading, setLoading] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);

    const loadServerKycStatus = async () => {
        if (!riderProfile) return;
        setLoading(true);
        try {
            const docs = await getKycDocuments(riderProfile.id);
            
            // Check if documents are uploaded and not rejected
            const isAadhaarDone = docs.some((d: any) => d.documentType === 'AadhaarFront' && d.status !== 'Rejected');
            const isPanDone = docs.some((d: any) => d.documentType === 'VehicleRC' && d.status !== 'Rejected');
            const isLicenceDone = docs.some((d: any) => d.documentType === 'DrivingLicense' && d.status !== 'Rejected');

            setAadhaarUploaded(isAadhaarDone);
            setPanUploaded(isPanDone);
            setLicenceUploaded(isLicenceDone);

            // Determine active step based on what's missing
            if (!isAadhaarDone) {
                setUploadStep(1);
            } else if (!isPanDone) {
                setUploadStep(2);
            } else if (!isLicenceDone) {
                setUploadStep(3);
            }

            // Determine screen based on upload completion and profile status
            if (riderProfile.kycStatus === 'Approved') {
                setCurrentScreen('approved');
            } else if (isAadhaarDone && isPanDone && isLicenceDone) {
                // Check if they need to submit bank details or if it is already submitted and under review
                if (riderProfile.kycStatus === 'Pending') {
                    setCurrentScreen('review');
                } else {
                    setCurrentScreen('bank');
                }
            } else {
                setCurrentScreen('documents');
            }
        } catch (e) {
            console.warn('Failed to load server KYC status:', e);
        } finally {
            setLoading(false);
        }
    };

    // Sync with backend status on mount or profile refresh
    useEffect(() => {
        loadServerKycStatus();
    }, [riderProfile]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showToast('Permission to access media library was denied', 'warning');
            return null;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            return result.assets[0].uri;
        }
        return null;
    };

    const handleUploadDocument = async () => {
        const imageUri = await pickImage();
        if (!imageUri) return;

        setLoading(true);
        try {
            // We map the steps to our backend RiderKycDocumentType:
            // Step 1: Aadhaar Card -> AadhaarFront
            // Step 2: PAN Card -> VehicleRC (since PAN is not in enum, we use VehicleRC)
            // Step 3: Driving Licence -> DrivingLicense
            let docType = 'AadhaarFront';
            let docLabel = 'Aadhaar Card';
            if (uploadStep === 2) {
                docType = 'VehicleRC';
                docLabel = 'PAN Card';
            } else if (uploadStep === 3) {
                docType = 'DrivingLicense';
                docLabel = 'Driving Licence';
            }

            const success = await uploadKyc(docType, imageUri);
            
            if (success) {
                setAlertMessage(`${docLabel} uploaded successfully!`);
                if (uploadStep === 1) {
                    setAadhaarUploaded(true);
                    setUploadStep(2);
                } else if (uploadStep === 2) {
                    setPanUploaded(true);
                    setUploadStep(3);
                } else if (uploadStep === 3) {
                    setLicenceUploaded(true);
                }
                showToast(`${docLabel} Uploaded`, 'success');
            }
        } catch (e) {
            showToast('Document upload failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleIfscChange = (text: string) => {
        const cleaned = text.toUpperCase();
        setIfscCode(cleaned);
        // Auto-populate mock bank names for clean UX
        if (cleaned.length >= 4) {
            if (cleaned.startsWith('HDFC')) setBankName('HDFC Bank');
            else if (cleaned.startsWith('SBIN')) setBankName('State Bank of India');
            else if (cleaned.startsWith('ICIC')) setBankName('ICICI Bank');
            else if (cleaned.startsWith('BARB')) setBankName('Bank of Baroda');
            else setBankName('Validated Bank Account');
        } else {
            setBankName('');
        }
    };

    const handleBankSubmit = async () => {
        if (!accountNumber || !ifscCode) {
            showToast('Please fill all bank details', 'warning');
            return;
        }
        setLoading(true);
        try {
            // Simulate sending bank details to the profile.
            // On the server we upload it as AadhaarBack since there's no bank model,
            // or confirm it, keeping status pending.
            await uploadKyc('AadhaarBack', `https://picsum.photos/bank-mock?acc=${accountNumber}&ifsc=${ifscCode}`);
            setAlertMessage('Bank details submitted successfully!');
            showToast('Bank Details Submitted', 'success');
            setCurrentScreen('review');
            await refreshProfile();
            await loadServerKycStatus();
        } catch (e) {
            showToast('Failed to submit bank details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshStatus = async () => {
        setLoading(true);
        await refreshProfile();
        await loadServerKycStatus();
        setLoading(false);
        showToast('Profile status refreshed', 'info');
    };

    // Calculate progress percentage
    const getProgressPercent = () => {
        let count = 0;
        if (aadhaarUploaded) count += 33;
        if (panUploaded) count += 33;
        if (licenceUploaded) count += 34;
        return count;
    };

    const isAllDocsUploaded = aadhaarUploaded && panUploaded && licenceUploaded;

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.container}
        >
            {/* Top Toolbar */}
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>Documents Verification</Text>
                <View style={styles.topBarActions}>
                    <TouchableOpacity style={styles.topBarButton} onPress={handleRefreshStatus}>
                        <RefreshCw size={18} color="#4B5563" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.topBarButton, { marginLeft: 10 }]} onPress={logout}>
                        <LogOut size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Green Notification Toast Banner */}
            {alertMessage && (
                <View style={styles.alertToastBanner}>
                    <CheckCircle2 size={16} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.alertToastText}>{alertMessage}</Text>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                
                {/* SCREEN 1: Documents Upload Flow */}
                {currentScreen === 'documents' && (
                    <View style={styles.contentBlock}>
                        {/* Progress Indicator */}
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>Upload Documents</Text>
                            <Text style={styles.progressPercentText}>Progress {getProgressPercent()}%</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${getProgressPercent()}%` }]} />
                        </View>

                        {/* Illustration Container */}
                        <View style={styles.illustrationWrapper}>
                            <View style={styles.illustrationBlob} />
                            <FileText size={72} color="#A30D11" />
                        </View>

                        {/* Status Check List of Uploaded Documents */}
                        <View style={styles.uploadedChecklist}>
                            {aadhaarUploaded && (
                                <View style={styles.checklistItem}>
                                    <CheckCircle2 size={16} color="#10B981" style={{ marginRight: 6 }} />
                                    <Text style={styles.checklistText}>Aadhaar Card uploaded</Text>
                                </View>
                            )}
                            {panUploaded && (
                                <View style={styles.checklistItem}>
                                    <CheckCircle2 size={16} color="#10B981" style={{ marginRight: 6 }} />
                                    <Text style={styles.checklistText}>PAN Card uploaded</Text>
                                </View>
                            )}
                            {licenceUploaded && (
                                <View style={styles.checklistItem}>
                                    <CheckCircle2 size={16} color="#10B981" style={{ marginRight: 6 }} />
                                    <Text style={styles.checklistText}>Driving Licence uploaded</Text>
                                </View>
                            )}
                        </View>

                        {/* Active Document Step Card */}
                        {!isAllDocsUploaded ? (
                            <View style={styles.stepCard}>
                                <View style={styles.stepHeaderRow}>
                                    <View style={styles.stepBadge}>
                                        <Text style={styles.stepBadgeText}>Step {uploadStep}</Text>
                                    </View>
                                    <Text style={styles.stepTitle}>
                                        {uploadStep === 1 ? 'Aadhaar Card' : uploadStep === 2 ? 'PAN Card' : 'Driving Licence'}
                                    </Text>
                                </View>
                                <Text style={styles.stepSub}>
                                    {uploadStep === 1 ? 'Required for identity verification' : uploadStep === 2 ? 'Required for tax purposes' : 'Valid motor vehicle licence'}
                                </Text>

                                <TouchableOpacity 
                                    style={styles.uploadTriggerButton}
                                    onPress={handleUploadDocument}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <Upload size={18} color="white" style={{ marginRight: 8 }} />
                                            <Text style={styles.uploadTriggerText}>
                                                Upload {uploadStep === 1 ? 'Aadhaar Card' : uploadStep === 2 ? 'PAN Card' : 'Driving Licence'}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                {/* Photo Guidelines */}
                                <View style={styles.guidelinesBox}>
                                    <Text style={styles.guidelinesTitle}>Photo Guidelines</Text>
                                    <View style={styles.guidelineRow}>
                                        <Text style={styles.guidelineBullet}>•</Text>
                                        <Text style={styles.guidelineText}>Clear photo of front and back side of card</Text>
                                    </View>
                                    <View style={styles.guidelineRow}>
                                        <Text style={styles.guidelineBullet}>•</Text>
                                        <Text style={styles.guidelineText}>Name and digits should be clearly visible</Text>
                                    </View>
                                    <View style={styles.guidelineRow}>
                                        <Text style={styles.guidelineBullet}>•</Text>
                                        <Text style={styles.guidelineText}>No blurry or faded images</Text>
                                    </View>
                                    <View style={styles.guidelineRow}>
                                        <Text style={styles.guidelineBullet}>•</Text>
                                        <Text style={styles.guidelineText}>File size should be under 5MB</Text>
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.allUploadedBox}>
                                <CheckCircle2 size={48} color="#10B981" style={{ marginBottom: 12 }} />
                                <Text style={styles.allUploadedTitle}>All Documents Uploaded!</Text>
                                <Text style={styles.allUploadedDesc}>Click below to continue and add your bank details for payouts.</Text>
                            </View>
                        )}

                        <TouchableOpacity 
                            style={[styles.primaryButton, !isAllDocsUploaded && styles.disabledButton]}
                            disabled={!isAllDocsUploaded}
                            onPress={() => {
                                setAlertMessage(null);
                                setCurrentScreen('bank');
                            }}
                        >
                            <Text style={styles.primaryButtonText}>Continue to Bank Details</Text>
                            <ArrowRight size={18} color="white" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* SCREEN 2: Add Bank Details */}
                {currentScreen === 'bank' && (
                    <View style={styles.contentBlock}>
                        <Text style={styles.sectionTitle}>Add Bank Details</Text>
                        <Text style={styles.sectionSubtitle}>Fill in your weekly earnings details to get paid</Text>

                        {/* Yellow Warning Info Box */}
                        <View style={styles.warningBox}>
                            <AlertTriangle size={18} color="#B45309" style={{ marginRight: 10, marginTop: 2 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.warningTitle}>Important Information</Text>
                                <Text style={styles.warningText}>
                                    Your actual name will be automatically populated into the bank account validation. Please verify validation details once.
                                </Text>
                            </View>
                        </View>

                        {/* Form Inputs */}
                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>Account Holder Name *</Text>
                            <View style={[styles.inputWrapper, styles.disabledInputWrapper]}>
                                <User size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                                <TextInput 
                                    style={[styles.input, styles.disabledInput]}
                                    value={riderProfile?.name || 'Rider Profile Name'}
                                    editable={false}
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>Bank Account Number *</Text>
                            <View style={styles.inputWrapper}>
                                <CreditCard size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                                <TextInput 
                                    style={styles.input}
                                    placeholder="Enter your bank account number"
                                    keyboardType="number-pad"
                                    value={accountNumber}
                                    onChangeText={setAccountNumber}
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>IFSC Code *</Text>
                            <View style={styles.inputWrapper}>
                                <Landmark size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                                <TextInput 
                                    style={styles.input}
                                    placeholder="e.g. HDFC0001234"
                                    autoCapitalize="characters"
                                    value={ifscCode}
                                    onChangeText={handleIfscChange}
                                    maxLength={11}
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>Bank Name *</Text>
                            <View style={[styles.inputWrapper, styles.disabledInputWrapper]}>
                                <Landmark size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                                <TextInput 
                                    style={[styles.input, styles.disabledInput]}
                                    placeholder="Auto-populated on IFSC entry"
                                    value={bankName}
                                    editable={false}
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={styles.primaryButton}
                            onPress={handleBankSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Submit Bank Details</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* SCREEN 3: Verification In Progress / Review */}
                {currentScreen === 'review' && (
                    <View style={styles.contentBlock}>
                        <View style={styles.illustrationWrapper}>
                            <View style={styles.illustrationBlob} />
                            <Clock size={72} color="#D97706" />
                        </View>

                        <Text style={styles.centerTitle}>Documents Under Verification</Text>
                        <Text style={styles.centerSubtitle}>
                            Verification takes up to 24-48 hours. Please check back later.
                        </Text>

                        {/* Status timeline */}
                        <View style={styles.timelineContainer}>
                            <View style={styles.timelineRow}>
                                <CheckCircle2 size={20} color="#10B981" style={styles.timelineIcon} />
                                <View style={styles.timelineBody}>
                                    <Text style={styles.timelineTitle}>Documents Submitted</Text>
                                    <Text style={styles.timelineDesc}>All files uploaded successfully</Text>
                                </View>
                            </View>
                            <View style={styles.timelineLine} />
                            
                            <View style={styles.timelineRow}>
                                <View style={styles.timelineActiveDotContainer}>
                                    <RefreshCw size={14} color="#D97706" style={styles.spinIcon} />
                                </View>
                                <View style={styles.timelineBody}>
                                    <Text style={[styles.timelineTitle, { color: '#D97706' }]}>Verification In Progress</Text>
                                    <Text style={styles.timelineDesc}>Our team is reviewing your documents</Text>
                                </View>
                            </View>
                            <View style={styles.timelineLineInactive} />

                            <View style={styles.timelineRow}>
                                <HelpCircle size={20} color="#9CA3AF" style={styles.timelineIcon} />
                                <View style={styles.timelineBody}>
                                    <Text style={[styles.timelineTitle, { color: '#9CA3AF' }]}>Approval Pending</Text>
                                    <Text style={styles.timelineDesc}>Ready to activate account</Text>
                                </View>
                            </View>
                        </View>

                        {/* Purple Note Box */}
                        <View style={styles.purpleNoteBox}>
                            <Text style={styles.purpleNoteTitle}>Important Note</Text>
                            <Text style={styles.purpleNoteText}>
                                Once verified, you will receive notifications. In case of rejection, you can re-upload.
                            </Text>
                        </View>

                        <TouchableOpacity 
                            style={styles.refreshButton}
                            onPress={handleRefreshStatus}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#A30D11" />
                            ) : (
                                <>
                                    <RefreshCw size={16} color="#A30D11" style={{ marginRight: 8 }} />
                                    <Text style={styles.refreshButtonText}>Refresh Verification Status</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* SCREEN 4: Approved State */}
                {currentScreen === 'approved' && (
                    <View style={styles.contentBlock}>
                        <View style={styles.illustrationWrapper}>
                            <View style={styles.illustrationBlobGreen} />
                            <ShieldCheck size={80} color="#10B981" />
                        </View>

                        <Text style={styles.centerTitle}>Verification Successful!</Text>
                        <Text style={styles.centerSubtitle}>
                            Your documents have been verified. You are ready to start training.
                        </Text>

                        {/* Verified Checklist box */}
                        <View style={styles.verifiedChecklistContainer}>
                            <Text style={styles.verifiedChecklistHeader}>Verified Documents</Text>
                            
                            <View style={styles.verifiedCheckItem}>
                                <CheckCircle2 size={16} color="#10B981" style={{ marginRight: 10 }} />
                                <Text style={styles.verifiedCheckText}>Aadhaar Card</Text>
                            </View>
                            <View style={styles.verifiedCheckItem}>
                                <CheckCircle2 size={16} color="#10B981" style={{ marginRight: 10 }} />
                                <Text style={styles.verifiedCheckText}>PAN Card</Text>
                            </View>
                            <View style={styles.verifiedCheckItem}>
                                <CheckCircle2 size={16} color="#10B981" style={{ marginRight: 10 }} />
                                <Text style={styles.verifiedCheckText}>Driving Licence</Text>
                            </View>
                            <View style={styles.verifiedCheckItem}>
                                <CheckCircle2 size={16} color="#10B981" style={{ marginRight: 10 }} />
                                <Text style={styles.verifiedCheckText}>Bank Account</Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={styles.primaryButton}
                            onPress={() => navigation.navigate('Dashboard')}
                        >
                            <Text style={styles.primaryButtonText}>Continue to Training</Text>
                            <ArrowRight size={18} color="white" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    topBarTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    topBarActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    topBarButton: {
        padding: 6,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    scrollContainer: {
        flexGrow: 1,
        padding: 20,
        paddingBottom: 40,
    },
    contentBlock: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    alertToastBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10B981',
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    alertToastText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },

    // Progress Header
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4B5563',
    },
    progressPercentText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#A30D11',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        width: '100%',
        marginBottom: 20,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 3,
    },

    // Illustration Wrapper
    illustrationWrapper: {
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginBottom: 20,
    },
    illustrationBlob: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#FEE2E2',
        opacity: 0.7,
    },
    illustrationBlobGreen: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#D1FAE5',
        opacity: 0.7,
    },

    // Status checklists
    uploadedChecklist: {
        marginBottom: 16,
    },
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        borderColor: '#A7F3D0',
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginBottom: 8,
        alignSelf: 'flex-start',
    },
    checklistText: {
        fontSize: 12,
        color: '#065F46',
        fontWeight: '600',
    },

    // Step Card
    stepCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 20,
    },
    stepHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    stepBadge: {
        backgroundColor: '#FEE2E2',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginRight: 10,
    },
    stepBadgeText: {
        color: '#A30D11',
        fontSize: 11,
        fontWeight: 'bold',
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    stepSub: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 16,
    },
    uploadTriggerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#A30D11',
        height: 46,
        borderRadius: 10,
    },
    uploadTriggerText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },

    // Guidelines Box
    guidelinesBox: {
        backgroundColor: '#FEF3C7',
        borderColor: '#FDE68A',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginTop: 16,
    },
    guidelinesTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#92400E',
        marginBottom: 6,
    },
    guidelineRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 3,
    },
    guidelineBullet: {
        fontSize: 11,
        color: '#92400E',
        marginRight: 6,
    },
    guidelineText: {
        fontSize: 11,
        color: '#92400E',
        flex: 1,
        lineHeight: 14,
    },

    // All uploaded message
    allUploadedBox: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ECFDF5',
        borderColor: '#A7F3D0',
        borderWidth: 1,
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
    },
    allUploadedTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#065F46',
        marginBottom: 4,
    },
    allUploadedDesc: {
        fontSize: 12,
        color: '#047857',
        textAlign: 'center',
        lineHeight: 16,
    },

    // Primary button
    primaryButton: {
        backgroundColor: '#A30D11',
        height: 52,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#A30D11',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
    },
    disabledButton: {
        backgroundColor: '#F2A9A9',
        shadowOpacity: 0,
        elevation: 0,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },

    // SCREEN 2: Add Bank Details Styles
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 20,
    },
    warningBox: {
        flexDirection: 'row',
        backgroundColor: '#FEF3C7',
        borderColor: '#FDE68A',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
    },
    warningTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#B45309',
        marginBottom: 2,
    },
    warningText: {
        fontSize: 11,
        color: '#B45309',
        lineHeight: 15,
    },
    formGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#4B5563',
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1.2,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
    },
    disabledInputWrapper: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
    },
    input: {
        flex: 1,
        height: '100%',
        color: '#111827',
        fontSize: 14,
        fontWeight: '600',
    },
    disabledInput: {
        color: '#6B7280',
    },

    // SCREEN 3: Verification In Progress
    centerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8,
    },
    centerSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 10,
        marginBottom: 24,
    },
    timelineContainer: {
        paddingHorizontal: 10,
        marginBottom: 24,
    },
    timelineRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timelineIcon: {
        marginRight: 14,
    },
    timelineActiveDotContainer: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    spinIcon: {
        transform: [{ rotate: '45deg' }],
    },
    timelineBody: {
        flex: 1,
    },
    timelineTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
    },
    timelineDesc: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
    },
    timelineLine: {
        width: 2,
        height: 20,
        backgroundColor: '#10B981',
        marginLeft: 9,
        marginVertical: 4,
    },
    timelineLineInactive: {
        width: 2,
        height: 20,
        backgroundColor: '#E5E7EB',
        marginLeft: 9,
        marginVertical: 4,
    },
    purpleNoteBox: {
        backgroundColor: '#F5F3FF',
        borderColor: '#DDD6FE',
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        marginBottom: 24,
    },
    purpleNoteTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6D28D9',
        marginBottom: 4,
    },
    purpleNoteText: {
        fontSize: 11,
        color: '#6D28D9',
        lineHeight: 15,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderWidth: 1.5,
        borderColor: '#A30D11',
        height: 48,
        borderRadius: 12,
    },
    refreshButtonText: {
        color: '#A30D11',
        fontSize: 14,
        fontWeight: 'bold',
    },

    // SCREEN 4: Approved Checklist
    verifiedChecklistContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 24,
    },
    verifiedChecklistHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 8,
    },
    verifiedCheckItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    verifiedCheckText: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '600',
    },
});
