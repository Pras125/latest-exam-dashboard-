
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Test {
  id: string;
  title: string;
  batch: { name: string };
}

interface TestSession {
  id: string;
  total_score: number;
  total_questions: number;
  started_at: string;
  completed_at: string | null;
  student: { name: string; email: string };
  test: { title: string };
}

const TestResults = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState("");
  const [testSessions, setTestSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    if (selectedTest) {
      fetchTestSessions();
    }
  }, [selectedTest]);

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from("tests")
        .select(`
          id,
          title,
          batch:batches(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error("Error fetching tests:", error);
    }
  };

  const fetchTestSessions = async () => {
    if (!selectedTest) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("test_sessions")
        .select(`
          id,
          total_score,
          total_questions,
          started_at,
          completed_at,
          student:students(name, email),
          test:tests(title)
        `)
        .eq("test_id", selectedTest)
        .order("total_score", { ascending: false });

      if (error) throw error;
      setTestSessions(data || []);
    } catch (error) {
      console.error("Error fetching test sessions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch test results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScorePercentage = (score: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((score / total) * 100);
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-100 text-green-800";
    if (percentage >= 80) return "bg-blue-100 text-blue-800";
    if (percentage >= 70) return "bg-yellow-100 text-yellow-800";
    if (percentage >= 60) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    return "F";
  };

  // Prepare chart data
  const chartData = testSessions.map((session, index) => ({
    student: `Student ${index + 1}`,
    score: getScorePercentage(session.total_score, session.total_questions),
  }));

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const calculateStats = () => {
    if (testSessions.length === 0) return null;

    const percentages = testSessions.map(session => 
      getScorePercentage(session.total_score, session.total_questions)
    );

    const average = percentages.reduce((sum, score) => sum + score, 0) / percentages.length;
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    const passed = percentages.filter(score => score >= 60).length;

    return { average, highest, lowest, passed, total: testSessions.length };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Test</CardTitle>
          <CardDescription>Choose a test to view results</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedTest} onValueChange={setSelectedTest}>
            <SelectTrigger>
              <SelectValue placeholder="Select a test" />
            </SelectTrigger>
            <SelectContent>
              {tests.map((test) => (
                <SelectItem key={test.id} value={test.id}>
                  {test.title} - {test.batch?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTest && stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.average.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.highest}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Lowest Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.lowest}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0}%
                </div>
                <p className="text-xs text-gray-600">
                  {stats.passed} of {stats.total} students
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Score Distribution</CardTitle>
              <CardDescription>Visual representation of student scores</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="student" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="score" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Individual Results</CardTitle>
              <CardDescription>Detailed breakdown of each student's performance</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Started At</TableHead>
                    <TableHead>Completed At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testSessions.map((session) => {
                    const percentage = getScorePercentage(session.total_score, session.total_questions);
                    const grade = getGrade(percentage);
                    
                    return (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">{session.student?.name}</TableCell>
                        <TableCell>{session.student?.email}</TableCell>
                        <TableCell>{session.total_score} / {session.total_questions}</TableCell>
                        <TableCell>{percentage}%</TableCell>
                        <TableCell>
                          <Badge className={getGradeColor(percentage)}>
                            {grade}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(session.started_at)}</TableCell>
                        <TableCell>
                          {session.completed_at ? formatDateTime(session.completed_at) : "In Progress"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={session.completed_at ? "default" : "secondary"}>
                            {session.completed_at ? "Completed" : "In Progress"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default TestResults;
