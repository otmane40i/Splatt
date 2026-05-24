"use client";

import { motion } from "framer-motion";

export function GradientOrbs() {
  const orbs = [
    "left-[4%] top-20 h-56 w-56 bg-splatt-pink/55",
    "right-[8%] top-32 h-72 w-72 bg-splatt-teal/45",
    "bottom-10 left-[42%] h-64 w-64 bg-splatt-orange/45"
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      {orbs.map((classes, index) => (
        <motion.div
          key={classes}
          className={`orb ${classes}`}
          animate={{ x: [0, 28, -12, 0], y: [0, -24, 18, 0], scale: [1, 1.08, 0.98, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: index * 0.8 }}
        />
      ))}
    </div>
  );
}
