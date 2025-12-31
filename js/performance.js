// ============================================
// PERFORMANCE OPTIMIZATIONS
// ============================================
(function() {

// IndexedDB for large-scale caching (replaces localStorage for images)
const DB_NAME = 'TaggerDB';
const DB_VERSION = 3; // Incremented for new settings store
const STORE_THUMBNAILS = 'thumbnails';
const STORE_ANALYSIS = 'analysis';
const STORE_MEMORY = 'memory';
const STORE_SETTINGS = 'settings';

let dbInstance = null;

const initDB = async () => {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Thumbnails store
      if (!db.objectStoreNames.contains(STORE_THUMBNAILS)) {
        const thumbStore = db.createObjectStore(STORE_THUMBNAILS, { keyPath: 'hash' });
        thumbStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Analysis cache store
      if (!db.objectStoreNames.contains(STORE_ANALYSIS)) {
        const analysisStore = db.createObjectStore(STORE_ANALYSIS, { keyPath: 'hash' });
        analysisStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Memory store (for queue/working data)
      if (!db.objectStoreNames.contains(STORE_MEMORY)) {
        db.createObjectStore(STORE_MEMORY, { keyPath: 'key' });
      }

      // Settings store (for persistent settings like directory handles)
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };
  });
};

// Thumbnail generation with size control and placeholder detection
const generateThumbnail = async (file, maxSize = 200, retryCount = 0) => {
  const MAX_RETRIES = 0; // Disable automatic retries - user can manually rebuild with Alt+Ctrl+R

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Detect Dropbox/cloud placeholder by checking if image quality is suspiciously low
      // Placeholders are often 64x64, 128x128, or other low resolutions
      // Also check file size - real images are typically larger
      const isLowResolution = width < 300 || height < 300;
      const isSmallFile = file.size < 30 * 1024; // 30KB

      if (isLowResolution && isSmallFile) {
        // This is likely a Dropbox placeholder
        console.warn(`[THUMB] Dropbox placeholder detected for ${file.name}: ${width}x${height}, ${(file.size/1024).toFixed(1)}KB - using low quality thumbnail. Use Alt+Ctrl+R to rebuild after files download.`);
      }

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (blob) {
          if (retryCount > 0) {
            console.log(`[THUMB] Successfully generated thumbnail for ${file.name} after ${retryCount} retries: ${width}x${height}`);
          }
          resolve(blob);
        } else {
          reject(new Error('Thumbnail generation failed'));
        }
      }, 'image/jpeg', 0.92);

      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      if (retryCount < MAX_RETRIES) {
        console.warn(`[THUMB] Load error for ${file.name}, retrying ${retryCount + 1}/${MAX_RETRIES}...`);
        setTimeout(() => {
          generateThumbnail(file, maxSize, retryCount + 1).then(resolve).catch(reject);
        }, RETRY_DELAY * (retryCount + 1));
      } else {
        reject(new Error('Failed to load image after retries'));
      }
    };
    img.src = URL.createObjectURL(file);
  });
};

// Resize image for API submission (reduce payload size)
const resizeForAPI = async (file, maxSize = 1600) => {
  // Check if file format is supported by browser Image API
  const unsupportedFormats = ['.psd', '.psb', '.ai', '.eps', '.indd', '.tif', '.tiff', '.cr2', '.nef', '.arw', '.dng', '.raf', '.orf'];
  const fileName = file.name.toLowerCase();
  const isUnsupported = unsupportedFormats.some(ext => fileName.endsWith(ext));

  if (isUnsupported) {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toUpperCase();
    console.warn(`[API] Skipping unsupported format for analysis: ${file.name}`);
    return Promise.reject(new Error(`${ext} format not supported - only JPEG, PNG, WebP, and GIF can be analyzed`));
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Only resize if larger than maxSize
      if (width <= maxSize && height <= maxSize) {
        // Image is already small enough, just convert to base64
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        URL.revokeObjectURL(img.src);
        return;
      }

      // Calculate new dimensions
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to base64 with good quality
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      resolve(base64);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image for API resize'));
    };
    img.src = URL.createObjectURL(file);
  });
};

// Store thumbnail in IndexedDB
const storeThumbnail = async (hash, blob) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_THUMBNAILS, 'readwrite');
    const store = tx.objectStore(STORE_THUMBNAILS);

    await store.put({
      hash,
      blob,
      timestamp: Date.now()
    });

    return true;
  } catch (e) {
    console.error('[THUMB] Store failed:', e);
    return false;
  }
};

