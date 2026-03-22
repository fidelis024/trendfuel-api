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
  const verifyUrl = `${env.API_URL}/api/v1/auth/verify-email/${token}`;
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
  const resetUrl = `${env.API_URL}/reset-password/${token}`;
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
  const amount = (order.totalAmount / 100).toFixed(2);
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
  const orderUrl = `${env.API_URL}/dashboard/orders/${order.orderId}`;
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
        <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;">Delivery proof</p>
        <p style="margin:4px 0 0;"><a href="${order.deliveryLink}" style="color:#a78bfa;font-size:14px;word-break:break-all;">${order.deliveryLink}</a></p>
      </td></tr>
    </table>
    ${btn(orderUrl, 'Confirm Delivery')}
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
  const earnings = (order.earnings / 100).toFixed(2);
  const dashboardUrl = `${env.API_URL}/dashboard/earnings`;
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
    ${btn(dashboardUrl, 'View Earnings')}
  `),
    'order completed email'
  );
};

export const sendOrderCancelledEmail = async (
  buyerEmail: string,
  buyerFirstName: string,
  order: { serviceTitle: string; refundAmount: number }
) => {
  const refund = (order.refundAmount / 100).toFixed(2);
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
  const dashboardUrl = `${env.API_URL}/dashboard/disputes/${dispute.disputeId}`;
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
    ${btn(dashboardUrl, 'Respond to Dispute')}
  `),
    'dispute opened email'
  );
};

export const sendDisputeResolvedEmail = async (
  recipientEmail: string,
  recipientFirstName: string,
  dispute: { disputeId: string; serviceTitle: string; resolution: string; refundAmount: number }
): Promise<void> => {
  const dashboardUrl = `${env.API_URL}/dashboard/disputes/${dispute.disputeId}`;
  const refund = dispute.refundAmount > 0 ? `$${(dispute.refundAmount / 100).toFixed(2)}` : null;

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
    ${btn(dashboardUrl, 'View Dispute')}
  `),
    'dispute resolved email'
  );
};
