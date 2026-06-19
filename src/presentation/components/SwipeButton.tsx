import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions, LayoutChangeEvent } from 'react-native';
import { ChevronsRight, ChevronsLeft } from 'lucide-react-native';

interface SwipeButtonProps {
    title: string;
    actionType: 'goOnline' | 'goOffline';
    onSwipeComplete: () => void;
}

export const SwipeButton: React.FC<SwipeButtonProps> = ({ title, actionType, onSwipeComplete }) => {
    const isOnlineAction = actionType === 'goOnline';
    const [containerWidth, setContainerWidth] = useState(0);
    const THUMB_SIZE = 56;
    const PADDING = 4;
    
    // The max distance the thumb can travel
    const maxTranslate = containerWidth > 0 ? containerWidth - THUMB_SIZE - (PADDING * 2) : 200;

    // Keep dynamic values in refs to avoid stale closures in PanResponder
    const isOnlineActionRef = useRef(isOnlineAction);
    const containerWidthRef = useRef(containerWidth);
    const maxTranslateRef = useRef(maxTranslate);
    const onSwipeCompleteRef = useRef(onSwipeComplete);

    isOnlineActionRef.current = isOnlineAction;
    containerWidthRef.current = containerWidth;
    maxTranslateRef.current = maxTranslate;
    onSwipeCompleteRef.current = onSwipeComplete;

    // We use a single Animated.Value
    // If going Online (sliding right), it goes from 0 to maxTranslate
    // If going Offline (sliding left), it goes from 0 to -maxTranslate
    const pan = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderTerminationRequest: () => false,
            onPanResponderMove: (_, gestureState) => {
                const currentContainerWidth = containerWidthRef.current;
                const currentMaxTranslate = maxTranslateRef.current;
                const currentIsOnlineAction = isOnlineActionRef.current;

                if (currentContainerWidth === 0) return;
                
                let newValue = gestureState.dx;
                
                if (currentIsOnlineAction) {
                    // Restrict between 0 and maxTranslate
                    if (newValue < 0) newValue = 0;
                    if (newValue > currentMaxTranslate) newValue = currentMaxTranslate;
                } else {
                    // Restrict between -maxTranslate and 0
                    if (newValue > 0) newValue = 0;
                    if (newValue < -currentMaxTranslate) newValue = -currentMaxTranslate;
                }
                
                pan.setValue(newValue);
            },
            onPanResponderRelease: (_, gestureState) => {
                const currentContainerWidth = containerWidthRef.current;
                const currentMaxTranslate = maxTranslateRef.current;
                const currentIsOnlineAction = isOnlineActionRef.current;

                if (currentContainerWidth === 0) return;
                
                const threshold = currentMaxTranslate * 0.5; // 50% swipe required
                const distance = Math.abs(gestureState.dx);
                const isCorrectDirection = currentIsOnlineAction 
                    ? gestureState.dx > 0 
                    : gestureState.dx < 0;
                
                const isFastSwipe = Math.abs(gestureState.vx) > 0.5 && isCorrectDirection;

                if (distance > threshold || isFastSwipe) {
                    // Trigger action and animate to end
                    Animated.timing(pan, {
                        toValue: currentIsOnlineAction ? currentMaxTranslate : -currentMaxTranslate,
                        duration: 150,
                        useNativeDriver: true,
                    }).start(() => {
                        onSwipeCompleteRef.current();
                        // Reset after a short delay so it's ready if state flips back
                        setTimeout(() => pan.setValue(0), 300);
                    });
                } else {
                    // Snap back
                    Animated.spring(pan, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 10,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                // Snap back to 0 if gesture is interrupted/terminated
                Animated.spring(pan, {
                    toValue: 0,
                    useNativeDriver: true,
                    bounciness: 10,
                }).start();
            }
        })
    ).current;

    const handleLayout = (e: LayoutChangeEvent) => {
        setContainerWidth(e.nativeEvent.layout.width);
    };

    // Styling logic
    const containerStyle = [
        styles.container,
        isOnlineAction ? styles.containerOffline : styles.containerOnline
    ];

    const thumbStyle = [
        styles.thumb,
        isOnlineAction ? styles.thumbRed : styles.thumbGreen,
        { transform: [{ translateX: pan }] }
    ];

    const initialThumbPosition = isOnlineAction 
        ? { left: PADDING } 
        : { right: PADDING };

    return (
        <View style={containerStyle} onLayout={handleLayout}>
            <Text style={[styles.title, isOnlineAction ? styles.titleOffline : styles.titleOnline]}>
                {title}
            </Text>
            
            {containerWidth > 0 && (
                <Animated.View 
                    style={[thumbStyle, initialThumbPosition]} 
                    {...panResponder.panHandlers}
                >
                    {isOnlineAction ? (
                        <ChevronsRight color="#FFF" size={24} />
                    ) : (
                        <ChevronsLeft color="#FFF" size={24} />
                    )}
                </Animated.View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1,
    },
    containerOffline: {
        backgroundColor: '#FFFFFF',
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    containerOnline: {
        backgroundColor: '#ECFCCB', // Light green
        borderColor: '#D9F99D',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    titleOffline: {
        color: '#111827',
        marginLeft: 20, // Offset to balance visual weight with thumb on left
    },
    titleOnline: {
        color: '#111827',
        marginRight: 20, // Offset to balance visual weight with thumb on right
    },
    thumb: {
        position: 'absolute',
        width: 56,
        height: 56,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    thumbRed: {
        backgroundColor: '#B91C1C',
    },
    thumbGreen: {
        backgroundColor: '#65A30D',
    }
});
