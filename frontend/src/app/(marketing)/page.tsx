"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Code, ShieldCheck, Cpu, Terminal, Users, Award, BookOpen, Calendar, MapPin, GitMerge, CheckCircle2, Star, Zap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";

const CyberScene = dynamic(
  () => import("@/components/ui/cyber-scene").then((mod) => mod.CyberScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-background to-background -z-10 animate-pulse" />
    ),
  }
);
import { TiltCard } from "@/components/ui/tilt-card";
import { getAssetUrl } from "@/lib/utils";

interface ActivityEvent {
  id: number;
  event_type: string;
  actor_name: string;
  actor_avatar_url?: string;
  project_title?: string;
  created_at: string;
  metadata: Record<string, string>;
}

const MOCK_ACTIVITY: ActivityEvent[] = [
  { id: 1, event_type: "certificate_issued", actor_name: "Rohan Verma", project_title: "Distributed E-Commerce API Engine", created_at: new Date(Date.now() - 3600000).toISOString(), metadata: { mentor_name: "Atul Sharma" } },
  { id: 2, event_type: "submission_approved", actor_name: "Priya Singh", project_title: "Real-Time ML Inference API", created_at: new Date(Date.now() - 7200000).toISOString(), metadata: { mentor_name: "Divakar Singh" } },
  { id: 3, event_type: "project_started", actor_name: "Atul Sharma", project_title: "CoderCorps CLI Toolchain", created_at: new Date(Date.now() - 86400000).toISOString(), metadata: {} },
  { id: 4, event_type: "certificate_issued", actor_name: "Aditya Kumar", project_title: "Async Job Queue System", created_at: new Date(Date.now() - 172800000).toISOString(), metadata: { mentor_name: "Devansh Rathaur" } },
  { id: 5, event_type: "submission_approved", actor_name: "Meera Joshi", project_title: "LLM-Powered Code Review Bot", created_at: new Date(Date.now() - 259200000).toISOString(), metadata: { mentor_name: "Atul Sharma" } },
];

function getEventIcon(eventType: string) {
  switch (eventType) {
    case "certificate_issued": return <Award className="h-4 w-4 text-yellow-400" />;
    case "submission_approved": return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case "project_started": return <Zap className="h-4 w-4 text-indigo-400" />;
    case "pr_merged": return <GitMerge className="h-4 w-4 text-cyan-400" />;
    default: return <Star className="h-4 w-4 text-primary" />;
  }
}

