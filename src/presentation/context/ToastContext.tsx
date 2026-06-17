import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react-native';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => {
      const next = [...prev, { id, message, type, duration }];
      if (next.length > 3) {
        return next.slice(-3);
      }
      return next;
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <SafeAreaView pointerEvents="box-none" style={styles.toastContainer}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </SafeAreaView>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onClose: () => void }> = ({ toast, onClose }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      handleClose();
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const getStyle = () => {
    switch (toast.type) {
      case 'success':
        return {
          container: styles.successContainer,
          text: styles.successText,
          icon: <CheckCircle size={20} color="#14532D" />,
        };
      case 'error':
        return {
          container: styles.errorContainer,
          text: styles.errorText,
          icon: <AlertCircle size={20} color="#7F1D1D" />,
        };
      case 'warning':
        return {
          container: styles.warningContainer,
          text: styles.warningText,
          icon: <AlertTriangle size={20} color="#854D0E" />,
        };
      default: // info
        return {
          container: styles.infoContainer,
          text: styles.infoText,
          icon: <Info size={20} color="#1E3A8A" />,
        };
    }
  };

  const style = getStyle();

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        style.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.iconWrapper}>{style.icon}</View>
      <Text style={[styles.messageText, style.text]}>{toast.message}</Text>
      <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
        <X size={16} color="rgba(0,0,0,0.3)" />
      </TouchableOpacity>
    </Animated.View>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: 16,
  },
  toastWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width - 32,
    maxWidth: 450,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
  },
  iconWrapper: {
    marginRight: 10,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  successContainer: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  successText: {
    color: '#14532D',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#7F1D1D',
  },
  warningContainer: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FEF08A',
  },
  warningText: {
    color: '#854D0E',
  },
  infoContainer: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  infoText: {
    color: '#1E3A8A',
  },
});
