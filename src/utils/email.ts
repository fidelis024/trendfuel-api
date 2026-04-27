import { Resend } from 'resend';
import env from '../config/env';
import logger from './logger';

const resend = new Resend(env.RESEND_API_KEY);
const FROM = 'TrendFuel <noreply@trendfuelhq.org>';

const header = `
  <tr>
    <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:36px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">TrendFuel</h1>
      <p style="margin:6px 0 0;color:#c4b5fd;font-size:13px;">Buy &amp; Sell Social Services</p>
    </td>
  </tr>`;

const footer = `
  <tr>
    <td style="padding:0 40px;">
      <hr style="border:none;border-top:1px solid #2d3148;margin:0;"/>
    </td>
  </tr>
  <tr>
    <td style="padding:24px 40px;text-align:center;">
      <p style="margin:0;color:#334155;font-size:12px;">&copy; ${new Date().getFullYear()} TrendFuel. All rights reserved.</p>
    </td>
  </tr>`;

const wrap = (body: string) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1117;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#1a1d2e;border-radius:12px;overflow:hidden;">
        ${header}
        <tr><td style="padding:40px 40px 32px;">${body}</td></tr>
        ${footer}
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const btn = (url: string, label: string) => `
  <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
    <tr>
      <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:8px;">
        <a href="${url}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`;

const sendEmail = async (to: string, subject: string, html: string, context: string) => {
  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    logger.error(`Resend error [${context}] to ${to}:`, error);
    throw new Error(`Failed to send ${context}: ${error.message}`);
  }
  logger.info(`Email [${context}] sent to ${to} — id: ${data?.id}`);
};

export const sendVerificationEmail = async (email: string, token: string, firstName: string) => {
  const verifyUrl = `${env.APP_URL}/confirm-account?token=${token}`;
  await sendEmail(
    email,
    'Verify your TrendFuel account',
    wrap(`
    <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:600;">Hey ${firstName}, confirm your email</h2>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">Thanks for signing up. Click below to verify your email. Link expires in <strong style="color:#a78bfa;">24 hours</strong>.</p>
    ${btn(verifyUrl, 'Verify Email Address')}
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;">Or copy this URL:</p>
    <p style="margin:0;word-break:break-all;"><a href="${verifyUrl}" style="color:#7c3aed;font-size:13px;">${verifyUrl}</a></p>
  `),
    'verification email'
  );
};

export const sendPasswordResetEmail = async (email: string, token: string, firstName: string) => {
  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
  await sendEmail(
    email,
    'Reset your TrendFuel password',
    wrap(`
    <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:600;">Hey ${firstName}, reset your password</h2>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">We received a password reset request. Link expires in <strong style="color:#a78bfa;">1 hour</strong>.</p>
    ${btn(resetUrl, 'Reset Password')}
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;">Or copy this URL:</p>
    <p style="margin:0 0 28px;word-break:break-all;"><a href="${resetUrl}" style="color:#7c3aed;font-size:13px;">${resetUrl}</a></p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="background-color:#1e1b4b;border-left:3px solid #7c3aed;border-radius:4px;padding:14px 16px;">
        <p style="margin:0;color:#a78bfa;font-size:13px;line-height:1.5;">If you didn't request this, ignore this email.</p>
      </td>
    </tr></table>
  `),
    'password reset email'
  );
};

export const sendNewOrderEmail = async (
  sellerEmail: string,
  sellerFirstName: string,
  order: {
    orderId: string;
    serviceTitle: string;
    quantity: number;
    totalAmount: number;
    buyerName: string;
  }
) => {
  const amount = order.totalAmount;
  const dashboardUrl = `${env.API_URL}/dashboard/orders/${order.orderId}`;
  await sendEmail(
    sellerEmail,
    `New order: ${order.serviceTitle}`,
    wrap(`
    <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:600;">New order received!</h2>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
      Hey ${sellerFirstName}, you have a new order from <strong style="color:#f1f5f9;">${order.buyerName}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background:#0f1117;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:16px 20px;border-bottom:1px solid #2d3148;">
        <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Service</p>
        <p style="margin:4px 0 0;color:#f1f5f9;font-size:15px;">${order.serviceTitle}</p>
      </td></tr>
      <tr><td style="padding:16px 20px;border-bottom:1px solid #2d3148;">
        <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Quantity</p>
        <p style="margin:4px 0 0;color:#f1f5f9;font-size:15px;">${order.quantity.toLocaleString()}</p>
      </td></tr>
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Order value</p>
        <p style="margin:4px 0 0;color:#a78bfa;font-size:18px;font-weight:600;">$${amount}</p>
      </td></tr>
    </table>
    ${btn(dashboardUrl, 'View Order')}
    <p style="margin:0;color:#64748b;font-size:13px;">Start working on this order to maintain your completion rate.</p>
  `),
    'new order email'
  );
};

