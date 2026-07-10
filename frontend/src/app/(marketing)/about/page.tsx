"use client";

import React from "react";
import { Terminal, Shield, Award, Sparkles, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

export default function AboutPage() {
  const principles = [
    {
      title: "No Certificate Selling",
      desc: "We do not sell paper. We issue credentials only after verified deliverables (code, commits, PR merges) are signed off by industry staff mentors.",
      icon: <Shield className="h-6 w-6 text-indigo-400" />
    },
    {
      title: "No Placement Guarantees",
      desc: "We reject deceptive marketing. We guarantee zero placements. What we guarantee is a standard of code and documentation that mirrors top-tier engineering organizations.",
      icon: <Terminal className="h-6 w-6 text-cyan-400" />
    },
    {
      title: "Public Code Audits",
      desc: "Our portfolios are transparent. Your profile page lists the exact, Scannable GitHub Pull Requests you authored, allowing engineering recruiters to read your actual code immediately.",
      icon: <Award className="h-6 w-6 text-teal-400" />
    }
  ];

  return (
    <div className="bg-background text-foreground py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">
        <div className="flex flex-col gap-4 text-left">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold w-fit">
            <span>OUR MISSION</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            Rigorous Software Engineering
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mt-2">
            CoderCorps is built by engineers, for builders. We believe that standard bootcamps and certifications are broken. They print certificates for attendance and sell fake job placement promises. 
          </p>
        </div>

        <div className="h-px bg-border/40" />

        <div className="flex flex-col gap-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Our Core Principles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {principles.map((p, idx) => (
              <div 
                key={idx}
                className="glass p-6 rounded-xl border border-border/40 flex flex-col gap-4"
              >
                <div className="p-2.5 rounded-lg bg-border/40 border border-border/60 w-fit">
                  {p.icon}
                </div>
                <h3 className="font-bold text-lg text-foreground">{p.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-border/40" />

        <div className="flex flex-col gap-4 text-muted-foreground leading-relaxed">
          <h3 className="text-xl font-bold text-foreground">Why We Build in Public</h3>
          <p className="text-sm">
            In a world flooded by generated resumes and templated projects, the only indicator of true engineering competence is public code reviews. If you build a cache middleware, a query engine, or a multi-tenant DB structure, you should be able to show the direct code contribution.
          </p>
          <p className="text-sm">
            At CoderCorps, you work on open repositories, write pull requests, engage in active code review comment threads with mentors, and deploy live apps. That audit trail is the core of our platform.
          </p>
        </div>
      </div>
    </div>
  );
}
