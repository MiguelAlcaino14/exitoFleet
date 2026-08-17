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
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) throw new Error('MAILERSEND_API_KEY no configurada');

  const from = {
    email: fromEmail || process.env.MAILERSEND_FROM_EMAIL || '',
    name: fromName || 'D Motor',
  };

  if (!from.email) throw new Error('Email remitente no configurado');

  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));

  const body: any = {
    from,
    to: recipients,
    subject,
    html,
  };

  if (replyTo) body.reply_to = { email: replyTo };

  const res = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MailerSend error ${res.status}: ${err}`);
  }

  return true;
}
