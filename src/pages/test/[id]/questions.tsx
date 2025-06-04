import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Clock } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
}

const TestQuestions = () => {
  const router = useRouter();
  const { id: testId } = router.query;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [testInfo, setTestInfo] = useState<{
    title: string;
    duration_minutes: number;
  } | null>(null);

  useEffect(() => {
    if (testId && typeof testId === "string") {
      checkSession();
      fetchTestInfo();
    }
  }, [testId]);

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

  const checkSession = () => {
    const studentId = sessionStorage.getItem("studentId");
    const studentName = sessionStorage.getItem("studentName");
    const storedTestId = sessionStorage.getItem("testId");

    if (!studentId || !studentName || !storedTestId || storedTestId !== testId) {
      toast({
        title: "Error",
        description: "Please login to access the test",
        variant: "destructive",
      });
      router.push(`/test/${testId}`);
    }
  };

  const fetchTestInfo = async () => {
    if (!testId || typeof testId !== "string") return;

    try {
      const { data: test, error } = await supabase
        .from("tests")
        .select("title, duration_minutes")
        .eq("id", testId)
        .single();

      if (error) throw error;

      setTestInfo(test);
      setTimeLeft(test.duration_minutes * 60);

      // Fetch questions
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("test_id", testId)
        .order("created_at");

      if (questionsError) throw questionsError;

      setQuestions(questions || []);
    } catch (error) {
      console.error("Error fetching test info:", error);
      toast({
        title: "Error",
        description: "Failed to load test",
        variant: "destructive",
      });
      router.push(`/test/${testId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = async () => {
    if (submitting || !testId || typeof testId !== "string") return;

    setSubmitting(true);
    try {
      const studentId = sessionStorage.getItem("studentId");
      if (!studentId) throw new Error("Session expired");

      // Calculate score
      let score = 0;
      questions.forEach((question) => {
        if (answers[question.id] === question.correct_answer) {
          score++;
        }
      });

      // Save test submission
      const { error } = await supabase.from("test_submissions").insert({
        test_id: testId,
        student_id: studentId,
        score,
        total_questions: questions.length,
        answers: answers,
        completed_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Update student's has_taken_test status
      const { error: updateError } = await supabase
        .from("students")
        .update({ has_taken_test: true })
        .eq("id", studentId);

      if (updateError) throw updateError;

      // Clear session
      sessionStorage.removeItem("studentId");
      sessionStorage.removeItem("studentName");
      sessionStorage.removeItem("testId");

      toast({
        title: "Success",
        description: `Test completed! Your score: ${score}/${questions.length}`,
      });

      router.push("/");
    } catch (error) {
      console.error("Error submitting test:", error);
      toast({
        title: "Error",
        description: "Failed to submit test. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">{testInfo?.title}</h1>
            <p className="text-gray-600">
              Total Questions: {questions.length}
            </p>
          </div>
          <div className="flex items-center space-x-2 text-lg font-semibold">
            <Clock className="h-5 w-5" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Question {index + 1}
                </CardTitle>
                <CardDescription>{question.question_text}</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={answers[question.id]}
                  onValueChange={(value) =>
                    handleAnswerChange(question.id, value)
                  }
                  className="space-y-3"
                >
                  {[
                    { value: "A", label: question.option_a },
                    { value: "B", label: question.option_b },
                    { value: "C", label: question.option_c },
                    { value: "D", label: question.option_d },
                  ].map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2"
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={`${question.id}-${option.value}`}
                      />
                      <Label
                        htmlFor={`${question.id}-${option.value}`}
                        className="text-base"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Submit Test
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TestQuestions; 