const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #007BFF, #0056b3); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Password Reset Request</h1>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              You requested a password reset for your attendance management system account.
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Click the button below to reset your password:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #007BFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="color: #007BFF; font-size: 14px; word-break: break-all;">
              ${resetUrl}
            </p>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              This link will expire in 1 hour for security reasons.
            </p>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              If you didn't request this password reset, please ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated email from the Attendance Management System.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Send new employee invitation email
const sendEmployeeInvitation = async (email, name, tempPassword) => {
  try {
    const transporter = createTransporter();
    
    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    
    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to the Attendance Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #007BFF, #0056b3); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Welcome to the Team!</h1>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Hello ${name},
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Welcome to the Attendance Management System! Your account has been created successfully.
            </p>
            <div style="background: #e3f2fd; border-left: 4px solid #007BFF; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #1976d2; font-weight: bold;">Your Login Credentials:</p>
              <p style="margin: 5px 0 0 0; color: #333;">
                <strong>Email:</strong> ${email}<br>
                <strong>Temporary Password:</strong> ${tempPassword}
              </p>
            </div>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Please log in with these credentials and change your password immediately for security.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: #007BFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Login Now
              </a>
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              If you have any questions, please contact your system administrator.
            </p>
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated email from the Attendance Management System.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Employee invitation email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending employee invitation email:', error);
    throw error;
  }
};

// Send attendance notification email
const sendAttendanceNotification = async (email, name, type, details) => {
  try {
    const transporter = createTransporter();
    
    let subject, message;
    
    switch (type) {
      case 'unusual_location':
        subject = 'Unusual Attendance Location Detected';
        message = `
          <p>Hello ${name},</p>
          <p>We detected an unusual location for your recent attendance record:</p>
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>Date:</strong> ${details.date}<br>
              <strong>Time:</strong> ${details.time}<br>
              <strong>Location:</strong> ${details.location}<br>
              <strong>Distance from office:</strong> ${details.distance}m
            </p>
          </div>
          <p>If this is correct, no action is needed. If you believe this is an error, please contact your administrator.</p>
        `;
        break;
      
      case 'late_attendance':
        subject = 'Late Attendance Notification';
        message = `
          <p>Hello ${name},</p>
          <p>You were marked as late for your attendance:</p>
          <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #721c24;">
              <strong>Date:</strong> ${details.date}<br>
              <strong>Clock-in time:</strong> ${details.clockInTime}<br>
              <strong>Expected time:</strong> 9:00 AM
            </p>
          </div>
          <p>Please ensure timely attendance in the future.</p>
        `;
        break;
      
      default:
        subject = 'Attendance System Notification';
        message = `
          <p>Hello ${name},</p>
          <p>You have a new notification from the attendance system.</p>
        `;
    }
    
    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #007BFF, #0056b3); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Attendance Notification</h1>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            ${message}
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated email from the Attendance Management System.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Attendance notification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending attendance notification email:', error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendEmployeeInvitation,
  sendAttendanceNotification
};
