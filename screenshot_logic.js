const ssStartBtn = document.getElementById('ssStartBtn');
const ssRetakeBtn = document.getElementById('ssRetakeBtn');
const ssVideo = document.getElementById('screenshotVideo');
const ssPreviewContainer = document.getElementById('screenshotPreviewContainer');
const ssPlaceholder = document.getElementById('screenshotPlaceholder');
const editorContainer = document.getElementById('editorContainer');
const editorCanvas = document.getElementById('editorCanvas');
const ssToolbar = document.getElementById('ssToolbar');
const ssSaveActions = document.getElementById('ssSaveActions');
const ssSaveJpgBtn = document.getElementById('ssSaveJpgBtn');
const ssSavePngBtn = document.getElementById('ssSavePngBtn');
const screenshotInstruction = document.getElementById('screenshotInstruction');
const ssDelaySelect = document.getElementById('ssDelaySelect');

// Tools inputs
const toolColorInput = document.getElementById('toolColor');
const toolWidthInput = document.getElementById('toolWidth');
const toolBtns = document.querySelectorAll('.tool-btn');
const applyCropBtn = document.getElementById('applyCropBtn');

let ssStream = null;
let currentTool = null;
let isDrawing = false;
let startX = 0;
let startY = 0;
let snapshot = null; // Canvas state before drawing current shape

// --- Setup Event Listeners ---

// Tool selection
toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Reset crop UI if switching away from crop
        if (currentTool === 'crop' && btn.dataset.tool !== 'crop') {
             applyCropBtn.classList.add('hidden');
             screenshotInstruction.classList.add('hidden');
             // Redraw canvas to remove selection rect if any
             if (snapshot) {
                 const ctx = editorCanvas.getContext('2d');
                 ctx.putImageData(snapshot, 0, 0);
             }
        }

        if (currentTool === btn.dataset.tool) {
            currentTool = null; // Deselect
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('text-gray-300');
            applyCropBtn.classList.add('hidden');
            screenshotInstruction.classList.add('hidden');
        } else {
            // Deselect others
            toolBtns.forEach(b => {
                b.classList.remove('bg-blue-600', 'text-white');
                b.classList.add('text-gray-300');
            });

            currentTool = btn.dataset.tool;
            btn.classList.add('bg-blue-600', 'text-white');
            btn.classList.remove('text-gray-300');
        }
    });
});

// Canvas Drawing Events
editorCanvas.addEventListener('mousedown', startDrawing);
editorCanvas.addEventListener('mousemove', draw);
editorCanvas.addEventListener('mouseup', stopDrawing);
editorCanvas.addEventListener('mouseout', stopDrawing);

// Canvas Text Input Logic
editorCanvas.addEventListener('click', handleCanvasClick);

// Paste Event
document.addEventListener('paste', handlePaste);


// Apply Crop
applyCropBtn.addEventListener('click', () => {
    if (currentTool === 'crop' && selectionRect) {
        const ctx = editorCanvas.getContext('2d');

        // 1. Restore clean snapshot to remove selection border
        ctx.putImageData(snapshot, 0, 0);

        // 2. Get the cropped image data from clean state
        const croppedData = ctx.getImageData(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);

        // 3. Resize canvas
        editorCanvas.width = selectionRect.w;
        editorCanvas.height = selectionRect.h;

        // 4. Put image data back
        ctx.putImageData(croppedData, 0, 0);

        // 5. Reset state
        selectionRect = null;
        applyCropBtn.classList.add('hidden');
        screenshotInstruction.classList.add('hidden');

        // Deselect tool
        currentTool = null;
        toolBtns.forEach(b => {
            b.classList.remove('bg-blue-600', 'text-white');
            b.classList.add('text-gray-300');
        });

        // Update snapshot for subsequent edits
        snapshot = ctx.getImageData(0, 0, editorCanvas.width, editorCanvas.height);
    }
});


