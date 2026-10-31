// Runs automatically after Netlify accepts a form submission (spam is filtered out first).
// Emails each inquiry to the firm through Resend. Configure in Netlify → Site configuration
// → Environment variables: RESEND_API_KEY (secret), INQUIRY_TO (comma-separated), INQUIRY_FROM.

const FIELDS = [
  ['name', 'Name'],
  ['organization', 'Practice or firm'],
  ['email', 'Email'],
  ['phone', 'Telephone'],
  ['sector', 'Field'],
  ['interest', 'Engagement of interest'],
  ['message', 'Message'],
];

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Keep header values to a single line.
const oneLine = (s) => String(s || '').replace(/[\r\n]+/g, ' ').trim();

export const handler = async (event) => {
  const { payload } = JSON.parse(event.body || '{}');
  if (!payload || payload.form_name !== 'inquiry') return { statusCode: 200, body: 'ignored' };

  const { RESEND_API_KEY, INQUIRY_TO, INQUIRY_FROM } = process.env;
  if (!RESEND_API_KEY || !INQUIRY_TO || !INQUIRY_FROM) {
    console.error('Inquiry email not sent: RESEND_API_KEY, INQUIRY_TO or INQUIRY_FROM is not set.');
    return { statusCode: 500, body: 'not configured' };
  }

  const data = payload.data || {};
  const rows = FIELDS.filter(([key]) => data[key]).map(([key, label]) => [label, String(data[key]).trim()]);
  const name = oneLine(data.name) || 'Website visitor';
  const org = oneLine(data.organization);
  const replyTo = oneLine(data.email);

  const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n') +
    '\n\nReply to this email to respond to the client directly.';
  const html = `<div style="font-family:Georgia,serif;color:#1C1B19;font-size:15px;line-height:1.6">
<p style="margin:0 0 16px;color:#5C1A1B;font-size:18px">New inquiry from hackworthseo.com</p>
<table cellpadding="6" style="border-collapse:collapse">${rows
    .map(([label, value]) => `<tr><td style="vertical-align:top;color:#7A6430;white-space:nowrap">${escapeHtml(label)}</td><td style="white-space:pre-wrap">${escapeHtml(value)}</td></tr>`)
    .join('')}</table>
<p style="margin:16px 0 0;color:#5F6253;font-style:italic">Reply to this email to respond to the client directly.</p></div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      // Netlify can retry this function; the key stops Resend sending the same inquiry twice.
      'Idempotency-Key': `inquiry-${payload.id || payload.number || Date.now()}`,
    },
    body: JSON.stringify({
      from: INQUIRY_FROM,
      to: INQUIRY_TO.split(',').map((s) => s.trim()).filter(Boolean),
      ...(replyTo && { reply_to: replyTo }),
      subject: `New inquiry: ${name}${org ? `, ${org}` : ''}`,
      text,
      html,
      tags: [{ name: 'source', value: 'website-inquiry' }],
    }),
  });

  if (!res.ok) {
    console.error('Resend error', res.status, await res.text());
    return { statusCode: 502, body: 'email failed' };
  }
  return { statusCode: 200, body: 'sent' };
};
