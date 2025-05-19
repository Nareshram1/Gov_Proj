"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CardWithForm from "./login";

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Show splash screen for 3 seconds then fade out
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            className="fixed inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-900 z-50"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
          >
            <motion.h1
              className="text-5xl font-extrabold mb-4 tracking-tight"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Paniyal
            </motion.h1>

            <motion.p
              className="text-lg text-center max-w-xs"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              Tracking the footprints of service — paving the path with purpose.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {!showSplash && <CardWithForm />}
    </>
  );
}
