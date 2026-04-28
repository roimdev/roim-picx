import imageCompression from 'browser-image-compression'

export interface CompressionLevel {
    label: string
    value: string
    maxSizeMB: number
    quality: number
    description: string
}

export const compressionLevels: CompressionLevel[] = [
    {
        label: 'upload.compressionNone',
        value: 'none',
        maxSizeMB: 20,
        quality: 1,
        description: 'upload.compressionNoneDesc'
    },
    {
        label: 'upload.compressionHigh',
        value: 'high',
        maxSizeMB: 4,
        quality: 0.9,
        description: 'upload.compressionHighDesc'
    },
    {
        label: 'upload.compressionBalanced',
        value: 'balanced',
        maxSizeMB: 2,
        quality: 0.7,
        description: 'upload.compressionBalancedDesc'
    },
    {
        label: 'upload.compressionSmall',
        value: 'small',
        maxSizeMB: 1,
        quality: 0.5,
        description: 'upload.compressionSmallDesc'
    }
]

export interface CompressResult {
    file: File
    originalSize: number
    compressedSize: number
    ratio: number
}

/**
 * Compress an image file using browser-image-compression
 * @param file The image file to compress
 * @param level Compression level configuration
 * @returns Compressed file with size info
 */
export async function compressImage(
    file: File,
    level: CompressionLevel
): Promise<CompressResult> {
    const originalSize = file.size

    // Skip compression for 'none' level or non-image files
    if (level.value === 'none' || !file.type.startsWith('image/')) {
        return {
            file,
            originalSize,
            compressedSize: originalSize,
            ratio: 1
        }
    }

    // Skip compression for GIF and SVG (browser-image-compression doesn't handle them well)
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
        return {
            file,
            originalSize,
            compressedSize: originalSize,
            ratio: 1
        }
    }

    try {
        const options = {
            maxSizeMB: level.maxSizeMB,
            maxWidthOrHeight: 4096,
            useWebWorker: true,
            initialQuality: level.quality,
            fileType: file.type as 'image/jpeg' | 'image/png' | 'image/webp'
        }

        const compressedBlob = await imageCompression(file, options)

        // Create a new File object with the original name
        const compressedFile = new File([compressedBlob], file.name, {
            type: compressedBlob.type
        })

        const compressedSize = compressedFile.size

        return {
            file: compressedFile,
            originalSize,
            compressedSize,
            ratio: compressedSize / originalSize
        }
    } catch (error) {
        console.error('Compression failed:', error)
        // Return original file if compression fails
        return {
            file,
            originalSize,
            compressedSize: originalSize,
            ratio: 1
        }
    }
}

/**
 * Compress multiple images with progress callback
 */
export async function compressImages(
    files: File[],
    level: CompressionLevel,
    onProgress?: (current: number, total: number) => void
): Promise<CompressResult[]> {
    const results: CompressResult[] = []

    for (let i = 0; i < files.length; i++) {
        const result = await compressImage(files[i], level)
        results.push(result)
        onProgress?.(i + 1, files.length)
    }

    return results
}
