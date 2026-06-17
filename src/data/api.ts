const BASE_URL = 'https://rally-staging-9ae8.up.railway.app/api';

export const sendRiderOtp = async (phoneNumber: string): Promise<any> => {
    try {
        const response = await fetch(`${BASE_URL}/riders/otp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber })
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `Failed to send OTP: ${response.statusText}`);
        }
        return await response.text().then(text => text ? JSON.parse(text) : {});
    } catch (error) {
        console.error('Error in sendRiderOtp:', error);
        throw error;
    }
};

export const verifyRiderOtp = async (phoneNumber: string, otp: string): Promise<any> => {
    try {
        const response = await fetch(`${BASE_URL}/riders/otp/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, otp })
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `Failed to verify OTP: ${response.statusText}`);
        }
        const data = await response.json();
        if (data && data.accessToken) {
            localStorage.setItem('rider_token', data.accessToken);
            if (data.accessTokenExpiresAt) {
                localStorage.setItem('rider_token_expires_at', data.accessTokenExpiresAt);
            }
            if (data.refreshToken) {
                localStorage.setItem('rider_refresh_token', data.refreshToken);
            }
            if (data.riderId) {
                localStorage.setItem('rider_id', data.riderId);
            }
        }
        return data;
    } catch (error) {
        console.error('Error in verifyRiderOtp:', error);
        throw error;
    }
};

export const isTokenValid = (): boolean => {
    const token = localStorage.getItem('rider_token');
    const expiresAt = localStorage.getItem('rider_token_expires_at');
    if (!token) return false;
    if (!expiresAt) return true;
    return new Date(expiresAt).getTime() > Date.now();
};

export const authFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('rider_token');
    const headers = new Headers(options.headers || {});
    if (token && isTokenValid()) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
};

export const getRiderProfile = async (): Promise<any> => {
    try {
        const response = await authFetch('/riders/profile');
        if (!response.ok) throw new Error(`Failed to fetch rider profile: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Error in getRiderProfile:', error);
        throw error;
    }
};

export const updateRiderProfile = async (profileData: { name: string; email: string; vehicleNumber: string }): Promise<any> => {
    try {
        const response = await authFetch('/riders/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });
        if (!response.ok) {
            throw new Error(`Failed to update profile: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error in updateRiderProfile:', error);
        throw error;
    }
};

export const setStatusOnline = async (): Promise<boolean> => {
    try {
        const response = await authFetch('/riders/status/online', { method: 'POST' });
        return response.ok;
    } catch (error) {
        console.error('Error setting status online:', error);
        return false;
    }
};

export const setStatusOffline = async (): Promise<boolean> => {
    try {
        const response = await authFetch('/riders/status/offline', { method: 'POST' });
        return response.ok;
    } catch (error) {
        console.error('Error setting status offline:', error);
        return false;
    }
};

export const updateRiderLocation = async (latitude: number, longitude: number): Promise<boolean> => {
    try {
        const response = await authFetch('/riders/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude })
        });
        return response.ok;
    } catch (error) {
        console.warn('Error updating rider location:', error);
        return false;
    }
};

