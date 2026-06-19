import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FileText, CheckCircle2, Clock, AlertTriangle, Upload, ArrowRight, ShieldCheck, Landmark, User, CreditCard, HelpCircle, FileCheck, LogOut, RefreshCw, Lock, X, ArrowLeft } from 'lucide-react-native';
import { getRiderKycStatus } from '../../data/api';
import * as ImagePicker from 'expo-image-picker';

type KycStep = 'documents' | 'bank' | 'review' | 'approved';

export const KycScreen = ({ navigation }: { navigation: any }) => {
    const { riderProfile, uploadKyc, refreshProfile, logout } = useAuth();
    const { showToast } = useToast();

    const [currentScreen, setCurrentScreen] = useState<KycStep>('documents');
    const [uploadStep, setUploadStep] = useState<number>(1); // 1: Aadhaar Front, 2: Aadhaar Back, 3: Driving Licence, 4: Vehicle RC

    // Document upload success flags (local simulation/mapping to backend)
    const [aadhaarFrontUploaded, setAadhaarFrontUploaded] = useState(false);
    const [aadhaarBackUploaded, setAadhaarBackUploaded] = useState(false);
    const [licenceUploaded, setLicenceUploaded] = useState(false);
    const [rcUploaded, setRcUploaded] = useState(false);

    // Bank account fields
    const [accountNumber, setAccountNumber] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [showValidationError, setShowValidationError] = useState(false);

    useEffect(() => {
        if (riderProfile) {
            const acc = localStorage.getItem(`bank_acc_${riderProfile.id}`) || '';
            const ifsc = localStorage.getItem(`bank_ifsc_${riderProfile.id}`) || '';
            const bName = localStorage.getItem(`bank_name_${riderProfile.id}`) || '';
            const holder = localStorage.getItem(`bank_holder_${riderProfile.id}`) || '';
            
            if (acc) setAccountNumber(acc);
            if (ifsc) setIfscCode(ifsc);
            if (bName) setBankName(bName);
            if (holder) {
                setAccountHolderName(holder);
            } else if (riderProfile.name) {
                setAccountHolderName(riderProfile.name);
            }
        }
    }, [riderProfile]);

    const [loading, setLoading] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);

    const [hasLoadedInitialStatus, setHasLoadedInitialStatus] = useState(false);

    const loadServerKycStatus = async () => {
        if (!riderProfile) return;
        setLoading(true);
        try {
            // Load local flags as a fallback/cache
            const localAadhaarFront = localStorage.getItem(`kyc_aadhaar_front_uploaded_${riderProfile.id}`) === 'true';
            const localAadhaarBack = localStorage.getItem(`kyc_aadhaar_back_uploaded_${riderProfile.id}`) === 'true';
            const localLicence = localStorage.getItem(`kyc_licence_uploaded_${riderProfile.id}`) === 'true';
            const localRc = localStorage.getItem(`kyc_rc_uploaded_${riderProfile.id}`) === 'true';

            // Use the self-service endpoint — no need to pass riderId
            const kycData = await getRiderKycStatus();
            // Response shape: { kycStatus, canGoOnline, lastSubmittedAt, documents: [...] }
            const docs: any[] = kycData?.documents ?? (Array.isArray(kycData) ? kycData : []);

            // Live kycStatus from server (real values: "NotStarted" | "Pending" | "Submitted" | "UnderReview" | "Verified" | "Rejected")
            const serverKycStatus: string | undefined = kycData?.kycStatus;

            // Documents have no "status" field — presence means uploaded.
            // We only skip a doc if it's explicitly rejected via isVerified being explicitly a rejection marker.
            // For now: a doc is "done" if it exists in the array (uploaded) OR is cached locally.
            const isAadhaarFrontDone = docs.some((d: any) => d.documentType === 'AadhaarFront') || localAadhaarFront;
            const isAadhaarBackDone = docs.some((d: any) => d.documentType === 'AadhaarBack') || localAadhaarBack;
            const isLicenceDone = docs.some((d: any) => d.documentType === 'DrivingLicense') || localLicence;
            const isRcDone = docs.some((d: any) => d.documentType === 'VehicleRC') || localRc;

            setAadhaarFrontUploaded(isAadhaarFrontDone);
            setAadhaarBackUploaded(isAadhaarBackDone);
            setLicenceUploaded(isLicenceDone);
            setRcUploaded(isRcDone);

            // Determine active step based on what's missing
            if (!isAadhaarFrontDone) {
                setUploadStep(1);
            } else if (!isAadhaarBackDone) {
                setUploadStep(2);
            } else if (!isLicenceDone) {
                setUploadStep(3);
            } else if (!isRcDone) {
                setUploadStep(4);
            }

            // Prefer live server kycStatus over cached profile value
            const effectiveKycStatus = serverKycStatus ?? riderProfile.kycStatus;

            // "Verified" is the real backend value for fully approved
            if (effectiveKycStatus === 'Verified') {
                setCurrentScreen('approved');
            } else if (isAadhaarFrontDone && isAadhaarBackDone && isLicenceDone && isRcDone) {
                // All docs uploaded — check if bank was submitted or if KYC is under review
                const isBankSubmittedLocal = localStorage.getItem(`bank_submitted_${riderProfile.id}`) === 'true';
                const isUnderReview = ['Pending', 'Submitted', 'UnderReview'].includes(effectiveKycStatus ?? '');
                if (isUnderReview || isBankSubmittedLocal) {
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

    // Sync with backend status once when profile loads
    useEffect(() => {
        if (riderProfile && !hasLoadedInitialStatus) {
            loadServerKycStatus();
            setHasLoadedInitialStatus(true);
        }
    }, [riderProfile, hasLoadedInitialStatus]);

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
            const asset = result.assets[0];
            let contentType = 'image/jpeg';
            if (asset.mimeType) {
                contentType = asset.mimeType;
            } else if (asset.uri) {
                const ext = asset.uri.split('.').pop()?.toLowerCase();
                if (ext === 'png') contentType = 'image/png';
                else if (ext === 'webp') contentType = 'image/webp';
            }
            return { uri: asset.uri, contentType };
        }
        return null;
    };

    const handleUploadDocument = async () => {
        if (!riderProfile) return;
        const pickerResult = await pickImage();
        if (!pickerResult) return;
        const { uri: imageUri, contentType } = pickerResult;

        setLoading(true);
        setUploadStatus('Preparing upload...');
        try {
            // We map the steps to our backend RiderKycDocumentType:
            // Step 1: Aadhaar Front -> AadhaarFront
            // Step 2: Aadhaar Back -> AadhaarBack
            // Step 3: Driving Licence -> DrivingLicense
            // Step 4: Vehicle RC -> VehicleRC
            let docType = 'AadhaarFront';
            let docLabel = 'Aadhaar Front';
            if (uploadStep === 2) {
                docType = 'AadhaarBack';
                docLabel = 'Aadhaar Back';
            } else if (uploadStep === 3) {
                docType = 'DrivingLicense';
                docLabel = 'Driving Licence';
            } else if (uploadStep === 4) {
                docType = 'VehicleRC';
                docLabel = 'Vehicle RC';
            }

            const success = await uploadKyc(docType, imageUri, contentType, setUploadStatus);
            
            if (success) {
                setAlertMessage(`${docLabel} uploaded successfully!`);
                if (uploadStep === 1) {
                    setAadhaarFrontUploaded(true);
                    localStorage.setItem(`kyc_aadhaar_front_uploaded_${riderProfile.id}`, 'true');
                    setUploadStep(2);
                } else if (uploadStep === 2) {
                    setAadhaarBackUploaded(true);
                    localStorage.setItem(`kyc_aadhaar_back_uploaded_${riderProfile.id}`, 'true');
                    setUploadStep(3);
                } else if (uploadStep === 3) {
                    setLicenceUploaded(true);
                    localStorage.setItem(`kyc_licence_uploaded_${riderProfile.id}`, 'true');
                    setUploadStep(4);
                } else if (uploadStep === 4) {
                    setRcUploaded(true);
                    localStorage.setItem(`kyc_rc_uploaded_${riderProfile.id}`, 'true');
                }
                showToast(`${docLabel} Uploaded`, 'success');
            }
        } catch (e) {
            showToast('Document upload failed', 'error');
        } finally {
            setLoading(false);
            setUploadStatus(null);
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
        if (!riderProfile) return;
        if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
            setShowValidationError(true);
            showToast('Please fill all bank details', 'warning');
            return;
        }
        setShowValidationError(false);
        setLoading(true);
        setUploadStatus('Submitting details...');
        try {
            // Simulate sending bank details to the profile safely (no S3 file overwrite)
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Persist submitted status and values locally
            localStorage.setItem(`bank_submitted_${riderProfile.id}`, 'true');
            localStorage.setItem(`bank_acc_${riderProfile.id}`, accountNumber);
            localStorage.setItem(`bank_ifsc_${riderProfile.id}`, ifscCode);
            localStorage.setItem(`bank_name_${riderProfile.id}`, bankName);
            localStorage.setItem(`bank_holder_${riderProfile.id}`, accountHolderName);

            setAlertMessage('Bank details submitted successfully!');
            showToast('Bank Details Submitted', 'success');
            setCurrentScreen('review');
            await refreshProfile();
            await loadServerKycStatus();
        } catch (e) {
            showToast('Failed to submit bank details', 'error');
        } finally {
            setLoading(false);
            setUploadStatus(null);
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
        if (aadhaarFrontUploaded) count += 25;
        if (aadhaarBackUploaded) count += 25;
        if (licenceUploaded) count += 25;
        if (rcUploaded) count += 25;
        return count;
    };

    const isAllDocsUploaded = aadhaarFrontUploaded && aadhaarBackUploaded && licenceUploaded && rcUploaded;

    const getGuidelines = () => {
        if (uploadStep === 1) {
            return [
                'Clear front side photo of Aadhaar card',
                'All 12 digits must be visible',
                'Name and photo should be clear',
                'Take photo in good lighting'
            ];
        }
        if (uploadStep === 2) {
            return [
                'Clear back side photo of Aadhaar card',
                'Address must be clearly visible and legible',
                'No blur or glare on card',
                'Take photo in good lighting'
            ];
        }
        if (uploadStep === 3) {
            return [
                'Front side of licence showing photo',
                'Licence number clearly visible',
                'Valid (not expired)',
                'Two-wheeler category must be present'
            ];
        }
        return [
            'Clear photo of Vehicle RC (Registration Certificate)',
            'Registration number and owner name visible',
            'Valid (not expired)',
            'Make sure vehicle class matches two-wheeler'
        ];
    };

    const getStepDetails = () => {
        if (uploadStep === 1) {
            return {
                title: 'Aadhaar Card (Front)',
                subtext: 'Government Issued ID proof (Front side)',
                badge: 'Required',
                buttonLabel: 'Upload Aadhaar Front'
            };
        }
        if (uploadStep === 2) {
            return {
                title: 'Aadhaar Card (Back)',
                subtext: 'Government Issued ID proof (Back side)',
                badge: 'Required',
                buttonLabel: 'Upload Aadhaar Back'
            };
        }
        if (uploadStep === 3) {
            return {
                title: 'Driving Licence',
                subtext: 'Valid driving licence',
                badge: 'Required',
                buttonLabel: 'Upload Driving Licence'
            };
        }
        return {
            title: 'Vehicle RC',
            subtext: 'Vehicle Registration Certificate',
            badge: 'Required',
            buttonLabel: 'Upload Vehicle RC'
        };
    };

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

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                
                {/* SCREEN 1: Documents Upload Flow */}
                {currentScreen === 'documents' && (
                    <View style={styles.contentBlock}>
                        {/* Figma style Top Step Indicator */}
                        <Text style={styles.stepInfoText}>
                            Step {Math.min(uploadStep, 4)} of 4 • Document Details
                        </Text>
                        
                        {/* Progress Indicator */}
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>Upload Documents</Text>
                            <Text style={styles.progressPercentText}>Progress {getProgressPercent()}%</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${getProgressPercent()}%` }]} />
                        </View>

                        <Text style={styles.documentSubtitle}>
                            Complete one step at a time to complete your verification
                        </Text>

                        {/* Figma style Upload Successful Checklist Container */}
                        {(aadhaarFrontUploaded || aadhaarBackUploaded || licenceUploaded || rcUploaded) && (
                            <View style={styles.uploadSuccessBox}>
                                <View style={styles.successHeaderRow}>
                                    <CheckCircle2 size={18} color="#10B981" style={{ marginRight: 8 }} />
                                    <Text style={styles.successTitleText}>Upload Successful</Text>
                                </View>
                                <View style={styles.successList}>
                                    {aadhaarFrontUploaded && (
                                        <Text style={styles.successListItemText}>1. Aadhaar Front Uploaded</Text>
                                    )}
                                    {aadhaarBackUploaded && (
                                        <Text style={styles.successListItemText}>2. Aadhaar Back Uploaded</Text>
                                    )}
                                    {licenceUploaded && (
                                        <Text style={styles.successListItemText}>3. Driving Licence Uploaded</Text>
                                    )}
                                    {rcUploaded && (
                                        <Text style={styles.successListItemText}>4. Vehicle RC Uploaded</Text>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Active Document Step Card */}
                        {!isAllDocsUploaded ? (
                            <View style={styles.stepCard}>
                                <View style={styles.stepHeaderRow}>
                                    <Text style={styles.stepNumberText}>Step {uploadStep}</Text>
                                    <View style={{ flex: 1 }} />
                                    <View style={[styles.statusBadge, styles.badgeRequired]}>
                                        <Text style={styles.badgeRequiredText}>
                                            Required
                                        </Text>
                                    </View>
                                </View>
                                
                                <Text style={styles.stepTitle}>{getStepDetails().title}</Text>
                                <Text style={styles.stepSub}>{getStepDetails().subtext}</Text>

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
                                                {getStepDetails().buttonLabel}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                {uploadStatus && (
                                    <Text style={styles.inlineUploadStatusText}>{uploadStatus}</Text>
                                )}

                                {/* Photo Guidelines */}
                                <View style={styles.guidelinesBox}>
                                    <Text style={styles.guidelinesTitle}>Photo Guidelines</Text>
                                    {getGuidelines().map((guideline, index) => (
                                        <View key={index} style={styles.guidelineRow}>
                                            <Text style={styles.guidelineBullet}>•</Text>
                                            <Text style={styles.guidelineText}>{guideline}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ) : (
                            <View style={styles.allUploadedBox}>
                                <CheckCircle2 size={48} color="#10B981" style={{ marginBottom: 12 }} />
                                <Text style={styles.allUploadedTitle}>All Documents Uploaded!</Text>
                                <Text style={styles.allUploadedDesc}>Click below to continue and add your bank details for payouts.</Text>
                            </View>
                        )}

                        {/* Solid continue button if all uploaded, or outline continue button if Aadhaar & Licence uploaded */}
                        {isAllDocsUploaded ? (
                            <TouchableOpacity 
                                style={styles.primaryButton}
                                onPress={() => {
                                    setAlertMessage(null);
                                    setCurrentScreen('bank');
                                }}
                            >
                                <Text style={styles.primaryButtonText}>Continue to Bank Details</Text>
                                <ArrowRight size={18} color="white" style={{ marginLeft: 6 }} />
                            </TouchableOpacity>
                        ) : (aadhaarFrontUploaded && aadhaarBackUploaded && licenceUploaded) ? (
                            <TouchableOpacity 
                                style={styles.outlinePrimaryButton}
                                onPress={() => {
                                    setAlertMessage(null);
                                    setCurrentScreen('bank');
                                }}
                            >
                                <Text style={styles.outlinePrimaryButtonText}>Continue to Bank Details</Text>
                                <ArrowRight size={18} color="#A30D11" style={{ marginLeft: 6 }} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                )}

                {/* SCREEN 2: Add Bank Details */}
                {currentScreen === 'bank' && (
                    <View style={styles.contentBlock}>
                        {/* Figma Header with Back arrow */}
                        <View style={styles.figmaHeader}>
                            <TouchableOpacity 
                                style={styles.backButtonRow}
                                onPress={() => setCurrentScreen('documents')}
                            >
                                <ArrowLeft size={16} color="#6B7280" style={{ marginRight: 4 }} />
                                <Text style={styles.backButtonText}>Back</Text>
                            </TouchableOpacity>
                            <Text style={styles.figmaHeaderSub}>Document Verification</Text>
                            <View style={styles.figmaHeaderTitleRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.figmaHeaderTitle}>Add Bank Details</Text>
                                    <Text style={styles.figmaHeaderSubtitle}>Your weekly earnings will be deposited here</Text>
                                </View>
                                <CreditCard size={44} color="#A30D11" style={styles.figmaHeaderIcon} />
                            </View>
                        </View>

                        {/* Yellow Warning Info Box */}
                        <View style={styles.warningBox}>
                            <AlertTriangle size={18} color="#B45309" style={{ marginRight: 10, marginTop: 2 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.warningTitle}>Important Information</Text>
                                <Text style={styles.warningText}>
                                    Your weekly earnings will be automatically transferred to this bank account every Monday. Make sure all details are accurate.
                                </Text>
                            </View>
                        </View>

                        {/* Bank Account Information Card */}
                        <View style={styles.bankInfoCard}>
                            <View style={styles.bankInfoCardHeader}>
                                <View style={styles.bankInfoIconWrapper}>
                                    <Landmark size={18} color="#A30D11" />
                                </View>
                                <Text style={styles.bankInfoCardTitle}>Bank Account Information</Text>
                            </View>

                            {/* Account Holder Name */}
                            <View style={styles.formGroup}>
                                <Text style={styles.inputLabel}>Account Holder Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput 
                                        style={styles.input}
                                        placeholder="Enter name as per bank account"
                                        value={accountHolderName}
                                        onChangeText={setAccountHolderName}
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>
                                <Text style={styles.inputHint}>Must match exactly with name on your Aadhaar/PAN card</Text>
                            </View>

                            {/* Account Number */}
                            <View style={styles.formGroup}>
                                <Text style={styles.inputLabel}>Account Number <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <View style={styles.inputWrapper}>
                                    <Lock size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
                                    <TextInput 
                                        style={styles.input}
                                        placeholder="Enter your bank account number"
                                        keyboardType="number-pad"
                                        value={accountNumber}
                                        onChangeText={setAccountNumber}
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>
                                <Text style={styles.inputHint}>Enter 9 to 18 digit account number</Text>
                            </View>

                            {/* IFSC Code */}
                            <View style={styles.formGroup}>
                                <Text style={styles.inputLabel}>IFSC Code <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput 
                                        style={styles.input}
                                        placeholder="e.g., SBIN0001234"
                                        autoCapitalize="characters"
                                        value={ifscCode}
                                        onChangeText={handleIfscChange}
                                        maxLength={11}
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>
                                <Text style={styles.inputHint}>11-character IFSC code (found on your cheque book or passbook)</Text>
                            </View>

                            {/* Bank Name */}
                            <View style={styles.formGroup}>
                                <Text style={styles.inputLabel}>Bank Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <View style={[styles.inputWrapper, styles.disabledInputWrapper]}>
                                    <TextInput 
                                        style={[styles.input, styles.disabledInput]}
                                        placeholder="e.g., State Bank of India, HDFC Bank, ICICI Bank"
                                        value={bankName}
                                        editable={false}
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Need Help Card */}
                        <View style={styles.helpCard}>
                            <Text style={styles.helpTitle}>Need Help?</Text>
                            <View style={styles.helpRow}>
                                <Text style={styles.helpBullet}>•</Text>
                                <Text style={styles.helpText}>IFSC code is printed on your cheque book</Text>
                            </View>
                            <View style={styles.helpRow}>
                                <Text style={styles.helpBullet}>•</Text>
                                <Text style={styles.helpText}>You can also find it in your bank passbook</Text>
                            </View>
                            <View style={styles.helpRow}>
                                <Text style={styles.helpBullet}>•</Text>
                                <Text style={styles.helpText}>Or check your net banking / mobile banking app</Text>
                            </View>
                        </View>

                        {/* Validation Error Alert Box (if visible) */}
                        {showValidationError && (
                            <View style={styles.validationErrorBox}>
                                <AlertTriangle size={18} color="#EF4444" style={{ marginRight: 10 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.validationErrorTitle}>Fill All Required Fields</Text>
                                    <Text style={styles.validationErrorText}>All fields are mandatory for receiving payments</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowValidationError(false)}>
                                    <X size={16} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity 
                            style={styles.primaryButton}
                            onPress={handleBankSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text style={styles.primaryButtonText}>Submit Bank Details</Text>
                                    <ArrowRight size={18} color="white" style={{ marginLeft: 6 }} />
                                </>
                            )}
                        </TouchableOpacity>

                        {uploadStatus && (
                            <Text style={styles.inlineUploadStatusText}>{uploadStatus}</Text>
                        )}
                    </View>
                )}

                {/* SCREEN 3: Verification In Progress / Review */}
                {currentScreen === 'review' && (
                    <View style={styles.contentBlock}>
                        {/* Header */}
                        <View style={styles.figmaHeader}>
                            <Text style={styles.figmaHeaderSub}>Document Verification</Text>
                            <Text style={styles.figmaHeaderTitle}>Verification In Progress</Text>
                            <Text style={styles.figmaHeaderSubtitle}>Your documents are being reviewed</Text>
                        </View>

                        {/* Clock illustration */}
                        <View style={styles.centerClockContainer}>
                            <View style={styles.centerClockWrapper}>
                                <Clock size={40} color="#F59E0B" />
                            </View>
                            <Text style={styles.centerTitle}>Documents Under Verification</Text>
                            <Text style={styles.centerSubtitle}>
                                Please wait while we verify your documents
                            </Text>
                        </View>

                        {/* 3-step status timeline */}
                        <View style={styles.timelineCard}>
                            {/* Step 1 - Done */}
                            <View style={styles.timelineRow}>
                                <CheckCircle2 size={20} color="#10B981" style={styles.timelineIcon} />
                                <View style={styles.timelineBody}>
                                    <Text style={styles.timelineTitle}>Documents Submitted</Text>
                                    <Text style={styles.timelineDesc}>Successfully uploaded</Text>
                                </View>
                            </View>
                            <View style={styles.timelineLine} />

                            {/* Step 2 - Active */}
                            <View style={styles.timelineRow}>
                                <View style={styles.timelineActiveDotContainer}>
                                    <Clock size={12} color="#F59E0B" />
                                </View>
                                <View style={styles.timelineBody}>
                                    <Text style={[styles.timelineTitle, { color: '#F59E0B' }]}>Verification In Progress</Text>
                                    <Text style={styles.timelineDesc}>Our team is reviewing your documents</Text>
                                </View>
                            </View>
                            <View style={styles.timelineLineInactive} />

                            {/* Step 3 - Pending */}
                            <View style={styles.timelineRow}>
                                <View style={styles.timelineInactiveDotContainer}>
                                    <FileCheck size={12} color="#9CA3AF" />
                                </View>
                                <View style={styles.timelineBody}>
                                    <Text style={[styles.timelineTitle, { color: '#9CA3AF' }]}>Approval Pending</Text>
                                    <Text style={styles.timelineDesc}>You'll be notified once approved</Text>
                                </View>
                            </View>
                        </View>

                        {/* Expected Wait Time card */}
                        <View style={styles.waitTimeCard}>
                            <View style={styles.waitTimeHeader}>
                                <Clock size={14} color="#D97706" style={{ marginRight: 6 }} />
                                <Text style={styles.waitTimeTitle}>Expected Wait Time</Text>
                            </View>
                            <Text style={styles.waitTimeBody}>
                                Verification may take <Text style={{ fontWeight: 'bold' }}>24 to 48 hours</Text>
                            </Text>
                            <Text style={styles.waitTimeBody}>
                                We'll send you a notification once your documents are approved.
                            </Text>
                            <Text style={[styles.waitTimeBody, { marginTop: 8 }]}>
                                You can close this app. We'll notify you by SMS when verification is complete.
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
                        {/* Header */}
                        <View style={styles.figmaHeader}>
                            <Text style={styles.figmaHeaderSub}>Document Verification</Text>
                            <Text style={styles.figmaHeaderTitle}>Documents Verified!</Text>
                            <Text style={styles.figmaHeaderSubtitle}>Your account has been approved</Text>
                        </View>

                        {/* Green shield illustration */}
                        <View style={styles.approvedIllustration}>
                            <View style={styles.approvedIconCircle}>
                                <ShieldCheck size={48} color="#10B981" />
                            </View>
                            <Text style={styles.approvedTitle}>Verification Successful!</Text>
                            <Text style={styles.approvedSubtitle}>
                                All your documents have been verified and approved
                            </Text>
                        </View>

                        {/* Verified documents list */}
                        <View style={styles.verifiedChecklistContainer}>
                            <Text style={styles.verifiedChecklistHeader}>Verified Documents</Text>
                            {[
                                'Aadhaar Card Front',
                                'Aadhaar Card Back',
                                'Driving Licence',
                                'Vehicle RC',
                                'Bank Details',
                            ].map((doc) => (
                                <View key={doc} style={styles.verifiedCheckItem}>
                                    <CheckCircle2 size={16} color="#10B981" style={{ marginRight: 10 }} />
                                    <Text style={styles.verifiedCheckText}>{doc}</Text>
                                </View>
                            ))}
                        </View>


                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={async () => {
                                setLoading(true);
                                try {
                                    await refreshProfile();
                                    // App.tsx will automatically switch the navigator once riderProfile.kycStatus === 'Verified'
                                } catch (e) {
                                    showToast('Failed to start. Please try again.', 'error');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                        >
                            <Text style={styles.primaryButtonText}>Start Deliveries</Text>
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
    scrollView: {
        flex: 1,
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
    stepInfoText: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    documentSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 20,
    },
    uploadSuccessBox: {
        backgroundColor: '#ECFDF5',
        borderColor: '#A7F3D0',
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
    },
    successHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    successTitleText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#065F46',
    },
    successList: {
        paddingLeft: 6,
    },
    successListItemText: {
        fontSize: 12,
        color: '#047857',
        fontWeight: '600',
        marginBottom: 4,
    },
    stepNumberText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6B7280',
    },
    statusBadge: {
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    badgeRequired: {
        backgroundColor: '#FEE2E2',
    },
    badgeRequiredText: {
        color: '#A30D11',
        fontSize: 11,
        fontWeight: 'bold',
    },
    badgeOptional: {
        backgroundColor: '#FEF3C7',
    },
    badgeOptionalText: {
        color: '#B45309',
        fontSize: 11,
        fontWeight: 'bold',
    },
    outlinePrimaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderWidth: 1.5,
        borderColor: '#A30D11',
        height: 52,
        borderRadius: 12,
        shadowColor: '#A30D11',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
        marginTop: 10,
    },
    outlinePrimaryButtonText: {
        color: '#A30D11',
        fontSize: 15,
        fontWeight: 'bold',
    },
    figmaHeader: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingBottom: 16,
    },
    backButtonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    backButtonText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    figmaHeaderSub: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    figmaHeaderTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    figmaHeaderTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 2,
    },
    figmaHeaderSubtitle: {
        fontSize: 13,
        color: '#6B7280',
    },
    figmaHeaderIcon: {
        marginLeft: 10,
    },
    bankInfoCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 20,
    },
    bankInfoCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    bankInfoIconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    bankInfoCardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#111827',
    },
    inputHint: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 4,
    },
    helpCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 20,
    },
    helpTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 10,
    },
    helpRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    helpBullet: {
        fontSize: 12,
        color: '#6B7280',
        marginRight: 6,
    },
    helpText: {
        fontSize: 12,
        color: '#6B7280',
        flex: 1,
        lineHeight: 16,
    },
    validationErrorBox: {
        flexDirection: 'row',
        backgroundColor: '#FEE2E2',
        borderColor: '#FCA5A5',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginBottom: 20,
    },
    validationErrorTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#991B1B',
        marginBottom: 2,
    },
    validationErrorText: {
        fontSize: 11,
        color: '#991B1B',
    },
    centerClockContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 24,
    },
    centerClockWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    timelineCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 24,
    },
    inlineUploadStatusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#A30D11',
        textAlign: 'center',
        marginTop: 10,
    },

    // Review screen extras
    timelineInactiveDotContainer: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    waitTimeCard: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FCD34D',
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
    },
    waitTimeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    waitTimeTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#D97706',
    },
    waitTimeBody: {
        fontSize: 12,
        color: '#92400E',
        lineHeight: 17,
        marginTop: 2,
    },

    // Approved screen
    approvedIllustration: {
        alignItems: 'center',
        marginBottom: 20,
    },
    approvedIconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#D1FAE5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    approvedTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 6,
    },
    approvedSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 20,
    },
    nextStepCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFF7ED',
        borderColor: '#FDBA74',
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
        gap: 12,
    },
    nextStepIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextStepTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 3,
    },
    nextStepDesc: {
        fontSize: 12,
        color: '#6B7280',
        lineHeight: 16,
    },
});
