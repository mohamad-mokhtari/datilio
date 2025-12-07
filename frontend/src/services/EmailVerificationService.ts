import ApiService2 from './ApiService2';
import apiClient from '@/utils/apiClient';

export interface EmailVerificationResponse {
  message: string;
  success: boolean;
  verified?: boolean; // Keep for backward compatibility
}

export interface ResendVerificationResponse {
  message: string;
  success: boolean;
}

export interface ResendByTokenResponse {
  message: string;
  success: boolean;
}

export interface VerificationStatusResponse {
  is_verified: boolean;
  email: string;
}

export const EmailVerificationService = {
  /**
   * Verify email with token from URL
   */
  async verifyEmail(token: string): Promise<EmailVerificationResponse> {
    const response = await ApiService2.post<EmailVerificationResponse>(
      '/email-verification/verify',
      { token }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to verify email: ${response.statusText}`);
    }
    
    return response.data;
  },

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<ResendVerificationResponse> {
    const response = await ApiService2.post<ResendVerificationResponse>(
      '/auth/resend-verification',
      { email }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to resend verification email: ${response.statusText}`);
    }
    
    return response.data;
  },

  /**
   * Resend verification email using token
   */
  async resendVerificationByToken(token: string): Promise<ResendByTokenResponse> {
    const response = await ApiService2.post<ResendByTokenResponse>(
      '/email-verification/resend-by-token',
      { token }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to resend verification email: ${response.statusText}`);
    }
    
    return response.data;
  },

  /**
   * Resend verification email using email address
   */
  async resendVerificationByEmail(email: string): Promise<ResendVerificationResponse> {
    const response = await ApiService2.post<ResendVerificationResponse>(
      '/email-verification/resend-by-email',
      { email }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to resend verification email: ${response.statusText}`);
    }
    
    return response.data;
  },

  /**
   * Check current user's verification status
   */
  async getVerificationStatus(): Promise<VerificationStatusResponse> {
    const response = await ApiService2.get<VerificationStatusResponse>(
      '/email-verification/status'
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get verification status: ${response.statusText}`);
    }
    
    return response.data;
  }
};

export default EmailVerificationService;