export const getPendingOffer = async (): Promise<any | null> => {
    try {
        const response = await authFetch('/rider/delivery/pending-offer');
        if (response.status === 204) return null;
        if (!response.ok) return null;
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch (error) {
        console.error('Error fetching pending offer:', error);
        return null;
    }
};

export const acceptOffer = async (offerId: string): Promise<boolean> => {
    try {
        const response = await authFetch(`/rider/delivery/offer/${offerId}/accept`, {
            method: 'POST'
        });
        return response.ok;
    } catch (error) {
        console.error('Error accepting offer:', error);
        return false;
    }
};

export const rejectOffer = async (offerId: string, reason: string = 'Declined'): Promise<boolean> => {
    try {
        const response = await authFetch(`/rider/delivery/offer/${offerId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        return response.ok;
    } catch (error) {
        console.error('Error rejecting offer:', error);
        return false;
    }
};

export const markArrivedPickup = async (deliveryId: string): Promise<boolean> => {
    try {
        const response = await authFetch(`/rider/delivery/${deliveryId}/arrived-pickup`, {
            method: 'POST'
        });
        return response.ok;
    } catch (error) {
        console.error('Error marking arrived at pickup:', error);
        return false;
    }
};

export const markPickedUp = async (deliveryId: string, pickupCode: string): Promise<boolean> => {
    try {
        const response = await authFetch(`/rider/delivery/${deliveryId}/pickup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pickupCode })
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || errData.message || `Failed to mark picked up: ${response.statusText}`);
        }
        return true;
    } catch (error) {
        console.error('Error marking picked up:', error);
        throw error;
    }
};

export const markArrivedDrop = async (deliveryId: string): Promise<boolean> => {
    try {
        const response = await authFetch(`/rider/delivery/${deliveryId}/arrived-drop`, {
            method: 'POST'
        });
        return response.ok;
    } catch (error) {
        console.error('Error marking arrived at drop:', error);
        return false;
    }
};

export const markDelivered = async (deliveryId: string, dropCode: string): Promise<boolean> => {
    try {
        const response = await authFetch(`/rider/delivery/${deliveryId}/delivered`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dropCode })
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || errData.message || `Failed to mark delivered: ${response.statusText}`);
        }
        return true;
    } catch (error) {
        console.error('Error marking delivered:', error);
        throw error;
    }
};

export const markFailed = async (deliveryId: string, reason: string, notes: string = '', photoUrl: string = ''): Promise<boolean> => {
    try {
        const response = await authFetch(`/rider/delivery/${deliveryId}/failed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason, notes, photoUrl })
        });
        return response.ok;
    } catch (error) {
        console.error('Error marking delivery failed:', error);
        return false;
    }
};

export const getActiveDelivery = async (): Promise<any | null> => {
    try {
        const response = await authFetch('/rider/delivery/current');
        if (response.status === 204) return null;
        if (!response.ok) return null;
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch (error) {
        console.error('Error fetching current delivery:', error);
        return null;
    }
};

export const getRiderEarnings = async (): Promise<any> => {
    try {
        const response = await authFetch('/riders/earnings');
        if (!response.ok) throw new Error('Failed to fetch rider earnings');
        return await response.json();
    } catch (error) {
        console.error('Error fetching earnings:', error);
        return {
            totalEarnings: 0,
            weeklyEarnings: 0,
            monthlyEarnings: 0,
            pendingPayout: 0,
            recentDeliveries: []
        };
    }
};

export const getKycDocuments = async (riderId: string): Promise<any> => {
    try {
        const response = await authFetch(`/riders/${riderId}/kyc-documents`);
        if (!response.ok) throw new Error('Failed to fetch KYC documents');
        return await response.json();
    } catch (error) {
        console.error('Error in getKycDocuments:', error);
        return [];
    }
};

export const generateKycUploadUrl = async (riderId: string, documentType: string, contentType: string = 'image/jpeg'): Promise<any> => {
    try {
        const response = await authFetch(`/users/riders/${riderId}/kyc/upload-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contentType, documentType })
        });
        if (!response.ok) throw new Error('Failed to generate KYC upload URL');
        return await response.json();
    } catch (error) {
        console.error('Error in generateKycUploadUrl:', error);
        throw error;
    }
};

export const confirmKyc = async (riderId: string, documentType: string, fileKey: string): Promise<any> => {
    try {
        const response = await authFetch(`/users/riders/${riderId}/kyc/confirm`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileKey, documentType })
        });
        if (!response.ok) throw new Error('Failed to confirm KYC document');
        return await response.json();
    } catch (error) {
        console.error('Error in confirmKyc:', error);
        throw error;
    }
};
