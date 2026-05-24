import { cn } from "@/lib/utils";

export function LogoText({ className }: { className?: string }) {
  const letters = [
    ["S", "text-splatt-pink"],
    ["P", "text-splatt-teal"],
    ["L", "text-splatt-orange"],
    ["A", "text-splatt-pink"],
    ["T", "text-splatt-teal"],
    ["T", "text-splatt-orange"],
    [".", "text-splatt-pink"]
  ] as const;

  return (
    <span
      className={cn(
        "inline-flex items-baseline font-space text-3xl font-black leading-none tracking-normal drop-shadow-[0_0_18px_rgba(255,46,147,0.35)]",
        className
      )}
      aria-label="SPLATT."
    >
      {letters.map(([letter, color], index) => (
        <span key={`${letter}-${index}`} className={color}>
          {letter}
        </span>
      ))}
    </span>
  );
}
