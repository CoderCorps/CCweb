import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "codercorps@gmail.com";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "rnsjhylaigcnatef";
function getDeployedFrontendUrl(req: NextRequest): string {
  const envUrl = (process.env.FRONTEND_URL || "").trim().replace(/\/$/, "");
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl;
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }

  return "https://c-cweb-u67f.vercel.app";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name = "Candidate", email, phone, college, why_join, linkedin_url, github_url, resume_url, instagram_url } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ detail: "Valid email address is required." }, { status: 400 });
    }

    const recipientName = String(name).trim() || "Candidate";
    const recipientEmail = String(email).trim().toLowerCase();

    // Generate token url using deployed frontend domain
    const rawToken = crypto.randomBytes(24).toString("hex");
    const baseUrl = getDeployedFrontendUrl(req);
    const assessmentUrl = `${baseUrl}/assessment/candidate/${rawToken}`;

    // Configure SMTP Transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; padding: 32px; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #a855f7; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">CoderCorps</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Engineering Community & Verifiable Portfolios</p>
        </div>

        <div style="background-color: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #334155;">
          <h2 style="color: #f1f5f9; margin-top: 0; font-size: 20px;">Welcome, ${recipientName}! 👋</h2>
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
            Thank you for applying to the <strong>CoderCorps Python Engineering Track</strong>. Your initial screening assessment is ready to begin.
          </p>
          
          <div style="margin: 28px 0; text-align: center;">
            <a href="${assessmentUrl}" style="background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(168, 85, 247, 0.4);">
              🚀 Start Python Assessment
            </a>
          </div>

          <div style="background-color: #0f172a; border-left: 4px solid #a855f7; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #94a3b8;">
            <p style="margin: 0;"><strong>Assessment Details:</strong></p>
            <ul style="margin: 8px 0 0 0; padding-left: 20px;">
              <li>10 Timed Questions (Basic & Intermediate Python)</li>
              <li>Link Valid for 24 Hours</li>
              <li>Instant Score & Detailed Breakdown Upon Completion</li>
            </ul>
          </div>
        </div>

        <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${assessmentUrl}" style="color: #a855f7;">${assessmentUrl}</a>
        </p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"CoderCorps Academy" <${SMTP_USER}>`,
      to: recipientEmail,
      subject: "CoderCorps Python Assessment — Your 1-Time Test Link",
      html: htmlContent,
    });

    console.log(`[NEXTJS API APPLY] Email sent to ${recipientEmail}. MessageId: ${info.messageId}`);

    return NextResponse.json({
      ok: true,
      message: "Check your email for your assessment link.",
      token: rawToken,
    });
  } catch (err: any) {
    console.error("[NEXTJS API APPLY ERROR]", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to dispatch email." },
      { status: 500 }
    );
  }
}
