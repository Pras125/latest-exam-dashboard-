import { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Plus, Mail, Loader2, Trash2 } from "lucide-react";
import { sendTestEmails } from "@/lib/emailService";

interface Batch {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  has_taken_test: boolean;
  batch: { name: string };
}

const StudentManagement = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const { toast } = useToast();

  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
  });

  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchBatches();
    fetchStudents();
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

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select(`
          id,
          name,
          email,
          has_taken_test,
          batch:batches(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const generatePassword = () =>
    Math.random().toString(36).slice(-10) +
    Math.random().toString(36).toUpperCase().slice(-2);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !studentForm.name.trim() || !studentForm.email.trim()) return;

    setLoading(true);
    try {
      const password = generatePassword();

      const { error } = await supabase.from("students").insert([
        {
          batch_id: selectedBatch,
          name: studentForm.name,
          email: studentForm.email,
          password,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Student added with password: ${password}`,
      });

      setStudentForm({ name: "", email: "" });
      fetchStudents();
    } catch (error) {
      console.error("Error adding student:", error);
      toast({
        title: "Error",
        description: "Failed to add student",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmails = async () => {
    if (!selectedBatch) {
      toast({
        title: "Error",
        description: "Please select a batch first",
        variant: "destructive",
      });
      return;
    }

    setEmailSending(true);

    try {
      console.log('Fetching test for batch:', selectedBatch);
      const { data: test, error: testError } = await supabase
        .from("tests")
        .select("id, title")
        .eq("batch_id", selectedBatch)
        .single();

      if (testError) {
        console.error('Error fetching test:', testError);
        throw new Error('Failed to fetch test information');
      }

      if (!test) {
        throw new Error('No test found for this batch');
      }

      console.log('Fetching students for batch:', selectedBatch);
      const { data: studentList, error: studentError } = await supabase
        .from("students")
        .select("id, name, email, password")
        .eq("batch_id", selectedBatch);

      if (studentError) {
        console.error('Error fetching students:', studentError);
        throw new Error('Failed to fetch student list');
      }

      if (!studentList || studentList.length === 0) {
        throw new Error('No students found in this batch');
      }

      console.log(`Found ${studentList.length} students in batch`);
      // Get the base URL from window.location in browser or use default
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'https://quiz-wizard.vercel.app';
      
      // Ensure we're using the correct test ID in the URL
      const testLink = `${baseUrl}/test/${test.id}`;
      console.log('Test link:', testLink);

      // Log the test ID for debugging
      console.log('Test ID:', test.id);

      const result = await sendTestEmails(studentList, testLink);

      if (result.success) {
        toast({
          title: "Success",
          description: `Successfully sent test invitations to all ${result.successCount} students`,
        });
      } else {
        const message = result.failedCount > 0 
          ? `Sent ${result.successCount} emails successfully. Failed to send ${result.failedCount} emails.`
          : 'Failed to send test invitations';
        
        toast({
          title: "Partial Success",
          description: message,
          variant: result.successCount === 0 ? "destructive" : "default",
        });
      }
    } catch (error) {
      console.error("Error sending test emails:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send test links",
        variant: "destructive",
      });
    } finally {
      setEmailSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBatch) return;

    setLoading(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const studentsToUpload = [];

      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(",");
        if (columns.length >= 2) {
          studentsToUpload.push({
            batch_id: selectedBatch,
            name: columns[0]?.trim(),
            email: columns[1]?.trim(),
            password: generatePassword(),
          });
        }
      }

      if (studentsToUpload.length > 0) {
        const { error } = await supabase.from("students").insert(studentsToUpload);
        if (error) throw error;

        toast({
          title: "Success",
          description: `${studentsToUpload.length} students uploaded successfully`,
        });
        fetchStudents();
      } else {
        toast({
          title: "Warning",
          description: "No valid students found in the file",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to upload students. Please check file format.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;

    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", studentToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student deleted successfully",
      });

      fetchStudents();
    } catch (error) {
      console.error("Error deleting student:", error);
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
      setStudentToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Batch</CardTitle>
          <CardDescription>Choose the batch to add students to</CardDescription>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add Student Manually</CardTitle>
            <CardDescription>Enter student details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Student Name</Label>
                <Input
                  id="name"
                  placeholder="Enter student name"
                  value={studentForm.name}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={studentForm.email}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <Button type="submit" disabled={loading || !selectedBatch}>
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload from Excel</CardTitle>
            <CardDescription>Upload student list from CSV/Excel file</CardDescription>
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
                <ul className="list-disc list-inside mt-2">
                  <li>CSV file with headers</li>
                  <li>Columns: Name, Email</li>
                </ul>
              </div>
              <Button onClick={handleSendTestEmails} disabled={!selectedBatch || emailSending}>
                {emailSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Send Test Links to All
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Students</CardTitle>
          <CardDescription>View all registered students</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Test Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.batch?.name}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        student.has_taken_test
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {student.has_taken_test ? "Completed" : "Pending"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setStudentToDelete(student)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!studentToDelete} onOpenChange={() => setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {studentToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudent}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StudentManagement;
