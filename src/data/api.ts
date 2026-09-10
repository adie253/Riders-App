import { localStorage } from '../utils/storage';

const BASE_URL = 'https://rally-staging-9ae8.up.railway.app/api/v1';

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
            const jwtExpMs = getJwtExpirationMs(data.accessToken);
            const actualExpiresAt = data.accessTokenExpiresAt 
                || (jwtExpMs ? new Date(jwtExpMs).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
            localStorage.setItem('rider_token_expires_at', actualExpiresAt);
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

const decodeBase64 = (str: string): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    str = str.replace(/[^A-Za-z0-9\+\/\=]/g, '');
    for (let i = 0; i < str.length;) {
        const enc1 = chars.indexOf(str.charAt(i++));
        const enc2 = chars.indexOf(str.charAt(i++));
        const enc3 = chars.indexOf(str.charAt(i++));
        const enc4 = chars.indexOf(str.charAt(i++));
        const chr1 = (enc1 << 2) | (enc2 >> 4);
        const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        const chr3 = ((enc3 & 3) << 6) | enc4;
        output += String.fromCharCode(chr1);
        if (enc3 !== 64 && enc3 !== -1) output += String.fromCharCode(chr2);
        if (enc4 !== 64 && enc4 !== -1) output += String.fromCharCode(chr3);
    }
    return output;
};

export const getJwtExpirationMs = (token: string): number | null => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4 !== 0) {
            base64 += '=';
        }
        const decoded = decodeBase64(base64);
        const payload = JSON.parse(decoded);
        if (payload && typeof payload.exp === 'number') {
            return payload.exp * 1000;
        }
        return null;
    } catch {
        return null;
    }
};

export const isTokenValid = (): boolean => {
    const token = localStorage.getItem('rider_token');
    if (!token) return false;

    // Check JWT payload expiration
    const expMs = getJwtExpirationMs(token);
    if (expMs !== null && expMs <= Date.now()) {
        return false;
    }

    // Check stored expiresAt timestamp if present
    const expiresAt = localStorage.getItem('rider_token_expires_at');
    if (expiresAt) {
        const t = new Date(expiresAt).getTime();
        if (!isNaN(t) && t <= Date.now()) {
            return false;
        }
    }

    return true;
};

export const isTokenExpiredOrExpiringSoon = (): boolean => {
    const token = localStorage.getItem('rider_token');
    if (!token) return true;

    const buffer = 5 * 60 * 1000; // 5 minute buffer

    // Check JWT payload expiration
    const expMs = getJwtExpirationMs(token);
    if (expMs !== null) {
        return expMs - Date.now() < buffer;
    }

    // Check stored expiresAt
    const expiresAt = localStorage.getItem('rider_token_expires_at');
    if (expiresAt) {
        const t = new Date(expiresAt).getTime();
        if (!isNaN(t)) {
            return t - Date.now() < buffer;
        }
    }

    return false;
};

let isRefreshingPromise: Promise<string | null> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void) => {
    unauthorizedHandler = handler;
};

export const refreshRiderToken = async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem('rider_refresh_token');
    if (!refreshToken) return null;

    if (isRefreshingPromise) {
        return isRefreshingPromise;
    }

    isRefreshingPromise = (async () => {
        try {
            const rootApiUrl = BASE_URL.replace(/\/v1$/, '');
            let response = await fetch(`${rootApiUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            }).catch(() => null);

            if (!response || !response.ok) {
                response = await fetch(`${BASE_URL}/riders/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken })
                }).catch(() => null);
            }

            if (response && response.ok) {
                const data = await response.json().catch(() => null);
                const newToken = data?.accessToken || data?.token;
                if (newToken) {
                    localStorage.setItem('rider_token', newToken);
                    const jwtExpMs = getJwtExpirationMs(newToken);
                    const newExpiresAt = data.accessTokenExpiresAt 
                        || (jwtExpMs ? new Date(jwtExpMs).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
                    localStorage.setItem('rider_token_expires_at', newExpiresAt);
                    if (data.refreshToken) {
                        localStorage.setItem('rider_refresh_token', data.refreshToken);
                    }
                    console.log('[Auth] Token preserved and refreshed successfully!');
                    return newToken;
                }
            }
            console.warn('[Auth] Token refresh request rejected by server.');
            return null;
        } catch (err) {
            console.error('[Auth] Refresh token failed:', err);
            return null;
        } finally {
            isRefreshingPromise = null;
        }
    })();

    return isRefreshingPromise;
};

export const authFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    let token = localStorage.getItem('rider_token');
    const refreshToken = localStorage.getItem('rider_refresh_token');

    if (token && refreshToken && isTokenExpiredOrExpiringSoon()) {
        console.log('[Auth] Proactively refreshing expired/expiring token before API call...');
        const newToken = await refreshRiderToken();
        if (newToken) {
            token = newToken;
        }
    }

    const headers = new Headers(options.headers || {});
    const activeToken = token || localStorage.getItem('rider_token');
    if (activeToken) {
        headers.set('Authorization', `Bearer ${activeToken}`);
    }
    
    let finalEndpoint = endpoint;
    if (!options.method || options.method.toUpperCase() === 'GET') {
        finalEndpoint += (endpoint.includes('?') ? '&' : '?') + '_ts=' + Date.now();
    }

    const defaultOptions: RequestInit = {
        ...options,
        headers,
    };
    
    let response = await fetch(`${BASE_URL}${finalEndpoint}`, defaultOptions);

    // Auto retry with token refresh if 401 Unauthorized occurs
    if (response.status === 401 && refreshToken) {
        console.log('[Auth] Received 401 Unauthorized. Retrying with refreshed token...');
        const newToken = await refreshRiderToken();
        if (newToken) {
            headers.set('Authorization', `Bearer ${newToken}`);
            response = await fetch(`${BASE_URL}${finalEndpoint}`, {
                ...options,
                headers
            });
        }
    }

    if (response.status === 401) {
        console.warn('[Auth] 401 Unauthorized after refresh attempt. Triggering logout...');
        unauthorizedHandler?.();
    }

    return response;
};

