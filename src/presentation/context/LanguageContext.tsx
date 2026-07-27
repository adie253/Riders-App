import React, { createContext, useContext, useState, useEffect } from 'react';
import { localStorage } from '../../utils/storage';

export type LanguageType = 'English' | 'Hindi';

const translations: Record<LanguageType, Record<string, string>> = {
  English: {
    chooseLanguage: 'Choose Your Language',
    selectPreferredLanguage: 'Select your preferred language',
    languageInfo: 'You can change the language anytime from your profile settings',
    continue: 'Continue',
    newOrderRequest: 'New Order Request',
    respondWithin: 'Respond within {time}s',
    pickup: 'Pickup',
    drop: 'Drop',
    totalDistance: 'Total Distance',
    yourEarnings: 'Your Earnings',
    forThisOrder: 'for this order',
    reject: 'Reject',
    acceptOrder: 'Accept Order',
    rejectionWarning: 'Frequent rejections may reduce order priority',
    hello: 'Hello',
    online: 'Online',
    offline: 'Offline',
    readyToReceive: 'Ready to receive delivery requests',
    slideToStart: 'Slide to start receiving orders & earn money.',
    slideToGoOffline: 'Slide to Go Offline',
    slideToGoOnline: 'Slide to Go Online',
    todayBonus: "Today's Bonus",
    moreOrdersToEarn: '{count} more orders to earn ₹50',
    targetAchieved: 'Target achieved! ₹50 bonus earned.',
    ordersCompleted: '{count} of 10 orders completed',
    stayOnlineToReceive: 'Stay online to receive delivery requests',
    todaysPerformance: "Today's Performance",
    earnings: 'Earnings',
    orders: 'Orders',
    safetyFirst: 'Safety First',
    needHelpSos: 'Need help during delivery? Tap the SOS button on the top right corner of the screen.',
    goOfflineQuestion: 'Go Offline?',
    goOfflineWarning: "You won't receive new orders while offline. Your current earnings will be saved.",
    cancel: 'Cancel',
    confirmGoOffline: 'Go Offline',
  },
  Hindi: {
    chooseLanguage: 'अपनी भाषा चुनें',
    selectPreferredLanguage: 'अपनी पसंदीदा भाषा का चयन करें',
    languageInfo: 'आप अपने प्रोफ़ाइल सेटिंग्स से कभी भी भाषा बदल सकते हैं',
    continue: 'जारी रखें',
    newOrderRequest: 'नया ऑर्डर अनुरोध',
    respondWithin: '{time}s के भीतर प्रतिक्रिया दें',
    pickup: 'पिकअप',
    drop: 'ड्रॉप',
    totalDistance: 'कुल दूरी',
    yourEarnings: 'आपकी कमाई',
    forThisOrder: 'इस ऑर्डर के लिए',
    reject: 'अस्वीकार करें',
    acceptOrder: 'ऑर्डर स्वीकार करें',
    rejectionWarning: 'बार-बार अस्वीकार करने से ऑर्डर प्राथमिकता कम हो सकती है',
    hello: 'नमस्ते',
    online: 'ऑनलाइन',
    offline: 'ऑफलाइन',
    readyToReceive: 'डिलीवरी अनुरोध प्राप्त करने के लिए तैयार',
    slideToStart: 'ऑर्डर प्राप्त करना शुरू करने और पैसे कमाने के लिए स्लाइड करें।',
    slideToGoOffline: 'ऑफलाइन जाने के लिए स्लाइड करें',
    slideToGoOnline: 'ऑनलाइन जाने के लिए स्लाइड करें',
    todayBonus: 'आज का बोनस',
    moreOrdersToEarn: '₹50 कमाने के लिए {count} और ऑर्डर',
    targetAchieved: 'लक्ष्य प्राप्त हुआ! ₹50 बोनस अर्जित किया।',
    ordersCompleted: '10 में से {count} ऑर्डर पूरे हुए',
    stayOnlineToReceive: 'डिलीवरी अनुरोध प्राप्त करने के लिए ऑनलाइन रहें',
    todaysPerformance: 'आज का प्रदर्शन',
    earnings: 'कमाई',
    orders: 'ऑर्डर',
    safetyFirst: 'सुरक्षा सर्वोपरि',
    needHelpSos: 'डिलीवरी के दौरान मदद चाहिए? स्क्रीन के ऊपरी दाएं कोने पर SOS बटन पर टैप करें।',
    goOfflineQuestion: 'ऑफलाइन जाएं?',
    goOfflineWarning: 'ऑफलाइन रहने पर आपको नए ऑर्डर नहीं मिलेंगे। आपकी वर्तमान कमाई सुरक्षित रहेगी।',
    cancel: 'रद्द करें',
    confirmGoOffline: 'ऑफलाइन जाएं',
  }
};

interface LanguageContextType {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageType>('English');

  useEffect(() => {
    const storedLang = localStorage.getItem('rider_language') as LanguageType;
    if (storedLang && (storedLang === 'English' || storedLang === 'Hindi')) {
      setLanguageState(storedLang);
    }
  }, []);

  const setLanguage = (lang: LanguageType) => {
    setLanguageState(lang);
    localStorage.setItem('rider_language', lang);
  };

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const dict = translations[language];
    let text = dict[key] || translations['English'][key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