// Get thumbnail from IndexedDB
const getThumbnail = async (hash) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_THUMBNAILS, 'readonly');
    const store = tx.objectStore(STORE_THUMBNAILS);

    return new Promise((resolve, reject) => {
      const request = store.get(hash);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.blob) {
          resolve(result.blob);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('[THUMB] Get failed:', e);
    return null;
  }
};

// Delete thumbnail from IndexedDB (for regenerating low-quality thumbnails)
const deleteThumbnail = async (hash) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_THUMBNAILS, 'readwrite');
    const store = tx.objectStore(STORE_THUMBNAILS);

    await store.delete(hash);
    console.log('[THUMB] Deleted cached thumbnail for hash:', hash);
    return true;
  } catch (e) {
    console.error('[THUMB] Delete failed:', e);
    return false;
  }
};

// Store analysis in IndexedDB
const storeAnalysis = async (hash, data) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_ANALYSIS, 'readwrite');
    const store = tx.objectStore(STORE_ANALYSIS);

    await store.put({
      hash,
      data,
      timestamp: Date.now()
    });

    return true;
  } catch (e) {
    console.error('[ANALYSIS] Store failed:', e);
    return false;
  }
};

// Get analysis from IndexedDB
const getAnalysis = async (hash) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_ANALYSIS, 'readonly');
    const store = tx.objectStore(STORE_ANALYSIS);

    return new Promise((resolve, reject) => {
      const request = store.get(hash);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('[ANALYSIS] Get failed:', e);
    return null;
  }
};

const deleteAnalysis = async (hash) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_ANALYSIS, 'readwrite');
    const store = tx.objectStore(STORE_ANALYSIS);

    return new Promise((resolve, reject) => {
      const request = store.delete(hash);
      request.onsuccess = () => {
        console.log('[ANALYSIS] Deleted cache for:', hash);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('[ANALYSIS] Delete failed:', e);
    return false;
  }
};

// Clean old thumbnails (keep last 1000)
const cleanOldThumbnails = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_THUMBNAILS, 'readwrite');
    const store = tx.objectStore(STORE_THUMBNAILS);
    const index = store.index('timestamp');

    const allKeys = await new Promise((resolve) => {
      const request = index.getAllKeys();
      request.onsuccess = () => resolve(request.result);
    });

    if (allKeys.length > 1000) {
      const toDelete = allKeys.slice(0, allKeys.length - 1000);
      for (const key of toDelete) {
        await store.delete(key);
      }
      console.log('[THUMB] Cleaned', toDelete.length, 'old thumbnails');
    }
  } catch (e) {
    console.error('[THUMB] Cleanup failed:', e);
  }
};

// Batch queue processor with rate limiting
class BatchProcessor {
  constructor(processFn, { batchSize = 5, delayMs = 100 } = {}) {
    this.processFn = processFn;
    this.batchSize = batchSize;
    this.delayMs = delayMs;
    this.queue = [];
    this.processing = false;
  }

  add(item) {
    this.queue.push(item);
    if (!this.processing) {
      this.process();
    }
  }

  addBatch(items) {
    this.queue.push(...items);
    if (!this.processing) {
      this.process();
    }
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);

      try {
        await Promise.all(batch.map(item => this.processFn(item)));
      } catch (e) {
        console.error('[BATCH] Processing error:', e);
      }

      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delayMs));
      }
    }

    this.processing = false;
  }

  clear() {
    this.queue = [];
  }

  get pending() {
    return this.queue.length;
  }
}

// Virtual scrolling helper
class VirtualScroller {
  constructor(containerHeight, itemHeight, itemsCount, overscan = 5) {
    this.containerHeight = containerHeight;
    this.itemHeight = itemHeight;
    this.itemsCount = itemsCount;
    this.overscan = overscan;
  }

  getVisibleRange(scrollTop) {
    const visibleStart = Math.floor(scrollTop / this.itemHeight);
    const visibleEnd = Math.ceil((scrollTop + this.containerHeight) / this.itemHeight);

    const start = Math.max(0, visibleStart - this.overscan);
    const end = Math.min(this.itemsCount, visibleEnd + this.overscan);

    return { start, end, visibleStart, visibleEnd };
  }

  getTotalHeight() {
    return this.itemsCount * this.itemHeight;
  }

