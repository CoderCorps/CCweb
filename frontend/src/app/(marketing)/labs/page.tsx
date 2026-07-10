"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, GitPullRequest, Code2, Users, ShieldAlert, ArrowDown } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LabsPage() {
  const steps = [
    {
      step: "01",
      title: "Sprint Goals & Scaffolding",
      desc: "Connect to the repository. The mentor outlines the sprint objective (e.g. build a rate-limiter middleware). Tasks are assigned to contributors on the Kanban board.",
      icon: <Code2 className="h-6 w-6 text-indigo-400" />
    },
    {
      step: "02",
      title: "GitHub Pull Request",
      desc: "Checkout a development branch. Implement the features, write robust unit tests, and open a Pull Request. Automated linter and CI tests run on your push.",
      icon: <GitPullRequest className="h-6 w-6 text-cyan-400" />
    },
    {
      step: "03",
      title: "Mentor Audit & Review",
      desc: "A staff engineer audits your PR. Line-by-line comments, performance feedback, and architecture audits are provided. Address feedback, push updates, and get approved.",
      icon: <Users className="h-6 w-6 text-teal-400" />
    },
    {
      step: "04",
      title: "Deploy & Audited Certificate",
      desc: "Merge to main automatically triggers Vercel/Render deployments. The system logs your approved PRs and issues a certificate containing the immutable audit log link.",
      icon: <CheckCircle className="h-6 w-6 text-emerald-400" />
    }
  ];

  return (
    <div className="bg-background text-foreground py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-16 flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-xs font-semibold w-fit">
            <span>LABS WORKSPACE PROCESS</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            How Labs Workspace Works
          </h1>
          <p className="text-lg text-muted-foreground">
            We operate like a modern remote engineering team. Build projects alongside peer contributors, execute GitHub workflows, and ship reviewed code.
          </p>
        </div>

        {/* Timeline representation */}
        <div className="relative border-l border-border/80 pl-6 ml-4 space-y-12 max-w-4xl">
          {steps.map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="relative"
            >
              {/* Dot indicator */}
              <div className="absolute -left-[37px] top-1.5 w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center font-mono text-[10px] text-foreground">
                {item.step}
              </div>

              <div className="glass p-6 rounded-xl border border-border/40 hover:border-indigo-500/30 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-border/40 border border-border/60">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-12">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Vision details */}
        <section className="mt-24 p-8 rounded-2xl glass-premium border border-border/40 max-w-4xl flex flex-col gap-6">
          <div className="flex items-start gap-4 text-amber-400">
            <ShieldAlert className="h-6 w-6 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-lg text-foreground">Audit Integrity Guarantee</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                CoderCorps certificates are backed by a database audit log. When an employer scans your certificate, they see the exact project details, the mentor who signed off on your code, and direct links to the public GitHub Pull Requests you authored. 
              </p>
            </div>
          </div>
          <div className="h-px bg-border/30" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-foreground font-mono">Ready to commit your first line of code?</p>
            <Link href="/signup">
              <Button className="gap-2 font-semibold">
                Register as Student <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
