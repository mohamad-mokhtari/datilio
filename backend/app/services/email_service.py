import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
from pathlib import Path

from app.core.config import settings


class EmailService:
    """Service for sending emails"""
    
    def __init__(self):
        self.smtp_server = getattr(settings, 'SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_username = getattr(settings, 'SMTP_USERNAME', None)
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', None)
        self.from_email = getattr(settings, 'FROM_EMAIL', 'noreply@example.com')
        self.frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    
    def send_verification_email(self, user_email: str, username: str, verification_token: str) -> bool:
        """Send email verification email"""
        try:
            verification_url = f"{self.frontend_url}/verify-email?token={verification_token}"
            
            subject = "Verify Your Email Address"
            
            # HTML email template
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Verification</title>
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }}
                    .header {{
                        background-color: #4CAF50;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }}
                    .content {{
                        background-color: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 5px 5px;
                    }}
                    .button {{
                        display: inline-block;
                        background-color: #4CAF50;
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }}
                    .footer {{
                        text-align: center;
                        margin-top: 30px;
                        color: #666;
                        font-size: 12px;
                    }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Welcome to Our Platform!</h1>
                </div>
                <div class="content">
                    <h2>Hello {username}!</h2>
                    <p>Thank you for signing up. To complete your registration and access your dashboard, please verify your email address by clicking the button below:</p>
                    
                    <div style="text-align: center;">
                        <a href="{verification_url}" class="button">Verify Email Address</a>
                    </div>
                    
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background-color: #e9e9e9; padding: 10px; border-radius: 3px;">
                        {verification_url}
                    </p>
                    
                    <p><strong>Important:</strong> This link will expire in 24 hours for security reasons.</p>
                    
                    <p>If you didn't create an account with us, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </body>
            </html>
            """
            
            # Plain text version
            text_content = f"""
            Welcome to Our Platform!
            
            Hello {username}!
            
            Thank you for signing up. To complete your registration and access your dashboard, please verify your email address by visiting this link:
            
            {verification_url}
            
            This link will expire in 24 hours for security reasons.
            
            If you didn't create an account with us, please ignore this email.
            
            This is an automated message, please do not reply to this email.
            """
            
            return self._send_email(user_email, subject, text_content, html_content)
            
        except Exception as e:
            print(f"Error sending verification email: {e}")
            return False
    
    def send_password_reset_email(self, user_email: str, username: str, reset_token: str) -> bool:
        """Send password reset email"""
        try:
            reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"
            
            subject = "Password Reset Request"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset</title>
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }}
                    .header {{
                        background-color: #f44336;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }}
                    .content {{
                        background-color: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 5px 5px;
                    }}
                    .button {{
                        display: inline-block;
                        background-color: #f44336;
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }}
                    .footer {{
                        text-align: center;
                        margin-top: 30px;
                        color: #666;
                        font-size: 12px;
                    }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <h2>Hello {username}!</h2>
                    <p>We received a request to reset your password. Click the button below to reset your password:</p>
                    
                    <div style="text-align: center;">
                        <a href="{reset_url}" class="button">Reset Password</a>
                    </div>
                    
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background-color: #e9e9e9; padding: 10px; border-radius: 3px;">
                        {reset_url}
                    </p>
                    
                    <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
                    
                    <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
                </div>
                <div class="footer">
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </body>
            </html>
            """
            
            text_content = f"""
            Password Reset Request
            
            Hello {username}!
            
            We received a request to reset your password. Visit this link to reset your password:
            
            {reset_url}
            
            This link will expire in 1 hour for security reasons.
            
            If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            
            This is an automated message, please do not reply to this email.
            """
            
            return self._send_email(user_email, subject, text_content, html_content)
            
        except Exception as e:
            print(f"Error sending password reset email: {e}")
            return False
    
    def _send_email(self, to_email: str, subject: str, text_content: str, html_content: str) -> bool:
        """
        Send email using SMTP
        
        Automatically detects mode:
        - DEVELOPMENT MODE: No SMTP credentials → logs to console
        - PRODUCTION MODE: SMTP credentials configured → sends real email
        """
        try:
            # Check if SMTP credentials are configured
            smtp_configured = bool(self.smtp_username and self.smtp_password)
            
            if not smtp_configured:
                # DEVELOPMENT MODE: Print to console
                print("=" * 80)
                print("📧 EMAIL (DEVELOPMENT MODE - NO SMTP CONFIGURED)")
                print("=" * 80)
                print(f"To: {to_email}")
                print(f"Subject: {subject}")
                print()
                print("🔗 VERIFICATION LINK:")
                # Extract URL from text content
                import re
                url_match = re.search(r'http://[^\s]+', text_content)
                if url_match:
                    verification_url = url_match.group()
                    print(f"   {verification_url}")
                    print()
                    print("📋 Copy this link and paste it in your browser")
                else:
                    print("   Could not extract URL from email content")
                print("=" * 80)
                print()
                print("💡 TIP: Configure SMTP credentials in .env to send real emails:")
                print("   SMTP_SERVER=smtp.gmail.com")
                print("   SMTP_PORT=587")
                print("   SMTP_USERNAME=your-email@gmail.com")
                print("   SMTP_PASSWORD=your-app-password")
                print("   FROM_EMAIL=your-email@gmail.com")
                print("=" * 80)
                print()
                return True
            
            # PRODUCTION MODE: Send real email via SMTP
            print(f"📧 Sending email to {to_email}...")
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.from_email
            message["To"] = to_email
            
            # Create text and HTML parts
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")
            
            # Add parts to message (HTML should be last per RFC 2046)
            message.attach(text_part)
            message.attach(html_part)
            
            # Create secure connection and send email
            context = ssl.create_default_context()
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                # Enable TLS encryption
                server.starttls(context=context)
                
                # Login to SMTP server
                server.login(self.smtp_username, self.smtp_password)
                
                # Send email
                server.send_message(message)
            
            print(f"✅ Email sent successfully to {to_email}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            print("=" * 80)
            print("❌ SMTP AUTHENTICATION ERROR")
            print("=" * 80)
            print(f"Failed to authenticate with SMTP server: {e}")
            print()
            print("Solutions:")
            print("1. If using Gmail with 2FA:")
            print("   → Use an App Password instead of regular password")
            print("   → Go to: https://myaccount.google.com/apppasswords")
            print()
            print("2. If using Gmail without 2FA:")
            print("   → Enable 'Less secure app access' or use App Password")
            print()
            print("3. Double-check your .env credentials are correct")
            print("=" * 80)
            return False
            
        except smtplib.SMTPException as e:
            print("=" * 80)
            print("❌ SMTP ERROR")
            print("=" * 80)
            print(f"SMTP error occurred: {e}")
            print()
            print("Possible issues:")
            print("- Incorrect SMTP server or port")
            print("- Network/firewall blocking connection")
            print("- Gmail blocking suspicious activity")
            print("=" * 80)
            return False
            
        except Exception as e:
            print(f"❌ Failed to send email to {to_email}: {e}")
            return False


# Global email service instance
email_service = EmailService()
