
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Timer, Mail } from "lucide-react";
import BatchManagement from "@/components/admin/BatchManagement";
import QuestionUpload from "@/components/admin/QuestionUpload";
import StudentManagement from "@/components/admin/StudentManagement";
import TestManagement from "@/components/admin/TestManagement";
import TestResults from "@/components/admin/TestResults";

const Index = () => {
  const [activeTab, setActiveTab] = useState("batches");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">HR Quiz Admin Portal</h1>
          <p className="text-gray-600 mt-2">Manage batches, questions, students, and tests</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="batches" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Batches
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Questions
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="tests" className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Tests
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="batches">
            <Card>
              <CardHeader>
                <CardTitle>Batch Management</CardTitle>
                <CardDescription>Create and manage student batches</CardDescription>
              </CardHeader>
              <CardContent>
                <BatchManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <CardTitle>Question Upload</CardTitle>
                <CardDescription>Upload questions via PDF, Excel, or manual entry</CardDescription>
              </CardHeader>
              <CardContent>
                <QuestionUpload />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Student Management</CardTitle>
                <CardDescription>Upload student email lists and manage registrations</CardDescription>
              </CardHeader>
              <CardContent>
                <StudentManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tests">
            <Card>
              <CardHeader>
                <CardTitle>Test Management</CardTitle>
                <CardDescription>Create tests, set duration, and manage test sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <TestManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>View test submissions and student performance</CardDescription>
              </CardHeader>
              <CardContent>
                <TestResults />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
