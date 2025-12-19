"use client";

import { useState, useCallback } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "./button";
import ImageLightbox from "./ImageLightbox";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api-client";

interface ProductImageGalleryProps {
  images?: string[];
  productId?: string; // Used to fetch full gallery on demand
  totalImages?: number; // Total image count from API (when primaryOnly is used)
  alt?: string;
  size?: "sm" | "md" | "lg";
  maxVisible?: number;
  showCount?: boolean;
  onImageClick?: (index: number) => void;
}

/**
 * ProductImageGallery - Displays a thumbnail gallery of product images
 * Supports lazy loading: shows primary image initially, fetches full gallery on click
 */
export default function ProductImageGallery({
  images = [],
  productId,
  totalImages,
  alt = "Product",
  size = "md",
  maxVisible = 4,
  showCount = true,
  onImageClick,
}: ProductImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [fullGalleryImages, setFullGalleryImages] = useState<string[] | null>(null);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);

  // Normalize images array and validate URLs
  const imageArray = Array.isArray(images) 
    ? images.filter(img => img && typeof img === 'string' && img.trim() !== '') 
    : [];

  // Use full gallery images if loaded, otherwise use the initial images
  const displayImages = fullGalleryImages || imageArray;
  const displayCount = totalImages || imageArray.length;

  const handleImageError = (index: number) => {
    console.warn(`Failed to load image at index ${index}:`, displayImages[index]);
    setFailedImages(prev => new Set([...prev, index]));
  };

  // Fetch full gallery from API when user clicks to open lightbox
  const fetchFullGallery = useCallback(async () => {
    if (!productId || fullGalleryImages) return displayImages;
    
    setIsLoadingGallery(true);
    try {
      const response = await apiClient.get(`/products/${productId}/images`);
      const galleryImages = response.data?.data?.images || [];
      setFullGalleryImages(galleryImages);
      return galleryImages;
    } catch (error) {
      console.error('Failed to fetch product gallery:', error);
      return displayImages;
    } finally {
      setIsLoadingGallery(false);
    }
  }, [productId, fullGalleryImages, displayImages]);

  const handleOpenLightbox = async (index: number) => {
    if (onImageClick) {
      onImageClick(index);
      return;
    }

    // If we have a productId and haven't loaded full gallery yet, fetch it
    if (productId && !fullGalleryImages && displayCount > 1) {
      await fetchFullGallery();
    }
    
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (imageArray.length === 0) {
    // No images - show placeholder
    const sizeClasses = {
      sm: "h-12 w-12",
      md: "h-16 w-16",
      lg: "h-32 w-32",
    };
    return (
      <div className={cn(sizeClasses[size], "flex items-center justify-center rounded border border-border bg-muted")}>
        <span className="text-xs text-muted-foreground">No Image</span>
      </div>
    );
  }

  if (imageArray.length === 1) {
    // Single image - show it with optional count badge (may have more images to load)
    const sizeClasses = {
      sm: "h-12 w-12",
      md: "h-16 w-16",
      lg: "h-32 w-32",
    };
    const imageFailed = failedImages.has(0);
    
    return (
      <div className="relative">
        <div
          className={cn(
            sizeClasses[size],
            "overflow-hidden rounded border border-border bg-muted cursor-pointer hover:opacity-90 transition-opacity relative"
          )}
          onClick={() => {
            if (!imageFailed) {
              handleOpenLightbox(0);
            }
          }}
        >
          {isLoadingGallery && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            </div>
          )}
          {!imageFailed ? (
            <img
              src={imageArray[0]}
              alt={alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              onError={() => handleImageError(0)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
            </div>
          )}
        </div>
        {showCount && displayCount > 1 && (
          <div className="absolute -top-1 -right-1 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded">
            {displayCount}
          </div>
        )}
      </div>
    );
  }

  // Multiple images - show thumbnail grid
  const visibleImages = imageArray.slice(0, maxVisible);
  const remainingCount = imageArray.length - maxVisible;

  const sizeClasses = {
    sm: {
      container: "gap-1",
      thumbnail: "h-12 w-12",
      badge: "text-[8px] px-1 py-0.5",
    },
    md: {
      container: "gap-1.5",
      thumbnail: "h-16 w-16",
      badge: "text-[10px] px-1.5 py-0.5",
    },
    lg: {
      container: "gap-2",
      thumbnail: "h-32 w-32",
      badge: "text-xs px-2 py-1",
    },
  };

  const classes = sizeClasses[size];

  return (
    <>
      <div className={cn("flex flex-wrap", classes.container)}>
        {visibleImages.map((imageUrl, index) => {
          const imageFailed = failedImages.has(index);
          return (
            <div key={index} className="relative group">
              <div
                className={cn(
                  classes.thumbnail,
                  "overflow-hidden rounded border border-border bg-muted cursor-pointer hover:opacity-90 transition-opacity relative"
                )}
                onClick={() => {
                  if (!imageFailed) {
                    handleOpenLightbox(index);
                  }
                }}
              >
                {isLoadingGallery && index === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </div>
                )}
                {!imageFailed ? (
                  <img
                    src={imageUrl}
                    alt={`${alt} ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                    onError={() => handleImageError(index)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
                {index === 0 && showCount && !imageFailed && (
                  <div className={cn("absolute top-0 right-0 bg-foreground/80 text-background", classes.badge, "rounded-bl")}>
                    {displayCount}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {/* {remainingCount > 0 && (
          <div
            className={cn(
              classes.thumbnail,
              "flex items-center justify-center rounded border-2 border-dashed border-border bg-muted cursor-pointer hover:bg-muted/80 transition-colors text-xs text-muted-foreground font-medium"
            )}
            onClick={() => {
              if (onImageClick) {
                onImageClick(maxVisible);
              } else {
                setLightboxIndex(maxVisible);
                setLightboxOpen(true);
              }
            }}
          >
            +{remainingCount}
          </div>
        )} */}
      </div>
      {!onImageClick && (
        <ImageLightbox
          images={fullGalleryImages || imageArray}
          initialIndex={lightboxIndex}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

