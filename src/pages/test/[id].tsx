import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    // Verify test exists when component mounts
    if (testId && typeof testId === "string") {
      verifyTest();
    }
  }, [testId]);

  const verifyTest = async () => {
    if (!testId || typeof testId !== "string") return;
    
    try {
      const { data, error } = await supabase
        .from("tests")
        .select("id")
        .eq("id", testId)
        .single();

      if (error || !data) {
        toast({
          title: "Error",
          description: "Test not found",
          variant: "destructive",
        });
        router.push("/");
      }
    } catch (error) {
      console.error("Error verifying test:", error);
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

      // Create test session
      const { error: sessionError } = await supabase
        .from("test_sessions")
        .insert({
          test_id: testId,
          student_id: student.id,
          started_at: new Date().toISOString(),
        });

      if (sessionError) throw sessionError;

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
  );
};

export default TestLogin; 