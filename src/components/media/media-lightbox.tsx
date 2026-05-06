"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { BrowserImage } from "@/components/media/browser-image";
import { cn } from "@/lib/cn";

type LightboxProps = {
  open: boolean;
  onClose: () => void;
  type: "image" | "video";
  src: string;
  alt?: string;
};

/**
 * Full-screen media viewer: backdrop + Escape to close, scroll lock.
 */
function MediaLightboxView({
  open,
  onClose,
  type,
  src,
  alt = "",
}: LightboxProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      if (typeof document !== "undefined") {
        document.body.style.removeProperty("overflow");
      }
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <span id={titleId} className="sr-only">
        Enlarged {type === "image" ? "image" : "video"}
      </span>
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        className="relative z-10 flex max-h-full max-w-full flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex w-full min-w-0 max-w-[min(100vw-1.5rem,1200px)] justify-end">
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/20 bg-zinc-900/90 px-2.5 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
        <div
          className="relative w-full min-w-0 max-w-[min(100vw-1.5rem,1200px)] overflow-hidden rounded-lg bg-zinc-900/40 shadow-2xl"
          style={{ height: "min(85dvh, 900px)" }}
        >
          {type === "image" ? (
            <BrowserImage
              src={src}
              alt={alt}
              className="absolute inset-0 box-border h-full w-full object-contain [image-orientation:from-image]"
            />
          ) : (
            <video
              src={src}
              controls
              playsInline
              className="absolute inset-0 box-border h-full w-full object-contain"
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

type ExpandableProps = {
  type: "image" | "video";
  src: string;
  alt?: string;
  className?: string;
  /** Applied to the clickable image trigger (type image) or outer wrapper (video) */
  triggerClassName?: string;
  children: React.ReactNode;
};

/**
 * Thumbnail in `children` opens a full-screen lightbox. For video, the thumbnail
 * stays interactive; use the “Enlarge” control to open (avoids clashing with controls).
 */
export function ExpandableMedia({
  type,
  src,
  alt = "",
  className,
  triggerClassName,
  children,
}: ExpandableProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const skipPathClose = useRef(true);

  useEffect(() => {
    if (skipPathClose.current) {
      skipPathClose.current = false;
      return;
    }
    setOpen(false);
  }, [pathname]);

  if (type === "image") {
    return (
      <div className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "block w-full cursor-zoom-in text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2",
            triggerClassName,
          )}
          aria-label="View larger"
        >
          {children}
        </button>
        <MediaLightboxView
          open={open}
          onClose={() => setOpen(false)}
          type="image"
          src={src}
          alt={alt}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative", className, triggerClassName)}>
      {children}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex justify-start p-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto rounded-md bg-zinc-900/75 px-2.5 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-sm transition hover:bg-zinc-900/90"
        >
          Enlarge
        </button>
      </div>
      <MediaLightboxView
        open={open}
        onClose={() => setOpen(false)}
        type="video"
        src={src}
        alt={alt}
      />
    </div>
  );
}