  getItemOffset(index) {
    return index * this.itemHeight;
  }
}

// Debounce helper for scroll events
const debounce = (fn, delay) => {
  let timeoutId = null;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Throttle helper for scroll events
const throttle = (fn, limit) => {
  let inThrottle = false;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// IntersectionObserver wrapper for lazy loading
class LazyLoader {
  constructor(onIntersect, options = {}) {
    this.observers = new Map();
    this.options = {
      root: options.root || null,
      rootMargin: options.rootMargin || '200px',
      threshold: options.threshold || 0.01
    };
    this.onIntersect = onIntersect;
  }

  observe(element, data) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.onIntersect(element, data);
          observer.unobserve(element);
          this.observers.delete(element);
        }
      });
    }, this.options);

    observer.observe(element);
    this.observers.set(element, observer);
  }

  unobserve(element) {
    const observer = this.observers.get(element);
    if (observer) {
      observer.unobserve(element);
      this.observers.delete(element);
    }
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Store memory in IndexedDB (replaces localStorage for large datasets)
const storeMemory = async (key, data) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_MEMORY, 'readwrite');
    const store = tx.objectStore(STORE_MEMORY);

    await store.put({ key, data, timestamp: Date.now() });
    return true;
  } catch (e) {
    console.error('[MEMORY] Store failed:', e);
    return false;
  }
};

// Get memory from IndexedDB
const getMemory = async (key) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_MEMORY, 'readonly');
    const store = tx.objectStore(STORE_MEMORY);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('[MEMORY] Get failed:', e);
    return null;
  }
};

// Memory monitoring
const getMemoryUsage = () => {
  if (performance.memory) {
    const used = performance.memory.usedJSHeapSize / 1048576;
    const total = performance.memory.totalJSHeapSize / 1048576;
    return { used: used.toFixed(2), total: total.toFixed(2), percent: ((used / total) * 100).toFixed(1) };
  }
  return null;
};

// ============================================
// DIRECTORY HANDLE PERSISTENCE
// ============================================

// Save directory handle to IndexedDB
const saveOutputDirectory = async (directoryHandle) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = tx.objectStore(STORE_SETTINGS);

    await store.put({
      key: 'output_directory',
      handle: directoryHandle,
      name: directoryHandle.name,
      timestamp: Date.now()
    });

    await tx.complete;
    console.log('[SETTINGS] Saved output directory:', directoryHandle.name);
    return true;
  } catch (e) {
    console.error('[SETTINGS] Failed to save directory:', e);
    return false;
  }
};

// Load directory handle from IndexedDB with permission verification
const loadOutputDirectory = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_SETTINGS, 'readonly');
    const store = tx.objectStore(STORE_SETTINGS);

    const result = await new Promise((resolve, reject) => {
      const request = store.get('output_directory');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!result || !result.handle) {
      console.log('[SETTINGS] No saved output directory');
      return null;
    }

    // Verify we still have permission to access the directory
    const permission = await result.handle.queryPermission({ mode: 'readwrite' });

    if (permission === 'granted') {
      console.log('[SETTINGS] Restored output directory:', result.name);
      return result.handle;
    } else {
      // Try to request permission
      const requestedPermission = await result.handle.requestPermission({ mode: 'readwrite' });
      if (requestedPermission === 'granted') {
        console.log('[SETTINGS] Re-granted permission for output directory:', result.name);
        return result.handle;
      } else {
        console.log('[SETTINGS] Permission denied for saved directory, user must re-select');
        return null;
      }
    }
  } catch (e) {
    console.error('[SETTINGS] Failed to load directory:', e);
    return null;
  }
};

// Export for use in other modules
window.TaggerPerformance = {
  initDB,
  generateThumbnail,
  resizeForAPI,
  storeThumbnail,
  getThumbnail,
  deleteThumbnail,
  storeAnalysis,
  getAnalysis,
  deleteAnalysis,
  cleanOldThumbnails,
  storeMemory,
  getMemory,
  BatchProcessor,
  VirtualScroller,
  LazyLoader,
  debounce,
  throttle,
  getMemoryUsage,
  saveOutputDirectory,
  loadOutputDirectory
};

// Initialize DB on load
initDB().then(() => {
  console.log('[PERF] IndexedDB initialized');
  // Clean old thumbnails on startup
  cleanOldThumbnails();
}).catch(e => {
  console.error('[PERF] IndexedDB init failed:', e);
});

})();