export const sendOrderDeliveredEmail = async (
  buyerEmail: string,
  buyerFirstName: string,
  order: { orderId: string; serviceTitle: string; deliveryLink: string }
) => {
  await sendEmail(
    buyerEmail,
    `Order delivered: ${order.serviceTitle}`,
    wrap(`
    <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:600;">Your order has been delivered!</h2>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
      Hey ${buyerFirstName}, your order for <strong style="color:#f1f5f9;">${order.serviceTitle}</strong> has been marked as delivered.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background:#0f1117;border-radius:8px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Delivery for ${order.serviceTitle} has been submitted, Check you dashboard for details.</p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="background-color:#1e1b4b;border-left:3px solid #7c3aed;border-radius:4px;padding:14px 16px;">
        <p style="margin:0;color:#a78bfa;font-size:13px;line-height:1.5;">
          Confirm delivery to release payment to the seller. If there's an issue, open a dispute within <strong>72 hours</strong>. After that, the order auto-completes.
        </p>
      </td>
    </tr></table>
  `),
    'order delivered email'
  );
};

export const sendOrderCompletedEmail = async (
  sellerEmail: string,
  sellerFirstName: string,
  order: { orderId: string; serviceTitle: string; earnings: number }
) => {
  const earnings = order.earnings;
  await sendEmail(
    sellerEmail,
    `Payment released: $${earnings}`,
    wrap(`
    <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:600;">Payment released!</h2>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
      Hey ${sellerFirstName}, your order for <strong style="color:#f1f5f9;">${order.serviceTitle}</strong> is complete and payment has been released to your wallet.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background:#0f1117;border-radius:8px;">
      <tr><td style="padding:20px;">
        <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Earnings credited</p>
        <p style="margin:4px 0 0;color:#1D9E75;font-size:24px;font-weight:700;">+$${earnings}</p>
      </td></tr>
    </table>
  `),
    'order completed email'
  );
};

export const sendOrderCancelledEmail = async (
  buyerEmail: string,
  buyerFirstName: string,
  order: { serviceTitle: string; refundAmount: number }
) => {
  const refund = order.refundAmount;
  await sendEmail(
    buyerEmail,
    `Order cancelled: ${order.serviceTitle}`,
    wrap(`
    <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:600;">Order cancelled &amp; refunded</h2>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
      Hey ${buyerFirstName}, your order for <strong style="color:#f1f5f9;">${order.serviceTitle}</strong> has been cancelled.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background:#0f1117;border-radius:8px;">
      <tr><td style="padding:20px;">
        <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Refunded to wallet</p>
        <p style="margin:4px 0 0;color:#a78bfa;font-size:24px;font-weight:700;">$${refund}</p>
      </td></tr>
    </table>
    <p style="margin:0;color:#64748b;font-size:13px;">Your refund has been added back to your TrendFuel wallet balance.</p>
  `),
    'order cancelled email'
  );
};

export const sendDisputeOpenedEmail = async (
  sellerEmail: string,
  sellerFirstName: string,
  dispute: { disputeId: string; serviceTitle: string; respondBy: Date }
): Promise<void> => {
  const deadline = dispute.respondBy.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  await sendEmail(
    sellerEmail,
    `Dispute opened on your order`,
    wrap(`
    <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:600;">A dispute has been opened</h2>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
      Hey ${sellerFirstName}, a buyer has opened a dispute on your order for
      <strong style="color:#f1f5f9;">${dispute.serviceTitle}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="background-color:#1e1b4b;border-left:3px solid #E24B4A;border-radius:4px;padding:14px 16px;margin-bottom:24px;">
        <p style="margin:0;color:#F09595;font-size:13px;line-height:1.5;">
          You have until <strong>${deadline}</strong> to respond. If you don't respond in time, the admin will review the dispute without your input.
        </p>
      </td>
    </tr></table>
    <br/>
  `),
    'dispute opened email'
  );
};

