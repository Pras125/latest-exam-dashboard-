
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Play, Square, Timer, Users } from "lucide-react";

interface Batch {
  id: string;
  name: string;
}

interface Test {
  id: string;
  title: string;
  duration_minutes: number;
  is_active: boolean;
  start_time: string | null;
  end_time: string | null;
  batch: { name: string };
}

const TestManagement = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [testForm, setTestForm] = useState({
    title: "",
    duration_minutes: 60,
    start_time: "",
    end_time: "",
  });

  useEffect(() => {
    fetchBatches();
    fetchTests();
  }, []);

  const fetchBatches = async () => {
    try {
      const { data, error } = await supabase
        .from("batches")
        .select("id, name")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBatches(data || []);
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  };

  const fetchTests = async () => {
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
          batch:batches(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error("Error fetching tests:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !testForm.title.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("tests")
        .insert([{
          batch_id: selectedBatch,
          title: testForm.title,
          duration_minutes: testForm.duration_minutes,
          start_time: testForm.start_time || null,
          end_time: testForm.end_time || null,
        }]);

      if (error) throw error;

      toast({ title: "Success", description: "Test created successfully" });
      setTestForm({
        title: "",
        duration_minutes: 60,
        start_time: "",
        end_time: "",
      });
      fetchTests();
    } catch (error) {
      console.error("Error creating test:", error);
      toast({
        title: "Error",
        description: "Failed to create test",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTestStatus = async (testId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("tests")
        .update({ is_active: !isActive })
        .eq("id", testId);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Test ${!isActive ? 'activated' : 'deactivated'} successfully` 
      });
      fetchTests();
    } catch (error) {
      console.error("Error toggling test status:", error);
      toast({
        title: "Error",
        description: "Failed to update test status",
        variant: "destructive",
      });
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Test</CardTitle>
          <CardDescription>Set up a test for a specific batch</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch">Select Batch</Label>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Test Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Mid-term Assessment"
                  value={testForm.title}
                  onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={testForm.duration_minutes}
                  onChange={(e) => setTestForm({ ...testForm, duration_minutes: parseInt(e.target.value) || 60 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time (Optional)</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={testForm.start_time}
                  onChange={(e) => setTestForm({ ...testForm, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time (Optional)</Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  value={testForm.end_time}
                  onChange={(e) => setTestForm({ ...testForm, end_time: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading || !selectedBatch}>
              <Timer className="h-4 w-4 mr-2" />
              Create Test
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Tests</CardTitle>
          <CardDescription>Manage your created tests</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium">{test.title}</TableCell>
                  <TableCell>{test.batch?.name}</TableCell>
                  <TableCell>{test.duration_minutes} min</TableCell>
                  <TableCell>{formatDateTime(test.start_time)}</TableCell>
                  <TableCell>{formatDateTime(test.end_time)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      test.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {test.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={test.is_active}
                        onCheckedChange={() => toggleTestStatus(test.id, test.is_active)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleTestStatus(test.id, test.is_active)}
                      >
                        {test.is_active ? (
                          <Square className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestManagement;
