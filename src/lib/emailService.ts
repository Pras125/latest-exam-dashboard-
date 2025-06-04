// Email sending service
import emailjs from '@emailjs/browser';

// Initialize EmailJS
emailjs.init('TAhXwxu554TVdK-Xg');

const SERVICE_ID = 'service_zlnntgg';
const TEMPLATE_ID = 'template_gt4i1em';
const PUBLIC_KEY = 'TAhXwxu554TVdK-Xg';

// Add delay between requests to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Student {
  id: string;
  name: string;
  email: string;
  password: string;
}

interface EmailResult {
  success: boolean;
  error?: string;
}

export const sendTestEmails = async (students: any[], testLink: string) => {
  const failedEmails: string[] = [];
  const successEmails: string[] = [];

  // Process each email
  for (const student of students) {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(student.email)) {
        console.error(`Invalid email format: ${student.email}`);
        failedEmails.push(student.email);
        continue;
      }

      // Initialize EmailJS before sending
      emailjs.init(PUBLIC_KEY);

      // Send with exact template variables
      const response = await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          email: student.email.trim(),
          otp: student.password,
          company_name: "Quiz Wizard",
          test_link: testLink
        }
      );
      
      console.log('EmailJS response:', response);
      successEmails.push(student.email);
      
    } catch (error) {
      console.error(`Failed to send email to ${student.email}:`, error);
      failedEmails.push(student.email);
    }
  }

  return {
    success: failedEmails.length === 0,
    successCount: successEmails.length,
    failedCount: failedEmails.length,
    failedEmails,
    successEmails,
  };
};