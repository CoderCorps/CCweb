"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function IssueWizardPage() {
  const [step, setStep] = useState(1);
  const [programs, setPrograms] = useState([]);
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [eligibleUsers, setEligibleUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedIds, setGeneratedIds] = useState<number[]>([]);

  useEffect(() => {
    api.get("/programs").then(res => res.json()).then(data => setPrograms(data)).catch(console.error);
    api.get("/projects").then(res => res.json()).then(data => setProjects(data)).catch(console.error);
    api.get("/certificate-templates").then(res => res.json()).then(data => setTemplates(data)).catch(console.error);
  }, []);

  const handleFetchEligible = async () => {
    if (!selectedProgram && !selectedProject) return toast.error("Select a program or project first");
    try {
      let url = `/certificates/eligibility?`;
      if (selectedProject) url += `project_id=${selectedProject}`;
      else url += `program_id=${selectedProgram}`;
      
      const res = await api.get(url);
      const data = await res.json();
      setEligibleUsers(data);
      setSelectedUsers(data.filter((u: any) => u.eligible).map((u: any) => u.user_id));
      setStep(2);
    } catch (e) {
      toast.error("Failed to fetch eligible users");
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return toast.error("Select a template");
    if (selectedUsers.length === 0) return toast.error("Select users to issue to");
    
    setIsGenerating(true);
    try {
      const res = await api.post("/certificates/generate-batch", {
        template_id: parseInt(selectedTemplate),
        program_id: selectedProgram ? parseInt(selectedProgram) : null,
        project_id: selectedProject ? parseInt(selectedProject) : null,
        user_ids: selectedUsers,
        title: "Certificate of Completion"
      });
      const data = await res.json();
      setGeneratedIds(data.ids);
      toast.success(data.message);
      setStep(3);
    } catch (e) {
      toast.error("Failed to generate certificates");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSendEmails = async () => {
    toast.info("Sending emails in background...");
    try {
      await api.post("/certificates/send-batch", {
        certificate_ids: generatedIds,
        email_template_id: 1 
      });
      toast.success("Emails sent successfully!");
    } catch(e) {
      toast.error("Failed to send emails");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold font-mono">ISSUE CERTIFICATES</h1>
      
      {step === 1 && (
        <div className="p-6 border bg-card rounded-xl space-y-4">
          <h2 className="text-lg font-bold">Step 1: Select Source & Template</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Filter by Program (Optional)</label>
              <select 
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedProgram}
                onChange={(e) => { setSelectedProgram(e.target.value); setSelectedProject(""); }}
              >
                <option value="">Select a program...</option>
                {programs.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Filter by Project (Optional)</label>
              <select 
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedProject}
                onChange={(e) => { setSelectedProject(e.target.value); setSelectedProgram(""); }}
              >
                <option value="">Select a specific project...</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold">Certificate Template</label>
            <select 
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              <option value="">Select a template...</option>
              {templates.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          
          <Button onClick={handleFetchEligible} disabled={(!selectedProgram && !selectedProject) || !selectedTemplate}>
            Next: Review Candidates
          </Button>
        </div>
      )}
      
      {step === 2 && (
        <div className="p-6 border bg-card rounded-xl space-y-4">
          <h2 className="text-lg font-bold">Step 2: Review Eligible Candidates</h2>
          
          <div className="flex items-center space-x-2 py-4">
            <input 
              type="checkbox"
              id="override" 
              onChange={(e) => {
                if (e.target.checked) {
                  // Select all including ineligible
                  setSelectedUsers(eligibleUsers.map(u => u.user_id));
                } else {
                  // Revert to only eligible
                  setSelectedUsers(eligibleUsers.filter(u => u.eligible).map(u => u.user_id));
                }
              }}
              className="h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
            />
            <label htmlFor="override" className="text-sm font-bold text-red-500">
              Admin Override: Allow issuing to ineligible candidates
            </label>
          </div>

          <div className="space-y-2 border rounded-md p-4 bg-muted/50 max-h-[400px] overflow-y-auto">
            {eligibleUsers.length === 0 && <p className="text-sm text-muted-foreground">No users found.</p>}
            {eligibleUsers.map(user => {
              const isSelected = selectedUsers.includes(user.user_id);
              return (
                <div key={user.user_id} className="flex items-center space-x-2 py-2 border-b last:border-0">
                  <input 
                    type="checkbox"
                    id={`user-${user.user_id}`} 
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers([...selectedUsers, user.user_id]);
                      } else {
                        setSelectedUsers(selectedUsers.filter(id => id !== user.user_id));
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor={`user-${user.user_id}`} className={`text-sm font-medium leading-none ${!user.eligible && !isSelected ? 'opacity-50' : ''}`}>
                    {user.user_name}
                    {!user.eligible && <span className="ml-2 text-xs text-red-500">({user.missing_criteria.join(", ")})</span>}
                  </label>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={handleGenerate} disabled={isGenerating || selectedUsers.length === 0}>
              {isGenerating ? "Generating..." : `Generate ${selectedUsers.length} Certificates`}
            </Button>
          </div>
        </div>
      )}
      
      {step === 3 && (
        <div className="p-6 border bg-card rounded-xl space-y-4">
          <h2 className="text-lg font-bold text-green-500">Step 3: Certificates Generated!</h2>
          <p>Successfully generated {generatedIds.length} certificates.</p>
          
          <div className="flex gap-4">
            <Button onClick={handleSendEmails}>Email Certificates to Candidates</Button>
            <Button variant="outline" asChild><a href="/admin/certificates">Done</a></Button>
          </div>
        </div>
      )}
    </div>
  );
}