export const getRiderProfile = async (): Promise<any> => {
    try {
        const response = await authFetch('/riders/profile');
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        return null;
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

export const updateRiderBankDetails = async (bankDetails: { bankAccountNumber: string; bankIfscCode: string; bankAccountName: string }): Promise<any> => {
    try {
        const response = await authFetch('/riders/bank', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bankDetails)
        });
        if (!response.ok) {
            throw new Error(`Failed to update bank details: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error in updateRiderBankDetails:', error);
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
        const response = await authFetch('/riders/delivery/pending-offer');
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
        const response = await authFetch(`/riders/delivery/offer/${offerId}/accept`, {
            method: 'POST'
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || errData.message || `Failed to accept offer: ${response.statusText}`);
        }
        return true;
    } catch (error) {
        console.error('Error accepting offer:', error);
        throw error;
    }
};

export const rejectOffer = async (offerId: string, reason: string = 'Declined'): Promise<boolean> => {
    try {
        const response = await authFetch(`/riders/delivery/offer/${offerId}/reject`, {
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

export const markArrivedPickup = async (
    deliveryId: string,
    location?: { latitude?: number; longitude?: number } | null
): Promise<boolean> => {
    try {
        const hasValidCoords = location &&
            typeof location.latitude === 'number' &&
            typeof location.longitude === 'number' &&
            !(location.latitude === 0 && location.longitude === 0);

        const body = hasValidCoords
            ? { latitude: location.latitude, longitude: location.longitude }
            : {};

        const response = await authFetch(`/riders/delivery/${deliveryId}/arrived-pickup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return response.ok;
    } catch (error) {
        console.error('Error marking arrived at pickup:', error);
        return false;
    }
};

export const markPickedUp = async (deliveryId: string, pickupCode: string): Promise<boolean> => {
    try {
        const response = await authFetch(`/riders/delivery/${deliveryId}/pickup`, {
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
        const response = await authFetch(`/riders/delivery/${deliveryId}/arrived-drop`, {
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
        const response = await authFetch(`/riders/delivery/${deliveryId}/delivered`, {
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
        let formattedReason = reason;
        if (reason.toLowerCase().includes('customer')) formattedReason = 'CustomerUnavailable';
        else if (reason.toLowerCase().includes('wrong') || reason.toLowerCase().includes('address')) formattedReason = 'WrongAddress';
        else if (reason.toLowerCase().includes('restaurant') || reason.toLowerCase().includes('closed')) formattedReason = 'RestaurantClosed';
        else if (reason.toLowerCase().includes('accident') || reason.toLowerCase().includes('emergency')) formattedReason = 'Accident';
        else if (!formattedReason) formattedReason = 'Other';

        const response = await authFetch(`/riders/delivery/${deliveryId}/failed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reason: formattedReason,
                notes: notes || '',
                photoUrl: photoUrl || ''
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || errData.message || `Failed to cancel delivery: ${response.statusText}`);
        }

        return true;
    } catch (error) {
        console.error('Error marking delivery failed:', error);
        throw error;
    }
};

export const getActiveDelivery = async (): Promise<any | null> => {
    try {
        const response = await authFetch('/riders/delivery/current');
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
        return null;
    }
};

// Self-service endpoint: GET /riders/kyc-status
// Returns the authenticated rider's KYC status + all uploaded documents
export const getRiderKycStatus = async (): Promise<any> => {
    try {
        const response = await authFetch('/riders/kyc-status');
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        return null;
    }
};

export const generateKycUploadUrl = async (riderId: string, documentType: string, contentType: string = 'image/jpeg'): Promise<any> => {
    try {
        const response = await authFetch(`/riders/${riderId}/kyc/upload-url`, {
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
        const response = await authFetch(`/riders/${riderId}/kyc/confirm`, {
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

export const getOrderDetails = async (orderId: string): Promise<any> => {
    try {
        const response = await authFetch(`/../orders/${orderId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch order details: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error in getOrderDetails:', error);
        throw error;
    }
};

export const getDeliveryHistory = async (page: number = 1, pageSize: number = 20): Promise<any> => {
    try {
        let response = await authFetch(`/riders/delivery/history?page=${page}&pageSize=${pageSize}`).catch(() => null);

        if (!response || !response.ok) {
            response = await authFetch(`/riders/deliveries/history?page=${page}&pageSize=${pageSize}`).catch(() => null);
        }

        if (response && response.ok) {
            const data = await response.json().catch(() => null);
            if (data) return data;
        }
        return { items: [], totalCount: 0 };
    } catch (error) {
        return { items: [], totalCount: 0 };
    }
};
