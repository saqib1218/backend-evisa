const config = require("../config");

const STATUS_LABELS = {
  pending: "Pending",
  inprogress: "In Progress",
  accepted: "Accepted",
  rejected: "Rejected",
};

function applicationReceived({ fullName, applicantId }) {
  const issueDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>eVisa ETA - Application Received</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;700&family=Source+Sans+3:wght@400;600;700&display=swap');
    body { margin: 0; padding: 0; background-color: #c8c8c8; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; }
      .hero-title { font-size: 24px !important; }
      .body-text { font-size: 15px !important; }
      .app-id { font-size: 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#c8c8c8;">

  <!-- Preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Your eVisa ETA application has been received and is now being processed.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#c8c8c8;">
    <tr>
      <td align="center" style="padding:24px 16px;">

        <!-- Email Container -->
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#f5f0e8;border-radius:0;overflow:hidden;">

          <!-- Header Bar -->
          <tr>
            <td style="background-color:#2d76b5;padding:20px 40px;text-align:center;">
              <span style="font-family:'EB Garamond',Georgia,serif;font-size:22px;font-weight:400;color:#ffffff;letter-spacing:3px;text-transform:uppercase;">eVisa ETA</span>
            </td>
          </tr>

          <!-- Hero Section -->
          <tr>
            <td style="background-color:#f5f0e8;padding:48px 40px 36px 40px;text-align:center;">
              <div style="width:80px;height:2px;background-color:#b8860b;margin:0 auto 24px auto;"></div>
              <h1 class="hero-title" style="font-family:'EB Garamond',Georgia,serif;font-size:38px;font-weight:400;color:#1a1a2e;letter-spacing:0.18em;text-transform:uppercase;line-height:1.1;margin:0 0 12px 0;">
                Application Received
              </h1>
              <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:11px;font-weight:400;color:#5a5a6e;letter-spacing:0.22em;text-transform:uppercase;line-height:1.4;margin:0;">
                eVisa ETA Authority &mdash; Official Confirmation
              </p>
              <div style="width:80px;height:2px;background-color:#b8860b;margin:24px auto 0 auto;"></div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="background-color:#f5f0e8;padding:0 48px 36px 48px;">
              <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;color:#b8860b;letter-spacing:0.28em;text-transform:uppercase;text-align:center;margin:0 0 16px 0;">
                Official Declaration
              </p>
              <div style="width:100%;height:1px;background-color:#b8860b;margin:0 0 28px 0;"></div>

              <p style="font-family:'EB Garamond',Georgia,serif;font-size:22px;font-weight:400;color:#1a1a2e;line-height:1.3;margin:0 0 20px 0;">
                <em>Dear ${fullName},</em>
              </p>

              <p class="body-text" style="font-family:'EB Garamond',Georgia,serif;font-size:17px;font-weight:400;color:#1a1a2e;line-height:1.7;margin:0 0 20px 0;">
                This serves as formal confirmation that your application for eVisa ETA has been duly received and entered into the official record of the eVisa ETA Authority. Your application has been accepted for processing in accordance with applicable regulations and shall be advanced through the prescribed evaluation procedure without delay.
              </p>

              <p class="body-text" style="font-family:'EB Garamond',Georgia,serif;font-size:17px;font-weight:400;color:#1a1a2e;line-height:1.7;margin:0 0 28px 0;">
                You are advised to retain this confirmation as evidence of submission. No further action is required at this time. All correspondence pertaining to this matter shall reference the Application Identification Number set forth below.
              </p>

              <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;color:#5a5a6e;letter-spacing:0.22em;text-transform:uppercase;text-align:center;margin:0 0 8px 0;">
                Application Identification Number
              </p>
              <p class="app-id" style="font-family:'EB Garamond',Georgia,serif;font-size:30px;font-weight:400;color:#b8860b;letter-spacing:0.18em;text-align:center;line-height:1.2;margin:0 0 28px 0;">
                ${applicantId}
              </p>

              <div style="width:100%;height:1px;background-color:#b8860b;margin:0 0 16px 0;"></div>
              <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:11px;font-weight:400;color:#5a5a6e;letter-spacing:0.06em;text-align:center;line-height:1.4;margin:0;">
                Issued under the authority of the eVisa ETA Authority
              </p>
            </td>
          </tr>

          <!-- Info Grid -->
          <tr>
            <td style="background-color:#f5f0e8;padding:0 40px 28px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="text-align:center;padding:0 8px;">
                    <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:9px;font-weight:700;color:#b8860b;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 6px 0;">Application ID</p>
                    <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#1a1a2e;letter-spacing:0.08em;margin:0;">${applicantId}</p>
                  </td>
                  <td style="width:1px;background-color:#b8860b;"></td>
                  <td width="33%" style="text-align:center;padding:0 8px;">
                    <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:9px;font-weight:700;color:#b8860b;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 6px 0;">Issue Date</p>
                    <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#1a1a2e;letter-spacing:0.08em;margin:0;">${issueDate}</p>
                  </td>
                  <td style="width:1px;background-color:#b8860b;"></td>
                  <td width="33%" style="text-align:center;padding:0 8px;">
                    <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:9px;font-weight:700;color:#b8860b;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 6px 0;">Service</p>
                    <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#1a1a2e;letter-spacing:0.08em;margin:0;">eVisa ETA</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#2d76b5;padding:24px 40px;text-align:center;">
              <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:12px;font-weight:400;color:#ffffff;line-height:1.5;margin:0;">
                Copyright &copy; 2026 evisaeta.co.uk, All rights reserved.
              </p>
            </td>
          </tr>

        </table>

        <!-- Spacer -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td style="height:24px;line-height:24px;font-size:1px;">&nbsp;</td></tr></table>

      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function applicationStatusUpdate({ fullName, applicantId, status, notes, imageUrl }) {
  const statusLabel = STATUS_LABELS[status] || status;
  const issueDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>eVisa ETA - Application ${statusLabel}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;700&family=Source+Sans+3:wght@400;600;700&display=swap');
    body { margin: 0; padding: 0; background-color: #c8c8c8; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; }
      .hero-title { font-size: 24px !important; }
      .body-text { font-size: 15px !important; }
      .app-id { font-size: 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#c8c8c8;">

  <!-- Preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Your eVisa ETA application status has been updated to ${statusLabel}.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#c8c8c8;">
    <tr>
      <td align="center" style="padding:24px 16px;">

        <!-- Email Container -->
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#f5f0e8;border-radius:0;overflow:hidden;">

          <!-- Header Bar -->
          <tr>
            <td style="background-color:#2d76b5;padding:20px 40px;text-align:center;">
              <span style="font-family:'EB Garamond',Georgia,serif;font-size:22px;font-weight:400;color:#ffffff;letter-spacing:3px;text-transform:uppercase;">eVisa ETA</span>
            </td>
          </tr>

          <!-- Hero Section -->
          <tr>
            <td style="background-color:#f5f0e8;padding:48px 40px 36px 40px;text-align:center;">
              <div style="width:80px;height:2px;background-color:#b8860b;margin:0 auto 24px auto;"></div>
              <h1 class="hero-title" style="font-family:'EB Garamond',Georgia,serif;font-size:38px;font-weight:400;color:#1a1a2e;letter-spacing:0.18em;text-transform:uppercase;line-height:1.1;margin:0 0 12px 0;">
                Application ${statusLabel}
              </h1>
              <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:11px;font-weight:400;color:#5a5a6e;letter-spacing:0.22em;text-transform:uppercase;line-height:1.4;margin:0;">
                eVisa ETA Authority &mdash; Official Confirmation
              </p>
              <div style="width:80px;height:2px;background-color:#b8860b;margin:24px auto 0 auto;"></div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="background-color:#f5f0e8;padding:0 48px 36px 48px;">
              <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;color:#b8860b;letter-spacing:0.28em;text-transform:uppercase;text-align:center;margin:0 0 16px 0;">
                Official Declaration
              </p>
              <div style="width:100%;height:1px;background-color:#b8860b;margin:0 0 28px 0;"></div>

              <p style="font-family:'EB Garamond',Georgia,serif;font-size:22px;font-weight:400;color:#1a1a2e;line-height:1.3;margin:0 0 20px 0;">
                <em>Dear ${fullName},</em>
              </p>

              <p class="body-text" style="font-family:'EB Garamond',Georgia,serif;font-size:17px;font-weight:400;color:#1a1a2e;line-height:1.7;margin:0 0 ${notes ? "20px" : "28px"} 0;">
                Your application has been <strong>${statusLabel}</strong>.
              </p>

              ${
                notes
                  ? `<p class="body-text" style="font-family:'EB Garamond',Georgia,serif;font-size:17px;font-weight:400;color:#1a1a2e;line-height:1.7;margin:0 0 28px 0;">
                ${notes}
              </p>`
                  : ""
              }

              ${
                imageUrl
                  ? `<div style="text-align:center;margin:0 0 28px 0;">
                <img src="${imageUrl}" alt="Application Document" style="max-width:100%;height:auto;border:1px solid #b8860b;border-radius:4px;">
              </div>`
                  : ""
              }

              <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;color:#5a5a6e;letter-spacing:0.22em;text-transform:uppercase;text-align:center;margin:0 0 8px 0;">
                Application Identification Number
              </p>
              <p class="app-id" style="font-family:'EB Garamond',Georgia,serif;font-size:30px;font-weight:400;color:#b8860b;letter-spacing:0.18em;text-align:center;line-height:1.2;margin:0 0 28px 0;">
                ${applicantId}
              </p>

              <div style="width:100%;height:1px;background-color:#b8860b;margin:0 0 16px 0;"></div>
              <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:11px;font-weight:400;color:#5a5a6e;letter-spacing:0.06em;text-align:center;line-height:1.4;margin:0;">
                Issued under the authority of the eVisa ETA Authority
              </p>
            </td>
          </tr>

          <!-- Info Grid -->
          <tr>
            <td style="background-color:#f5f0e8;padding:0 40px 28px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="text-align:center;padding:0 8px;">
                    <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:9px;font-weight:700;color:#b8860b;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 6px 0;">Application ID</p>
                    <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#1a1a2e;letter-spacing:0.08em;margin:0;">${applicantId}</p>
                  </td>
                  <td style="width:1px;background-color:#b8860b;"></td>
                  <td width="33%" style="text-align:center;padding:0 8px;">
                    <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:9px;font-weight:700;color:#b8860b;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 6px 0;">Issue Date</p>
                    <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#1a1a2e;letter-spacing:0.08em;margin:0;">${issueDate}</p>
                  </td>
                  <td style="width:1px;background-color:#b8860b;"></td>
                  <td width="33%" style="text-align:center;padding:0 8px;">
                    <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:9px;font-weight:700;color:#b8860b;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 6px 0;">Service</p>
                    <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#1a1a2e;letter-spacing:0.08em;margin:0;">eVisa ETA</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#2d76b5;padding:24px 40px;text-align:center;">
              <p style="font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:12px;font-weight:400;color:#ffffff;line-height:1.5;margin:0;">
                Copyright &copy; 2026 evisaeta.co.uk, All rights reserved.
              </p>
            </td>
          </tr>

        </table>

        <!-- Spacer -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td style="height:24px;line-height:24px;font-size:1px;">&nbsp;</td></tr></table>

      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

module.exports = {
  applicationReceived,
  applicationStatusUpdate,
};
