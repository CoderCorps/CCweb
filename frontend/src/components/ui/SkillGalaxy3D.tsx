'use client';

import React, { useState } from 'react';
import Spline from '@splinetool/react-spline';
import { motion, AnimatePresence } from 'framer-motion';

// Mock data for the skill tree
const SKILL_NODES = [
  { id: 'foundations', title: 'Web Foundations', x: '10%', y: '50%', unlocked: true, description: 'HTML, CSS, and basic JS.' },
  { id: 'react', title: 'React Mastery', x: '30%', y: '30%', unlocked: true, description: 'Hooks, context, and state management.' },
  { id: 'nextjs', title: 'Next.js Architect', x: '50%', y: '50%', unlocked: false, description: 'App router, SSR, and API routes.' },
  { id: 'backend', title: 'FastAPI Backend', x: '70%', y: '20%', unlocked: false, description: 'Python, SQLAlchemy, and API design.' },
  { id: 'fullstack', title: 'Full-Stack Engineer', x: '90%', y: '50%', unlocked: false, description: 'End-to-end application development.' },
];

interface SkillGalaxy3DProps {
  unlockedSkills?: string[];
  skillPoints?: number;
}

export function SkillGalaxy3D({ unlockedSkills = ['foundations', 'react'], skillPoints = 250 }: SkillGalaxy3DProps) {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  // Merge backend data with our layout mapping
  const nodes = SKILL_NODES.map(node => ({
    ...node,
    unlocked: unlockedSkills.includes(node.id) || node.unlocked // Fallback to mock for demo
  }));

  return (
    <div className="relative w-full h-[600px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* 3D Background - Removed broken Spline scene to prevent buffer crash */}
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none"></div>

      {/* Skill Points Overlay */}
      <div className="absolute top-6 left-6 z-20">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-500/20 border border-indigo-500/50 backdrop-blur-md text-indigo-200 px-4 py-2 rounded-full font-mono text-sm shadow-[0_0_15px_rgba(99,102,241,0.3)]"
        >
          ⚡ {skillPoints} Skill Points
        </motion.div>
      </div>

      {/* Interactive Nodes */}
      <div className="absolute inset-0 z-10">
        {nodes.map((node, index) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.15, type: 'spring' }}
            className="absolute"
            style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
          >
            {/* Connection lines (simplified logic for demo) */}
            {index < nodes.length - 1 && (
              <svg className="absolute top-1/2 left-1/2 w-[200px] h-[200px] overflow-visible pointer-events-none -z-10" style={{ transform: 'translate(0, -50%)' }}>
                <line 
                  x1="0" y1="0" 
                  x2="100%" y2={nodes[index+1].y > node.y ? '50%' : '-50%'} 
                  stroke={node.unlocked && nodes[index+1].unlocked ? 'rgba(99, 102, 241, 0.6)' : 'rgba(71, 85, 105, 0.3)'} 
                  strokeWidth="2" 
                  strokeDasharray={node.unlocked && nodes[index+1].unlocked ? "0" : "5,5"}
                />
              </svg>
            )}

            <button
              onMouseEnter={() => setActiveNode(node.id)}
              onMouseLeave={() => setActiveNode(null)}
              className={`relative group w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                node.unlocked 
                  ? 'bg-indigo-500/20 border-2 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.5)] cursor-pointer hover:scale-110 hover:bg-indigo-500/40' 
                  : 'bg-slate-800/50 border-2 border-slate-700 cursor-not-allowed grayscale'
              }`}
            >
              {node.unlocked && (
                <div className="absolute inset-0 rounded-full bg-indigo-400 opacity-20 animate-ping"></div>
              )}
              <span className="text-lg">{node.unlocked ? '✨' : '🔒'}</span>
              
              {/* Tooltip */}
              <AnimatePresence>
                {activeNode === node.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute top-16 left-1/2 -translate-x-1/2 w-48 bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl z-30 pointer-events-none"
                  >
                    <h4 className="text-slate-200 font-bold text-sm mb-1">{node.title}</h4>
                    <p className="text-slate-400 text-xs">{node.description}</p>
                    {!node.unlocked && (
                      <div className="mt-2 text-[10px] text-amber-400/80 uppercase tracking-wider font-semibold">
                        Requires preceding skills
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
