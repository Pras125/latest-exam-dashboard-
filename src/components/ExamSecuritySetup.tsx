import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { monitoringService } from '../services/monitoringService';

interface ExamSecuritySetupProps {
  onSetupComplete: () => void;
}

const ExamSecuritySetup: React.FC<ExamSecuritySetupProps> = ({ onSetupComplete }) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const steps = [
    {
      title: "Camera Setup",
      description: "Please allow camera access to enable proctoring.",
      action: "Enable Camera",
      handler: setupCamera,
    },
    {
      title: "Fullscreen Mode",
      description: "The exam must be taken in fullscreen mode.",
      action: "Enter Fullscreen",
      handler: enterFullscreen,
    },
    {
      title: "Environment Check",
      description: "Please ensure you are in a well-lit, quiet environment.",
      action: "Confirm Environment",
      handler: confirmEnvironment,
    },
  ];

  useEffect(() => {
    // Check if already in fullscreen
    if (document.fullscreenElement) {
      setIsFullscreen(true);
    }

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      // Cleanup camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

  async function setupCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: true
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        
        // Start monitoring
        monitoringService.startMonitoring(stream);
        
        setCurrentStep(2);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Access Error",
        description: "Please ensure you have granted camera permissions and try again.",
        variant: "destructive",
      });
    }
  }

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
      setCurrentStep(3);
    } catch (error) {
      console.error('Error entering fullscreen:', error);
      toast({
        title: "Fullscreen Error",
        description: "Please try entering fullscreen mode manually.",
        variant: "destructive",
      });
    }
  }

  function confirmEnvironment() {
    // Start the exam
    onSetupComplete();
  }

  const currentStepData = steps[currentStep - 1];

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
            <div className="text-sm text-gray-500">
              Step {currentStep} of {steps.length}
            </div>
          </div>
          <p className="text-gray-600 mb-6">{currentStepData.description}</p>
          
          {currentStep === 1 && (
            <div className="mb-6">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full rounded-lg ${isCameraActive ? 'border-2 border-green-500' : 'border-2 border-gray-300'}`}
              />
            </div>
          )}

          <div className="flex justify-between items-center">
            <button
              onClick={currentStepData.handler}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {currentStepData.action}
            </button>
            
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="text-gray-600 hover:text-gray-800"
              >
                Back
              </button>
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-2">Security Requirements:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <span className={`w-4 h-4 mr-2 rounded-full ${isCameraActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              Camera Access
            </li>
            <li className="flex items-center">
              <span className={`w-4 h-4 mr-2 rounded-full ${isFullscreen ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              Fullscreen Mode
            </li>
            <li className="flex items-center">
              <span className={`w-4 h-4 mr-2 rounded-full ${currentStep === 3 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              Environment Check
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ExamSecuritySetup; 