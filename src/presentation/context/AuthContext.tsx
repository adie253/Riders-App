import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getRiderProfile, updateRiderProfile, sendRiderOtp, verifyRiderOtp, isTokenValid, generateKycUploadUrl, confirmKyc, getRiderKycStatus, refreshRiderToken, isTokenExpiredOrExpiringSoon } from '../../data/api';
import { useToast } from './ToastContext';

export interface RiderProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
    kycStatus: 'Pending' | 'Approved' | 'Rejected' | 'None' | string;
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
    uploadKyc: (documentType: string, fileUri: string, contentType?: string, onStatusChange?: (status: string) => void) => Promise<boolean>;
    refreshProfile: () => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [riderProfile, setRiderProfile] = useState<RiderProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const { showToast } = useToast();

    // Load initial token and profile
    const loadStoredAuth = useCallback(async () => {
        setIsLoading(true);
        try {
            let storedToken = localStorage.getItem('rider_token');
            const refreshToken = localStorage.getItem('rider_refresh_token');

            if (storedToken) {
                // Proactively refresh on mount if token is expiring soon
                if (isTokenExpiredOrExpiringSoon() && refreshToken) {
                    const newToken = await refreshRiderToken();
                    if (newToken) {
                        storedToken = newToken;
                    }
                }

                if (storedToken && isTokenValid()) {
                    setToken(storedToken);
                    // Fetch profile and real KYC status concurrently
                    const [profile, kycData] = await Promise.all([
                        getRiderProfile(),
                        getRiderKycStatus().catch(() => null) // Fallback if it fails
                    ]);
                    
                    // Merge real KYC status into the profile if available
                    if (kycData && kycData.kycStatus) {
                        profile.kycStatus = kycData.kycStatus;
                    }
                    
                    setRiderProfile(profile);
                } else {
                    // Token invalid/expired and refresh failed
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
    }, []);

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
                setToken(response.accessToken);
                // Fetch profile
                const profile = await getRiderProfile();
                setRiderProfile(profile);
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
            setRiderProfile(updated);
            showToast('Profile updated successfully', 'success');
            return true;
        } catch (error: any) {
            showToast(error.message || 'Failed to update profile', 'error');
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

            if (kycData && kycData.kycStatus) {
                profile.kycStatus = kycData.kycStatus;
            }

            setRiderProfile(profile);
            console.log("refreshProfile -> riderProfile updated to:", profile);
        } catch (e) {
            console.warn('Failed to refresh rider profile:', e);
        }
    };

    const logout = () => {
        localStorage.removeItem('rider_token');
        localStorage.removeItem('rider_token_expires_at');
        localStorage.removeItem('rider_refresh_token');
        localStorage.removeItem('rider_id');
        setToken(null);
        setRiderProfile(null);
        showToast('Logged out successfully', 'info');
    };

    const isAuthenticated = !!token && isTokenValid();

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
