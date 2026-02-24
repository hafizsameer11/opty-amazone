'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Button from '@/components/ui/Button';
import apiClient from '@/lib/api-client';

interface ImageItem {
  id: string;
  url: string;
  file?: File;
  isFeatured: boolean;
}

interface ProductImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

// Helper function to convert relative URLs to absolute URLs
const getFullImageUrl = (url: string): string => {
  if (!url) return url;
  // If it's already a full URL (http/https) or data URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // If it's a relative path starting with /storage, convert to full URL
  if (url.startsWith('/storage')) {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const backendBaseUrl = apiBaseUrl.replace('/api', '');
    return `${backendBaseUrl}${url}`;
  }
  return url;
};

export default function ProductImageUpload({ images, onChange, maxImages = 10 }: ProductImageUploadProps) {
  const [imageItems, setImageItems] = useState<ImageItem[]>(() => {
    return images.map((url, index) => ({
      id: `existing-${index}`,
      url: getFullImageUrl(url),
      isFeatured: index === 0,
    }));
  });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const isInternalUpdateRef = useRef(false);

  // Sync with external images prop changes (only HTTP/HTTPS URLs from backend)
  // Preserve local data URLs (preview images) - don't overwrite them
  useEffect(() => {
    // Skip sync if we're in the middle of an internal update
    if (isInternalUpdateRef.current) {
      return;
    }
    
    // Get current data URLs (preview images) that should be preserved
    const dataUrlItems = imageItems.filter(item => item.url.startsWith('data:'));
    
    // Only sync HTTP/HTTPS URLs from props (including relative /storage URLs)
    const httpUrls = images.filter(url => url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/storage')));
    
    // Get current HTTP URLs from state (excluding data URLs)
    const currentHttpUrls = imageItems
      .filter(item => !item.url.startsWith('data:'))
      .map(item => item.url);
    
    // Convert URLs to full URLs for comparison
    const normalizedHttpUrls = httpUrls.map(url => getFullImageUrl(url));
    const normalizedCurrentUrls = currentHttpUrls.map(url => getFullImageUrl(url));
    
    // Only update if HTTP URLs from props actually changed (sorted comparison to ignore order)
    const httpUrlsChanged = JSON.stringify([...normalizedCurrentUrls].sort()) !== JSON.stringify([...normalizedHttpUrls].sort());
    
    if (httpUrlsChanged) {
      const httpUrlItems = httpUrls.map((url, index) => ({
        id: `existing-${index}-${url}`,
        url: getFullImageUrl(url),
        isFeatured: index === 0 && dataUrlItems.length === 0, // Only first HTTP URL is featured if no data URLs
      }));
      
      // Merge: data URLs first (for preview), then HTTP URLs
      const mergedItems = [...dataUrlItems, ...httpUrlItems];
      
      // Preserve featured status if possible
      const existingFeatured = imageItems.find(item => item.isFeatured);
      if (existingFeatured) {
        const featuredInMerged = mergedItems.find(item => 
          item.url === existingFeatured.url || item.id === existingFeatured.id
        );
        if (featuredInMerged) {
          mergedItems.forEach(item => item.isFeatured = (item.id === featuredInMerged.id));
        } else if (mergedItems.length > 0) {
          // If featured item was removed, make first item featured
          mergedItems[0].isFeatured = true;
        }
      }
      
      setImageItems(mergedItems);
    }
  }, [images]); // Only depend on images prop, not imageItems to avoid loops

  const updateImages = useCallback((items: ImageItem[]) => {
    isInternalUpdateRef.current = true;
    setImageItems(items);
    // Extract URLs in order, with featured image first
    const sortedItems = [...items].sort((a, b) => {
      if (a.isFeatured) return -1;
      if (b.isFeatured) return 1;
      return 0;
    });
    // Filter out data URLs (base64) - only send HTTP/HTTPS URLs to parent
    // But keep data URLs in local state for preview
    const urls = sortedItems
      .map(item => item.url)
      .filter(url => url && (url.startsWith('http://') || url.startsWith('https://')));
    onChange(urls);
    // Reset flag after a short delay to allow state to update
    setTimeout(() => {
      isInternalUpdateRef.current = false;
    }, 100);
  }, [onChange]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} exceeds 5MB limit`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    if (imageItems.length + validFiles.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);

    try {
      // Upload files to backend and get URLs
      const uploadPromises = validFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        
        try {
          const response = await apiClient.post('/seller/products/upload-image', formData);
          
          if (response.data.success && response.data.data?.url) {
            // Convert relative URL to absolute URL
            const imageUrl = getFullImageUrl(response.data.data.url);
            
            return {
              id: `uploaded-${Date.now()}-${Math.random()}`,
              url: imageUrl,
              isFeatured: false,
            };
          } else {
            throw new Error('Upload failed');
          }
        } catch (error: any) {
          console.error('Upload error:', error);
          throw new Error(`Failed to upload ${file.name}: ${error.response?.data?.message || error.message}`);
        }
      });

      const uploadedItems = await Promise.all(uploadPromises);
      
      // Add uploaded images to the list
      updateImages([...imageItems, ...uploadedItems]);
    } catch (error: any) {
      console.error('Error uploading images:', error);
      alert(error.message || 'Failed to upload images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  }, [imageItems]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleRemove = (id: string) => {
    const newItems = imageItems.filter(item => item.id !== id);
    // If we removed the featured image, make the first one featured
    if (newItems.length > 0 && imageItems.find(item => item.id === id)?.isFeatured) {
      newItems[0].isFeatured = true;
    }
    updateImages(newItems);
  };

  const handleSetFeatured = (id: string) => {
    const newItems = imageItems.map(item => ({
      ...item,
      isFeatured: item.id === id,
    }));
    updateImages(newItems);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOverItem = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...imageItems];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setImageItems(newItems);
    setDraggedIndex(index);
  };

  const handleAddUrl = () => {
    const url = prompt('Enter image URL:');
    if (url && url.trim()) {
      if (imageItems.length >= maxImages) {
        alert(`Maximum ${maxImages} images allowed`);
        return;
      }
      const newItem: ImageItem = {
        id: `url-${Date.now()}`,
        url: url.trim(),
        isFeatured: imageItems.length === 0,
      };
      updateImages([...imageItems, newItem]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Image Grid */}
      {imageItems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {imageItems.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOverItem(e, index)}
              className={`relative group cursor-move border-2 rounded-lg overflow-hidden transition-all ${
                item.isFeatured
                  ? 'border-[#0066CC] ring-2 ring-[#0066CC]'
                  : 'border-gray-200 hover:border-gray-300'
              } ${draggedIndex === index ? 'opacity-50' : ''}`}
            >
              <img
                src={item.url}
                alt={`Product image ${index + 1}`}
                className="w-full h-32 object-cover"
                onError={(e) => {
                  // Fallback if image fails to load
                  console.error('Image load error:', item.url);
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage Error%3C/text%3E%3C/svg%3E';
                }}
              />
              
              {/* Featured Badge */}
              {item.isFeatured && (
                <div className="absolute top-2 left-2 bg-[#0066CC] text-white text-xs font-semibold px-2 py-1 rounded">
                  Featured
                </div>
              )}

              {/* Actions Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetFeatured(item.id)}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 rounded text-xs font-medium ${
                    item.isFeatured
                      ? 'bg-[#0066CC] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                  title={item.isFeatured ? 'Featured Image' : 'Set as Featured'}
                >
                  {item.isFeatured ? '✓ Featured' : 'Set Featured'}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600"
                  title="Remove Image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Drag Handle Indicator */}
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          uploading
            ? 'border-[#0066CC] bg-blue-50'
            : 'border-gray-300 hover:border-[#0066CC] hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={uploading || imageItems.length >= maxImages}
        />
        
        {uploading ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066CC] mx-auto"></div>
            <p className="text-sm text-gray-600">Uploading images...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-4h4m-4-4v4m0 4v-4m0 0l-3.172-3.172M32 24l3.172 3.172"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, JPEG, WEBP up to 5MB each
              </p>
              <p className="text-xs text-gray-500">
                {imageItems.length} / {maxImages} images
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageItems.length >= maxImages}
              >
                Select Images
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddUrl}
                disabled={imageItems.length >= maxImages}
              >
                Add URL
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="space-y-2">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800">
            <strong>Tip:</strong> The first image will be used as the featured image. You can drag images to reorder them or click "Set Featured" on any image.
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-800">
            <strong>✓ Images uploaded from your computer are automatically saved!</strong> You can also add images by URL using the "Add URL" button.
          </p>
        </div>
      </div>
    </div>
  );
}

