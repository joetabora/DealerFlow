"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { heicUrlToJpegObjectUrl, urlLooksHeic } from "@/lib/media/heic";

type Props = {
  src: string;
  alt?: string;
  className?: string;
} & React.ImgHTMLAttributes<HTMLImageElement>;

/**
 * Renders HEIC/HEIF from a URL (e.g. Supabase) as JPEG in memory — most
 * browsers can’t display HEIC in &lt;img&gt; natively.
 */
export function BrowserImage({ src, alt = "", className, ...rest }: Props) {
  const objectRef = useRef<string | null>(null);
  const [displaySrc, setDisplaySrc] = useState<string | null>(() =>
    src && !urlLooksHeic(src) ? src : null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    function clearBlob() {
      if (objectRef.current) {
        URL.revokeObjectURL(objectRef.current);
        objectRef.current = null;
      }
    }

    if (!src) {
      clearBlob();
      setDisplaySrc(null);
      return;
    }
    if (!urlLooksHeic(src)) {
      clearBlob();
      setDisplaySrc(src);
      setFailed(false);
      return;
    }

    let cancelled = false;
    clearBlob();
    setDisplaySrc(null);
    setFailed(false);

    void (async () => {
      try {
        const o = await heicUrlToJpegObjectUrl(src);
        if (cancelled) {
          URL.revokeObjectURL(o);
          return;
        }
        objectRef.current = o;
        setDisplaySrc(o);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      clearBlob();
    };
  }, [src]);

  if (failed) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-gray-100 text-[10px] text-gray-500",
          className,
        )}
      >
        Can’t show HEIC
      </div>
    );
  }

  if (displaySrc == null) {
    return (
      <div
        className={cn("animate-pulse bg-gray-100", className)}
        aria-hidden
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={displaySrc} alt={alt} className={className} {...rest} />;
}
