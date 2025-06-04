import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Plus, FileText, Link } from "lucide-react";
import { generateTestLink } from "@/lib/utils";

interface Batch {
  id: string;
  name: string;
}

const QuestionUpload = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [uploadType, setUploadType] = useState<"manual" | "file">("manual");
  const [loading, setLoading] = useState(false);
  const [testLink, setTestLink] = useState<string>("");
  const { toast } = useToast();

  // Manual question form
  const [questionForm, setQuestionForm] = useState({
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "A" as "A" | "B" | "C" | "D",
  });

  useEffect(() => {
    fetchBatches();
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

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !questionForm.question_text.trim()) return;

    setLoading(true);
    try {
      // First create a test for the batch
      const { data: test, error: testError } = await supabase
        .from("tests")
        .insert([{
          batch_id: selectedBatch,
          title: "Test for " + batches.find(b => b.id === selectedBatch)?.name,
          duration_minutes: 60,
          is_active: true,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        }])
        .select()
        .single();

      if (testError) throw testError;

      // Then add the question
      const { error: questionError } = await supabase
        .from("questions")
        .insert([{
          batch_id: selectedBatch,
          ...questionForm,
        }]);

      if (questionError) throw questionError;

      // Generate test link using the test ID
      const newTestLink = generateTestLink(test.id);
      setTestLink(newTestLink);
      
      toast({ 
        title: "Success", 
        description: "Question added successfully" 
      });
      
      setQuestionForm({
        question_text: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "A",
      });
    } catch (error) {
      console.error("Error adding question:", error);
      toast({
        title: "Error",
        description: "Failed to add question",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBatch) return;

    setLoading(true);
    try {
      // First create a test for the batch
      const { data: test, error: testError } = await supabase
        .from("tests")
        .insert([{
          batch_id: selectedBatch,
          title: "Test for " + batches.find(b => b.id === selectedBatch)?.name,
          duration_minutes: 60,
          is_active: true,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        }])
        .select()
        .single();

      if (testError) throw testError;

      const text = await file.text();
      
      // Simple CSV/Excel parsing (assuming CSV format with headers)
      const lines = text.split('\n').filter(line => line.trim());
      const questions = [];

      for (let i = 1; i < lines.length; i++) { // Skip header
        const columns = lines[i].split(',');
        if (columns.length >= 6) {
          questions.push({
            batch_id: selectedBatch,
            question_text: columns[0]?.trim(),
            option_a: columns[1]?.trim(),
            option_b: columns[2]?.trim(),
            option_c: columns[3]?.trim(),
            option_d: columns[4]?.trim(),
            correct_answer: columns[5]?.trim().toUpperCase(),
          });
        }
      }

      if (questions.length > 0) {
        const { error } = await supabase
          .from("questions")
          .insert(questions);

        if (error) throw error;

        // Generate test link using the test ID
        const newTestLink = generateTestLink(test.id);
        setTestLink(newTestLink);

        toast({
          title: "Success",
          description: `${questions.length} questions uploaded successfully`,
        });
      } else {
        toast({
          title: "Warning",
          description: "No valid questions found in the file",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to upload questions. Please check file format.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      e.target.value = ""; // Reset file input
    }
  };

  return (
    <div className="space-y-6">
      {testLink && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Test Link Generated
            </CardTitle>
            <CardDescription>
              Share this link with students to take the test
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                value={testLink}
                readOnly
                className="font-mono"
              />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(testLink);
                  toast({
                    title: "Copied!",
                    description: "Test link copied to clipboard",
                  });
                }}
              >
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Select Batch</CardTitle>
          <CardDescription>Choose the batch to add questions to</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Method</CardTitle>
          <CardDescription>Choose how you want to add questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={uploadType === "manual" ? "default" : "outline"}
              onClick={() => setUploadType("manual")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Manual Entry
            </Button>
            <Button
              variant={uploadType === "file" ? "default" : "outline"}
              onClick={() => setUploadType("file")}
            >
              <Upload className="h-4 w-4 mr-2" />
              File Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {uploadType === "manual" && (
        <Card>
          <CardHeader>
            <CardTitle>Add Question Manually</CardTitle>
            <CardDescription>Enter question details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question">Question</Label>
                <Textarea
                  id="question"
                  placeholder="Enter your question here..."
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  required
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="option_a">Option A</Label>
                  <Input
                    id="option_a"
                    placeholder="Option A"
                    value={questionForm.option_a}
                    onChange={(e) => setQuestionForm({ ...questionForm, option_a: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="option_b">Option B</Label>
                  <Input
                    id="option_b"
                    placeholder="Option B"
                    value={questionForm.option_b}
                    onChange={(e) => setQuestionForm({ ...questionForm, option_b: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="option_c">Option C</Label>
                  <Input
                    id="option_c"
                    placeholder="Option C"
                    value={questionForm.option_c}
                    onChange={(e) => setQuestionForm({ ...questionForm, option_c: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="option_d">Option D</Label>
                  <Input
                    id="option_d"
                    placeholder="Option D"
                    value={questionForm.option_d}
                    onChange={(e) => setQuestionForm({ ...questionForm, option_d: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="correct_answer">Correct Answer</Label>
                <Select
                  value={questionForm.correct_answer}
                  onValueChange={(value: "A" | "B" | "C" | "D") => 
                    setQuestionForm({ ...questionForm, correct_answer: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Option A</SelectItem>
                    <SelectItem value="B">Option B</SelectItem>
                    <SelectItem value="C">Option C</SelectItem>
                    <SelectItem value="D">Option D</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={loading || !selectedBatch}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {uploadType === "file" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Questions from File</CardTitle>
            <CardDescription>
              Upload a CSV file with columns: Question, Option A, Option B, Option C, Option D, Correct Answer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Choose File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={loading || !selectedBatch}
                />
              </div>
              <div className="text-sm text-gray-600">
                <p>Expected format:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>CSV file with headers</li>
                  <li>Columns: Question, Option A, Option B, Option C, Option D, Correct Answer</li>
                  <li>Correct Answer should be A, B, C, or D</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuestionUpload;