export const sendDisputeResolvedEmail = async (
  recipientEmail: string,
  recipientFirstName: string,
  dispute: { disputeId: string; serviceTitle: string; resolution: string; refundAmount: number }
): Promise<void> => {
  const refund = dispute.refundAmount > 0 ? `$${dispute.refundAmount}` : null;

  const resolutionText: Record<string, string> = {
    refund_full: 'Full refund issued to buyer',
    refund_partial: `Partial refund of ${refund} issued to buyer`,
    no_refund: 'No refund — payment released to seller',
  };

  await sendEmail(
    recipientEmail,
    `Dispute resolved: ${dispute.serviceTitle}`,
    wrap(`
    <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:600;">Dispute resolved</h2>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
      Hey ${recipientFirstName}, a dispute for <strong style="color:#f1f5f9;">${dispute.serviceTitle}</strong> has been resolved by our team.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background:#0f1117;border-radius:8px;">
      <tr><td style="padding:20px;">
        <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Decision</p>
        <p style="margin:4px 0 0;color:#f1f5f9;font-size:15px;">${resolutionText[dispute.resolution] ?? dispute.resolution}</p>
      </td></tr>
    </table>
  `),
    'dispute resolved email'
  );
};

export const sendWithdrawalSentEmail = async (
  sellerEmail: string,
  sellerFirstName: string,
  withdrawal: {
    reference: string;
    grossAmountUsd: string; // e.g. "100.00"
    feeUsd: string; // e.g. "3.00"
    netAmountUsd: string; // e.g. "97.00"
    walletAddress: string;
    network: string; // e.g. "TRC20"
  }
) => {
  await sendEmail(
    sellerEmail,
    '✅ Your TrendFuel Withdrawal Has Been Sent',
    wrap(`
      <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:600;">Withdrawal Successful</h2>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
        Hey ${sellerFirstName}, your USDT withdrawal has been processed and sent to your wallet.
        Please allow up to <strong style="color:#a78bfa;">30 minutes</strong> for the funds to
        appear depending on network congestion.
      </p>
 
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background:#0f1117;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #2d3148;">
            <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Amount Requested</p>
            <p style="margin:4px 0 0;color:#f1f5f9;font-size:15px;">$${withdrawal.grossAmountUsd} USDT</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #2d3148;">
            <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Withdrawal Fee (3%)</p>
            <p style="margin:4px 0 0;color:#f1f5f9;font-size:15px;">−$${withdrawal.feeUsd} USDT</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #2d3148;background:#0d1f17;">
            <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Amount Sent</p>
            <p style="margin:4px 0 0;color:#1D9E75;font-size:22px;font-weight:700;">$${withdrawal.netAmountUsd} USDT</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #2d3148;">
            <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Network</p>
            <p style="margin:4px 0 0;color:#f1f5f9;font-size:15px;">${withdrawal.network} (Tron)</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #2d3148;">
            <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Wallet Address</p>
            <p style="margin:4px 0 0;color:#a78bfa;font-size:13px;font-family:monospace;word-break:break-all;">${withdrawal.walletAddress}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 20px;">
            <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Reference</p>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;font-family:monospace;">${withdrawal.reference}</p>
          </td>
        </tr>
      </table>
 
 
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="background-color:#1e1b4b;border-left:3px solid #7c3aed;border-radius:4px;padding:14px 16px;">
          <p style="margin:0;color:#a78bfa;font-size:13px;line-height:1.5;">
            If you have any questions about this withdrawal, contact us at
            <a href="mailto:support@trendfuelhq.org" style="color:#c4b5fd;">support@trendfuelhq.org</a>
            and quote your reference number.
          </p>
        </td>
      </tr></table>
    `),
    'withdrawal sent email'
  );
};

