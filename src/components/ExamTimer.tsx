import React, { useState, useEffect } from 'react';

interface ExamTimerProps {
  duration: number; // Duration in minutes
  onTimeUp: () => void;
}

const ExamTimer: React.FC<ExamTimerProps> = ({ duration, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(duration * 60); // Convert to seconds
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Prevent leaving fullscreen
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    };

    // Enter fullscreen when component mounts
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable fullscreen: ${err.message}`);
    });

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Timer logic
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup
    return () => {
      clearInterval(timer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
  }, [duration, onTimeUp]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
      <div className="text-2xl font-bold">{formatTime(timeLeft)}</div>
      <div className="text-sm">Time Remaining</div>
    </div>
  );
};

export default ExamTimer; 