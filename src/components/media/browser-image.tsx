"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { heicUrlToJpegObjectUrl, urlLooksHeic } from "@/lib/media/heic";
import { heicDisplaySupportsNativeImage } from "@/lib/media/heic-native";

type Props = {
  src: string;
  alt?: string;
  className?: string;
} & React.ImgHTMLAttributes<HTMLImageElement>;

/**
 * HEIC/HEIF: WebKit (iOS, Safari) often decodes in &lt;img&gt; natively; others use
 * heic2any. Cross-origin Supabase fetches go through a same-origin API route when
 * standard CORS + fetch is unreliable.
 */
export function BrowserImage({ src, alt = "", className, ...rest }: Props) {
  const objectRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string | null>(() =>
    src && !urlLooksHeic(src) ? src : null,
  );
  const [failed, setFailed] = useState(false);
  const [nativeHeicFailed, setNativeHeicFailed] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    setNativeHeicFailed(false);
  }, [src]);

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

    if (heicDisplaySupportsNativeImage() && !nativeHeicFailed) {
      clearBlob();
      setDisplaySrc(null);
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
  }, [src, nativeHeicFailed]);

  const useNativeHeic =
    ready &&
    src &&
    urlLooksHeic(src) &&
    heicDisplaySupportsNativeImage() &&
    !nativeHeicFailed;

  if (failed) {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-1 bg-gray-100 px-2 text-center text-[10px] text-gray-500",
          className,
        )}
      >
        <span>Could not decode HEIC in this browser.</span>
        {src ? (
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-gray-700 underline decoration-gray-300 underline-offset-2"
          >
            Open original
          </a>
        ) : null}
      </div>
    );
  }

  if (useNativeHeic) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setNativeHeicFailed(true)}
        {...rest}
      />
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
