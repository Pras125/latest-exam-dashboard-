import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Head from "next/head";

const TestLogin = () => {
  const router = useRouter();
  const { id: testId } = router.query;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    // Verify test exists and is active when component mounts
    if (testId && typeof testId === "string") {
      verifyTest();
    }
  }, [testId]);

  const verifyTest = async () => {
    if (!testId || typeof testId !== "string") return;
    
    try {
      const { data, error } = await supabase
        .from("tests")
        .select("id, is_active, start_time, end_time")
        .eq("id", testId)
        .single();

      if (error || !data) {
        toast({
          title: "Error",
          description: "Test not found",
          variant: "destructive",
        });
        router.push("/");
        return;
      }

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
    } catch (error) {
      console.error("Error verifying test:", error);
      router.push("/");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testId || typeof testId !== "string") return;

    setLoading(true);
    try {
      // Verify student credentials
      const { data: student, error } = await supabase
        .from("students")
        .select("id, name, email, password, has_taken_test")
        .eq("email", formData.email)
        .eq("password", formData.password)
        .single();

      if (error || !student) {
        throw new Error("Invalid credentials");
      }

      // Check if student has already taken the test
      if (student.has_taken_test) {
        toast({
          title: "Error",
          description: "You have already taken this test",
          variant: "destructive",
        });
        return;
      }

      // Check if there's already an active session
      const { data: existingSession, error: sessionCheckError } = await supabase
        .from("test_sessions")
        .select("id")
        .eq("test_id", testId)
        .eq("student_id", student.id)
        .is("completed_at", null)
        .single();

      if (sessionCheckError && sessionCheckError.code !== "PGRST116") {
        throw sessionCheckError;
      }

      let sessionId;

      if (existingSession) {
        // Use existing session
        sessionId = existingSession.id;
      } else {
        // Create new test session
        const { data: newSession, error: sessionError } = await supabase
          .from("test_sessions")
          .insert({
            test_id: testId,
            student_id: student.id,
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (sessionError) throw sessionError;
        sessionId = newSession.id;
      }

      // Redirect to test page
      router.push(`/test/${testId}/attempt`);
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Test Login - Quiz Wizard</title>
        <meta name="description" content="Login to take your test" />
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Test Login</CardTitle>
            <CardDescription>Enter your credentials to start the test</CardDescription>
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Start Test"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default TestLogin; 