import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getRiderProfile, updateRiderProfile, updateRiderBankDetails, sendRiderOtp, verifyRiderOtp, isTokenValid, generateKycUploadUrl, confirmKyc, getRiderKycStatus, refreshRiderToken, isTokenExpiredOrExpiringSoon, setUnauthorizedHandler } from '../../data/api';
import { useToast } from './ToastContext';
import { localStorage } from '../../utils/storage';

export interface RiderProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
    kycStatus: 'Pending' | 'Approved' | 'Rejected' | 'None' | string;
    bankAccountNumber?: string;
    bankIfscCode?: string;
    bankAccountName?: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    token: string | null;
    riderProfile: RiderProfile | null;
    isLoading: boolean;
    isSendingOtp: boolean;
    isVerifyingOtp: boolean;
    isUpdatingProfile: boolean;
    sendOtpCode: (phoneNumber: string) => Promise<boolean>;
    verifyOtpCode: (phoneNumber: string, otp: string) => Promise<boolean>;
    updateProfile: (profileData: { name: string; email: string; vehicleNumber: string }) => Promise<boolean>;
    updateBankDetails: (bankData: { bankAccountNumber: string; bankIfscCode: string; bankAccountName: string }) => Promise<boolean>;
    uploadKyc: (documentType: string, fileUri: string, contentType?: string, onStatusChange?: (status: string) => void) => Promise<boolean>;
    refreshProfile: () => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getInitialProfile = (): RiderProfile | null => {
    try {
        const stored = localStorage.getItem('rider_profile');
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('rider_token'));
    const [riderProfile, setRiderProfileState] = useState<RiderProfile | null>(getInitialProfile);

    const setRiderProfile = (profileOrFn: RiderProfile | null | ((prev: RiderProfile | null) => RiderProfile | null)) => {
        setRiderProfileState(prev => {
            const next = typeof profileOrFn === 'function' ? profileOrFn(prev) : profileOrFn;
            if (next) {
                localStorage.setItem('rider_profile', JSON.stringify(next));
            } else {
                localStorage.removeItem('rider_profile');
            }
            return next;
        });
    };

    const [isLoading, setIsLoading] = useState(true);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const { showToast } = useToast();

    const logout = useCallback(() => {
        localStorage.removeItem('rider_token');
        localStorage.removeItem('rider_token_expires_at');
        localStorage.removeItem('rider_refresh_token');
        localStorage.removeItem('rider_id');
        setToken(null);
        setRiderProfile(null);
    }, []);

    useEffect(() => {
        setUnauthorizedHandler(() => {
            console.warn('[Auth] Unauthorized handler invoked. Logging out...');
            logout();
        });
    }, [logout]);

    // Load initial token and profile
    const loadStoredAuth = useCallback(async () => {
        setIsLoading(true);
        try {
            let storedToken = localStorage.getItem('rider_token');
            const refreshToken = localStorage.getItem('rider_refresh_token');

            if (storedToken) {
                // Proactively refresh on mount if token is expiring soon
                if (isTokenExpiredOrExpiringSoon() && refreshToken) {
                    console.log('[Auth] Startup token refresh triggered...');
                    const newToken = await refreshRiderToken();
                    if (newToken) {
                        storedToken = newToken;
                    }
                }

                if (storedToken && isTokenValid()) {
                    // Fetch profile and real KYC status concurrently in background
                    const [profile, kycData] = await Promise.all([
                        getRiderProfile().catch(() => null),
                        getRiderKycStatus().catch(() => null)
                    ]);
                    
                    if (profile) {
                        setToken(storedToken);
                        const mergedStatus = kycData?.kycStatus || kycData?.status || profile.kycStatus;
                        if (mergedStatus) {
                            profile.kycStatus = mergedStatus;
                        }
                        setRiderProfile(profile);
                    } else {
                        console.warn('[Auth] Server rejected token or rider profile unavailable. Logging out...');
                        logout();
                    }
                } else {
                    console.warn('[Auth] Stored token invalid or expired. Logging out...');
                    logout();
                }
            } else {
                setToken(null);
                setRiderProfile(null);
            }
        } catch (e) {
            console.error('Failed to load auth credentials:', e);
            logout();
        } finally {
            setIsLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        loadStoredAuth();
    }, [loadStoredAuth]);

    const sendOtpCode = async (phoneNumber: string): Promise<boolean> => {
        setIsSendingOtp(true);
        try {
            await sendRiderOtp(phoneNumber);
            showToast('OTP sent successfully', 'success');
            return true;
        } catch (error: any) {
            showToast(error.message || 'Failed to send OTP', 'error');
            return false;
        } finally {
            setIsSendingOtp(false);
        }
    };

    const verifyOtpCode = async (phoneNumber: string, otp: string): Promise<boolean> => {
        setIsVerifyingOtp(true);
        try {
            const response = await verifyRiderOtp(phoneNumber, otp);
            if (response && response.accessToken) {
                // Ensure token is stored in localStorage for authFetch requests
                localStorage.setItem('rider_token', response.accessToken);
                
                // Fetch profile and KYC status concurrently BEFORE triggering navigation re-render
                const [profile, kycData] = await Promise.all([
                    getRiderProfile().catch(() => null),
                    getRiderKycStatus().catch(() => null)
                ]);
                
                if (profile) {
                    const mergedStatus = kycData?.kycStatus || kycData?.status || profile.kycStatus;
                    if (mergedStatus) {
                        profile.kycStatus = mergedStatus;
                    }
                    // Set both states at the exact same moment to switch straight to Dashboard
                    setRiderProfile(profile);
                    setToken(response.accessToken);
                } else {
                    setToken(response.accessToken);
                }
                showToast('Signed in successfully', 'success');
                return true;
            }
            throw new Error('Invalid token returned');
        } catch (error: any) {
            showToast(error.message || 'OTP verification failed', 'error');
            return false;
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const updateProfile = async (profileData: { name: string; email: string; vehicleNumber: string }): Promise<boolean> => {
        setIsUpdatingProfile(true);
        try {
            const updated = await updateRiderProfile(profileData);
            setRiderProfile((prev: RiderProfile | null) => prev ? { ...prev, ...updated } : updated);
            showToast('Profile updated successfully', 'success');
            return true;
        } catch (error: any) {
            showToast(error.message || 'Failed to update profile', 'error');
            return false;
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const updateBankDetails = async (bankData: { bankAccountNumber: string; bankIfscCode: string; bankAccountName: string }): Promise<boolean> => {
        setIsUpdatingProfile(true);
        try {
            const updated = await updateRiderBankDetails(bankData);
            setRiderProfile((prev: RiderProfile | null) => prev ? { ...prev, ...updated } : updated);
            showToast('Bank details updated successfully', 'success');
            return true;
        } catch (error: any) {
            showToast(error.message || 'Failed to update bank details', 'error');
            return false;
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const uploadKyc = async (
        documentType: string, 
        fileUri: string, 
        contentType: string = 'image/jpeg',
        onStatusChange?: (status: string) => void
    ): Promise<boolean> => {
        if (!riderProfile) return false;
        try {
            onStatusChange?.('Generating upload URL...');
            
            // 1. Generate pre-signed URL from backend
            const uploadDetails = await generateKycUploadUrl(riderProfile.id, documentType, contentType);
            const { uploadUrl, fileKey } = uploadDetails;

            // 2. Upload file to URL
            onStatusChange?.('Uploading document...');
            // Since we are mocking the native upload or running in Expo client without a real S3 backend configure, 
            // we will simulate the PUT request or perform a fallback mock if the upload URL is empty/mocked.
            if (uploadUrl && uploadUrl.startsWith('http')) {
                const localFileRes = await fetch(fileUri);
                const blob = await localFileRes.blob();
                
                const response = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': contentType },
                    body: blob
                });
                if (!response.ok) {
                    throw new Error('File upload to storage failed');
                }
            } else {
                // Mock network delay
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            // 3. Confirm KYC document with backend
            onStatusChange?.('Confirming with server...');
            await confirmKyc(riderProfile.id, documentType, fileKey || 'mock-file-key');
            
            showToast(`${documentType} uploaded successfully!`, 'success');
            await refreshProfile();
            return true;
        } catch (error: any) {
            console.error('KYC Upload failed:', error);
            showToast(error.message || 'KYC document upload failed', 'error');
            return false;
        }
    };

    const refreshProfile = async () => {
        try {
            const [profile, kycData] = await Promise.all([
                getRiderProfile(),
                getRiderKycStatus().catch(() => null)
            ]);

            console.log("refreshProfile -> profile:", profile);
            console.log("refreshProfile -> kycData:", kycData);

            const mergedStatus = kycData?.kycStatus || kycData?.status || profile?.kycStatus;
            const updatedProfile = profile ? { ...profile, kycStatus: mergedStatus } : null;

            setRiderProfile(updatedProfile);
            console.log("refreshProfile -> riderProfile updated to:", updatedProfile);
        } catch (e) {
            console.warn('Failed to refresh rider profile:', e);
        }
    };

    const isAuthenticated = !!token && isTokenValid() && !!riderProfile;

    // Periodically check and refresh token in the background when authenticated
    useEffect(() => {
        if (!isAuthenticated) return;

        const checkAndRefresh = async () => {
            const refreshToken = localStorage.getItem('rider_refresh_token');
            if (isAuthenticated && refreshToken && isTokenExpiredOrExpiringSoon()) {
                console.log('[Auth] Background token refresh triggered...');
                const newToken = await refreshRiderToken();
                if (newToken) {
                    setToken(newToken);
                } else {
                    // Refresh failed (e.g. refresh token is revoked/expired), logout the user
                    logout();
                    showToast('Session expired. Please sign in again.', 'warning');
                }
            }
        };

        const interval = setInterval(checkAndRefresh, 60000); // Check every minute
        checkAndRefresh(); // Check immediately on auth state change

        return () => clearInterval(interval);
    }, [isAuthenticated, logout, showToast]);

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            token,
            riderProfile,
            isLoading,
            isSendingOtp,
            isVerifyingOtp,
            isUpdatingProfile,
            sendOtpCode,
            verifyOtpCode,
            updateProfile,
            updateBankDetails,
            uploadKyc,
            refreshProfile,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
