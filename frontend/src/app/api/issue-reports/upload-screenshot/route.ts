import { NextRequest, NextResponse } from "next/server";

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

    // 1. Upload to Supabase Storage Bucket via REST API
    if (supabaseUrl && supabaseKey) {
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
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;
        console.log("[NEXTJS SUPABASE UPLOAD SUCCESS]:", publicUrl);
        return NextResponse.json({ status: "ok", screenshot_url: publicUrl });
      } else {
        const errText = await supaRes.text();
        console.error("[NEXTJS SUPABASE UPLOAD ERROR]:", supaRes.status, errText);
      }
    }

    // 2. ImgBB Cloud Fallback
    const imgbbKey = (process.env.IMGBB_API_KEY || "").trim();
    if (imgbbKey) {
      const base64Str = buffer.toString("base64");
      const bodyParams = new URLSearchParams();
      bodyParams.append("key", imgbbKey);
      bodyParams.append("image", base64Str);

      const imgbbRes = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: bodyParams,
      });

      if (imgbbRes.ok) {
        const data = await imgbbRes.json();
        if (data?.data?.url) {
          console.log("[NEXTJS IMGBB UPLOAD SUCCESS]:", data.data.url);
          return NextResponse.json({ status: "ok", screenshot_url: data.data.url });
        }
      }
    }

    return NextResponse.json(
      { detail: "Supabase credentials missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment variables." },
      { status: 500 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload screenshot";
    console.error("[NEXTJS SCREENSHOT ERROR]", err);
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
