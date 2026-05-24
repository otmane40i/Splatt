import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  imageClassName,
  priority = false
}: {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn("relative block overflow-hidden", className)}>
      <Image
        src="/brand/splatt-logo.jpeg"
        alt="SPLATT."
        fill
        sizes="220px"
        priority={priority}
        className={cn("object-cover", imageClassName)}
      />
    </span>
  );
}
