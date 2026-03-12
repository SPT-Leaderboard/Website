//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ /
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/

async function autoCropTransparent(imageElement) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Await image load
        if (!imageElement.complete || imageElement.naturalWidth === 0) {
            imageElement.onload = () => processImage();
        } else {
            processImage();
        }

        function processImage() {
            const width = imageElement.naturalWidth;
            const height = imageElement.naturalHeight;
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCanvas.width = width;
            tempCanvas.height = height;
            tempCtx.drawImage(imageElement, 0, 0);

            const imageData = tempCtx.getImageData(0, 0, width, height);
            const data = imageData.data;

            let top = 0, bottom = height, left = width, right = 0;
            let found = false;

            // top to bottom
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const alpha = data[(y * width + x) * 4 + 3];
                    if (alpha > 10) { // transparency
                        top = y;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }

            // bottom to top
            found = false;
            for (let y = height - 1; y >= 0; y--) {
                for (let x = 0; x < width; x++) {
                    const alpha = data[(y * width + x) * 4 + 3];
                    if (alpha > 10) {
                        bottom = y;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }

            // left to right
            found = false;
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    const alpha = data[(y * width + x) * 4 + 3];
                    if (alpha > 10) {
                        left = x;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }

            // right to left
            found = false;
            for (let x = width - 1; x >= 0; x--) {
                for (let y = 0; y < height; y++) {
                    const alpha = data[(y * width + x) * 4 + 3];
                    if (alpha > 10) {
                        right = x;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }

            // add small padding
            const padding = 5;
            const cropWidth = Math.max(1, right - left + padding * 2);
            const cropHeight = Math.max(1, bottom - top + padding * 2);

            // create new image
            canvas.width = cropWidth;
            canvas.height = cropHeight;

            // create transparency where needed
            ctx.clearRect(0, 0, cropWidth, cropHeight);

            // draw the cropped image
            ctx.drawImage(
                imageElement,
                Math.max(0, left - padding),
                Math.max(0, top - padding),
                cropWidth,
                cropHeight,
                0, 0, cropWidth, cropHeight
            );

            // Create the image
            const croppedImage = new Image();
            croppedImage.onload = () => resolve(croppedImage);
            croppedImage.src = canvas.toDataURL('image/png');
        }
    });
}

async function loadAndCropPlayerImage(player) {
    let imageUrl = `${ApiPaths.pmcPfpsPath}${player.permaLink}_full.png`;

    // Bypass CF cache
    if (SettingsHelper.get('cacheBypassToggle')) {
        imageUrl = `${ApiPaths.pmcPfpsPath}${player.permaLink}_full.png?t=${Date.now()}`;
    }

    const fallbackUrl = 'media/default_full_pmc_avatar.png';
    const imgElement = document.querySelector('.playermodel-image img');
    const loadingModel = document.getElementById('loading-model');

    try {
        const tempImg = new Image();
        tempImg.crossOrigin = "anonymous";

        tempImg.onload = async () => {
            try {
                const croppedImage = await autoCropTransparent(tempImg);
                imgElement.src = croppedImage.src;
                setTimeout(() => {
                    loadingModel.classList.remove('active');
                }, 300);
            } catch (error) {
                console.warn('Auto-crop failed, using original image:', error);
                imgElement.src = imageUrl;
                setTimeout(() => {
                    loadingModel.classList.remove('active');
                }, 300);
            }
        };

        tempImg.onerror = () => {
            console.warn('Failed to load player image, using fallback');
            imgElement.src = fallbackUrl;
            setTimeout(() => {
                loadingModel.classList.remove('active');
            }, 300);
        };

        // Show *loading* state
        loadingModel.classList.add('active');
        tempImg.src = imageUrl;
    } catch (error) {
        console.error('Error in loadAndCropPlayerImage:', error);
        imgElement.src = fallbackUrl;
        setTimeout(() => {
            loadingModel.classList.remove('active');
        }, 300);
    }
}