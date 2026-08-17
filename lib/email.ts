import nodemailer from 'nodemailer';

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) throw new Error('Credenciales SMTP no configuradas (SMTP_HOST, SMTP_USER, SMTP_PASS)');

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail({
  to,
  subject,
  html,
  fromEmail,
  fromName,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
}) {
  const transport = createTransport();
  const from = `"${fromName ?? 'D Motor'}" <${fromEmail ?? process.env.SMTP_USER}>`;

  await transport.sendMail({
    from,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    ...(replyTo ? { replyTo } : {}),
  });
}
