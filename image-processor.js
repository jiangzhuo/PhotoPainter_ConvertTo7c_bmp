let originalImg; // This will hold the original Image object

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('imageInput').addEventListener('change', handleImageInputChange);
    // Add event listeners for direction, mode, and dither changes
    document.getElementById('direction').addEventListener('change', () => processImage(originalImg));
    document.getElementById('mode').addEventListener('change', () => processImage(originalImg));
    document.getElementById('dither').addEventListener('change', () => processImage(originalImg));
});

function handleImageInputChange(event) {
    const file = event.target.files[0];
    if (!file.type.startsWith('image/')) { return; }

    const reader = new FileReader();
    reader.onload = function(e) {
        originalImg = new Image();
        originalImg.onload = function() {
            processImage(originalImg);
        };
        originalImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Main function to process the image
function processImage(img) {
    if (!img) return; // Do not process if no image is loaded

    const canvas = document.getElementById('canvas');
    const direction = document.getElementById('direction').value;
    const mode = document.getElementById('mode').value;
    const dither = parseInt(document.getElementById('dither').value);

    // Set target dimensions
    const targetDimensions = getTargetDimensions(img, direction);

    // Resize and process image based on mode
    let processedImage;
    if (mode === 'scale') {
        processedImage = scaleImage(img, targetDimensions);
    } else {
        processedImage = cutImage(img, targetDimensions);
    }

    // Apply dithering if required
    if (dither === 1) {
        applyFloydSteinbergDithering(processedImage);
    }

    // Draw processed image on canvas
    canvas.width = processedImage.width;
    canvas.height = processedImage.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(processedImage, 0, 0);

    // Save button functionality
    document.getElementById('saveButton').onclick = function() {
        const dataURL = canvas.toDataURL('image/bmp');
        const link = document.createElement('a');
        link.download = 'processed_image.bmp';
        link.href = dataURL;
        link.click();
    };
}

function getTargetDimensions(img, direction) {
    // Define the target dimensions based on the selected direction
    if (direction === 'landscape') {
        return { width: 800, height: 480 };
    } else {
        return { width: 480, height: 800 };
    }
}

function scaleImage(img, targetDimensions) {
    const canvas = document.createElement('canvas');
    canvas.width = targetDimensions.width;
    canvas.height = targetDimensions.height;

    const ctx = canvas.getContext('2d');

    // Calculate scale ratios
    const scaleX = targetDimensions.width / img.width;
    const scaleY = targetDimensions.height / img.height;
    const scaleRatio = Math.max(scaleX, scaleY);

    // Calculate the position to center the image
    const centerShift_x = (canvas.width - img.width * scaleRatio) / 2;
    const centerShift_y = (canvas.height - img.height * scaleRatio) / 2;

    // Draw the scaled image
    ctx.drawImage(img, 0, 0, img.width, img.height,
        centerShift_x, centerShift_y, img.width * scaleRatio, img.height * scaleRatio);

    return canvas;
}

function cutImage(img, targetDimensions) {
    const canvas = document.createElement('canvas');
    canvas.width = targetDimensions.width;
    canvas.height = targetDimensions.height;
    const ctx = canvas.getContext('2d');

    // Calculate aspect ratios
    const sourceAspectRatio = img.width / img.height;
    const targetAspectRatio = targetDimensions.width / targetDimensions.height;

    let sourceWidth, sourceHeight, sourceX, sourceY;

    if (sourceAspectRatio > targetAspectRatio) {
        // Cut sides
        sourceHeight = img.height;
        sourceWidth = img.height * targetAspectRatio;
        sourceX = (img.width - sourceWidth) / 2;
        sourceY = 0;
    } else {
        // Cut top and bottom
        sourceWidth = img.width;
        sourceHeight = img.width / targetAspectRatio;
        sourceX = 0;
        sourceY = (img.height - sourceHeight) / 2;
    }

    // Draw the cut image
    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, targetDimensions.width, targetDimensions.height);

    return canvas;
}
function applyFloydSteinbergDithering(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;

            const oldR = data[idx];
            const oldG = data[idx + 1];
            const oldB = data[idx + 2];

            const newR = oldR < 128 ? 0 : 255;
            const newG = oldG < 128 ? 0 : 255;
            const newB = oldB < 128 ? 0 : 255;

            data[idx]     = newR;
            data[idx + 1] = newG;
            data[idx + 2] = newB;

            const errR = oldR - newR;
            const errG = oldG - newG;
            const errB = oldB - newB;

            distributeError(data, idx, canvas.width, errR, errG, errB);
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function distributeError(data, idx, width, errR, errG, errB) {
    // Distribute the error to neighboring pixels
    // Note: This is a very simple version and doesn't check image bounds
    for (const [offset, fraction] of [[4, 7 / 16], [width * 4 - 4, 3 / 16], [width * 4, 5 / 16], [width * 4 + 4, 1 / 16]]) {
        data[idx + offset]     += errR * fraction;
        data[idx + offset + 1] += errG * fraction;
        data[idx + offset + 2] += errB * fraction;
    }
}

