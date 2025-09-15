// utils/email.js
const nodemailer = require('nodemailer');

function createTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error('Missing email config. Set EMAIL_HOST / EMAIL_USER / EMAIL_PASS in .env');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for port 465, otherwise false (587 uses STARTTLS)
    auth: {
      user,
      pass,
    },
    tls: {
      // depending on your environment you may set this to true/false.
      rejectUnauthorized: false
    }
  });
}

/**
 * sendEmail({ to, subject, text, html })
 * - returns nodemailer info object on success
 */
exports.sendEmail = async ({ to, subject, text, html }) => {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const mailOptions = {
    from,
    to,
    subject,
    text,
    html
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};
