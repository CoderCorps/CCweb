"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CertificateCanvasEditor } from "@/components/certificates/CertificateEditorDynamic";
import EmailTemplateEditor from "@/components/certificates/EmailTemplateEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Settings2, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

function ManageTemplatesPage() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const editEmailId = searchParams.get("edit_email");

  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState("My Custom Template");
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  
  const [initialEmailData, setInitialEmailData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [fields, setFields] = useState([
    { id: "1", field_key: "student_name", x_percent: 50, y_percent: 50, font_size: 60, color: "#ffffff", text_align: "center" },
    { id: "2", field_key: "certificate_number", x_percent: 10, y_percent: 90, font_size: 20, color: "#dddddd", text_align: "left" },
    { id: "3", field_key: "issue_date", x_percent: 80, y_percent: 90, font_size: 20, color: "#dddddd", text_align: "left" },
    { id: "4", field_key: "qr_code", x_percent: 80, y_percent: 10, font_size: 0, color: "transparent", text_align: "left" }
  ]);

  const selectedField = fields.find(f => f.id === selectedFieldId);

  React.useEffect(() => {
    api.get("/certificate-templates").then(res => res.json()).then(data => {
      setSavedTemplates(data);
      if (editId) {
        const t = data.find((x: any) => x.id.toString() === editId);
        if (t) {
          setActiveTemplateId(t.id);
          setTemplateName(t.name);
          setBgImageUrl(t.background_image_url);
          if (t.fields && t.fields.length > 0) {
            setFields(t.fields.map((f: any) => ({
              id: f.id.toString(),
              field_key: f.field_key,
              x_percent: f.x_percent,
              y_percent: f.y_percent,
              font_size: f.font_size || 20,
              color: f.color || "#000000",
              text_align: f.text_align || "left"
            })));
          }
        }
      }
    }).catch(console.error);

    if (editEmailId) {
      api.get("/email-templates").then(res => res.json()).then(data => {
        const t = data.find((x: any) => x.id.toString() === editEmailId);
        if (t) {
          setInitialEmailData(t);
          setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 300);
        }
      }).catch(console.error);
    }
  }, [editId, editEmailId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show immediate local preview
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBgImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage via backend
    setIsUploading(true);
    const toastId = toast.loading("Uploading design to Supabase Cloud Storage...");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/certificate-templates/upload-background", formData);
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setBgImageUrl(data.url);
          toast.success("Design uploaded to Supabase Storage successfully!", { id: toastId });
        }
      } else {
        toast.error("Failed to upload to cloud storage, using local preview.", { id: toastId });
      }
    } catch (err) {
      toast.error("Cloud storage upload error.", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const updateSelectedField = (key: string, value: any) => {
    if (!selectedFieldId) return;
    setFields(fields.map(f => f.id === selectedFieldId ? { ...f, [key]: value } : f));
  };

  const handleEditTemplate = (t: any) => {
    setActiveTemplateId(t.id);
    setTemplateName(t.name);
    setBgImageUrl(t.background_image_url);
    if (t.fields && t.fields.length > 0) {
      // Map backend fields to frontend expected fields
      setFields(t.fields.map((f: any) => ({
        id: f.id.toString(),
        field_key: f.field_key,
        x_percent: f.x_percent,
        y_percent: f.y_percent,
        font_size: f.font_size || 20,
        color: f.color || "#000000",
        text_align: f.text_align || "left"
      })));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveTemplate = async () => {
    if (!bgImageUrl) return toast.error("Please upload a background image first.");
    try {
      let templateId = activeTemplateId;
      
      if (templateId) {
        await api.patch(`/certificate-templates/${templateId}`, {
          name: templateName,
          background_image_url: bgImageUrl,
          width_px: 2000,
          height_px: 1414
        });
      } else {
        const res = await api.post("/certificate-templates", {
          name: templateName,
          background_image_url: bgImageUrl,
          width_px: 2000,
          height_px: 1414
        });
        const data = await res.json();
        templateId = data.id;
        setActiveTemplateId(templateId);
      }
      
      await api.patch(`/certificate-templates/${templateId}/fields`, fields);
      
      // Refresh list
      api.get("/certificate-templates").then(res => res.json()).then(data => setSavedTemplates(data)).catch(console.error);
      toast.success("Certificate template saved successfully!");
    } catch (e) {
      toast.error("Failed to save template.");
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold font-mono">Manage Templates</h1>
        <p className="text-muted-foreground">Upload your custom design and position dynamic fields over it.</p>
      </div>
      
      <div className="p-6 border bg-card rounded-xl space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-semibold">Template Name</label>
            <Input value={templateName} onChange={e => setTemplateName(e.target.value)} />
          </div>
          
          <div className="flex-1 space-y-2">
            <label className="text-sm font-semibold">Upload Background Design (PNG/JPG)</label>
            <div className="relative">
              <Input type="file" accept="image/*" onChange={handleImageUpload} className="pl-10" />
              <Upload className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            </div>
          </div>
        </div>

        {bgImageUrl ? (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg border text-sm text-muted-foreground flex justify-between items-center">
              <span>Drag the text fields to position them. Click on a field to edit its style.</span>
              <div className="flex gap-2">
                <Button onClick={() => setShowPreview(true)} size="sm" variant="outline" className="gap-1.5">
                  <Eye className="w-4 h-4" />
                  Preview
                </Button>
                <Button onClick={handleSaveTemplate} size="sm">Save Canvas Layout</Button>
              </div>
            </div>
            
            {selectedField && (
              <div className="flex items-center gap-4 p-4 border border-primary/40 bg-primary/5 rounded-lg">
                <Settings2 className="w-5 h-5 text-primary" />
                <div>
                  <label className="text-xs font-bold block mb-1">Editing Field: {selectedField.field_key}</label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Color:</span>
                      <input 
                        type="color" 
                        value={selectedField.color} 
                        onChange={(e) => updateSelectedField("color", e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Size:</span>
                      <Input 
                        type="number" 
                        value={selectedField.font_size} 
                        onChange={(e) => updateSelectedField("font_size", parseInt(e.target.value))}
                        className="w-20 h-8 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Align:</span>
                      <select 
                        value={selectedField.text_align || "left"} 
                        onChange={(e) => updateSelectedField("text_align", e.target.value)}
                        className="h-8 text-xs rounded border border-input bg-background px-2"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <CertificateCanvasEditor 
              backgroundImageUrl={bgImageUrl} 
              fields={fields} 
              onChange={setFields}
              selectedId={selectedFieldId}
              onSelect={setSelectedFieldId}
            />
          </div>
        ) : (
          <div className="h-64 border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground bg-muted/50">
            Please upload a background image to activate the canvas editor.
          </div>
        )}
      </div>
      
      <div className="p-6 border bg-card rounded-xl space-y-4">
        <h2 className="text-xl font-bold">Email Templates</h2>
        <p className="text-sm text-muted-foreground">Customize the email message sent along with the certificate.</p>
        <EmailTemplateEditor 
          key={initialEmailData?.id || 'new'} 
          initialData={initialEmailData}
          onSave={(data) => {
            if (initialEmailData) {
              api.patch(`/email-templates/${initialEmailData.id}`, data)
                .then(() => toast.success("Email template updated!"))
                .catch(() => toast.error("Failed to update email template"));
            } else {
              api.post("/email-templates", data)
                .then(() => toast.success("Email template saved!"))
                .catch(() => toast.error("Failed to save email template"));
            }
        }} />
      </div>

      {/* Live Preview Modal */}
      {showPreview && bgImageUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setShowPreview(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors flex items-center gap-1.5 text-sm font-mono"
            >
              <X className="w-4 h-4" /> Close Preview
            </button>
            <p className="absolute -top-10 left-0 text-white/50 text-xs font-mono">
              LIVE PREVIEW — This is how the certificate will look on the public link
            </p>

            {/* Certificate Render Frame — mirrors certify/[id]/page.tsx exactly */}
            <div
              className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-border/40 select-none"
              style={{ containerType: "inline-size", backgroundColor: "#0b0f19" }}
            >
              {/* Background image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bgImageUrl}
                alt="Certificate Background Preview"
                className="w-full h-auto block"
              />

              {/* Overlaid dynamic fields */}
              {fields.map((f) => {
                if (f.field_key === "qr_code") {
                  return (
                    <div
                      key={f.id}
                      className="absolute bg-white p-1 sm:p-1.5 rounded-lg shadow-lg flex items-center justify-center"
                      style={{
                        left: `${f.x_percent}%`,
                        top: `${f.y_percent}%`,
                        width: "10%",
                        height: "auto",
                        aspectRatio: "1/1",
                        transform: "translate(0%, -50%)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent("https://codercorps.com/certify/PREVIEW")}`}
                        alt="QR Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  );
                }

                const sampleValues: Record<string, string> = {
                  student_name: "Atul Sharma",
                  holder_name: "Atul Sharma",
                  name: "Atul Sharma",
                  certificate_number: "CC-2026-00010",
                  issue_date: "September 24, 2026",
                  date: "September 24, 2026",
                  project_title: "CoderCorps Web Platform",
                  title: "Certificate of Completion",
                  mentor_name: "Divakar Singh",
                  reviewer_name: "Divakar Singh",
                };
                const val = sampleValues[f.field_key] || `{${f.field_key}}`;

                return (
                  <div
                    key={f.id}
                    className="absolute whitespace-nowrap pointer-events-none font-bold tracking-normal drop-shadow-md"
                    style={{
                      left: `${f.x_percent}%`,
                      top: `${f.y_percent}%`,
                      fontSize: `${(f.font_size / 2000) * 100}cqi`,
                      color: f.color || "#ffffff",
                      lineHeight: 1,
                      textAlign: (f.text_align as any) || "left",
                      transform: f.text_align === "center" ? "translate(-50%, -50%)" : f.text_align === "right" ? "translate(-100%, -50%)" : "translate(0%, -50%)",
                    }}
                  >
                    {val}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



export default function Page() {
  return (
    <React.Suspense fallback={<div className="p-12 text-center text-muted-foreground animate-pulse">Loading editor...</div>}>
      <ManageTemplatesPage />
    </React.Suspense>
  );
}
