"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export function BrandSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const alreadySeen = window.sessionStorage.getItem("splatt-splash-seen");
    if (alreadySeen) return;

    setVisible(true);
    window.sessionStorage.setItem("splatt-splash-seen", "true");
    const timer = window.setTimeout(() => setVisible(false), 1900);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center overflow-hidden bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
        >
          <motion.div
            className="absolute h-72 w-72 rounded-full bg-splatt-pink/45 blur-3xl"
            animate={{ x: [-90, 90, -20], y: [40, -40, 20], scale: [1, 1.25, 1] }}
            transition={{ duration: 1.7, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute h-80 w-80 rounded-full bg-splatt-teal/35 blur-3xl"
            animate={{ x: [100, -70, 20], y: [-70, 60, 0], scale: [0.9, 1.2, 1] }}
            transition={{ duration: 1.7, ease: "easeInOut" }}
          />
          <motion.div
            className="relative aspect-[43/24] w-[min(88vw,860px)]"
            initial={{ opacity: 0, scale: 0.72, rotate: -3, y: 40 }}
            animate={{ opacity: 1, scale: [0.72, 1.05, 1], rotate: [ -3, 2, 0], y: 0 }}
            transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image src="/brand/splatt-logo.jpeg" alt="SPLATT." fill priority className="object-contain drop-shadow-2xl" />
          </motion.div>
          <motion.div
            className="absolute bottom-12 h-1 w-48 rounded-full bg-gradient-to-r from-splatt-pink via-splatt-teal to-splatt-orange"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.25, delay: 0.25, ease: "easeOut" }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