ssStartBtn.addEventListener('click', async () => {
    try {
        const delay = parseInt(ssDelaySelect.value);
        let countdownInterval;

        // Visual feedback for delay if any
        if (delay > 0) {
            const originalText = ssStartBtn.innerHTML;
            let secondsLeft = delay / 1000;

            // We can't block the permission dialog, but we can start the delay *after* the stream is acquired?
            // Actually, getDisplayMedia blocks JS execution in some browsers or just waits.
            // But if we want to capture a specific state (like a menu), the delay usually happens *after* selection.
            // Flow: Click -> Select Screen -> (Delay) -> Snap.
        }

        ssStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: 1920, height: 1080 }
        });
        ssVideo.srcObject = ssStream;

        // Handle Delay
        if (delay > 0) {
            const originalText = ssStartBtn.innerHTML;
            let secondsLeft = delay / 1000;

            ssStartBtn.disabled = true;
            // Show countdown on button
            ssStartBtn.textContent = `Capturing in ${secondsLeft}s...`;

            countdownInterval = setInterval(() => {
                secondsLeft--;
                if (secondsLeft > 0) {
                    ssStartBtn.textContent = `Capturing in ${secondsLeft}s...`;
                } else {
                    clearInterval(countdownInterval);
                    ssStartBtn.innerHTML = originalText;
                }
            }, 1000);

            // Wait for delay
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Wait for metadata to load to ensure dimensions are correct
        if (ssVideo.readyState >= 2) { // 2 = HAVE_CURRENT_DATA
             captureAndShow();
        } else {
            ssVideo.onloadedmetadata = () => {
                 setTimeout(() => {
                     captureAndShow();
                 }, 300);
            };
        }

        ssStartBtn.disabled = true; // Disable until retake

    } catch (err) {
        console.error("Error starting capture: ", err);
        ssStartBtn.disabled = false;
        ssStartBtn.innerHTML = `
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            New Screenshot
        `;
    }
});

function captureAndShow() {
     if (!ssVideo.videoWidth) {
         // Retry if not ready
         requestAnimationFrame(captureAndShow);
         return;
     }

    editorCanvas.width = ssVideo.videoWidth;
    editorCanvas.height = ssVideo.videoHeight;

    const ctx = editorCanvas.getContext('2d');
    ctx.drawImage(ssVideo, 0, 0, editorCanvas.width, editorCanvas.height);

    stopScreenshotStream();
    showEditorUI();

    // --- Auto-select Crop Tool for "Drag Select" experience ---
    activateCropTool();
}

function handlePaste(e) {
    // Only handle paste if the Screenshot tab is active (checked by visibility of container?)
    // Or just always handle it if we are on the page.
    // Let's check if we are in the screenshot tab context.
    const screenshotContent = document.getElementById('screenshotContent');
    if (screenshotContent.classList.contains('hidden')) return;

    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            const img = new Image();
            img.onload = function() {
                editorCanvas.width = img.width;
                editorCanvas.height = img.height;
                const ctx = editorCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                showEditorUI();
                activateCropTool(); // Assume they might want to crop pasted images too
            };
            img.src = URL.createObjectURL(blob);
            e.preventDefault(); // Prevent default paste behavior
            break;
        }
    }
}

function showEditorUI() {
    ssPlaceholder.classList.add('hidden');
    editorContainer.classList.remove('hidden');

    // Hide controls
    ssStartBtn.parentElement.classList.add('hidden'); // Hide the button group
    ssRetakeBtn.classList.remove('hidden');
    ssToolbar.classList.remove('hidden');
    ssSaveActions.classList.remove('hidden');
}

function activateCropTool() {
    const cropBtn = document.querySelector('button[data-tool="crop"]');
    if(cropBtn) {
        // Deselect others first
        toolBtns.forEach(b => {
            b.classList.remove('bg-blue-600', 'text-white');
            b.classList.add('text-gray-300');
        });

        currentTool = 'crop';
        cropBtn.classList.add('bg-blue-600', 'text-white');
        cropBtn.classList.remove('text-gray-300');

        // Show instruction
        screenshotInstruction.classList.remove('hidden');
    }
}

ssRetakeBtn.addEventListener('click', () => {
    editorContainer.classList.add('hidden');
    // ssPreviewContainer.classList.remove('hidden'); // We keep this hidden now
    ssToolbar.classList.add('hidden');
    ssSaveActions.classList.add('hidden');
    screenshotInstruction.classList.add('hidden');

    ssRetakeBtn.classList.add('hidden');

    ssStartBtn.parentElement.classList.remove('hidden'); // Show button group
    ssStartBtn.disabled = false;
    // Reset button text just in case
    ssStartBtn.innerHTML = `
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        New Screenshot
    `;

    ssPlaceholder.classList.remove('hidden');
    ssVideo.srcObject = null;

    // Reset tools
    currentTool = null;
    toolBtns.forEach(b => {
        b.classList.remove('bg-blue-600', 'text-white');
        b.classList.add('text-gray-300');
    });
    applyCropBtn.classList.add('hidden');
});

// Save Functionality
ssSaveJpgBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'screenshot.jpg';
    link.href = editorCanvas.toDataURL('image/jpeg', 0.9);
    link.click();
});

ssSavePngBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'screenshot.png';
    link.href = editorCanvas.toDataURL('image/png');
    link.click();
});


