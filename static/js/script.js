// Theme Toggle
document.getElementById('themeToggle')?.addEventListener('click', function () {
    const body = document.body;
    body.classList.toggle('dark-theme');

    const icon = this.querySelector('i');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');

    localStorage.setItem('theme', body.classList.contains('dark-theme') ? 'dark' : 'light');
});

// Initialize saved theme
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        document.querySelector('#themeToggle i')?.classList.replace('fa-moon', 'fa-sun');
    }
});

// Camera Page Functionality
document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('cameraPreview')) {
        const video = document.getElementById('cameraPreview');
        const canvas = document.getElementById('captureCanvas');
        const captureBtn = document.getElementById('captureBtn');
        const loadingSpinner = document.getElementById('loadingSpinner');

        async function initCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                video.srcObject = stream;
            } catch (err) {
                alert('Error accessing camera: ' + err.message);
            }
        }

        async function captureImage() {
            try {
                captureBtn.disabled = true;
                loadingSpinner.style.display = 'block';

                const [videoWidth, videoHeight] = [video.videoWidth, video.videoHeight];
                canvas.width = videoWidth;
                canvas.height = videoHeight;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

                canvas.toBlob(async (blob) => {
                    const formData = new FormData();
                    const filename = `capture_${Date.now()}.jpeg`;
                    formData.append('file', blob, filename);

                    try {
                        const response = await fetch('/camera', { method: 'POST', body: formData });
                        if (response.redirected) window.location.href = response.url;
                    } finally {
                        captureBtn.disabled = false;
                        loadingSpinner.style.display = 'none';
                    }
                }, 'image/jpeg', 0.9);
            } catch (err) {
                alert('Error: ' + err.message);
                captureBtn.disabled = false;
                loadingSpinner.style.display = 'none';
            }
        }

        captureBtn?.addEventListener('click', captureImage);
        initCamera();
    }
});


// Upload Page Functionality
document.addEventListener('DOMContentLoaded', function () {
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        const fileInput = document.getElementById('file-input');
        const previewSection = document.getElementById('preview-section');
        const previewImage = document.getElementById('preview-image');

        fileInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file && file.type.match(/image.*/)) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImage.src = e.target.result;
                    previewSection.classList.remove('d-none');
                    dropZone.classList.add('d-none');
                };
                reader.readAsDataURL(file);
            }
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            fileInput.files = e.dataTransfer.files;
            fileInput.dispatchEvent(new Event('change'));
        });
    }
});

// Result Page Functionality
document.addEventListener('DOMContentLoaded', function () {
    const resultCanvas = document.getElementById('resultCanvas');
    if (!resultCanvas) return;

    const ctx = resultCanvas.getContext('2d');
    const image = new Image();

    // Get data from global variables
    image.src = window.resultImageData;
    const results = window.resultDetectionData;

    image.onload = function () {
        // Set canvas dimensions to match image
        resultCanvas.width = image.naturalWidth;
        resultCanvas.height = image.naturalHeight;

        // Draw original image
        ctx.drawImage(image, 0, 0, resultCanvas.width, resultCanvas.height);

        const boxColor = '#ff0000'; // Red
        const textColor = '#ffffff'; // White

        // Calculate scaling factors (YOLOv8 uses 640x640)
        const scaleX = image.naturalWidth / 640;
        const scaleY = image.naturalHeight / 640;

        results.forEach(condition => {
            const [x1, y1, x2, y2] = condition.bbox.map(coord => parseFloat(coord));

            // Scale coordinates
            const scaledX1 = x1 * scaleX;
            const scaledY1 = y1 * scaleY;
            const scaledX2 = x2 * scaleX;
            const scaledY2 = y2 * scaleY;
            const width = scaledX2 - scaledX1;
            const height = scaledY2 - scaledY1;

            // Draw bounding box
            ctx.strokeStyle = boxColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(scaledX1, scaledY1, width, height);

            // Draw label
            const labelText = `${condition.label} ${condition.confidence}`;
            ctx.font = '14px Arial';
            const textWidth = ctx.measureText(labelText).width;

            // Label background
            ctx.fillStyle = boxColor;
            ctx.fillRect(
                scaledX1 - 1,
                scaledY1 - 18,
                textWidth + 8,
                16
            );

            // Label text
            ctx.fillStyle = textColor;
            ctx.fillText(labelText, scaledX1 + 3, scaledY1 - 3);
        });
    };

    image.onerror = function () {
        console.error('Error loading result image');
    };
});
