"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cpu, Globe, Database, Shield, Terminal, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function AcademyPage() {
  const tracks = [
    {
      title: "AI & Machine Learning Engineering",
      desc: "Go beyond API calling. Learn to fine-tune open weights models, build custom retrieval pipelines (RAG), structure agentic workflows, and optimize GPU inference pipelines.",
      icon: <Cpu className="h-6 w-6 text-indigo-400" />,
      skills: ["PyTorch", "Hugging Face", "Vector DBs", "LlamaIndex", "Inference Optimization"],
      duration: "12 Weeks"
    },
    {
      title: "Advanced Full-Stack Engineering",
      desc: "Deep dive into reactive frontends and scalable API backends. Build production App Router apps in Next.js, and concurrent REST APIs in FastAPI, optimized with database query tuning.",
      icon: <Globe className="h-6 w-6 text-cyan-400" />,
      skills: ["Next.js 14", "FastAPI", "SQLAlchemy", "PostgreSQL Indexes", "State Engines"],
      duration: "10 Weeks"
    },
    {
      title: "DevOps & Cloud Engineering",
      desc: "Master infrastructure as code. Automate deployments, configure Kubernetes clusters, set up Prometheus monitoring, and construct complex GitHub Actions validation pipelines.",
      icon: <Database className="h-6 w-6 text-teal-400" />,
      skills: ["Docker", "Kubernetes", "Terraform", "GitHub CI/CD", "AWS/GCP"],
      duration: "8 Weeks"
    },
    {
      title: "Systems Programming & Architecture",
      desc: "Understand how compilers and low-level kernels execute your code. Write high-concurrency event loops in Go/Rust, manage raw socket layers, and implement custom cache protocols.",
      icon: <Terminal className="h-6 w-6 text-violet-400" />,
      skills: ["Go / Rust", "Concurrency", "Linux Sockets", "Redis Protocols", "gRPC Systems"],
      duration: "14 Weeks"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
  };

  return (
    <div className="bg-background text-foreground py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-left max-w-3xl mb-16 flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold w-fit">
            <span>ENGINEERING ACADEMY</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            Rigorous Learning Tracks
          </h1>
          <p className="text-lg text-muted-foreground">
            Our curriculum is built around actual engineering depth. No multiple choice tests, no superficial tutorials. Learn to build systems that work under load.
          </p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {tracks.map((track, idx) => (
            <motion.div 
              key={idx}
              variants={cardVariants}
              whileHover={{ y: -5 }}
              className="flex"
            >
              <Card className="glass-premium border border-border/40 flex flex-col justify-between w-full p-2">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="p-3 rounded-xl bg-border/40 border border-border/60">
                    {track.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl text-foreground font-bold">{track.title}</CardTitle>
                    <CardDescription className="text-xs text-indigo-500 font-mono mt-1">Duration: {track.duration}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <p className="text-sm text-muted-foreground leading-relaxed">{track.desc}</p>
                  
                  <div>
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 font-mono">Skills Covered:</h4>
                    <div className="flex flex-wrap gap-2">
                      {track.skills.map((skill, sIdx) => (
                        <span 
                          key={sIdx}
                          className="text-xs px-2.5 py-1 rounded-md bg-muted border border-border text-foreground font-mono"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-border/30 mt-6">
                  <Link href="/signup" className="w-full">
                    <Button variant="outline" className="w-full gap-2 font-semibold">
                      Apply to Track <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
