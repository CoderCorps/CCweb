"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Mail, MessageSquare, Terminal } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="bg-background text-foreground py-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[80vh]">
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
              <div className="p-6 text-center bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200">
                <Terminal className="h-6 w-6 text-indigo-400" />
                <h3 className="font-bold text-foreground">Message Logged!</h3>
                <p className="text-xs text-muted-foreground">
                  Our system registered your contact event. A mentor will review this connection request within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-semibold text-foreground font-mono">NAME</label>
                  <Input id="name" type="text" placeholder="Atul Sharma" required />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold text-foreground font-mono">EMAIL</label>
                  <Input id="email" type="email" placeholder="atul@gmail.com" required />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="message" className="text-xs font-semibold text-foreground font-mono">MESSAGE</label>
                  <textarea
                    id="message"
                    rows={4}
                    placeholder="Describe your engineering background or what track you are interested in..."
                    required
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <Button type="submit" className="w-full font-semibold mt-4">
                  Send Message
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