function stopScreenshotStream() {
    if (ssStream) {
        ssStream.getTracks().forEach(track => track.stop());
        ssStream = null;
        ssVideo.srcObject = null;
    }
}


// --- Drawing Logic ---

let selectionRect = null; // {x, y, w, h}

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    };
}

function startDrawing(e) {
    if (!currentTool || currentTool === 'text') return;

    isDrawing = true;
    const pos = getMousePos(editorCanvas, e);
    startX = pos.x;
    startY = pos.y;

    // Save state
    const ctx = editorCanvas.getContext('2d');
    snapshot = ctx.getImageData(0, 0, editorCanvas.width, editorCanvas.height);
}

function draw(e) {
    if (!isDrawing) return;

    const pos = getMousePos(editorCanvas, e);
    const ctx = editorCanvas.getContext('2d');

    // Restore state
    ctx.putImageData(snapshot, 0, 0);

    ctx.strokeStyle = toolColorInput.value;
    ctx.lineWidth = parseInt(toolWidthInput.value);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const w = pos.x - startX;
    const h = pos.y - startY;

    if (currentTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    } else if (currentTool === 'arrow') {
        drawArrow(ctx, startX, startY, pos.x, pos.y);
    } else if (currentTool === 'crop' || currentTool === 'blur' || currentTool === 'pixelate') {
        // Draw selection rectangle
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, startY, w, h);

        ctx.strokeStyle = '#000';
        ctx.strokeRect(startX, startY, w, h); // Outline for contrast

        ctx.setLineDash([]); // Reset

        selectionRect = { x: startX, y: startY, w: w, h: h };

        // Normalize rect (handle negative width/height)
        if (selectionRect.w < 0) { selectionRect.x += selectionRect.w; selectionRect.w = Math.abs(selectionRect.w); }
        if (selectionRect.h < 0) { selectionRect.y += selectionRect.h; selectionRect.h = Math.abs(selectionRect.h); }
    }
}

function stopDrawing(e) {
    if (!isDrawing) return;
    isDrawing = false;

    const ctx = editorCanvas.getContext('2d');

    // Handle effects immediately on mouse up
    if (currentTool === 'blur' && selectionRect) {
        // Apply blur
        // Restore original image first (remove selection rect)
        ctx.putImageData(snapshot, 0, 0);
        applyBlur(ctx, selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
        snapshot = ctx.getImageData(0, 0, editorCanvas.width, editorCanvas.height); // Update snapshot
        selectionRect = null;
    } else if (currentTool === 'pixelate' && selectionRect) {
         // Apply pixelate
        ctx.putImageData(snapshot, 0, 0);
        applyPixelate(ctx, selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
        snapshot = ctx.getImageData(0, 0, editorCanvas.width, editorCanvas.height); // Update snapshot
        selectionRect = null;
    } else if (currentTool === 'crop') {
        // Don't clear selection rect, show button to confirm
        applyCropBtn.classList.remove('hidden');
    }
}

function drawArrow(ctx, fromX, fromY, toX, toY) {
    const headLength = parseInt(toolWidthInput.value) * 3;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.fillStyle = toolColorInput.value;
    ctx.fill();
}

function handleCanvasClick(e) {
    if (currentTool !== 'text') return;

    const pos = getMousePos(editorCanvas, e);

    const text = prompt("Enter text:", "");
    if (text) {
        const ctx = editorCanvas.getContext('2d');
        ctx.font = `${parseInt(toolWidthInput.value) * 5 + 10}px Arial`;
        ctx.fillStyle = toolColorInput.value;
        ctx.fillText(text, pos.x, pos.y);
    }
}

function applyBlur(ctx, x, y, w, h) {
    if (w <= 0 || h <= 0) return;

    if (ctx.filter) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.drawImage(editorCanvas, x, y, w, h, 0, 0, w, h);

        ctx.save();
        ctx.filter = 'blur(5px)';
        ctx.drawImage(tempCanvas, 0, 0, w, h, x, y, w, h);
        ctx.restore();
    } else {
         ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
         ctx.fillRect(x, y, w, h);
    }
}

function applyPixelate(ctx, x, y, w, h) {
    if (w <= 0 || h <= 0) return;

    const pixelSize = 10;

    const tempW = Math.max(1, Math.floor(w / pixelSize));
    const tempH = Math.max(1, Math.floor(h / pixelSize));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = tempW;
    tempCanvas.height = tempH;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.imageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;

    tempCtx.drawImage(editorCanvas, x, y, w, h, 0, 0, tempW, tempH);

    ctx.drawImage(tempCanvas, 0, 0, tempW, tempH, x, y, w, h);

    ctx.imageSmoothingEnabled = true;
}
