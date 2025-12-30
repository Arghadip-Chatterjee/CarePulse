"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { sendEmail } from "./email.actions";

// Request password reset - generates token and sends email
export const requestPasswordReset = async (email: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return { success: true, message: "If an account exists, a reset email has been sent." };
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      } as any,
    });

    // Send reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;
    
    await sendEmail({
      to: email,
      subject: "Password Reset Request - CarePulse",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22c55e;">Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${resetUrl}</p>
          <p><strong>This link will expire in 15 minutes.</strong></p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">CarePulse - Healthcare Management System</p>
        </div>
      `,
    });

    return { success: true, message: "If an account exists, a reset email has been sent." };
  } catch (error) {
    console.error("Password reset request error:", error);
    return { success: false, message: "An error occurred. Please try again." };
  }
};

// Verify reset token
export const verifyResetToken = async (token: string) => {
  try {
    const user = await prisma.user.findFirst({
      where: { resetToken: token } as any,
    });

    if (!user || !(user as any).resetTokenExpiry) {
      return { valid: false, message: "Invalid or expired reset token." };
    }

    if (new Date() > (user as any).resetTokenExpiry) {
      return { valid: false, message: "Reset token has expired." };
    }

    return { valid: true, userId: user.id };
  } catch (error) {
    console.error("Token verification error:", error);
    return { valid: false, message: "An error occurred." };
  }
};

// Reset password with token
export const resetPassword = async (token: string, newPassword: string) => {
  try {
    // Verify token first
    const verification = await verifyResetToken(token);
    if (!verification.valid) {
      return { success: false, message: verification.message };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: verification.userId },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      } as any,
    });

    return { success: true, message: "Password reset successfully!" };
  } catch (error) {
    console.error("Password reset error:", error);
    return { success: false, message: "An error occurred. Please try again." };
  }
};
