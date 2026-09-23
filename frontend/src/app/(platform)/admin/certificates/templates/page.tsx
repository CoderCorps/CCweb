"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CertificateCanvasEditor } from "@/components/certificates/CertificateEditorDynamic";
import EmailTemplateEditor from "@/components/certificates/EmailTemplateEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Settings2 } from "lucide-react";
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
  const [fields, setFields] = useState([
    { id: "1", field_key: "student_name", x_percent: 50, y_percent: 50, font_size: 60, color: "#ffffff" },
    { id: "2", field_key: "certificate_number", x_percent: 10, y_percent: 90, font_size: 20, color: "#dddddd" },
    { id: "3", field_key: "issue_date", x_percent: 80, y_percent: 90, font_size: 20, color: "#dddddd" },
    { id: "4", field_key: "qr_code", x_percent: 80, y_percent: 10, font_size: 0, color: "transparent" }
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
              color: f.color || "#000000"
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
        color: f.color || "#000000"
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
              <Button onClick={handleSaveTemplate} size="sm">Save Canvas Layout</Button>
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
