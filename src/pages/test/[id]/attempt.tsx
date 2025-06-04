import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Timer } from "lucide-react";
import Head from "next/head";

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
  is_active: boolean;
  start_time: string | null;
  end_time: string | null;
}

interface TestData {
  id: string;
  title: string;
  duration_minutes: number;
  questions: {
    id: string;
    text: string;
    options: string[];
    correct_answer: number;
  }[];
}

const TestAttempt = () => {
  const router = useRouter();
  const { id: testId } = router.query;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!testId || typeof testId !== "string") return;
    verifySession();
  }, [testId]);

  const verifySession = async () => {
    if (!testId || typeof testId !== "string") return;

    try {
      // Check if there's an active session for this test
      const { data: session, error: sessionError } = await supabase
        .from("test_sessions")
        .select("id")
        .eq("test_id", testId)
        .is("completed_at", null)
        .single();

      if (sessionError || !session) {
        toast({
          title: "Error",
          description: "Please log in to take the test",
          variant: "destructive",
        });
        router.push(`/test/${testId}`);
        return;
      }

      setSessionId(session.id);
      fetchTest();
    } catch (error) {
      console.error("Error verifying session:", error);
      router.push(`/test/${testId}`);
    }
  };

  const fetchTest = async () => {
    if (!testId || typeof testId !== "string") return;

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
        router.push("/");
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
        router.push("/");
        return;
      }

      if (data.end_time && new Date(data.end_time) < now) {
        toast({
          title: "Error",
          description: "This test has ended",
          variant: "destructive",
        });
        router.push("/");
        return;
      }

      // Transform the data to match our Test interface
      const transformedTest: Test = {
        id: data.id,
        title: data.title,
        duration_minutes: data.duration_minutes,
        is_active: data.is_active,
        start_time: data.start_time,
        end_time: data.end_time,
        questions: (data.questions as unknown as Question[]).map(q => ({
          id: q.id,
          text: q.text,
          options: q.options,
          correct_answer: q.correct_answer,
        })),
      };

      setTest(transformedTest);
      setAnswers(new Array(transformedTest.questions.length).fill(-1));
    } catch (error) {
      console.error("Error fetching test:", error);
      toast({
        title: "Error",
        description: "Failed to load test",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!test) return;

    // Set initial time
    setTimeLeft(test.duration_minutes * 60);

    // Start timer
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
  }, [test]);

  const handleAnswer = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (!test || !testId || typeof testId !== "string") return;

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
        .eq("test_id", testId);

      if (error) throw error;

      // Mark student as having taken the test
      const { error: studentError } = await supabase
        .from("students")
        .update({ has_taken_test: true })
        .eq("id", testId);

      if (studentError) throw studentError;

      toast({
        title: "Success",
        description: "Test submitted successfully",
      });

      router.push("/test-complete");
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{test.title} - Quiz Wizard</title>
        <meta name="description" content="Take your test" />
      </Head>
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{test.title}</h1>
            <p className="text-gray-600">
              Question {currentQuestion + 1} of {test.questions.length}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Timer className="h-5 w-5" />
            <span className="font-medium">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-4">
                  {test.questions[currentQuestion].text}
                </h2>
                <div className="space-y-3">
                  {test.questions[currentQuestion].options.map((option, index) => (
                    <Button
                      key={index}
                      variant={answers[currentQuestion] === index ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => handleAnswer(currentQuestion, index)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestion === 0}
                >
                  Previous
                </Button>
                {currentQuestion === test.questions.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit Test"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentQuestion(prev => Math.min(test.questions.length - 1, prev + 1))}
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestAttempt; 