import { VoltBorderRadius, VoltColors, VoltFontSize, VoltSpacing } from '@/constants/Theme';
import { ocrVinRemote } from '@/services/cloudFunctions';
import { useToast } from '@/components/ToastProvider';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const SCAN_FRAME_WIDTH = width * 0.85;
const SCAN_FRAME_HEIGHT = 120;

export default function CameraScanScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { showToast } = useToast();
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    if (!permission) {
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.containerCenter}>
                <Ionicons name="camera-outline" size={64} color={VoltColors.textTertiary} />
                <Text style={styles.permissionText}>Avem nevoie de acces la cameră pentru a scana codul VIN.</Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Permite Accesul</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
                    <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const takePicture = async () => {
        if (!cameraRef.current || isProcessing) return;

        try {
            setIsProcessing(true);
            const photo = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.5,
            });

            if (!photo?.base64) {
                throw new Error('Nu s-a putut captura imaginea');
            }

            const response = await ocrVinRemote(photo.base64);

            if (response.success && response.vin) {
                // Success! Pass back to the tabs (specifically the scan tab)
                router.dismissAll();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                router.replace({ pathname: '/(dashboard)', params: { scannedVin: response.vin } } as any);
            } else {
                showToast(
                    'error',
                    response.message || t('camera.scanFailed') || 'Nu am putut detecta un VIN valid. Încearcă din nou sau introdu manual.',
                    4000,
                );
                setIsProcessing(false);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            // eslint-disable-next-line no-console
            console.error('[CameraScan] Error:', error);
            showToast(
                'error',
                (t('camera.processError') || 'Eroare la procesarea imaginii') + ': ' + error.message,
                4000,
            );
            setIsProcessing(false);
        }
    };

    return (
        <View style={styles.container}>
            <CameraView 
                style={styles.camera} 
                facing="back"
                ref={cameraRef}
                autofocus="on"
            >
                {/* Header Actions */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => router.back()} disabled={isProcessing}>
                        <Ionicons name="close" size={28} color={VoltColors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Scanare VIN</Text>
                    <View style={{ width: 44 }} />
                </View>

                {/* Focus Target / Guide */}
                <View style={styles.overlay}>
                    <View style={styles.guideTextContainer}>
                        <Text style={styles.guideText}>
                            Încadrează VIN-ul în dreptunghiul de mai jos
                        </Text>
                    </View>
                    
                    <View style={styles.scanFrame}>
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                </View>

                {/* Footer Controls */}
                <View style={styles.footer}>
                    {isProcessing ? (
                        <View style={styles.processingContainer}>
                            <ActivityIndicator size="large" color={VoltColors.neonGreen} />
                            <Text style={styles.processingText}>Se procesează...</Text>
                        </View>
                    ) : (
                        <TouchableOpacity 
                            style={styles.captureButton} 
                            onPress={takePicture}
                            activeOpacity={0.8}
                        >
                            <View style={styles.captureButtonInner} />
                        </TouchableOpacity>
                    )}
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    containerCenter: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
        justifyContent: 'center',
        alignItems: 'center',
        padding: VoltSpacing.xl,
    },
    camera: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: VoltSpacing.lg,
        zIndex: 10,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: VoltColors.textPrimary,
        fontSize: VoltFontSize.lg,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    guideTextContainer: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: VoltSpacing.lg,
        paddingVertical: VoltSpacing.sm,
        borderRadius: VoltBorderRadius.full,
        marginBottom: VoltSpacing.xxl,
    },
    guideText: {
        color: 'white',
        fontSize: VoltFontSize.md,
        textAlign: 'center',
    },
    scanFrame: {
        width: SCAN_FRAME_WIDTH,
        height: SCAN_FRAME_HEIGHT,
        borderColor: 'rgba(0, 230, 118, 0.4)',
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    corner: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderColor: VoltColors.neonGreen,
    },
    topLeft: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4 },
    topRight: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4 },
    bottomLeft: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4 },
    bottomRight: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4 },
    footer: {
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingBottom: 20,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButtonInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'white',
    },
    processingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    processingText: {
        color: VoltColors.neonGreen,
        marginTop: VoltSpacing.sm,
        fontSize: VoltFontSize.sm,
        fontWeight: '600',
    },
    permissionText: {
        color: VoltColors.textSecondary,
        fontSize: VoltFontSize.md,
        textAlign: 'center',
        marginTop: VoltSpacing.lg,
        marginBottom: VoltSpacing.xl,
    },
    permissionButton: {
        backgroundColor: VoltColors.neonGreen,
        paddingHorizontal: VoltSpacing.xl,
        paddingVertical: VoltSpacing.md,
        borderRadius: VoltBorderRadius.md,
        marginBottom: VoltSpacing.md,
    },
    permissionButtonText: {
        color: VoltColors.textOnGreen,
        fontWeight: '700',
        fontSize: VoltFontSize.md,
    },
    cancelButton: {
        padding: VoltSpacing.md,
    },
    cancelText: {
        color: VoltColors.textTertiary,
        fontSize: VoltFontSize.md,
    },
});
