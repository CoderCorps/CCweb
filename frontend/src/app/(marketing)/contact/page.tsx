"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Mail, Terminal, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // POST connection to backend contact endpoint (with skipAuth since user might not be logged in)
      const res = await api.post(
        "/contact", 
        { name, email, message }, 
        { skipAuth: true }
      );

      if (res.ok) {
        setSubmitted(true);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || "Failed to deliver message. Please check the inputs.");
      }
    } catch (err) {
      setError("Unable to connect to the backend server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-foreground py-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[80vh] relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06),transparent_60%)] -z-10" />

      <div className="max-w-md w-full relative z-10">
        <div className="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-full -z-10" />
        
        <Card className="glass-premium border border-border/40">
          <CardHeader className="text-center flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 w-fit">
              <Mail className="h-5 w-5" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Get in Touch</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Questions about our tracks, labs, or portfolio verification? Send us a message.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="p-6 text-center bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200">
                <Terminal className="h-6 w-6 text-emerald-400" />
                <h3 className="font-bold text-foreground">Message Dispatched!</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your inquiry has been successfully logged and routed to <span className="font-semibold text-primary">codercorps@gmail.comm</span>. An engineering lead will follow up shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-400 flex items-start gap-2 animate-in fade-in duration-200">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-semibold text-foreground font-mono">NAME</label>
                  <Input 
                    id="name" 
                    type="text" 
                    placeholder="Atul Sharma" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold text-foreground font-mono">EMAIL</label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="atul@gmail.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="message" className="text-xs font-semibold text-foreground font-mono">MESSAGE</label>
                  <textarea
                    id="message"
                    rows={4}
                    placeholder="Describe your engineering background or what track you are interested in..."
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <Button type="submit" className="w-full font-semibold mt-4" disabled={submitting}>
                  {submitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
