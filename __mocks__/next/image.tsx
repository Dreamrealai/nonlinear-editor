import React from 'react';

/**
 * Mock Next.js Image component for testing
 */
export default function Image({
  src,
  alt,
  width,
  height,
  ...props
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  [key: string]: any;
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={width} height={height} {...props} />;
}
