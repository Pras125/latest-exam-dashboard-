import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Timer } from "lucide-react";

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

  useEffect(() => {
    if (!testId || typeof testId !== "string") return;
    fetchTest();
  }, [testId]);

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

  const fetchTest = async () => {
    if (!testId || typeof testId !== "string") return;

    try {
      const { data, error } = await supabase
        .from("tests")
        .select(`
          id,
          title,
          duration_minutes,
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

      // Transform the data to match our Test interface
      const transformedTest: Test = {
        id: data.id,
        title: data.title,
        duration_minutes: data.duration_minutes,
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Test not found</h1>
          <p className="mt-2">The test you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{test.title}</h1>
          <div className="flex items-center space-x-2">
            <Timer className="h-5 w-5" />
            <span className="font-medium">{formatTime(timeLeft)}</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Question {currentQuestion + 1} of {test.questions.length}</CardTitle>
            <CardDescription>{test.questions[currentQuestion].text}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestion === 0}
              >
                Previous
              </Button>
              {currentQuestion < test.questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestion((prev) => Math.min(test.questions.length - 1, prev + 1))}
                  disabled={answers[currentQuestion] === -1}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || answers.includes(-1)}
                >
                  {submitting ? "Submitting..." : "Submit Test"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap gap-2">
          {test.questions.map((_, index) => (
            <Button
              key={index}
              variant={answers[index] === -1 ? "outline" : "default"}
              size="sm"
              onClick={() => setCurrentQuestion(index)}
            >
              {index + 1}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestAttempt; 