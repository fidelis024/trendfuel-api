import { Resend } from 'resend';
import env from '../config/env';
import logger from './logger';

const resend = new Resend(env.RESEND_API_KEY);

const FROM = 'TrendFuel <noreply@trendfuel.io>';

// ─── Email Templates ──────────────────────────────────────────────────────────

const verificationEmailHtml = (verifyUrl: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify your TrendFuel account</title>
</head>
<body style="margin:0;padding:0;background-color:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1117;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#1a1d2e;border-radius:12px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                TrendFuel
              </h1>
              <p style="margin:6px 0 0;color:#c4b5fd;font-size:13px;">Buy &amp; Sell Social Services</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:600;">
                Confirm your email address
              </h2>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Thanks for signing up. Click the button below to verify your email and activate your account.
                This link expires in <strong style="color:#a78bfa;">24 hours</strong>.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:8px;">
                    <a href="${verifyUrl}" 
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#64748b;font-size:13px;">
                Or copy and paste this URL into your browser:
              </p>
              <p style="margin:0;word-break:break-all;">
                <a href="${verifyUrl}" style="color:#7c3aed;font-size:13px;">${verifyUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #2d3148;margin:0;"/>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;color:#475569;font-size:12px;">
                If you didn't create a TrendFuel account, you can safely ignore this email.
              </p>
              <p style="margin:0;color:#334155;font-size:12px;">
                &copy; ${new Date().getFullYear()} TrendFuel. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const passwordResetEmailHtml = (resetUrl: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset your TrendFuel password</title>
</head>
<body style="margin:0;padding:0;background-color:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1117;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#1a1d2e;border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                TrendFuel
              </h1>
              <p style="margin:6px 0 0;color:#c4b5fd;font-size:13px;">Buy &amp; Sell Social Services</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:600;">
                Reset your password
              </h2>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                We received a request to reset the password for your TrendFuel account.
                Click the button below to choose a new password.
                This link expires in <strong style="color:#a78bfa;">1 hour</strong>.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:8px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#64748b;font-size:13px;">
                Or copy and paste this URL into your browser:
              </p>
              <p style="margin:0 0 28px;word-break:break-all;">
                <a href="${resetUrl}" style="color:#7c3aed;font-size:13px;">${resetUrl}</a>
              </p>

              <!-- Warning box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#1e1b4b;border-left:3px solid #7c3aed;border-radius:4px;padding:14px 16px;">
                    <p style="margin:0;color:#a78bfa;font-size:13px;line-height:1.5;">
                      If you didn't request a password reset, please ignore this email.
                      Your password will not be changed.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #2d3148;margin:0;"/>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;color:#475569;font-size:12px;">
                This link will expire in 1 hour for security reasons.
              </p>
              <p style="margin:0;color:#334155;font-size:12px;">
                &copy; ${new Date().getFullYear()} TrendFuel. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─── Send Functions ───────────────────────────────────────────────────────────

export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
  const verifyUrl = `${env.API_URL}/api/v1/auth/verify-email/${token}`;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Verify your TrendFuel account',
      html: verificationEmailHtml(verifyUrl),
    });
    logger.info(`Verification email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send verification email to ${email}:`, error);
    throw new Error('Failed to send verification email');
  }
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<void> => {
  // Reset link points to the frontend, not the API
  const resetUrl = `${env.API_URL}/reset-password/${token}`;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Reset your TrendFuel password',
      html: passwordResetEmailHtml(resetUrl),
    });
    logger.info(`Password reset email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send password reset email to ${email}:`, error);
    throw new Error('Failed to send password reset email');
  }
};
