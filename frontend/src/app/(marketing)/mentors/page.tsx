"use client";

import React, { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Github, Linkedin } from "@/components/ui/icons";
import { motion } from "framer-motion";

export default function MentorsPage() {
  const mentors = [
    {
      name: "Siddharth Roy",
      title: "Backend & Systems Mentor",
      company: "Ex-Staff Engineer at Uber",
      bio: "12+ years experience building highly concurrent distributed systems. Expert in DB tuning, cache design, and Python/Go.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300",
      skills: ["FastAPI", "Go", "PostgreSQL", "Kafka", "Kubernetes"],
      github: "https://github.com/mentor-siddharth",
      linkedin: "https://linkedin.com/in/siddharth-roy"
    },
    {
      name: "Neha Mehta",
      title: "Frontend & Architecture Mentor",
      company: "Principal Engineer at Razorpay",
      bio: "UI Architect. Focused on client state management, responsive designs, Next.js performance auditing, and animations.",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
      skills: ["React", "TypeScript", "Next.js", "Framer Motion", "Tailwind"],
      github: "https://github.com/neha-mehta",
      linkedin: "https://linkedin.com/in/neha-mehta"
    },
    {
      name: "Kabir Sengupta",
      title: "AI & Platform Lead",
      company: "Senior Applied Scientist at Nvidia",
      bio: "PhD in AI/ML. Specializes in LLM fine-tuning, training container optimization, CUDA drivers, and vector pipeline design.",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300",
      skills: ["PyTorch", "Hugging Face", "LangChain", "LLMs", "Vector DBs"],
      github: "https://github.com/kabir-s",
      linkedin: "https://linkedin.com/in/kabir-sengupta"
    }
  ];

  return (
    <div className="bg-background text-foreground py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-left max-w-3xl mb-16 flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 px-3 py-1 rounded-full text-xs font-semibold w-fit">
            <span>OUR INDUSTRY LEADS</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            Meet the Mentors
          </h1>
          <p className="text-lg text-muted-foreground">
            Learn from engineers who have built, optimized, and deployed code handling millions of active daily users. Real engineers giving real code reviews.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {mentors.map((mentor, idx) => (
            <MentorCard key={idx} mentor={mentor} />
          ))}
        </div>
      </div>
    </div>
  );
}

// 3D Flip Card Component using standard CSS transform-style preserve-3d
function MentorCard({ mentor }: { mentor: any }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div 
      className="w-full h-[400px] cursor-pointer perspective"
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onClick={() => setFlipped(!flipped)}
    >
      <div 
        className={`relative w-full h-full duration-700 preserve-3d ${
          flipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front side */}
        <div className="absolute inset-0 w-full h-full rounded-2xl glass-premium border border-border/40 p-6 flex flex-col items-center justify-between backface-hidden">
          <div className="flex flex-col items-center gap-4 text-center mt-4">
            <img 
              src={mentor.avatar} 
              alt={mentor.name} 
              className="w-24 h-24 rounded-full object-cover border-2 border-primary/50 shadow-md"
            />
            <div>
              <h3 className="text-xl font-bold text-foreground">{mentor.name}</h3>
              <p className="text-xs text-indigo-400 font-mono mt-0.5">{mentor.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{mentor.company}</p>
            </div>
          </div>

          <div className="w-full">
            <div className="flex flex-wrap gap-1.5 justify-center mb-4">
              {mentor.skills.slice(0, 3).map((skill: string, sIdx: number) => (
                <span 
                  key={sIdx}
                  className="text-[10px] px-2 py-0.5 rounded bg-muted border border-border text-foreground font-mono"
                >
                  {skill}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground text-center font-mono uppercase tracking-wider">Hover to view bio</p>
          </div>
        </div>

        {/* Back side */}
        <div className="absolute inset-0 w-full h-full rounded-2xl glass-premium border border-primary/30 p-6 flex flex-col justify-between backface-hidden rotate-y-180">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">{mentor.name}</h3>
              <p className="text-xs text-indigo-400 font-mono">{mentor.title}</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{mentor.bio}</p>
            
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 font-mono">Expertise:</h4>
              <div className="flex flex-wrap gap-1.5">
                {mentor.skills.map((skill: string, sIdx: number) => (
                  <span 
                    key={sIdx}
                    className="text-[10px] px-2 py-0.5 rounded bg-border/80 text-indigo-300 font-mono"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/30">
            <a 
              href={mentor.github} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-1.5 rounded-md hover:bg-border/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
            </a>
            <a 
              href={mentor.linkedin} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-1.5 rounded-md hover:bg-border/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Tailwind helper styles in JS, in addition to global.css */}
      <style jsx global>{`
        .perspective {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
