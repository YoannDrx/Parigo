import { cn } from "@/lib/utils";
import styles from "./ParigoLogo.module.css";

interface ParigoLogoProps {
  className?: string;
}

export function ParigoLogo({ className }: ParigoLogoProps) {
  return (
    <span className={cn("parigo-logo", styles.root, className)} aria-hidden="true">
      <svg viewBox="0 0 995.86 284.69" focusable="false" role="presentation">
        <path className="parigo-logo__corner parigo-logo__corner--top" d="m995.86 75.17v161.92H973V75.17c0-28.84-23.47-52.31-52.31-52.31H760.87V0h159.82c41.45 0 75.17 33.72 75.17 75.17Z" />
        <rect className="parigo-logo__extension parigo-logo__extension--top" x="760.87" y="0" width="159.82" height="22.86" />
        <path className={cn("parigo-logo__word", styles.word)} d="M127.66 165.58h-25.09v67.96H60.82V50.33h66.84c35.75 0 62.62 18.43 62.62 56.41s-26.87 58.85-62.62 58.85Zm18.65-57.52c0-18.87-15.55-24.43-31.98-24.43h-11.77v48.64h11.77c16.43 0 31.98-5.55 31.98-24.21Zm130.23-57.74 73.95 183.21h-44.86l-13.55-36.64h-69.73l-13.55 36.64h-44.86L237.9 50.33h38.64Zm1.33 109.93-20.65-53.3-20.65 53.3h41.31Zm170.77 1.78 59.74 71.51H455.3l-52.63-67.96h-3.33v67.96h-41.75V50.33h66.85c35.76 0 62.62 18.43 62.62 56.41 0 28.65-15.32 47.75-38.42 55.29Zm-5.55-53.97c0-18.87-15.55-24.43-31.98-24.43h-11.77v48.64h11.77c16.43 0 31.98-5.55 31.98-24.21Zm75.7 125.47h41.75V50.33h-41.75v183.21Z" />
        <path className="parigo-logo__corner parigo-logo__corner--bottom" d="M75.17 261.83h134.98v22.86H75.17C33.72 284.69 0 250.98 0 209.53V50.33h22.91l-.04 159.2c0 28.84 23.46 52.3 52.3 52.3Z" />
        <rect className="parigo-logo__extension parigo-logo__extension--bottom" x="75.17" y="261.83" width="134.98" height="22.86" />
        <path className="parigo-logo__go" d="M667.04 163.37h42.2v.89c0 22.43-20.88 34.42-39.75 34.42-25.76 0-46.64-25.54-46.64-56.63s20.88-57.29 46.64-57.29c16.21 0 30.2 6.44 40.86 23.54l27.32-29.98c-15.99-19.32-38.42-31.31-70.62-31.31-51.52 0-89.27 42.41-89.27 95.05s39.97 95.05 89.27 95.05c53.52 0 84.61-40.2 84.61-73.73v-32.2h-84.61v32.2Zm278.6-21.32c0 53.52-41.75 95.05-92.38 95.05s-92.38-41.53-92.38-95.05S802.63 47 853.26 47s92.38 41.53 92.38 95.05Zm-45.08 0c0-27.32-15.1-54.85-47.3-54.85s-47.3 27.54-47.3 54.85 15.1 54.85 47.3 54.85 47.3-27.54 47.3-54.85Z" />
      </svg>
    </span>
  );
}
