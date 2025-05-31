
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Plus, Mail } from "lucide-react";

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
  const { toast } = useToast();

  // Manual student form
  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
  });

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

  const generatePassword = () => {
    return Math.random().toString(36).slice(-8);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !studentForm.name.trim() || !studentForm.email.trim()) return;

    setLoading(true);
    try {
      const password = generatePassword();
      
      const { error } = await supabase
        .from("students")
        .insert([{
          batch_id: selectedBatch,
          name: studentForm.name,
          email: studentForm.email,
          password: password,
        }]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBatch) return;

    setLoading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const students = [];

      for (let i = 1; i < lines.length; i++) { // Skip header
        const columns = lines[i].split(',');
        if (columns.length >= 2) {
          students.push({
            batch_id: selectedBatch,
            name: columns[0]?.trim(),
            email: columns[1]?.trim(),
            password: generatePassword(),
          });
        }
      }

      if (students.length > 0) {
        const { error } = await supabase
          .from("students")
          .insert(students);

        if (error) throw error;

        toast({
          title: "Success",
          description: `${students.length} students uploaded successfully`,
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

  const sendTestEmails = async () => {
    if (!selectedBatch) {
      toast({
        title: "Error",
        description: "Please select a batch first",
        variant: "destructive",
      });
      return;
    }

    // This would integrate with your email service
    toast({
      title: "Feature Coming Soon",
      description: "Email sending functionality will be implemented with email service integration",
    });
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
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
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
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
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
              <Button onClick={sendTestEmails} disabled={!selectedBatch}>
                <Mail className="h-4 w-4 mr-2" />
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.batch?.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      student.has_taken_test 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {student.has_taken_test ? 'Completed' : 'Pending'}
                    </span>
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

export default StudentManagement;
