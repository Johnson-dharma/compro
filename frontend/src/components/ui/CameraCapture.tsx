import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, RotateCcw, Check } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';

interface CameraCaptureProps {
  onCapture: (photoData: string) => void;
  onClose: () => void;
  isOpen: boolean;
  title?: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onClose,
  isOpen,
  title = 'Take Photo'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCapturedPhoto(null);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(photoData);
  }, []);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
  }, []);

  const confirmPhoto = useCallback(() => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      handleClose();
    }
  }, [capturedPhoto, onCapture]);

  const handleClose = useCallback(() => {
    stopCamera();
    setError(null);
    onClose();
  }, [stopCamera, onClose]);

  // Start camera when modal opens
  React.useEffect(() => {
    if (isOpen && !isCameraActive && !capturedPhoto) {
      startCamera();
    }
  }, [isOpen, isCameraActive, capturedPhoto, startCamera]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="lg">
      <div className="space-y-4">
        {error && (
          <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
            <p className="text-danger-700 text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={startCamera}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary-100 dark:bg-secondary-800">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-secondary-600 dark:text-secondary-400">Starting camera...</p>
              </div>
            </div>
          )}

          {!isCameraActive && !isLoading && !capturedPhoto && (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary-100 dark:bg-secondary-800">
              <div className="text-center">
                <Camera className="w-12 h-12 text-secondary-400 mx-auto mb-2" />
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">Camera not active</p>
                <Button onClick={startCamera} variant="primary">
                  <Camera className="w-4 h-4 mr-2" />
                  Start Camera
                </Button>
              </div>
            </div>
          )}

          {capturedPhoto ? (
            <img
              src={capturedPhoto}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex justify-center gap-3">
          {capturedPhoto ? (
            <>
              <Button variant="outline" onClick={retakePhoto}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake
              </Button>
              <Button variant="primary" onClick={confirmPhoto}>
                <Check className="w-4 h-4 mr-2" />
                Use Photo
              </Button>
            </>
          ) : (
            isCameraActive && (
              <Button
                variant="primary"
                onClick={capturePhoto}
                className="px-8"
              >
                <Camera className="w-4 h-4 mr-2" />
                Capture
              </Button>
            )
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200 dark:border-secondary-700">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CameraCapture;
