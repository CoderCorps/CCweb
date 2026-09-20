"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EmailTemplateEditorProps {
  initialData?: any;
  onSave: (data: any) => void;
}

export default function EmailTemplateEditor({ initialData, onSave }: EmailTemplateEditorProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [bodyHtml, setBodyHtml] = useState(initialData?.body_html || "");

  return (
    <div className="space-y-4 border p-4 rounded-xl bg-card">
      <div>
        <label className="text-sm font-semibold">Template Name</label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Default Graduation Email" />
      </div>
      
      <div>
        <label className="text-sm font-semibold">Email Subject</label>
        <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Your CoderCorps Certificate" />
      </div>
      
      <div>
        <label className="text-sm font-semibold">Email HTML Body</label>
        <p className="text-xs text-muted-foreground mb-2">Available variables: {'{{name}}'}, {'{{certificate_number}}'}, {'{{certificate_link}}'}</p>
        <textarea 
          className="w-full h-48 border rounded-md p-2 bg-background font-mono text-sm"
          value={bodyHtml} 
          onChange={e => setBodyHtml(e.target.value)} 
          placeholder="<h1>Congratulations {{name}}!</h1>"
        />
      </div>
      
      <Button onClick={() => onSave({ name, subject, body_html: bodyHtml })}>
        Save Template
      </Button>
    </div>
  );
}
