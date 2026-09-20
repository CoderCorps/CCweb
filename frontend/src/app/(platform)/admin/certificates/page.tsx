"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Award } from "lucide-react";
import { api } from "@/lib/api";

export default function CertificatesHubPage() {
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);

  useEffect(() => {
    api.get("/certificate-templates").then(res => res.json()).then(data => setSavedTemplates(data)).catch(console.error);
    api.get("/email-templates").then(res => res.json()).then(data => setEmailTemplates(data)).catch(console.error);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">CERTIFICATES HUB</h1>
        <p className="text-muted-foreground mt-2">Manage templates and issue certificates to eligible candidates.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 border border-border/40 bg-card rounded-xl shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold mb-2 text-foreground">Certificate Templates</h2>
          <p className="text-sm text-muted-foreground mb-4">Design new templates or edit existing ones.</p>
          <Button asChild>
            <Link href="/admin/certificates/templates">Manage Templates</Link>
          </Button>
        </div>
        
        <div className="p-6 border border-border/40 bg-card rounded-xl shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
            <Award className="w-5 h-5 text-indigo-500" />
          </div>
          <h2 className="text-lg font-bold mb-2 text-foreground">Issue Certificates</h2>
          <p className="text-sm text-muted-foreground mb-4">Batch generate and email certificates for a program.</p>
          <Button variant="secondary" asChild>
            <Link href="/admin/certificates/issue">Issue Wizard</Link>
          </Button>
        </div>
      </div>

      <div className="p-6 border bg-card rounded-xl space-y-4 shadow-sm">
        <h2 className="text-xl font-bold">Saved Certificate Templates</h2>
        {savedTemplates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No templates saved yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {savedTemplates.map((t: any) => (
              <div key={t.id} className="p-4 border rounded-lg bg-muted/30 hover:border-primary transition-colors flex flex-col justify-between">
                <div>
                  <p className="font-semibold truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">ID: {t.id}</p>
                  <p className="text-xs text-muted-foreground">{t.fields?.length || 0} Dynamic Fields</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4 w-full"
                  asChild
                >
                  <Link href={`/admin/certificates/templates?edit=${t.id}`}>
                    View / Edit
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 border bg-card rounded-xl space-y-4 shadow-sm">
        <h2 className="text-xl font-bold flex items-center gap-2">
          Saved Email Templates
        </h2>
        {emailTemplates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No email templates saved yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emailTemplates.map((t: any) => (
              <div key={t.id} className="p-4 border rounded-lg bg-muted/30 hover:border-primary transition-colors flex flex-col justify-between">
                <div>
                  <p className="font-semibold truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">ID: {t.id}</p>
                  <p className="text-xs text-muted-foreground truncate mt-1">Subject: {t.subject}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4 w-full"
                  asChild
                >
                  <Link href={`/admin/certificates/templates?edit_email=${t.id}`}>
                    View / Edit
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

