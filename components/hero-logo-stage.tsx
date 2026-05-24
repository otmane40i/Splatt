"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function HeroLogoStage() {
  return (
    <motion.div
      className="relative mx-auto aspect-[43/24] w-full max-w-3xl"
      initial={{ opacity: 0, y: 36, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.75, delay: 0.2, ease: "easeOut" }}
    >
      <motion.div
        className="absolute -inset-8 rounded-full bg-splatt-pink/25 blur-3xl"
        animate={{ x: [0, 24, -18, 0], y: [0, -22, 18, 0], scale: [1, 1.08, 0.95, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-x-10 bottom-2 h-20 rounded-full bg-splatt-orange/30 blur-2xl"
        animate={{ scaleX: [1, 1.12, 0.96, 1], opacity: [0.45, 0.75, 0.5, 0.45] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-glow"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/brand/splatt-logo.jpeg"
          alt="SPLATT. paint-pour bear logo"
          fill
          sizes="(min-width: 1024px) 50vw, 94vw"
          priority
          className="object-cover"
        />
        <motion.div
          className="absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-18deg] bg-white/20 blur-sm"
          animate={{ left: ["-50%", "130%"] }}
          transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 3.2, ease: "easeInOut" }}
        />
      </motion.div>
      <div className="pointer-events-none absolute -bottom-5 left-1/2 h-8 w-2/3 -translate-x-1/2 rounded-full bg-black/80 blur-xl" />
    </motion.div>
  );
}
