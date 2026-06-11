// Client-side downscale of an image File via Canvas before upload.
// Non-image files (or already-small images) are returned unchanged.
export function resizeImage(file: File, maxDim = 1600, quality = 0.8): Promise<File> {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
        return Promise.resolve(file);
    }

    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;

            if (width <= maxDim && height <= maxDim) {
                resolve(file);
                return;
            }

            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(file);
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(blob => {
                if (!blob) {
                    resolve(file);
                    return;
                }
                resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
            }, 'image/jpeg', quality);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not load image'));
        };

        img.src = url;
    });
}
