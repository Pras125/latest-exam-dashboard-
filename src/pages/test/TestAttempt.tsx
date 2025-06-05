import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { Loader2 } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

const TestAttempt = () => {
  const { id: testId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
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
      
      fetchTestAndQuestions();
    }
  }, [testId, navigate]);

  const fetchTestAndQuestions = async () => {
    if (!testId) return;

    try {
      // First fetch test info
      const { data: test, error: testError } = await supabase
        .from("tests")
        .select("id, title, duration_minutes, batch_id")
        .eq("id", testId)
        .single();

      if (testError) throw testError;

      if (!test) {
        toast({
          title: "Error",
          description: "Test not found",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setTestInfo({
        title: test.title,
        duration_minutes: test.duration_minutes,
      });

      // Then fetch questions
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("batch_id", test.batch_id);

      if (questionsError) throw questionsError;

      if (!questions || questions.length === 0) {
        toast({
          title: "Error",
          description: "No questions found for this test",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setQuestions(questions);
    } catch (error) {
      console.error("Error fetching test:", error);
      toast({
        title: "Error",
        description: "Failed to load test questions",
        variant: "destructive",
      });
      navigate("/");
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
    if (!testId) return;

    setSubmitting(true);
    try {
      const studentId = sessionStorage.getItem("studentId");
      const sessionId = sessionStorage.getItem("sessionId");

      if (!studentId || !sessionId) {
        throw new Error("Session information missing");
      }

      // Submit all answers
      const submissions = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
        test_id: testId,
        student_id: studentId,
        question_id: questionId,
        selected_answer: selectedAnswer,
        submitted_at: new Date().toISOString(),
      }));

      const { error: submissionsError } = await supabase
        .from("test_submissions")
        .insert(submissions);

      if (submissionsError) throw submissionsError;

      // Update test session
      const { error: sessionError } = await supabase
        .from("test_sessions")
        .update({
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (sessionError) throw sessionError;

      // Update student's has_taken_test status
      const { error: studentError } = await supabase
        .from("students")
        .update({
          has_taken_test: true,
        })
        .eq("id", studentId);

      if (studentError) throw studentError;

      toast({
        title: "Success",
        description: "Test submitted successfully",
      });

      // Clear session storage
      sessionStorage.removeItem("studentId");
      sessionStorage.removeItem("studentName");
      sessionStorage.removeItem("testId");
      sessionStorage.removeItem("sessionId");

      // Redirect to home
      navigate("/");
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
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>{testInfo?.title}</CardTitle>
          <CardDescription>
            Duration: {testInfo?.duration_minutes} minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {questions.map((question, index) => (
              <div key={question.id} className="space-y-4">
                <h3 className="text-lg font-medium">
                  Question {index + 1}: {question.question_text}
                </h3>
                <RadioGroup
                  value={answers[question.id] || ""}
                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="A" id={`${question.id}-A`} />
                      <Label htmlFor={`${question.id}-A`}>{question.option_a}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="B" id={`${question.id}-B`} />
                      <Label htmlFor={`${question.id}-B`}>{question.option_b}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="C" id={`${question.id}-C`} />
                      <Label htmlFor={`${question.id}-C`}>{question.option_c}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="D" id={`${question.id}-D`} />
                      <Label htmlFor={`${question.id}-D`}>{question.option_d}</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            ))}
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Submit Test
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestAttempt; 