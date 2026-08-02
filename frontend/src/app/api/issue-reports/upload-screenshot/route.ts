import { NextRequest, NextResponse } from "next/server";

let consecutiveUploadFailures = 0;


export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ detail: "No image file provided." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
    const bucket = (process.env.SUPABASE_BUCKET || "issue-screenshots").trim();

    if (!supabaseUrl || !supabaseKey) {
      consecutiveUploadFailures++;
      console.error(`[SUPABASE UPLOAD ERROR] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing (Failure count: ${consecutiveUploadFailures})`);
      if (consecutiveUploadFailures >= 3) {
        console.error(`[SYSTEM CRITICAL ALERT]: Supabase Storage upload has failed ${consecutiveUploadFailures} times consecutively! Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.`);
      }
      return NextResponse.json(
        { detail: "Supabase credentials unconfigured. Please add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables." },
        { status: 500 }
      );
    }

    // 1. Upload to Supabase Storage Bucket via REST API
    const ext = (file.name ? file.name.split('.').pop() : "png") || "png";
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filename}`;

    const supaRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "apiKey": supabaseKey,
        "Content-Type": file.type || "image/png",
        "x-upsert": "true",
      },
      body: buffer,
    });

    if (supaRes.ok) {
      consecutiveUploadFailures = 0;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;
      console.log("[NEXTJS SUPABASE UPLOAD SUCCESS]:", publicUrl);
      return NextResponse.json({ status: "ok", screenshot_url: publicUrl });
    } else {
      consecutiveUploadFailures++;
      const errText = await supaRes.text();
      console.error(`[NEXTJS SUPABASE UPLOAD ERROR HTTP ${supaRes.status}] Body: ${errText} (Failure count: ${consecutiveUploadFailures})`);
      
      if (consecutiveUploadFailures >= 3) {
        console.error(`[SYSTEM CRITICAL ALERT]: Supabase Storage upload has failed ${consecutiveUploadFailures} times consecutively! Check bucket '${bucket}' exists and RLS policies allow inserts.`);
      }

      let errorDetail = `Supabase upload failed (HTTP ${supaRes.status}).`;
      if (supaRes.status === 404) {
        errorDetail = `Bucket '${bucket}' not found in Supabase Storage. Please create the bucket in Supabase Dashboard.`;
      } else if (supaRes.status === 403 || supaRes.status === 401) {
        errorDetail = `Supabase Storage permission denied (HTTP ${supaRes.status}). Verify SUPABASE_SERVICE_ROLE_KEY and bucket RLS policy.`;
      }

      return NextResponse.json({ detail: errorDetail }, { status: supaRes.status || 500 });
    }
  } catch (err: unknown) {
    consecutiveUploadFailures++;
    const message = err instanceof Error ? err.message : "Failed to upload screenshot";
    console.error(`[NEXTJS SCREENSHOT EXCEPTION] ${message} (Failure count: ${consecutiveUploadFailures})`, err);
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

