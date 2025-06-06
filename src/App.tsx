import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TestLogin from "./pages/test/TestLogin";
import TestAttempt from "./pages/test/TestAttempt";
import TestManagement from "./pages/TestManagement";
import ExamPage from "./pages/ExamPage";
import HRDashboard from "./components/HRDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/test/:id" element={<TestLogin />} />
          <Route path="/test/:id/attempt" element={<TestAttempt />} />
          <Route path="/tests" element={<TestManagement />} />
          <Route path="/exam/:id" element={<ExamPage examDuration={60} examId="1" />} />
          <Route path="/hr-dashboard" element={<HRDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
