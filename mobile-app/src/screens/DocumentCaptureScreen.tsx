import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { CameraService } from '../services/camera.service';
import { useScreenAnalytics } from '../hooks/useAnalytics';

export function DocumentCaptureScreen({ navigation }: any) {
  const cameraRef = useRef<Camera>(null);
  const cameraService = new CameraService(cameraRef);
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const [documentReady, setDocumentReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useScreenAnalytics('DocumentCapture');

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const hasPermission = await cameraService.requestCameraPermission();
    setHasPermission(hasPermission);
  };

  const handleCapture = async () => {
    if (!hasPermission || !cameraService) return;

    setCapturing(true);
    try {
      const imagePath = await cameraService.captureDocument();

      if (imagePath) {
        // Navigate to review screen with captured image
        navigation.navigate('DocumentReview', {
          imagePath,
          documentType: 'CAPITAL_CALL',
        });
      }
    } finally {
      setCapturing(false);
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermissions}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return <Text>No camera device found</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Camera
        ref={cameraRef}
        device={device}
        isActive={true}
        photo={true}
        style={styles.camera}
      />

      {/* Document guide overlay */}
      <View style={styles.guideOverlay}>
        <View style={styles.guideFrame} />
        <Text style={styles.guideText}>
          {documentReady
            ? 'Document ready. Tap to capture.'
            : 'Align document within frame'}
        </Text>
      </View>

      {/* Capture button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.captureButton,
            { opacity: capturing ? 0.6 : 1 },
          ]}
          onPress={handleCapture}
          disabled={capturing}
        >
          <View style={styles.captureCircle} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  guideOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: 300,
    height: 400,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
  },
  guideText: {
    marginTop: 20,
    color: '#fff',
    fontSize: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 8,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
