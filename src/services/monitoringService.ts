import { io, Socket } from 'socket.io-client';

// Define the WebSocket URL
const WEBSOCKET_URL = 'ws://localhost:3001';

interface MonitoringService {
  connect: () => void;
  disconnect: () => void;
  sendStream: (stream: MediaStream, type: 'camera' | 'screen' | 'audio') => void;
  onWarning: (callback: (warning: string) => void) => void;
  onExamTerminated: (callback: () => void) => void;
}

class MonitoringServiceImpl implements MonitoringService {
  private socket: Socket | null = null;
  private streamHandlers: Map<string, MediaStream> = new Map();
  private warningHandlers: ((warning: string) => void)[] = [];
  private examTerminatedHandlers: (() => void)[] = [];

  connect() {
    if (!this.socket) {
      this.socket = io(WEBSOCKET_URL);
      
      this.socket.on('warning', (warning: string) => {
        this.warningHandlers.forEach(handler => handler(warning));
      });

      this.socket.on('exam_terminated', () => {
        this.examTerminatedHandlers.forEach(handler => handler());
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendStream(stream: MediaStream, type: 'camera' | 'screen' | 'audio') {
    if (!this.socket) return;

    // Store the stream handler
    this.streamHandlers.set(type, stream);

    // Create a MediaRecorder for the stream
    const recorder = new MediaRecorder(stream, {
      mimeType: type === 'audio' ? 'audio/webm' : 'video/webm',
    });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.socket) {
        this.socket.emit('stream-data', {
          type,
          data: event.data,
        });
      }
    };

    // Start recording and send data every second
    recorder.start(1000);
  }

  startMonitoring(stream: MediaStream) {
    if (!this.socket) {
      throw new Error('Socket not connected. Call connect() first.');
    }

    // Create a MediaRecorder to capture the stream
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });

    // Send video chunks to the server
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.socket) {
        this.socket.emit('video_chunk', event.data);
      }
    };

    // Start recording
    mediaRecorder.start(1000); // Send chunks every second

    // Store the mediaRecorder for cleanup
    (this as any).mediaRecorder = mediaRecorder;
  }

  stopMonitoring() {
    if ((this as any).mediaRecorder) {
      (this as any).mediaRecorder.stop();
      (this as any).mediaRecorder = null;
    }
  }

  onWarning(handler: (warning: string) => void) {
    this.warningHandlers.push(handler);
    return () => {
      this.warningHandlers = this.warningHandlers.filter(h => h !== handler);
    };
  }

  onExamTerminated(handler: () => void) {
    this.examTerminatedHandlers.push(handler);
    return () => {
      this.examTerminatedHandlers = this.examTerminatedHandlers.filter(h => h !== handler);
    };
  }
}

export const monitoringService = new MonitoringServiceImpl(); 