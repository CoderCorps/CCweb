"use client";

import React, { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Github, Linkedin } from "@/components/ui/icons";
import { motion } from "framer-motion";

export default function MentorsPage() {
  const mentors = [
    {
      name: "Atul Sharma",
      title: "Founder & Lead Backend Architect",
      company: "Founder at CoderCorps",
      bio: "Backend Engineer with 2+ years of experience building scalable Python systems and cloud-native applications. Specializes in optimizing workflows, high-performance APIs, data pipelines, and production AI solutions.",
      avatar: "/assets/mentors/atul.png",
      skills: ["Python", "FastAPI", "Cloud Native", "Data Pipelines", "LLMs", "RAG"],
      github: "https://github.com/atul120212",
      linkedin: "https://www.linkedin.com/in/imatul-sharma/"
    },
    {
      name: "Devansh Rathaur",
      title: "Distributed Systems & Infrastructure Lead",
      company: "Core Architect at CoderCorps · Founder of CodeInCampus",
      bio: "Software Developer, Python Trainer & tech community builder. Honed skills in Python, Core Java, Flask, Django, MySQL, AWS, and mentored in open-source programs like GirlScript Summer of Code.",
      avatar: "/assets/mentors/devansh.jpg",
      skills: ["Python", "Flask/Django", "MySQL", "AWS", "Docker/K8s", "Git"],
      github: "https://github.com/Devansh80",
      linkedin: "https://www.linkedin.com/in/devanshrathaur/"
    },
    {
      name: "Divakar Singh",
      title: "AI Backend & Systems Lead",
      company: "AI Engineer at Blackcoffer · Tech Lead",
      bio: "AI Backend Engineer building LLM applications, RAG systems, and FastAPI microservices. Experienced in training deep learning models (ImageNets, LSTM) and building serious AI infrastructure.",
      avatar: "/assets/mentors/divakar.jpg",
      skills: ["Deep Learning", "FastAPI", "RAG Systems", "PyTorch", "LangChain", "Docker"],
      github: "https://github.com/divakar166",
      linkedin: "https://www.linkedin.com/in/divakar-singh/"
    }
  ];

  return (
    <div className="bg-background text-foreground py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-left max-w-3xl mb-16 flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 px-3 py-1 rounded-full text-xs font-semibold w-fit">
            <span>OUR CORE ENGINEERING BOARD</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            Core Engineers & Mentors
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
