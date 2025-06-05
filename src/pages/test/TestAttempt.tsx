import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Question {
  id: string;
  text: string;
  options: string[];
  correct_answer: number;
}

interface Test {
  id: string;
  title: string;
  duration_minutes: number;
  questions: Question[];
}

const TestAttempt = () => {
  const { id: testId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!testId) return;
    verifySession();
  }, [testId]);

  const verifySession = async () => {
    if (!testId) return;

    try {
      // Get session ID from sessionStorage
      const storedSessionId = sessionStorage.getItem("sessionId");
      const storedStudentId = sessionStorage.getItem("studentId");
      const storedTestId = sessionStorage.getItem("testId");

      if (!storedSessionId || !storedStudentId || storedTestId !== testId) {
        toast({
          title: "Error",
          description: "Please log in to take the test",
          variant: "destructive",
        });
        navigate(`/test/${testId}`);
        return;
      }

      // Verify the session exists and is active
      const { data: session, error: sessionError } = await supabase
        .from("test_sessions")
        .select("id")
        .eq("id", storedSessionId)
        .eq("student_id", storedStudentId)
        .eq("test_id", testId)
        .is("completed_at", null)
        .single();

      if (sessionError || !session) {
        // Clear session storage if session is invalid
        sessionStorage.removeItem("sessionId");
        sessionStorage.removeItem("studentId");
        sessionStorage.removeItem("studentName");
        sessionStorage.removeItem("testId");

        toast({
          title: "Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        navigate(`/test/${testId}`);
        return;
      }

      setSessionId(storedSessionId);
      fetchTest();
    } catch (error) {
      console.error("Error verifying session:", error);
      navigate(`/test/${testId}`);
    }
  };

  const fetchTest = async () => {
    if (!testId) return;

    try {
      const { data, error } = await supabase
        .from("tests")
        .select(`
          id,
          title,
          duration_minutes,
          is_active,
          start_time,
          end_time,
          questions:test_questions(
            id,
            text,
            options,
            correct_answer
          )
        `)
        .eq("id", testId)
        .single();

      if (error) throw error;

      // Check if test is active
      if (!data.is_active) {
        toast({
          title: "Error",
          description: "This test is not active",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Check if test is within time window
      const now = new Date();
      if (data.start_time && new Date(data.start_time) > now) {
        toast({
          title: "Error",
          description: "This test has not started yet",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      if (data.end_time && new Date(data.end_time) < now) {
        toast({
          title: "Error",
          description: "This test has ended",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setTest(data);
      setTimeLeft(data.duration_minutes * 60);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching test:", error);
      toast({
        title: "Error",
        description: "Failed to fetch test",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < (test?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    if (!test || !testId) return;

    setSubmitting(true);
    try {
      // Calculate score
      const score = test.questions.reduce((total, question, index) => {
        return total + (answers[index] === question.correct_answer ? 1 : 0);
      }, 0);

      // Update test session
      const { error } = await supabase
        .from("test_sessions")
        .update({
          completed_at: new Date().toISOString(),
          total_score: score,
          total_questions: test.questions.length,
        })
        .eq("id", sessionId);

      if (error) throw error;

      // Mark student as having taken the test
      const studentId = sessionStorage.getItem("studentId");
      if (studentId) {
        const { error: studentError } = await supabase
          .from("students")
          .update({ has_taken_test: true })
          .eq("id", studentId);

        if (studentError) throw studentError;
      }

      // Clear session
      sessionStorage.removeItem("sessionId");
      sessionStorage.removeItem("studentId");
      sessionStorage.removeItem("studentName");
      sessionStorage.removeItem("testId");

      toast({
        title: "Success",
        description: "Test submitted successfully",
      });

      navigate("/test-complete");
    } catch (error) {
      console.error("Error submitting test:", error);
      toast({
        title: "Error",
        description: "Failed to submit test",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Loading test...</h2>
          <p>Please wait while we prepare your test.</p>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Test not found</h2>
          <p>The test you're looking for doesn't exist or is no longer available.</p>
        </div>
      </div>
    );
  }

  const currentQ = test.questions[currentQuestion];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">{test.title}</h1>
          <div className="text-lg font-semibold">
            Time Left: {minutes}:{seconds.toString().padStart(2, "0")}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Question {currentQuestion + 1} of {test.questions.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <p className="text-lg">{currentQ.text}</p>
              <div className="space-y-3">
                {currentQ.options.map((option, index) => (
                  <Button
                    key={index}
                    variant={answers[currentQuestion] === index ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleAnswer(index)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
              >
                Previous
              </Button>
              {currentQuestion === test.questions.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Submit Test
                </Button>
              ) : (
                <Button onClick={handleNext}>Next</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestAttempt; 