import React, { useState } from 'react';
import { useAuth, useData, useFeedback } from '@/hooks/useApi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

/**
 * Example component demonstrating the new error handling system
 * This shows how to use the new hooks and error handling
 */
const ErrorHandlingExample: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  
  const { login, register, loading: authLoading } = useAuth();
  const { uploadFile, loading: dataLoading } = useData();
  const { createFeedback, addMessage, loading: feedbackLoading } = useFeedback();

  const handleLogin = async () => {
    try {
      const response = await login({ email, password });
      console.log('Login successful:', response);
      // Handle successful login
    } catch (error) {
      // Error is automatically handled by the error context
      console.log('Login failed:', error);
    }
  };

  const handleRegister = async () => {
    try {
      const response = await register({ 
        email, 
        password, 
        username: email.split('@')[0] 
      });
      console.log('Registration successful:', response);
    } catch (error) {
      // Error is automatically handled by the error context
      console.log('Registration failed:', error);
    }
  };

  const handleFileUpload = async () => {
    if (!file) return;
    
    try {
      const response = await uploadFile(file);
      console.log('Upload successful:', response);
    } catch (error) {
      // Error is automatically handled by the error context
      console.log('Upload failed:', error);
    }
  };

  const handleCreateFeedback = async () => {
    try {
      const response = await createFeedback({
        title: 'Test Feedback',
        message: message,
        type: 'bug'
      });
      console.log('Feedback created:', response);
    } catch (error) {
      // Error is automatically handled by the error context
      console.log('Feedback creation failed:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-4">Error Handling Examples</h2>
      
      {/* Authentication Examples */}
      <div className="border p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Authentication</h3>
        
        <div className="space-y-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          
          <div className="flex gap-2">
            <Button
              onClick={handleLogin}
              loading={authLoading}
              variant="solid"
            >
              Login (Test Error)
            </Button>
            
            <Button
              onClick={handleRegister}
              loading={authLoading}
              variant="outline"
            >
              Register (Test Error)
            </Button>
          </div>
        </div>
      </div>

      {/* File Upload Example */}
      <div className="border p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">File Upload</h3>
        
        <div className="space-y-3">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          
          <Button
            onClick={handleFileUpload}
            loading={dataLoading}
            disabled={!file}
            variant="solid"
          >
            Upload File (Test Error)
          </Button>
        </div>
      </div>

      {/* Feedback Example */}
      <div className="border p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Feedback</h3>
        
        <div className="space-y-3">
          <Input
            placeholder="Feedback message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          
          <Button
            onClick={handleCreateFeedback}
            loading={feedbackLoading}
            variant="solid"
          >
            Create Feedback (Test Error)
          </Button>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <p><strong>How it works:</strong></p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Errors are automatically caught and displayed</li>
          <li>User-friendly messages are shown based on error codes</li>
          <li>Loading states are managed automatically</li>
          <li>Critical errors stay visible until dismissed</li>
          <li>Non-critical errors auto-dismiss after 5 seconds</li>
        </ul>
      </div>
    </div>
  );
};

export default ErrorHandlingExample;
