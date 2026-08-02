import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "codercorps@gmail.com";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "rnsjhylaigcnatef";
const MAIL_TO = process.env.MAIL_TO || "codercorps@gmail.com";

function getBackendUrl(): string {
  const url = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (url && !url.includes("localhost") && !url.includes("127.0.0.1")) return url;
  return "https://c-cweb-three.vercel.app/api/v1";
}

async function sendAdminNotificationEmail(payload: any, reportId: string | number) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  const categoryLabels: Record<string, string> = {
    website_bug: "Website Bug",
    assessment_email_issue: "Assessment Email Issue",
    account_login: "Account & Login Issue",
    feature_request: "Feature Request",
    other: "General Issue Report",
  };
  const categoryLabel = categoryLabels[payload.category] || payload.category || "Issue Report";
  const subject = `[${categoryLabel}] New report from ${payload.reporter_name}`;

  let assessmentSection = "";
  if (payload.category === "assessment_email_issue" || payload.assessment_email_used) {
    assessmentSection = `
    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 16px; border-radius: 10px; margin-top: 16px;">
      <h4 style="margin: 0 0 10px 0; color: #f59e0b; font-size: 14px;">🎯 Assessment Specific Triage Data</h4>
      <p style="margin: 4px 0; font-size: 13px; color: #cbd5e1;"><strong>Assessment Email Used:</strong> ${payload.assessment_email_used || "Not specified"}</p>
      <p style="margin: 4px 0; font-size: 13px; color: #cbd5e1;"><strong>Received Invitation Email?</strong> ${payload.assessment_link_received === true ? "Yes" : payload.assessment_link_received === false ? "No" : "Not specified"}</p>
      <p style="margin: 4px 0; font-size: 13px; color: #cbd5e1;"><strong>Assessment Link Worked?</strong> ${payload.assessment_link_worked === true ? "Yes" : payload.assessment_link_worked === false ? "No" : "Not specified"}</p>
    </div>
    `;
  }

  let screenshotSection = "";
  if (payload.screenshot_url) {
    screenshotSection = `
    <div style="margin-top: 16px; padding: 12px; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 8px;">
      <strong style="color: #818cf8; font-size: 13px;">🖼️ Attached Screenshot (Supabase Cloud Link):</strong><br>
      <a href="${payload.screenshot_url}" style="color: #818cf8; font-weight: bold; word-break: break-all; font-size: 13px;" target="_blank">${payload.screenshot_url}</a>
    </div>
    `;
  }

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 24px; }
      .card { max-width: 600px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
      .tag { display: inline-block; padding: 4px 12px; background-color: #6366f1; color: #ffffff; font-size: 12px; font-weight: 700; border-radius: 20px; text-transform: uppercase; }
      h2 { font-size: 20px; color: #ffffff; margin-top: 12px; }
      .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
      .meta-table td { padding: 8px 0; color: #94a3b8; border-bottom: 1px dashed #1e293b; }
      .meta-table td.val { color: #f8fafc; font-weight: 600; text-align: right; }
      .desc-box { background: #0b1120; border: 1px solid #1e293b; padding: 16px; border-radius: 10px; font-size: 14px; line-height: 1.6; color: #e2e8f0; white-space: pre-wrap; margin-top: 16px; }
      .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="card">
      <div><span class="tag">${categoryLabel}</span></div>
      <h2>New Issue Report #${reportId}</h2>
      
      <table class="meta-table">
        <tr><td>Reporter Name:</td><td class="val">${payload.reporter_name}</td></tr>
        <tr><td>Reporter Email:</td><td class="val"><a href="mailto:${payload.reporter_email}" style="color:#818cf8">${payload.reporter_email}</a></td></tr>
        <tr><td>Reporter Role:</td><td class="val">${payload.reporter_role} ${payload.reporter_role_detail ? `(${payload.reporter_role_detail})` : ""}</td></tr>
        <tr><td>Page URL:</td><td class="val">${payload.page_url || "N/A"}</td></tr>
      </table>

      ${assessmentSection}

      <div class="desc-box">
        <strong>Issue Description:</strong><br>${payload.description}
      </div>

      ${screenshotSection}

      <div class="footer">
        CoderCorps Platform • Automated Triage System
      </div>
    </div>
  </body>
  </html>
  `;

  await transporter.sendMail({
    from: `"CoderCorps Support" <${SMTP_USER}>`,
    to: MAIL_TO,
    replyTo: payload.reporter_email,
    subject: subject,
    html: html,
  });
}

async function sendReporterConfirmationEmail(payload: any, reportId: string | number) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 24px; }
      .card { max-width: 520px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; }
      h2 { font-size: 20px; color: #ffffff; margin-top: 0; }
      p { font-size: 14px; line-height: 1.6; color: #cbd5e1; }
      .ref-badge { display: inline-block; padding: 6px 14px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); color: #818cf8; font-weight: 700; border-radius: 8px; font-size: 13px; margin: 12px 0; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>We've Received Your Issue Report</h2>
      <p>Hello ${payload.reporter_name},</p>
      <p>Thank you for reaching out to CoderCorps Support. We have logged your issue report and assigned a ticket ID:</p>
      
      <div className="ref-badge">Ticket Ref: #${reportId}</div>

      <p>Our engineering and admissions team will review your report and follow up with you at <strong>${payload.reporter_email}</strong> as soon as possible.</p>
      
      <p style="margin-top: 24px; font-size: 12px; color: #64748b;">
        Regards,<br>
        <strong>CoderCorps Admissions & Support Team</strong>
      </p>
    </div>
  </body>
  </html>
  `;

  await transporter.sendMail({
    from: `"CoderCorps Support" <${SMTP_USER}>`,
    to: payload.reporter_email,
    subject: `We've received your report (#${reportId}) — CoderCorps Support`,
    html: html,
  });
}

let consecutiveEmailFailures = 0;

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));

    if (!payload.reporter_name || !payload.reporter_email || !payload.description) {
      return NextResponse.json({ detail: "Name, email, and description are required." }, { status: 400 });
    }

    const reportId = Math.floor(Math.random() * 900000) + 100000;

    // STEP 1: Attempt to post to backend Python DB (if backend server is online)
    try {
      const backendUrl = getBackendUrl();
      const backendRes = await fetch(`${backendUrl}/issue-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (backendRes.ok) {
        const d = await backendRes.json().catch(() => ({}));
        console.log("[NEXTJS API ISSUE REPORT] Saved to backend DB:", d?.id);
      }
    } catch (backendErr) {
      console.warn("[NEXTJS API ISSUE REPORT] Backend DB notice (proceeding with email dispatch):", backendErr);
    }

    // STEP 2: Email Dispatch to codercorps@gmail.com over Gmail SMTP
    let emailSuccess = false;
    let emailErrorMessage = "";
    try {
      await sendAdminNotificationEmail(payload, reportId);
      consecutiveEmailFailures = 0;
      emailSuccess = true;
      console.log(`[NEXTJS API ISSUE REPORT SUCCESS] Email notification sent to ${MAIL_TO} for report #${reportId}`);
    } catch (emailErr: any) {
      consecutiveEmailFailures++;
      emailErrorMessage = emailErr?.message || "SMTP delivery error";
      console.error(`[NEXTJS API ISSUE REPORT ERROR] Email dispatch failed (Consecutive Failures: ${consecutiveEmailFailures}):`, emailErr);

      if (consecutiveEmailFailures >= 3) {
        console.error(`[SYSTEM CRITICAL ALERT]: Issue report email delivery to ${MAIL_TO} has failed ${consecutiveEmailFailures} times consecutively! Verify SMTP_USER, SMTP_PASSWORD, and provider settings.`);
      }
    }

    // STEP 3: Receipt Email Dispatch to reporter
    if (emailSuccess) {
      try {
        await sendReporterConfirmationEmail(payload, reportId);
        console.log(`[NEXTJS API ISSUE REPORT] Receipt sent to ${payload.reporter_email}`);
      } catch (receiptErr) {
        console.warn("[NEXTJS API ISSUE REPORT] Receipt email send notice:", receiptErr);
      }
    }

    if (!emailSuccess) {
      return NextResponse.json({
        detail: `Issue report logged (#${reportId}), but email delivery to ${MAIL_TO} encountered an error: ${emailErrorMessage}. Please contact support directly if urgent.`
      }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      id: reportId,
      status: "open",
      message: "Issue report submitted successfully and sent to support.",
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit issue report.";
    console.error("[NEXTJS API ISSUE REPORT ERROR]", err);
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
