"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./dialog";
import { Button } from "./button";

/**
 * ImageGallery Component
 * A reusable image gallery component that displays images in a grid,
 * allows viewing in a lightbox modal, and supports adding/removing images.
 * 
 * @param {Object} props
 * @param {Array} props.images - Array of image objects: { id: string, url: string, isExisting?: boolean }
 * @param {Function} props.onRemove - Callback when image is removed: (imageId: string) => void
 * @param {Function} props.onAdd - Callback when add button is clicked: () => void
 * @param {number} props.maxImages - Maximum number of images allowed (default: 20)
 * @param {boolean} props.showAddButton - Whether to show add button (default: true)
 * @param {string} props.emptyMessage - Message to show when no images (default: "No images")
 * @param {string} props.title - Title for the gallery modal (default: "Image Gallery")
 * @param {boolean} props.autoOpen - Whether to automatically open the modal on mount (default: false)
 * @param {Function} props.onClose - Callback when modal is closed: () => void
 */
export default function ImageGallery({
  images = [],
  onRemove,
  onAdd,
  maxImages = 20,
  showAddButton = true,
  emptyMessage = "No images",
  title = "Image Gallery",
  autoOpen = false,
  onClose,
}) {
  const [isModalOpen, setIsModalOpen] = useState(autoOpen);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = useRef(null);
  
  // Auto-open modal when autoOpen prop is true
  useEffect(() => {
    if (autoOpen && validImages.length > 0 && !isModalOpen) {
      setIsModalOpen(true);
      setSelectedImageIndex(0);
    }
  }, [autoOpen, validImages.length, isModalOpen]);

  // Filter out any null/undefined images
  const validImages = images.filter(img => img && img.url);

  const handleImageClick = (index) => {
    setSelectedImageIndex(index);
    setIsModalOpen(true);
  };

  const handlePrevious = () => {
    setSelectedImageIndex((prev) => 
      prev > 0 ? prev - 1 : validImages.length - 1
    );
  };

  const handleNext = () => {
    setSelectedImageIndex((prev) => 
      prev < validImages.length - 1 ? prev + 1 : 0
    );
  };

  const handleKeyDown = (e) => {
    if (!isModalOpen) return;
    
    if (e.key === "ArrowLeft") {
      handlePrevious();
    } else if (e.key === "ArrowRight") {
      handleNext();
    } else if (e.key === "Escape") {
      setIsModalOpen(false);
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, validImages.length]);

  const selectedImage = validImages[selectedImageIndex];

  if (validImages.length === 0 && !showAddButton) {
    return (
      <div className="text-xs text-muted-foreground italic">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {!autoOpen && (
        <div className="space-y-2">
          {/* Thumbnail Grid */}
          {validImages.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {validImages.map((image, index) => (
              <div
                key={image.id || index}
                className="relative group cursor-pointer"
                onClick={() => handleImageClick(index)}
              >
                <div className="h-12 w-12 overflow-hidden rounded border border-border bg-muted flex items-center justify-center hover:border-primary transition-colors">
                  <img
                    src={image.url}
                    alt={`Image ${index + 1}`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                      const parent = e.target.parentElement;
                      if (parent && !parent.querySelector(".error-indicator")) {
                        const errorDiv = document.createElement("div");
                        errorDiv.className = "error-indicator text-[8px] text-destructive p-1 text-center";
                        errorDiv.textContent = "Error";
                        parent.appendChild(errorDiv);
                      }
                    }}
                  />
                </div>
                {/* Remove button on hover */}
                {onRemove && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(image.id || index);
                    }}
                    className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {validImages.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleImageClick(0)}
              className="text-xs"
            >
              View All ({validImages.length})
            </Button>
          )}
          {showAddButton && onAdd && validImages.length < maxImages && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAdd}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              {validImages.length > 0 ? "Add More" : "Add Images"}
            </Button>
          )}
          {validImages.length >= maxImages && (
            <span className="text-xs text-muted-foreground">
              Maximum {maxImages} images reached
            </span>
          )}
        </div>
      </div>
      )}

      {/* Lightbox Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) {
          setIsFullscreen(false);
          if (onClose) {
            onClose();
          }
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between">
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {validImages.length} image{validImages.length !== 1 ? "s" : ""}
              </DialogDescription>
            </div>
            {showAddButton && onAdd && validImages.length < maxImages && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAdd}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Images
              </Button>
            )}
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4 p-6 overflow-y-auto flex-1">
              {/* Main Image Viewer */}
              <div className="relative bg-muted rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                <img
                  src={selectedImage.url}
                  alt={`Image ${selectedImageIndex + 1} of ${validImages.length}`}
                  className={`max-w-full max-h-[60vh] object-contain ${
                    isFullscreen ? "cursor-zoom-out" : "cursor-zoom-in"
                  }`}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  onError={(e) => {
                    e.target.style.display = "none";
                    const parent = e.target.parentElement;
                    if (parent) {
                      const errorDiv = document.createElement("div");
                      errorDiv.className = "text-destructive text-center p-4";
                      errorDiv.textContent = "Failed to load image";
                      parent.appendChild(errorDiv);
                    }
                  }}
                />

                {/* Navigation Arrows */}
                {validImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevious}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                  {selectedImageIndex + 1} / {validImages.length}
                </div>

                {/* Remove Button */}
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => {
                      onRemove(selectedImage.id || selectedImageIndex);
                      if (validImages.length === 1) {
                        setIsModalOpen(false);
                      } else if (selectedImageIndex >= validImages.length - 1) {
                        setSelectedImageIndex(selectedImageIndex - 1);
                      }
                    }}
                    className="absolute top-2 right-2 bg-destructive hover:bg-destructive/90 text-white rounded-full p-2 transition-colors"
                    title="Remove image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Thumbnail Strip */}
              {validImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {validImages.map((image, index) => (
                    <div
                      key={image.id || index}
                      className={`flex-shrink-0 cursor-pointer rounded border-2 transition-all ${
                        index === selectedImageIndex
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <img
                        src={image.url}
                        alt={`Thumbnail ${index + 1}`}
                        className="h-16 w-16 object-cover rounded"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Keyboard Shortcuts Hint */}
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                Use arrow keys to navigate • Click image to zoom • Press ESC to close
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen Overlay */}
      {isFullscreen && selectedImage && (
        <div
          className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <img
            src={selectedImage.url}
            alt={`Fullscreen image ${selectedImageIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
            aria-label="Exit fullscreen"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  );
}

