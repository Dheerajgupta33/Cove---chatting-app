import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter;
if (env.smtpEnabled) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

const layout = (title, body, cta, url) => `
<div style="font-family:Arial,sans-serif;background:#0b0b1a;padding:32px">
  <div style="max-width:480px;margin:auto;background:#141428;border-radius:16px;padding:32px;color:#e8e9f7">
    <h2 style="margin:0 0 12px;font-size:22px">${title}</h2>
    <p style="line-height:1.6;color:#a9acc9">${body}</p>
    <p style="margin:28px 0"><a href="${url}" style="background:linear-gradient(135deg,#7c5cff,#2dd4bf);color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">${cta}</a></p>
    <p style="font-size:12px;color:#7b7ea3">If the button doesn't work, paste this link into your browser:<br>${url}</p>
  </div>
</div>`;

export async function sendEmail({ to, subject, html, devLink }) {
  if (!transporter) {
    // Development fallback: surface the link in the server log instead of sending.
    console.log(`\n📧 [email disabled] To: ${to}\n   Subject: ${subject}\n   Link: ${devLink}\n`);
    return;
  }
  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
}

export const sendVerificationEmail = (user, token) => {
  const url = `${env.clientOrigins[0]}/verify-email/${token}`;
  return sendEmail({
    to: user.email,
    subject: 'Confirm your email for Cove',
    html: layout('Confirm your email', `Hi ${user.name}, confirm your address to finish setting up your Cove account.`, 'Confirm email', url),
    devLink: url,
  });
};

export const sendPasswordResetEmail = (user, token) => {
  const url = `${env.clientOrigins[0]}/reset-password/${token}`;
  return sendEmail({
    to: user.email,
    subject: 'Reset your Cove password',
    html: layout('Reset your password', 'Use the button below to choose a new password. The link expires in 30 minutes. If you did not request this, you can ignore this email.', 'Choose a new password', url),
    devLink: url,
  });
};
