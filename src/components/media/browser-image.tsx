"use client";

import type { ImgHTMLAttributes } from "react";

type Props = {
  src: string;
  alt?: string;
} & ImgHTMLAttributes<HTMLImageElement>;

/** Remote image from storage; use JPEG/PNG/WebP (HEIC not supported in-app). */
export function BrowserImage({ src, alt = "", className, ...rest }: Props) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img src={src} alt={alt} className={className} {...rest} />
  );
}