function getEventLabel(ev: ActivityEvent) {
  switch (ev.event_type) {
    case "certificate_issued": return <><strong>{ev.actor_name}</strong> earned a certificate for <em>{ev.project_title}</em></>;
    case "submission_approved": return <><strong>{ev.actor_name}</strong>&apos;s submission was approved on <em>{ev.project_title}</em></>;
    case "project_started": return <>New project launched: <em>{ev.project_title}</em></>;
    case "pr_merged": return <><strong>{ev.actor_name}</strong> merged a PR into <em>{ev.project_title}</em></>;
    default: return <><strong>{ev.actor_name}</strong> completed an action</>;
  }
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function HomePage() {
  const shouldReduceMotion = useReducedMotion();
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [activityVisible, setActivityVisible] = useState(8);
  const animProps = (delay = 0) => 
    shouldReduceMotion 
      ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
      : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay } };

  const scaleAnimProps = shouldReduceMotion
    ? { initial: { opacity: 1, scale: 1 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.8 } };

  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const stepsRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    // Fetch live activity feed, fall back to mock data
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/activity/recent?limit=20`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (Array.isArray(data) && data.length > 0) setActivityEvents(data); else setActivityEvents(MOCK_ACTIVITY); })
      .catch(() => setActivityEvents(MOCK_ACTIVITY));
  }, []);

  useEffect(() => {
    // Check system preference for reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      const path = pathRef.current;
      if (path) {
        gsap.set(path, { strokeDashoffset: 0 });
      }
      stepsRefs.current.filter(Boolean).forEach((step) => {
        gsap.set(step, {
          borderColor: "#6366f1",
          backgroundColor: "rgba(99, 102, 241, 0.15)",
        });
      });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const path = pathRef.current;
    if (!path) return;

    const pathLength = path.getTotalLength();
    gsap.set(path, {
      strokeDasharray: pathLength,
      strokeDashoffset: pathLength,
    });

    const steps = stepsRefs.current.filter(Boolean);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 20%",
        end: "bottom 80%",
        scrub: 1.5,
      },
    });

    tl.to(path, { strokeDashoffset: 0, ease: "none", duration: 3 });

    steps.forEach((step, idx) => {
      tl.to(
        step,
        {
          borderColor: "#6366f1",
          backgroundColor: "rgba(99, 102, 241, 0.15)",
          scale: 1.05,
          duration: 0.5,
          yoyo: true,
          repeat: 1,
        },
        idx * 0.5
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  const sdlcSteps = [
    {
      title: "1. Planning & Sprints",
      desc: "Work with your team to partition deliverables into strict 2-week sprints. Set concrete goals under a mentor-assigned lead.",
      icon: <Terminal className="h-5 w-5 text-indigo-400" />
    },
    {
      title: "2. Clean Code Development",
      desc: "Implement modular, documented logic in standard repositories. Write tests first, ensuring clean architectural boundaries.",
      icon: <Code className="h-5 w-5 text-indigo-400" />
    },
    {
      title: "3. GitHub PR Workflow",
      desc: "Create focused Pull Requests. Run automated tests and linting suites on every branch to establish modern CI/CD patterns.",
      icon: <Cpu className="h-5 w-5 text-cyan-400" />
    },
    {
      title: "4. Mentor Code Review",
      desc: "Receive audits from staff engineers. No code is merged without passing high-standard syntax and scalability reviews.",
      icon: <Users className="h-5 w-5 text-cyan-400" />
    },
    {
      title: "5. Automated Deployment",
      desc: "Merge to main triggers automated deployments to cloud runtimes, establishing visible, live, testing-validated applications.",
      icon: <ShieldCheck className="h-5 w-5 text-teal-400" />
    },
    {
      title: "6. Verifiable Demo & Certificate",
      desc: "Deliver a live presentation. Approval triggers a cryptography-signed certificate detailing the exact merged PRs and code quality metrics.",
      icon: <Award className="h-5 w-5 text-teal-400" />
    }
  ];

  const events = [
    {
      title: "HackGear 2.0 Hackathon",
      type: "8-Hour Hackathon",
      date: "OCTOBER 14, 2024",
      desc: "A rapid build-a-thon where developers teamed up to construct prototype utilities under constraint. Hosted as community partners at VIT Aligarh.",
      location: "VIT Aligarh",
      partner: "VIT Aligarh Partner"
    },
    {
      title: "Git & GitHub Developer Workspace",
      type: "Hands-on Workshop",
      date: "NOVEMBER 05, 2024",
      desc: "A live terminal session teaching branching structures, merge conflict resolution, pull request authoring, and CI/CD code verification pipelines.",
      location: "CoderCorps Hub",
      partner: "Open Source India"
    },
    {
      title: "Introduction to Open Source Contributions",
      type: "Technical Seminar",
      date: "DECEMBER 10, 2024",
      desc: "A seminar introducing students to the public open-source ecosystem. Explored finding issues, authoring clean commits, and maintainer reviews.",
      location: "Vision Campus",
      partner: "Hacktoberfest '24"
    },
    {
      title: "FastAPI & REST API Architecture",
      type: "Live Lab Session",
      date: "JANUARY 18, 2025",
      desc: "A hands-on session focusing on FastAPI routes, SQLAlchemy database mapping, JWT authentication cookies, and writing database migrations using Alembic.",
      location: "CoderCorps Labs",
      partner: "Python Aligarh"
    }
  ];

  return (
    <div className="bg-background text-foreground overflow-x-hidden">

      {/* ── HERO SECTION with WebGL Three.js & Video background ── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden isolate">
        {/* Video background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover -z-20"
        >
          <source src={getAssetUrl("/assets/intro.mp4")} type="video/mp4" />
        </video>

        {/* WebGL Interactive Particle canvas */}
        <CyberScene />

        {/* Dark overlay so text stays readable */}
        <div className="absolute inset-0 bg-black/60 dark:bg-black/70 -z-10" />
        {/* Subtle radial purple tint on top */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.18),transparent_70%)] -z-10" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
          <div className="lg:col-span-7 flex flex-col gap-6 text-left">
            <motion.div
              {...animProps(0)}
              className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 px-3 py-1.5 rounded-full text-xs font-semibold w-fit backdrop-blur-sm"
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>COMMUNITY-LED ENGINEERING ACCELERATOR</span>
            </motion.div>
 
            <motion.h1
              {...animProps(0.1)}
              className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-none text-white"
            >
              We Do Not Sell Certificates.<br />
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                We Build Engineers.
              </span>
            </motion.h1>
 
            <motion.p
              {...animProps(0.2)}
              className="text-lg text-slate-200 max-w-2xl leading-relaxed"
            >
              CoderCorps is an active software development community. Bridge the gap between
              academic theory and high-scale production systems through real code review,
              sprints, and CI/CD pipelines.
            </motion.p>
 
            <motion.div
              {...animProps(0.3)}
              className="flex flex-col sm:flex-row gap-4 mt-4"
            >
              <Link href="/signup">
                <Button size="lg" className="font-semibold gap-2 shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-500 text-white">
                  Join CoderCorps <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/labs">
                <Button size="lg" variant="outline" className="font-semibold border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
                  How Sprints Work
                </Button>
              </Link>
            </motion.div>
          </div>
 
          {/* Real logo + terminal card (with 3D Hover Tilt wrapper) */}
          <motion.div
            {...scaleAnimProps}
            className="lg:col-span-5 w-full flex flex-col items-center gap-6"
          >
            <TiltCard className="w-full flex flex-col items-center gap-6 p-4 rounded-3xl" scale={1.03}>
              {/* Big CoderCorps logo */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-3xl scale-150" />
                <Image
                  src={getAssetUrl("/assets/logo.gif")}
                  alt="CoderCorps"
                  width={200}
                  height={200}
                  className="relative z-10 drop-shadow-2xl"
                />
              </div>

              {/* Terminal card */}
              <div className="w-full bg-black/60 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs text-slate-400 font-mono">codercorps-cli --version</span>
                </div>
                <div className="font-mono text-sm space-y-2.5">
                  <p className="text-indigo-400">$ npx codercorps init</p>
                  <p className="text-emerald-400">✓ Connected to Supabase PostgreSQL cluster</p>
                  <p className="text-emerald-400">✓ Auth system initialized (JWT + HTTP-Only Refresh)</p>
                  <p className="text-emerald-400">✓ Active Sprint: 1 [Distributed API Engine]</p>
                  <p className="text-slate-500">// Pure capability audits. No shortcuts.</p>
                  <div className="h-px bg-white/10 my-1" />
                  <p className="text-indigo-400">$ git push origin sprint-1</p>
                  <p className="text-cyan-400">→ Running automated linting & unit tests...</p>
                  <p className="text-emerald-400">✓ Tests passed. PR #4 opened for Siddharth Roy</p>
                </div>
              </div>
            </TiltCard>
          </motion.div>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────── */}
      <section className="relative border-y border-border/40 bg-card/60 backdrop-blur-sm py-8 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "120+", label: "Active Engineers" },
            { value: "18", label: "Projects Deployed" },
            { value: "40+", label: "PRs Reviewed" },
            { value: "6", label: "Mentor Sessions/Mo" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={shouldReduceMotion ? { duration: 0 } : { delay: i * 0.1 }}
            >
              <p className="text-3xl font-extrabold text-primary">{stat.value}</p>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── SDLC SCROLL-DRIVEN ANIMATION SECTION ──────────────── */}
      <section ref={containerRef} className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Circuit board background image */}
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]">
          <Image src={getAssetUrl("/assets/circuit-blue.jpg")} alt="" fill className="object-cover" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 text-foreground">
              The Engineering Loop
            </h2>
            <p className="text-muted-foreground">
              Scroll to see how our engineering workspace mirrors the professional SDLC cycle, ensuring you deploy clean code reviewed by professionals.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="hidden lg:block lg:col-span-5 relative h-[500px]">
              <svg className="w-full h-full" viewBox="0 0 400 500" fill="none">
                <path
                  d="M200 40 C350 40 350 200 200 250 C50 300 50 460 200 460"
                  stroke="hsl(215 25% 17%)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  ref={pathRef}
                  d="M200 40 C350 40 350 200 200 250 C50 300 50 460 200 460"
                  stroke="url(#gradient-accent)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient-accent" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="lg:col-span-7 flex flex-col gap-6">
              {sdlcSteps.map((step, idx) => (
                <div
                  key={idx}
                  ref={(el) => { if (el) stepsRefs.current[idx] = el; }}
                  className="glass p-6 rounded-xl border border-border/40 flex items-start gap-4 transition-all duration-300"
                >
                  <div className="p-2.5 rounded-lg bg-border/40 border border-border/60 shrink-0">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE ACTIVITY FEED ─────────────────────────────────── */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 border-t border-border/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE ACTIVITY
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">Community in Motion</h2>
            <p className="text-muted-foreground text-sm">Real-time achievements from engineers in our community.</p>
          </div>

          <div className="space-y-3">
            {(activityEvents.length > 0 ? activityEvents : MOCK_ACTIVITY).slice(0, activityVisible).map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={shouldReduceMotion ? { duration: 0 } : { delay: i * 0.06, duration: 0.4 }}
                className="glass border border-border/40 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-primary/20 transition-colors"
              >
                <div className="p-2 rounded-lg bg-border/40 border border-border/60 shrink-0">
                  {getEventIcon(ev.event_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug">
                    {getEventLabel(ev)}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap shrink-0">
                  {timeAgo(ev.created_at)}
                </span>
              </motion.div>
            ))}
          </div>

          {activityVisible < (activityEvents.length > 0 ? activityEvents : MOCK_ACTIVITY).length && (
            <div className="text-center mt-8">
              <Button
                variant="outline"
                onClick={() => setActivityVisible(v => v + 8)}
                className="font-mono text-xs"
              >
                Show More Activity
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── COMMUNITY EVENTS SECTION with real photo ──────────── */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 border-t border-border/20 overflow-hidden">
        {/* Orange circuit texture background */}
        <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08]">
          <Image src={getAssetUrl("/assets/circuit-bg.jpg")} alt="" fill className="object-cover" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-left max-w-3xl mb-16 flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 px-3 py-1 rounded-full text-xs font-semibold w-fit">
              <Calendar className="h-3.5 w-3.5" />
              <span>COMMUNITY EVENT TIMELINE</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Hackathons & Technical Events
            </h2>
            <p className="text-muted-foreground">
              CoderCorps is a developer hub in Aligarh. Check out our upcoming and past workshops, seminars, and hackathons.
            </p>
          </div>

          {/* Real event photo inside Tilt Card */}
          <TiltCard className="mb-12 rounded-2xl border border-border/40 shadow-2xl w-full" scale={1.01}>
            <div className="relative group overflow-hidden w-full h-64 md:h-96">
              <Image
                src={getAssetUrl("/assets/event-rpa.png")}
                alt="CoderCorps RPA Workshop — Jan 2022"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white">
                <p className="text-xs font-mono text-indigo-300 uppercase tracking-wider">Featured Event</p>
                <h3 className="text-2xl font-bold mt-1">Robotic Process Automation Workshop</h3>
                <p className="text-sm text-slate-300 mt-1 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Day 1: Jan 29 · Day 2: Jan 30, 2022
                </p>
              </div>
            </div>
          </TiltCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {events.map((event, idx) => (
              <TiltCard key={idx} className="w-full flex" scale={1.02}>
                <div className="glass-premium p-6 rounded-2xl border border-border/40 hover:border-primary/30 transition-all duration-300 flex flex-col justify-between gap-4 group w-full h-full">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-indigo-500 uppercase tracking-widest font-semibold">{event.type}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{event.date}</span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{event.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{event.desc}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/30 pt-4 text-xs font-mono text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-indigo-400" /> {event.location}</span>
                    {event.partner && (
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[9px] border border-indigo-500/20">{event.partner}</span>
                    )}
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID with circuit hero bg ────────────────── */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Hero neon circuit background — very subtle */}
        <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08]">
          <Image src={getAssetUrl("/assets/hero-bg.jpg")} alt="" fill className="object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">What Makes CoderCorps Different</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">No shortcuts. No fake credits. Every certificate represents a real contribution, live deployment, and mentor-audited code review.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TiltCard scale={1.03}>
              <div className="glass-premium p-8 rounded-2xl border border-border/40 hover:border-indigo-500/30 transition-all duration-300 flex flex-col gap-4 group h-full">
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 w-fit">
                  <BookOpen className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Academy Learning</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Structured, rigorous modules covering Systems Programming, Distributed Architectures, and advanced AI systems. Learn the why, not just the how.
                </p>
              </div>
            </TiltCard>

            <TiltCard scale={1.03}>
              <div className="glass-premium p-8 rounded-2xl border border-border/40 hover:border-cyan-500/30 transition-all duration-300 flex flex-col gap-4 group h-full">
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 w-fit">
                  <Users className="h-7 w-7 text-cyan-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Real Mentorship</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Interact with staff engineers from high-scale tech firms. Get direct, line-by-line code review feedback on your PR submissions.
                </p>
              </div>
            </TiltCard>

            <TiltCard scale={1.03}>
              <div className="glass-premium p-8 rounded-2xl border border-border/40 hover:border-teal-500/30 transition-all duration-300 flex flex-col gap-4 group h-full">
                <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 w-fit">
                  <Award className="h-7 w-7 text-teal-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Verifiable Proof</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every certificate represents a real project contribution with verified code reviews and deliverables. No fake credits, no fluff.
                </p>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ─────────────────────────────────────────── */}
      <section className="relative py-20 px-4 overflow-hidden border-t border-border/20">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-primary/5 to-cyan-600/10" />
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <Image src={getAssetUrl("/assets/logo.gif")} alt="CoderCorps" width={80} height={80} className="drop-shadow-xl" />
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Ready to commit your first <span className="text-primary">real</span> line of code?
          </h2>
          <p className="text-muted-foreground text-lg">
            Join the community. Build something auditable. Earn credentials that actually mean something.
          </p>
          <div className="flex gap-4 flex-wrap justify-center">
            <Link href="/signup">
              <Button size="lg" className="font-semibold gap-2 shadow-lg shadow-indigo-500/20">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/academy">
              <Button size="lg" variant="outline" className="font-semibold gap-2">
                Browse Academy Tracks
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
