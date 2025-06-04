import { useState, useEffect } from "react";
import { useRouter } from "next/router";
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
import Head from "next/head";

const TestLogin = () => {
  const router = useRouter();
  const { id: testId } = router.query;
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
    if (testId && typeof testId === "string") {
      fetchTestInfo();
    }
  }, [testId]);

  const fetchTestInfo = async () => {
    if (!testId || typeof testId !== "string") return;

    try {
      const { data: test, error } = await supabase
        .from("tests")
        .select(`
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
        router.push("/");
        return;
      }

      if (!test.is_active) {
        toast({
          title: "Error",
          description: "This test is not active",
          variant: "destructive",
        });
        router.push("/");
        return;
      }

      const now = new Date();
      const startTime = new Date(test.start_time);
      const endTime = new Date(test.end_time);

      if (now < startTime) {
        toast({
          title: "Error",
          description: "Test has not started yet",
          variant: "destructive",
        });
        router.push("/");
        return;
      }

      if (now > endTime) {
        toast({
          title: "Error",
          description: "Test has ended",
          variant: "destructive",
        });
        router.push("/");
        return;
      }

      setTestInfo({
        title: test.title,
        batch_name: test.batch.name,
        start_time: new Date(test.start_time).toLocaleString(),
        end_time: new Date(test.end_time).toLocaleString(),
      });
    } catch (error) {
      console.error("Error fetching test info:", error);
      toast({
        title: "Error",
        description: "Failed to fetch test information",
        variant: "destructive",
      });
      router.push("/");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testId || typeof testId !== "string") return;

    setLoading(true);
    try {
      const { data: student, error } = await supabase
        .from("students")
        .select("id, name, has_taken_test")
        .eq("email", formData.email)
        .eq("password", formData.password)
        .single();

      if (error) throw error;

      if (!student) {
        toast({
          title: "Error",
          description: "Invalid email or password",
          variant: "destructive",
        });
        return;
      }

      if (student.has_taken_test) {
        toast({
          title: "Error",
          description: "You have already taken this test",
          variant: "destructive",
        });
        return;
      }

      // Store student info in session
      sessionStorage.setItem("studentId", student.id);
      sessionStorage.setItem("studentName", student.name);
      sessionStorage.setItem("testId", testId);

      // Redirect to test page
      router.push(`/test/${testId}/attempt`);
    } catch (error) {
      console.error("Error during login:", error);
      toast({
        title: "Error",
        description: "Failed to login. Please try again.",
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
      <Head>
        <title>Test Login - Quiz Wizard</title>
        <meta name="description" content="Login to take your test" />
      </Head>
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