import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const TestLogin = () => {
  const { id: testId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testInfo, setTestInfo] = useState<{
    title: string;
    batch_name: string;
    start_time: string;
    end_time: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    if (testId) {
      // Check if user is already logged in
      const studentId = sessionStorage.getItem("studentId");
      const storedTestId = sessionStorage.getItem("testId");
      
      if (studentId && storedTestId === testId) {
        // User is already logged in, redirect to attempt page
        navigate(`/test/${testId}/attempt`);
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
          is_active,
          start_time,
          end_time,
          batch:batches(name)
        `)
        .eq("id", testId)
        .single();

      if (error) throw error;

      if (!test) {
        toast({
          title: "Error",
          description: "Test not found",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      if (!test.is_active) {
        toast({
          title: "Error",
          description: "This test is not active",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Only check time if start_time and end_time are set
      if (test.start_time && test.end_time) {
        const now = new Date();
        const startTime = new Date(test.start_time);
        const endTime = new Date(test.end_time);

        if (now < startTime) {
          toast({
            title: "Error",
            description: "Test has not started yet",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        if (now > endTime) {
          toast({
            title: "Error",
            description: "Test has ended",
            variant: "destructive",
          });
          navigate("/");
          return;
        }
      }

      setTestInfo({
        title: test.title,
        batch_name: test.batch.name,
        start_time: test.start_time ? new Date(test.start_time).toLocaleString() : "Not set",
        end_time: test.end_time ? new Date(test.end_time).toLocaleString() : "Not set",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testId) return;

    setLoading(true);
    try {
      // First check if the test exists and is active
      const { data: test, error: testError } = await supabase
        .from("tests")
        .select("id, is_active")
        .eq("id", testId)
        .single();

      if (testError) {
        console.error("Error checking test:", testError);
        throw new Error("Failed to verify test status");
      }

      if (!test || !test.is_active) {
        toast({
          title: "Error",
          description: "This test is no longer available",
          variant: "destructive",
        });
        return;
      }

      // Then proceed with student login
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, name, has_taken_test")
        .eq("email", formData.email)
        .eq("password", formData.password)
        .single();

      if (studentError) {
        console.error("Error during student login:", studentError);
        throw new Error("Failed to verify student credentials");
      }

      if (!student) {
        toast({
          title: "Error",
          description: "Invalid email or password",
          variant: "destructive",
        });
        return;
      }

      // Check if student has already taken the test
      const { data: existingSession, error: sessionCheckError } = await supabase
        .from("test_sessions")
        .select("id")
        .eq("test_id", testId)
        .eq("student_id", student.id)
        .single();

      if (sessionCheckError && sessionCheckError.code !== "PGRST116") {
        console.error("Error checking existing session:", sessionCheckError);
        throw new Error("Failed to check test session status");
      }

      if (existingSession) {
        toast({
          title: "Error",
          description: "You have already taken this test",
          variant: "destructive",
        });
        return;
      }

      // Create a test session
      const { data: session, error: sessionError } = await supabase
        .from("test_sessions")
        .insert([{
          test_id: testId,
          student_id: student.id,
          started_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (sessionError) {
        console.error("Error creating test session:", sessionError);
        throw new Error("Failed to create test session");
      }

      // Store student info in session
      sessionStorage.setItem("studentId", student.id);
      sessionStorage.setItem("studentName", student.name);
      sessionStorage.setItem("testId", testId);
      sessionStorage.setItem("sessionId", session.id);

      // Redirect to test page
      navigate(`/test/${testId}/attempt`);
    } catch (error) {
      console.error("Error during login:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!testInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {testInfo.title}
          </CardTitle>
          <CardDescription className="text-center">
            Batch: {testInfo.batch_name}
          </CardDescription>
          <div className="text-sm text-gray-500 text-center mt-2">
            <p>Start Time: {testInfo.start_time}</p>
            <p>End Time: {testInfo.end_time}</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Login to Start Test
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestLogin; 