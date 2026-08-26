"use client";

import { useReducedMotion, type MotionProps, type Variants } from "framer-motion";

const modalEase = [0.22, 1, 0.36, 1] as const;

const backdropVariants: Variants = {
  hidden: { scaleX: 0, scaleY: 0.003 },
  visible: {
    scaleX: [0, 1, 1],
    scaleY: [0.003, 0.003, 1],
    transition: { duration: 1.55, times: [0, 0.4, 1], ease: modalEase },
  },
  closed: {
    scaleX: [1, 1, 0],
    scaleY: [1, 0.003, 0.003],
    transition: { duration: 1.35, times: [0, 0.6, 1], delay: 0.32, ease: modalEase },
  },
};

const dialogVariants: Variants = {
  hidden: { opacity: 0, scale: 0.78 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.48, delay: 0.92, ease: modalEase },
  },
  closed: {
    opacity: 0,
    scale: 0.82,
    transition: { duration: 0.38, ease: modalEase },
  },
};

interface ParigoModalMotion {
  backdrop: MotionProps;
  dialog: MotionProps;
}

export function useParigoModalMotion(): ParigoModalMotion {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    const immediate: MotionProps = {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0 },
    };
    return { backdrop: immediate, dialog: immediate };
  }

  return {
    backdrop: {
      variants: backdropVariants,
      initial: "hidden",
      animate: "visible",
      exit: "closed",
      style: { transformOrigin: "center", willChange: "transform" },
    },
    dialog: {
      variants: dialogVariants,
      initial: "hidden",
      animate: "visible",
      exit: "closed",
      style: { transformOrigin: "center", willChange: "transform, opacity" },
    },
  };
}
