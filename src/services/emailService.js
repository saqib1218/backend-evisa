const sgMail = require("@sendgrid/mail");
const config = require("../config");

if (config.sendgrid.apiKey) {
  sgMail.setApiKey(config.sendgrid.apiKey);
} else {
  console.warn("SendGrid API key not configured. Emails will not be sent.");
}

const EmailService = {
  async sendEmail({ to, subject, html, replyTo }) {
    if (!config.sendgrid.apiKey) {
      console.error("Email not sent: SENDGRID_API_KEY is missing in environment variables.");
      return { success: false, error: "SendGrid API key not configured" };
    }

    const msg = {
      to,
      from: config.sendgrid.fromEmail,
      replyTo: replyTo || config.sendgrid.replyTo,
      subject,
      html,
    };

    try {
      await sgMail.send(msg);
      console.log(`Email sent successfully to ${to} | Subject: "${subject}"`);
      return { success: true };
    } catch (err) {
      console.error(`Failed to send email to ${to}:`, err.response?.body || err.message);
      return { success: false, error: err.message };
    }
  },
};

module.exports = EmailService;