export const withdrawalSentEmail = async (
  sellerEmail: string,
  sellerFirstName: string,
  withdrawal: {
    reference: string;
    netAmountUsd: string; // e.g. "97.00"
    walletAddress: string;
    network: string; // e.g. "TRC20"
  }
) => {
  const { reference, netAmountUsd, walletAddress, network } = withdrawal;

  await sendEmail(
    sellerEmail,
    'Your TrendFuel Withdrawal Has Been Sent',
    wrap(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Withdrawal Successful</h2>
        <p>Hi ${sellerFirstName},</p>
        <p>
          Great news! Your withdrawal of <strong>$${netAmountUsd} USDT</strong> has been
          successfully sent to your wallet.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Amount Sent</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">$${netAmountUsd} USDT</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Network</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${network} (Tron)</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Wallet Address</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; word-break: break-all;">${walletAddress}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Reference</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${reference}</td>
          </tr>
        </table>
        <p>
          Please allow up to 30 minutes for the USDT to appear in your wallet depending on
          network congestion.
        </p>
        <p>
          If you have any questions, please contact support at
          <a href="mailto:support@trendfuelhq.org">support@trendfuelhq.org</a>.
        </p>
        <p>— The TrendFuel Team</p>
      </div>
    `),
    'withdrawal sent email'
  );
};

export const sendSellerApprovedEmail = async (sellerEmail: string, sellerFirstName: string) => {
  await sendEmail(
    sellerEmail,
    '🎉 Your TrendFuel seller application has been approved!',
    wrap(`
      <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:600;">
        Congratulations, ${sellerFirstName}!
      </h2>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
        Your seller application has been reviewed and <strong style="color:#1D9E75;">approved</strong>.
        You can now start listing your services and earning on TrendFuel.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background:#0f1117;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="padding:16px 20px;border-bottom:1px solid #2d3148;">
            <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Account status</p>
            <p style="margin:4px 0 0;color:#1D9E75;font-size:15px;font-weight:600;">✓ Seller — Active</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Next step</p>
            <p style="margin:4px 0 0;color:#f1f5f9;font-size:15px;">Create your first service listing</p>
          </td>
        </tr>
      </table>
    `),
    'seller approved email'
  );
};

export const sendSellerRejectedEmail = async (
  sellerEmail: string,
  sellerFirstName: string,
  reason?: string
) => {
  const supportUrl = `mailto:support@trendfuelhq.org`;

  await sendEmail(
    sellerEmail,
    'Update on your TrendFuel seller application',
    wrap(`
      <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:600;">
        Application update, ${sellerFirstName}
      </h2>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
        Thank you for applying to become a seller on TrendFuel. Unfortunately, after reviewing
        your application and KYC documents, we were unable to approve your account at this time.
      </p>

      ${
        reason
          ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr>
        <td style="background-color:#2d1b1b;border-left:3px solid #E24B4A;border-radius:4px;padding:14px 16px;">
          <p style="margin:0 0 6px;color:#F09595;font-size:12px;text-transform:uppercase;font-weight:600;">Reason for rejection</p>
          <p style="margin:0;color:#fca5a5;font-size:14px;line-height:1.6;">${reason}</p>
        </td>
      </tr></table>`
          : `<div style="margin-bottom:28px;"></div>`
      }

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background:#0f1117;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="padding:16px 20px;border-bottom:1px solid #2d3148;">
            <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Can I reapply?</p>
            <p style="margin:4px 0 0;color:#f1f5f9;font-size:14px;line-height:1.5;">
              Yes. Please address the reason above and resubmit your KYC from your account settings.
              Your registration fee remains on file — you will not be charged again.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Need help?</p>
            <p style="margin:4px 0 0;color:#f1f5f9;font-size:14px;">
              Contact us at
              <a href="${supportUrl}" style="color:#a78bfa;">support@trendfuelhq.org</a>
              and we'll guide you through the next steps.
            </p>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="background-color:#1e1b4b;border-left:3px solid #7c3aed;border-radius:4px;padding:14px 16px;">
          <p style="margin:0;color:#a78bfa;font-size:13px;line-height:1.5;">
            This decision was made by our compliance team. If you believe this is a mistake,
            please reach out with your reference email and we'll review your case.
          </p>
        </td>
      </tr></table>
    `),
    'seller rejected email'
  );
};
