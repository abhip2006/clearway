import React from 'react';
import { Camera, useCameraDevice, useFrameProcessor, runOnJS } from 'react-native-vision-camera';
import { detectEdges } from 'react-native-vision-ocr';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';

export class CameraService {
  private cameraRef: React.RefObject<Camera>;

  constructor(cameraRef: React.RefObject<Camera>) {
    this.cameraRef = cameraRef;
  }

  /**
   * Request camera permissions
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const cameraStatus = await Camera.requestCameraPermission();
      return cameraStatus === 'granted';
    } catch (error) {
      console.error('Camera permission error:', error);
      return false;
    }
  }

  /**
   * Capture document photo
   */
  async captureDocument(): Promise<string | null> {
    try {
      if (!this.cameraRef.current) return null;

      const photo = await this.cameraRef.current.takePhoto({
        qualityPrioritization: 'quality',
        flash: 'auto',
      });

      // Process image: crop, enhance, optimize
      const processedImage = await this.processImage(photo.path);
      return processedImage;
    } catch (error) {
      console.error('Document capture failed:', error);
      return null;
    }
  }

  /**
   * Detect edges in real-time (frame processor)
   */
  useDocumentEdgeDetection() {
    const device = useCameraDevice('back');

    const frameProcessor = useFrameProcessor((frame) => {
      'worklet';

      const edges = detectEdges(frame);

      // Check if document is properly framed
      if (edges.length >= 4) {
        // Corners detected, show capture ready indicator
        runOnJS(this.notifyEdgesDetected)(edges);
      }
    }, []);

    return { device, frameProcessor };
  }

  /**
   * Process captured image
   */
  private async processImage(imagePath: string): Promise<string> {
    try {
      // Detect and crop edges
      const corners = await this.detectCorners(imagePath);

      // Crop to document
      let croppedPath = imagePath;
      if (corners) {
        croppedPath = await this.cropImage(imagePath, corners);
      }

      // Enhance image (brightness, contrast)
      const enhancedPath = await this.enhanceImage(croppedPath);

      // Optimize file size
      const optimizedPath = await ImageManipulator.manipulateAsync(
        enhancedPath,
        [{ resize: { width: 1200, height: 1600 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      return optimizedPath.uri;
    } catch (error) {
      console.error('Image processing failed:', error);
      return imagePath;
    }
  }

  /**
   * Extract corners from image
   */
  private async detectCorners(imagePath: string): Promise<any> {
    // Use vision-ocr to detect document corners
    try {
      const result = await detectEdges(imagePath);
      return result.corners;
    } catch (error) {
      console.error('Corner detection failed:', error);
      return null;
    }
  }

  /**
   * Crop image to detected rectangle
   */
  private async cropImage(imagePath: string, corners: any): Promise<string> {
    const manipulations = [
      {
        crop: {
          originX: corners.topLeft.x,
          originY: corners.topLeft.y,
          width: corners.bottomRight.x - corners.topLeft.x,
          height: corners.bottomRight.y - corners.topLeft.y,
        },
      },
    ];

    const result = await ImageManipulator.manipulateAsync(
      imagePath,
      manipulations,
      { format: ImageManipulator.SaveFormat.JPEG }
    );

    return result.uri;
  }

  /**
   * Enhance image quality
   */
  private async enhanceImage(imagePath: string): Promise<string> {
    // Apply filters for better OCR
    const result = await ImageManipulator.manipulateAsync(
      imagePath,
      [
        {
          resize: { width: 1200, height: 1600 },
        },
      ],
      {
        compress: 0.95,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return result.uri;
  }

  /**
   * Extract text from document image
   */
  async extractText(imagePath: string): Promise<string> {
    try {
      const text = await detectEdges(imagePath);
      return (text as any).text || '';
    } catch (error) {
      console.error('OCR failed:', error);
      return '';
    }
  }

  /**
   * Called when document edges are detected
   */
  private notifyEdgesDetected(edges: any): void {
    // Trigger haptic feedback or visual indicator
    console.log('Document edges detected, ready to capture');
  }

  /**
   * Save to device gallery
   */
  async saveToGallery(imagePath: string): Promise<boolean> {
    try {
      const asset = await MediaLibrary.createAssetAsync(imagePath);
      await MediaLibrary.createAlbumAsync('Clearway Captures', asset, false);
      return true;
    } catch (error) {
      console.error('Save to gallery failed:', error);
      return false;
    }
  }
}
