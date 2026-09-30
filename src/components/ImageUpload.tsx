'use client'

import { useState, useRef, ChangeEvent } from 'react'
import Image from 'next/image'
import { compressImage } from '@/utils/image-compression'

interface ImageUploadProps {
    onImageSelect: (file: File | null, base64: string | null) => void
    currentImage?: string | null
    className?: string
}

export default function ImageUpload({
    onImageSelect,
    currentImage,
    className = ''
}: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(currentImage || null)
    const [isDragging, setIsDragging] = useState(false)
    const [isCompressing, setIsCompressing] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFile(file)
        }
    }

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file')
            return
        }

        setIsCompressing(true)
        try {
            const compressedB64 = await compressImage(file)
            setPreview(compressedB64)
            onImageSelect(file, compressedB64)
        } catch (error) {
            console.error('Compression failed:', error)
            // Fallback to original if compression fails (though unlikely)
            const reader = new FileReader()
            reader.onload = (e) => {
                const b64 = e.target?.result as string
                setPreview(b64)
                onImageSelect(file, b64)
            }
            reader.readAsDataURL(file)
        } finally {
            setIsCompressing(false)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const file = e.dataTransfer.files?.[0]
        if (file) {
            handleFile(file)
        }
    }

    const handleClick = () => {
        fileInputRef.current?.click()
    }

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation()
        setPreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
        onImageSelect(null, null)
    }

    return (
        <div className={className}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />

            <div
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="relative w-full aspect-video rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden"
                style={{
                    borderColor: isDragging ? 'var(--cn-accent-purple)' : 'var(--cn-border)',
                    background: isDragging ? 'var(--cn-surface)' : 'var(--cn-surface-2)',
                    boxShadow: isDragging ? 'var(--cn-shadow-glow-purple)' : 'none',
                }}
                onMouseEnter={(e) => {
                    if (!isDragging) e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.45)'
                }}
                onMouseLeave={(e) => {
                    if (!isDragging) e.currentTarget.style.borderColor = 'var(--cn-border)'
                }}
            >
                {isCompressing ? (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm z-10"
                        style={{ background: 'rgba(10, 7, 19, 0.72)' }}
                    >
                        <div
                            className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mb-2"
                            style={{ borderColor: 'var(--cn-accent-purple)', borderTopColor: 'transparent' }}
                        />
                        <p className="text-xs font-semibold" style={{ color: 'var(--cn-accent-purple)' }}>Optimizing...</p>
                    </div>
                ) : null}

                {preview ? (
                    <>
                        <Image
                            src={preview}
                            alt="Preview"
                            fill
                            className="object-cover"
                        />
                        <button
                            onClick={handleRemove}
                            className="absolute top-2 right-2 w-8 h-8 text-white rounded-full
                         flex items-center justify-center transition-colors
                         shadow-lg"
                            style={{ background: 'var(--cn-accent-sukuna)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--cn-accent-sukuna)')}
                        >
                            ✕
                        </button>
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                        <div
                            className="w-16 h-16 mb-4 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--cn-surface-2)' }}
                        >
                            <svg className="w-8 h-8" style={{ color: 'var(--cn-text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-sm text-center" style={{ color: 'var(--cn-text-2)' }}>
                            <span className="font-medium" style={{ color: 'var(--cn-accent-purple)' }}>Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--cn-text-3)' }}>Images are automatically optimized</p>
                    </div>
                )}
            </div>
        </div>
    )
}
