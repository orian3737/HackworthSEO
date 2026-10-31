// netlify/functions/submission-created.mjs
//
// Netlify runs this automatically after every verified (non-spam) Netlify Forms
// submission. For the "inquiry" form on hackworthseo.com it sends two emails
// through Resend using the published Hackworth SEO templates:
//
//   1. hackworth-contact-confirmation -> the person who filled in the form
//   2. hackworth-new-lead             -> Dan, then Ryan
//
// Required Netlify environment variable: RESEND_API_KEY

const RESEND_URL = "https://api.resend.com/emails";

const TEMPLATE_CONFIRMATION = "hackworth-contact-confirmation";
const TEMPLATE_NEW_LEAD = "hackworth-new-lead";

const FROM_INQUIRIES = "Hackworth SEO <inquiries@hackworthseo.com>";
const FROM_LEADS = "Hackworth SEO Leads <leads@hackworthseo.com>";

// Dan first, then Ryan.
const TEAM = ["info@daniel-hackworth.com", "orian3737@gmail.com"];

const clean = (value) => (typeof value === "string" ? value.trim() : "");

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// The confirmation goes to whatever address the visitor typed, under our brand,
// so the visitor's own words in it are reduced to plain name characters with no
// links or markup. Otherwise the form could be used to send branded phishing.
const nameOnly = (value, max) =>
  clean(value)
    .replace(/https?:\/\/\S+|www\.\S+/gi, "")
    .replace(/[^\p{L}\p{M}\p{N} .,'&()-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const formatSubmittedAt = (iso) => {
  const date = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date) + " ET";
};

// Only include variables that have a value, so each template's fallback
// ("Not provided", "your practice", etc.) is used for anything left blank.
const compact = (variables) =>
  Object.fromEntries(Object.entries(variables).filter(([, v]) => v !== ""));

async function sendWithResend(apiKey, idempotencyKey, body) {
  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `Resend ${response.status} for ${body.template?.id || "plain email"}: ${JSON.stringify(result)}`
    );
  }
  return result;
}

export const handler = async (event) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set in Netlify environment variables.");
    return { statusCode: 500, body: "Email is not configured." };
  }

  let payload;
  try {
    ({ payload } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: "Unreadable submission." };
  }

  if (payload?.form_name !== "inquiry") {
    return { statusCode: 200, body: "Not the inquiry form; nothing sent." };
  }

  const data = payload.data || {};

  // Honeypot: real visitors never fill this hidden field.
  if (clean(data.company_website)) {
    console.log(`Honeypot filled on submission ${payload.id}; no emails sent.`);
    return { statusCode: 200, body: "Ignored." };
  }

  const name = clean(data.name);
  const email = clean(data.email);
  const practice = clean(data.organization);
  const phone = clean(data.phone);
  const field = clean(data.sector);
  const engagement = clean(data.interest);
  const message = clean(data.message);

  const submissionId = String(payload.id || Date.now());
  const submittedAt = formatSubmittedAt(payload.created_at);
  const hasValidEmail = isEmail(email);

  const leadVariables = compact({
    CONTACT_NAME: name,
    PRACTICE_NAME: practice,
    CONTACT_EMAIL: hasValidEmail ? email : "",
    PHONE: phone,
    FIELD: field,
    ENGAGEMENT: engagement,
    MESSAGE: message,
    SUBMISSION_ID: submissionId,
    SUBMITTED_AT: submittedAt,
  });

  const leadEnvelope = {
    from: FROM_LEADS,
    to: TEAM,
    ...(hasValidEmail ? { reply_to: email } : {}),
    subject: `[Lead] ${practice || "New inquiry"} · Ref ${submissionId}`,
  };

  // If the lead template can't be used (for example, it is still a draft), the team
  // still gets the lead as a plain-text email rather than nothing.
  const leadText = [
    ["Name", name], ["Practice or firm", practice], ["Email", email], ["Telephone", phone],
    ["Field", field], ["Engagement of interest", engagement], ["Message", message],
    ["Submitted", submittedAt], ["Reference", submissionId],
  ].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");

  const sends = [
    sendWithResend(apiKey, `hackworth-lead/${submissionId}`, {
      ...leadEnvelope,
      template: { id: TEMPLATE_NEW_LEAD, variables: leadVariables },
    }).catch((err) => {
      console.error(`Lead template failed, sending plain lead instead. ${err.message}`);
      return sendWithResend(apiKey, `hackworth-lead-plain/${submissionId}`, {
        ...leadEnvelope,
        text: `${leadText}\n\nReply to this email to respond to the client directly.`,
      });
    }),
  ];

  if (hasValidEmail) {
    sends.push(
      sendWithResend(apiKey, `hackworth-confirm/${submissionId}`, {
        from: FROM_INQUIRIES,
        to: [email],
        reply_to: TEAM,
        subject: `Thank you for contacting Hackworth SEO · Ref ${submissionId}`,
        template: {
          id: TEMPLATE_CONFIRMATION,
          variables: compact({
            GIVEN_NAME: nameOnly(name, 60).split(" ")[0] || "",
            PRACTICE_NAME: nameOnly(practice, 80),
            SUBMISSION_ID: submissionId,
          }),
        },
      })
    );
  }

  const results = await Promise.allSettled(sends);
  const failures = results.filter((r) => r.status === "rejected");

  failures.forEach((f) => console.error(f.reason));
  results
    .filter((r) => r.status === "fulfilled")
    .forEach((r) => console.log(`Sent via Resend: ${r.value.id}`));

  return failures.length
    ? { statusCode: 500, body: `${failures.length} email(s) failed; see function logs.` }
    : { statusCode: 200, body: "Emails sent." };
};
