import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ExamSecuritySetup from '../components/ExamSecuritySetup';
import ExamTimer from '../components/ExamTimer';
import { monitoringService } from '../services/monitoringService';

const ExamPage = () => {
  const { id: testId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [testInfo, setTestInfo] = useState<{
    title: string;
    duration_minutes: number;
  } | null>(null);

  useEffect(() => {
    if (testId) {
      // Check if user is logged in
      const studentId = sessionStorage.getItem("studentId");
      const storedTestId = sessionStorage.getItem("testId");
      
      if (!studentId || storedTestId !== testId) {
        toast({
          title: "Error",
          description: "Please login to take the test",
          variant: "destructive",
        });
        navigate(`/test/${testId}`);
        return;
      }
      
      fetchTestInfo();
    }
  }, [testId, navigate]);

  const fetchTestInfo = async () => {
    if (!testId) return;

    try {
      const { data: test, error } = await supabase
        .from("tests")
        .select(`
          id,
          title,
          duration_minutes,
          is_active,
          start_time,
          end_time
        `)
        .eq("id", testId)
        .single();

      if (error) throw error;

      if (!test || !test.is_active) {
        toast({
          title: "Error",
          description: "This test is not available",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setTestInfo({
        title: test.title,
        duration_minutes: test.duration_minutes,
      });
    } catch (error) {
      console.error("Error fetching test info:", error);
      toast({
        title: "Error",
        description: "Failed to fetch test information",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  useEffect(() => {
    // Connect to monitoring service
    monitoringService.connect();

    // Set up warning handler
    monitoringService.onWarning((warning) => {
      setWarnings((prev) => [...prev, warning]);
    });

    // Set up exam termination handler
    monitoringService.onExamTerminated(() => {
      setIsExamStarted(false);
      alert('Exam has been terminated by the administrator.');
      navigate('/');
    });

    return () => {
      monitoringService.disconnect();
    };
  }, [navigate]);

  const handleSetupComplete = () => {
    setIsSetupComplete(true);
    setIsExamStarted(true);
  };

  const handleTimeUp = async () => {
    setIsExamStarted(false);
    
    // Submit the exam
    try {
      const studentId = sessionStorage.getItem("studentId");
      if (!studentId || !testId) return;

      const { error } = await supabase
        .from("test_sessions")
        .insert([{
          test_id: testId,
          student_id: studentId,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }]);

      if (error) throw error;

      // Mark student as having taken the test
      await supabase
        .from("students")
        .update({ has_taken_test: true })
        .eq("id", studentId);

      toast({
        title: "Success",
        description: "Your exam has been submitted successfully",
      });

      navigate('/');
    } catch (error) {
      console.error("Error submitting exam:", error);
      toast({
        title: "Error",
        description: "Failed to submit exam. Please contact support.",
        variant: "destructive",
      });
    }
  };

  if (!testInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isSetupComplete) {
    return <ExamSecuritySetup onSetupComplete={handleSetupComplete} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {isExamStarted && (
        <>
          <ExamTimer duration={testInfo.duration_minutes} onTimeUp={handleTimeUp} />
          
          {/* Display warnings if any */}
          {warnings.length > 0 && (
            <div className="fixed top-20 right-4 bg-yellow-100 border-l-4 border-yellow-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    {warnings[warnings.length - 1]}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Exam Content */}
          <div className="container mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h1 className="text-2xl font-bold mb-6">{testInfo.title}</h1>
              
              {/* Add your exam questions and content here */}
              <div className="space-y-6">
                {/* Example question */}
                <div className="border-b pb-4">
                  <h2 className="text-lg font-semibold mb-2">Question 1</h2>
                  <p className="text-gray-700 mb-4">
                    What is the capital of France?
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="radio" name="q1" className="mr-2" />
                      London
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="q1" className="mr-2" />
                      Paris
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="q1" className="mr-2" />
                      Berlin
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="q1" className="mr-2" />
                      Madrid
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExamPage; 