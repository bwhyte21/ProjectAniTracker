import { useState } from "react";
import placeholderCover from "@/assets/cover-placeholder.svg";

interface CoverImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

export function CoverImage({ src, alt, className }: CoverImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPlaceholder = !src || failedSrc === src;

  return (
    <img
      src={showPlaceholder ? placeholderCover : src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (src) {
          setFailedSrc(src);
        }
      }}
    />
  );
}
