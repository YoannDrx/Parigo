"use client";

import { motion } from "framer-motion";
import { LoginForm } from "@/components/features/AuthModal";
import { Card } from "@/components/ui";

export default function LoginPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
      <Card padding="lg" className="border-[var(--line)] bg-[var(--surface)] shadow-none">
        <LoginForm />
      </Card>
    </motion.div>
  );
}
