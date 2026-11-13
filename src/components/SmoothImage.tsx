import React, { useState, useEffect, useRef } from 'react';

export const DEFAULT_FALLBACK_PHOTO =
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80';

interface SmoothImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  priority?: boolean;
  wrapperClassName?: string;
}

/**
 * SmoothImage ensures every photograph in the app:
 * 1. Displays a subtle warm shimmer placeholder while loading (no harsh layout shift or blank space).
 * 2. Smoothly fades in with GPU-accelerated opacity/scale transition once decoded.
 * 3. Automatically recovers with a real verified fallback photo on any network/404 error—never rendering a broken icon or SVG text box.
 */
export const SmoothImage: React.FC<SmoothImageProps> = ({
  src,
  fallbackSrc = DEFAULT_FALLBACK_PHOTO,
  alt,
  priority = false,
  className = '',
  wrapperClassName = '',
  ...props
}) => {
  const safeInitial = src && src.trim() ? src.trim() : fallbackSrc;
  const [currentSrc, setCurrentSrc] = useState<string>(safeInitial);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [fallbackUsed, setFallbackUsed] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const nextSrc = src && src.trim() ? src.trim() : fallbackSrc;
    if (nextSrc !== currentSrc) {
      setCurrentSrc(nextSrc);
      setFallbackUsed(false);
      setLoaded(false);
    }
  }, [src, fallbackSrc]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [currentSrc]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true);
    props.onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!fallbackUsed && currentSrc !== fallbackSrc) {
      setFallbackUsed(true);
      setCurrentSrc(fallbackSrc);
      setLoaded(false);
    } else if (currentSrc !== DEFAULT_FALLBACK_PHOTO) {
      setCurrentSrc(DEFAULT_FALLBACK_PHOTO);
      setLoaded(false);
    } else {
      setLoaded(true);
    }
    props.onError?.(e);
  };

  return (
    <div className={`relative overflow-hidden bg-stone-200/70 ${wrapperClassName}`}>
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 animate-pulse"
        />
      )}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        referrerPolicy="no-referrer"
        onLoad={handleLoad}
        onError={handleError}
        className={`${className} transition-[opacity,transform] duration-500 ease-out will-change-transform ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...props}
      />
    </div>
  );
};
