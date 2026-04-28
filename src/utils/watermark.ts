/**
 * Watermark utility for applying text watermarks to images
 * Uses Canvas API for browser-side processing
 */

export type WatermarkPosition =
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'center'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right'

export interface WatermarkConfig {
    enabled: boolean
    text: string
    position: WatermarkPosition
    fontSize: number  // Percentage of image width (1-10)
    opacity: number   // 0-100
    color: string     // Hex color
}

export const defaultWatermarkConfig: WatermarkConfig = {
    enabled: false,
    text: 'PICX',
    position: 'bottom-right',
    fontSize: 3,
    opacity: 50,
    color: '#ffffff'
}

export interface WatermarkResult {
    file: File
    originalSize: number
    watermarkedSize: number
}

/**
 * Apply text watermark to an image file
 * @param file The image file to watermark
 * @param config Watermark configuration
 * @returns Watermarked file
 */
export async function applyWatermark(
    file: File,
    config: WatermarkConfig
): Promise<WatermarkResult> {
    const originalSize = file.size

    // Skip if watermark is disabled
    if (!config.enabled || !config.text.trim()) {
        return {
            file,
            originalSize,
            watermarkedSize: originalSize
        }
    }

    // Skip for non-image files
    if (!file.type.startsWith('image/')) {
        return {
            file,
            originalSize,
            watermarkedSize: originalSize
        }
    }

    // Skip for GIF and SVG (Canvas doesn't handle them well)
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
        return {
            file,
            originalSize,
            watermarkedSize: originalSize
        }
    }

    try {
        // Load image
        const img = await loadImage(file)

        // Create canvas
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!

        canvas.width = img.width
        canvas.height = img.height

        // Draw original image
        ctx.drawImage(img, 0, 0)

        // Calculate font size based on image width
        const fontSize = Math.max(12, Math.floor(img.width * (config.fontSize / 100)))

        // Setup text style
        ctx.font = `bold ${fontSize}px Arial, sans-serif`
        ctx.fillStyle = hexToRgba(config.color, config.opacity / 100)
        ctx.textBaseline = 'bottom'

        // Add text shadow for better visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.shadowBlur = fontSize / 4
        ctx.shadowOffsetX = 1
        ctx.shadowOffsetY = 1

        // Measure text
        const textMetrics = ctx.measureText(config.text)
        const textWidth = textMetrics.width
        const textHeight = fontSize

        // Calculate position
        const padding = fontSize
        const { x, y } = calculatePosition(
            config.position,
            canvas.width,
            canvas.height,
            textWidth,
            textHeight,
            padding
        )

        // Draw watermark text
        ctx.fillText(config.text, x, y)

        // Convert canvas to blob
        const blob = await canvasToBlob(canvas, file.type)

        // Create new file
        const watermarkedFile = new File([blob], file.name, {
            type: file.type
        })

        return {
            file: watermarkedFile,
            originalSize,
            watermarkedSize: watermarkedFile.size
        }
    } catch (error) {
        console.error('Watermark failed:', error)
        return {
            file,
            originalSize,
            watermarkedSize: originalSize
        }
    }
}

/**
 * Apply watermark to multiple images
 */
export async function applyWatermarks(
    files: File[],
    config: WatermarkConfig,
    onProgress?: (current: number, total: number) => void
): Promise<WatermarkResult[]> {
    const results: WatermarkResult[] = []

    for (let i = 0; i < files.length; i++) {
        const result = await applyWatermark(files[i], config)
        results.push(result)
        onProgress?.(i + 1, files.length)
    }

    return results
}

/**
 * Load an image file into an HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)

        img.onload = () => {
            URL.revokeObjectURL(url)
            resolve(img)
        }
        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Failed to load image'))
        }

        img.src = url
    })
}

/**
 * Convert canvas to blob
 */
function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob)
                } else {
                    reject(new Error('Failed to convert canvas to blob'))
                }
            },
            mimeType,
            0.92 // Quality for JPEG/WebP
        )
    })
}

/**
 * Calculate watermark position coordinates
 */
function calculatePosition(
    position: WatermarkPosition,
    canvasWidth: number,
    canvasHeight: number,
    textWidth: number,
    textHeight: number,
    padding: number
): { x: number; y: number } {
    let x: number
    let y: number

    switch (position) {
        case 'top-left':
            x = padding
            y = padding + textHeight
            break
        case 'top-center':
            x = (canvasWidth - textWidth) / 2
            y = padding + textHeight
            break
        case 'top-right':
            x = canvasWidth - textWidth - padding
            y = padding + textHeight
            break
        case 'center':
            x = (canvasWidth - textWidth) / 2
            y = (canvasHeight + textHeight) / 2
            break
        case 'bottom-left':
            x = padding
            y = canvasHeight - padding
            break
        case 'bottom-center':
            x = (canvasWidth - textWidth) / 2
            y = canvasHeight - padding
            break
        case 'bottom-right':
        default:
            x = canvasWidth - textWidth - padding
            y = canvasHeight - padding
            break
    }

    return { x, y }
}

/**
 * Convert hex color to rgba
 */
function hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (result) {
        const r = parseInt(result[1], 16)
        const g = parseInt(result[2], 16)
        const b = parseInt(result[3], 16)
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
    return `rgba(255, 255, 255, ${alpha})`
}
