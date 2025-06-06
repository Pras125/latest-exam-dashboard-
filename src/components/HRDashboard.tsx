import React, { useState, useEffect } from 'react';

interface ExamSession {
  id: string;
  studentName: string;
  examName: string;
  startTime: Date;
  status: 'active' | 'completed' | 'flagged';
  cameraStream: MediaStream | null;
  screenStream: MediaStream | null;
  audioStream: MediaStream | null;
  warnings: string[];
}

const HRDashboard: React.FC = () => {
  const [activeSessions, setActiveSessions] = useState<ExamSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);

  // Mock function to fetch active sessions
  useEffect(() => {
    // In a real implementation, this would fetch from your backend
    const fetchSessions = async () => {
      // Simulated data
      const sessions: ExamSession[] = [
        {
          id: '1',
          studentName: 'John Doe',
          examName: 'Mathematics Final',
          startTime: new Date(),
          status: 'active',
          cameraStream: null,
          screenStream: null,
          audioStream: null,
          warnings: []
        }
      ];
      setActiveSessions(sessions);
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSessionSelect = (session: ExamSession) => {
    setSelectedSession(session);
  };

  const handleWarning = (sessionId: string, warning: string) => {
    setActiveSessions(prev =>
      prev.map(session =>
        session.id === sessionId
          ? { ...session, warnings: [...session.warnings, warning] }
          : session
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">HR Exam Monitoring Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Active Sessions List */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Active Sessions</h2>
            <div className="space-y-4">
              {activeSessions.map(session => (
                <div
                  key={session.id}
                  className={`p-4 rounded-lg cursor-pointer ${
                    selectedSession?.id === session.id
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => handleSessionSelect(session)}
                >
                  <h3 className="font-semibold">{session.studentName}</h3>
                  <p className="text-sm text-gray-600">{session.examName}</p>
                  <p className="text-sm text-gray-500">
                    Started: {session.startTime.toLocaleTimeString()}
                  </p>
                  {session.warnings.length > 0 && (
                    <div className="mt-2">
                      <span className="text-red-500 text-sm">
                        {session.warnings.length} warning(s)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Session Monitoring */}
          {selectedSession && (
            <div className="md:col-span-2 bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">
                Monitoring: {selectedSession.studentName}
              </h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Camera Feed */}
                <div className="relative">
                  <h3 className="text-lg font-semibold mb-2">Camera Feed</h3>
                  <div className="aspect-video bg-gray-200 rounded-lg">
                    {/* Camera stream would be displayed here */}
                  </div>
                </div>

                {/* Screen Share */}
                <div className="relative">
                  <h3 className="text-lg font-semibold mb-2">Screen Share</h3>
                  <div className="aspect-video bg-gray-200 rounded-lg">
                    {/* Screen share would be displayed here */}
                  </div>
                </div>
              </div>

              {/* Warnings Section */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Warnings</h3>
                {selectedSession.warnings.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedSession.warnings.map((warning, index) => (
                      <li key={index} className="text-red-500">
                        {warning}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-green-500">No warnings</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex space-x-4">
                <button
                  onClick={() => handleWarning(selectedSession.id, 'Suspicious activity detected')}
                  className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                >
                  Flag Suspicious Activity
                </button>
                <button
                  onClick={() => handleWarning(selectedSession.id, 'Exam terminated by HR')}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Terminate Exam
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HRDashboard; 