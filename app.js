// Initialize Lucide Icons
lucide.createIcons();

// --- UI Elements ---
const myIdEl = document.getElementById('myId');
const connectionStatusEl = document.getElementById('connectionStatus');
const statusDot = connectionStatusEl.querySelector('.status-dot');
const statusText = connectionStatusEl.querySelector('.status-text');
const qrContainer = document.getElementById('qrcode');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

const targetIdInput = document.getElementById('targetIdInput');
const connectBtn = document.getElementById('connectBtn');

const transferZone = document.getElementById('transferZone');
const transferTitle = document.getElementById('transferTitle');
const transferModeBadge = document.getElementById('transferModeBadge');
const transferBadgeText = document.getElementById('transferBadgeText');
const radarStatusText = document.getElementById('radarStatusText');
const fileTypeIcon = document.getElementById('fileTypeIcon');
const fileNameText = document.getElementById('fileNameText');
const fileSizeText = document.getElementById('fileSizeText');
const batchCountBadge = document.getElementById('batchCountBadge');
const progressBarFill = document.getElementById('progressBarFill');
const progressPercent = document.getElementById('progressPercent');
const progressStatusLabel = document.getElementById('progressStatusLabel');
const overallProgressContainer = document.getElementById('overallProgressContainer');
const overallProgressLabel = document.getElementById('overallProgressLabel');
const overallProgressPercent = document.getElementById('overallProgressPercent');
const overallProgressBarFill = document.getElementById('overallProgressBarFill');
const transferSpeedText = document.getElementById('transferSpeedText');
const transferredBytesText = document.getElementById('transferredBytesText');
const transferEtaText = document.getElementById('transferEtaText');

const incomingModal = document.getElementById('incomingModal');
const incomingFileInfo = document.getElementById('incomingFileInfo');
const incomingDocIcon = document.getElementById('incomingDocIcon');
const acceptBtn = document.getElementById('acceptBtn');
const declineBtn = document.getElementById('declineBtn');

const successModal = document.getElementById('successModal');
const successMsgText = document.getElementById('successMsgText');
const transferSummaryBox = document.getElementById('transferSummaryBox');
const sumTotalSize = document.getElementById('sumTotalSize');
const sumAvgSpeed = document.getElementById('sumAvgSpeed');
const sumTimeTaken = document.getElementById('sumTimeTaken');
const closeSuccessBtn = document.getElementById('closeSuccessBtn');
const downloadAgainBtn = document.getElementById('downloadAgainBtn');

const scanModal = document.getElementById('scanModal');
const scanVideo = document.getElementById('scanVideo');
const scanQrBtn = document.getElementById('scanQrBtn');
const closeScanBtn = document.getElementById('closeScanBtn');
const cancelTransferBtn = document.getElementById('cancelTransferBtn');
const toastContainer = document.getElementById('toastContainer');

// --- PeerJS / P2P Logic ---
const radarContainer = document.getElementById('radarAnimation');
const transferInfo = document.getElementById('transferInfo');
const methodIcons = document.querySelectorAll('.method-icon');
const methodLabel = document.getElementById('methodLabel');

// --- PeerJS / P2P State ---
let peer = null;
let currentConn = null;
let currentFiles = []; // Array to store multiple files to send
let currentFileIndex = 0;
let receivedBlobs = []; // Array to store multiple received files
let incomingFiles = []; // Array to store incoming file metadata
let currentQrType = 'id';
let myPeerId = '';
let scanning = false;
let canvasElement = document.createElement("canvas");
let canvas = canvasElement.getContext("2d", { willReadFrequently: true });

// Chunk Streaming & Performance Constants
const CHUNK_SIZE = 64 * 1024; // 64 KB optimal WebRTC data channel chunk size
const BUFFER_HIGH_WATER = 512 * 1024; // 512 KB backpressure ceiling
const BUFFER_LOW_WATER = 128 * 1024;  // 128 KB resume drain threshold
let isTransferAborted = false;

// Receiver State for Chunk Reassembly
let receiveState = {
    active: false,
    currentFileIndex: 0,
    currentChunks: [],
    receivedBytesForFile: 0
};

// Real-Time Speed & Telemetry Tracker
let metrics = {
    active: false,
    mode: 'receive', // 'send' or 'receive'
    startTime: 0,
    totalBytes: 0,
    transferredTotalBytes: 0,
    currentFileBytes: 0,
    currentFileSize: 0,
    lastCalcTime: 0,
    lastCalcBytes: 0,
    speedSamples: [],
    currentSpeed: 0
};

// Helper: Determine file icon by filename extension
function getFileIcon(filename) {
    if (!filename) return 'file-text';
    const ext = filename.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'file-text';
    if (['doc', 'docx', 'txt', 'rtf', 'odt', 'pages', 'md', 'csv', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext)) return 'file-text';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic', 'tiff'].includes(ext)) return 'image';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso', 'apk'].includes(ext)) return 'archive';
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus'].includes(ext)) return 'music';
    if (['mp4', 'mkv', 'mov', 'avi', 'webm', 'wmv', '3gp', 'flv'].includes(ext)) return 'video';
    if (['js', 'ts', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'rs', 'sh', 'xml', 'sql'].includes(ext)) return 'code-2';
    return 'file';
}

function formatSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec <= 0 || !isFinite(bytesPerSec)) return '0 KB/s';
    if (bytesPerSec < 1024 * 1024) {
        return (bytesPerSec / 1024).toFixed(1) + ' KB/s';
    }
    return (bytesPerSec / (1024 * 1024)).toFixed(2) + ' MB/s';
}

function formatEta(seconds) {
    if (!seconds || seconds <= 0 || !isFinite(seconds)) return '--';
    if (seconds < 1) return '< 1s';
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.ceil(seconds % 60);
    return `${m}m ${s}s`;
}

function startMetrics(mode, totalBytes, firstFileSize) {
    const now = performance.now();
    metrics = {
        active: true,
        mode: mode,
        startTime: now,
        totalBytes: totalBytes || 0,
        transferredTotalBytes: 0,
        currentFileBytes: 0,
        currentFileSize: firstFileSize || 0,
        lastCalcTime: now,
        lastCalcBytes: 0,
        speedSamples: [],
        currentSpeed: 0
    };
    updateMetricsUI();
}

function recordProgressBytes(bytesAdded) {
    if (!metrics.active) return;
    metrics.transferredTotalBytes += bytesAdded;
    metrics.currentFileBytes += bytesAdded;

    const now = performance.now();
    const elapsedSinceLast = (now - metrics.lastCalcTime) / 1000;
    
    // Update rolling average speed every ~150ms for responsive and smooth UI
    if (elapsedSinceLast >= 0.15) {
        const bytesInInterval = metrics.transferredTotalBytes - metrics.lastCalcBytes;
        const instantSpeed = bytesInInterval / elapsedSinceLast;
        
        metrics.speedSamples.push(instantSpeed);
        if (metrics.speedSamples.length > 5) metrics.speedSamples.shift();
        
        const sum = metrics.speedSamples.reduce((a, b) => a + b, 0);
        metrics.currentSpeed = sum / metrics.speedSamples.length;
        
        metrics.lastCalcTime = now;
        metrics.lastCalcBytes = metrics.transferredTotalBytes;
    }
    
    updateMetricsUI();
}

function updateMetricsUI() {
    // Current file progress percentage
    const filePct = metrics.currentFileSize > 0
        ? Math.min(100, Math.round((metrics.currentFileBytes / metrics.currentFileSize) * 100))
        : 0;
    
    if (progressBarFill) progressBarFill.style.width = `${filePct}%`;
    if (progressPercent) progressPercent.textContent = `${filePct}%`;

    // Speed display
    if (transferSpeedText) {
        transferSpeedText.textContent = formatSpeed(metrics.currentSpeed);
    }
    
    // Transferred display
    if (transferredBytesText) {
        const currentBytesFormatted = formatBytes(metrics.transferredTotalBytes);
        const totalBytesFormatted = formatBytes(metrics.totalBytes);
        transferredBytesText.textContent = `${currentBytesFormatted} / ${totalBytesFormatted}`;
    }

    // Estimated remaining time (ETA)
    if (transferEtaText) {
        const remaining = Math.max(0, metrics.totalBytes - metrics.transferredTotalBytes);
        if (metrics.currentSpeed > 0 && remaining > 0) {
            const etaSec = remaining / metrics.currentSpeed;
            transferEtaText.textContent = formatEta(etaSec);
        } else if (remaining === 0 && metrics.transferredTotalBytes > 0) {
            transferEtaText.textContent = 'Done!';
        } else {
            transferEtaText.textContent = 'Estimating...';
        }
    }

    // Overall progress (for batch transfers)
    if (overallProgressBarFill && overallProgressPercent) {
        const overallPct = metrics.totalBytes > 0
            ? Math.min(100, Math.round((metrics.transferredTotalBytes / metrics.totalBytes) * 100))
            : filePct;
        overallProgressBarFill.style.width = `${overallPct}%`;
        overallProgressPercent.textContent = `${overallPct}%`;
    }
}

// Initialize Peer
function initPeer() {
    // Generate a shorter, readable ID (optional, PeerJS generates longer ones by default)
    const customId = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    peer = new Peer(customId, {
        debug: 3
    });

    peer.on('open', (id) => {
        myPeerId = id;
        myIdEl.textContent = id;
        statusDot.className = 'status-dot online';
        statusText.textContent = 'Ready to sync';
        updateQR();
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'peer-unavailable') {
            showToast("Device not found. Please verify the Connection ID or QR code.", "error");
            if (transferZone) transferZone.classList.add('hidden');
            if (radarContainer) radarContainer.classList.add('hidden');
            return;
        }
        if (err.type === 'unavailable-id') {
            setTimeout(initPeer, 500);
            return;
        }
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Offline (Retry in 5s)';
        setTimeout(() => {
            if (peer && !peer.destroyed) {
                try { peer.destroy(); } catch (e) {}
            }
            initPeer();
        }, 5000);
    });

    // Handle Incoming Connection
    peer.on('connection', (conn) => {
        handleConnection(conn);
    });
}

function handleConnection(conn) {
    currentConn = conn;
    
    conn.on('open', () => {
        console.log("Connection established with:", conn.peer);
        if (radarContainer) radarContainer.classList.add('hidden');
        
        // If we have files ready to send, initiate the metadata exchange
        if (currentFiles.length > 0) {
            conn.send({
                type: 'metadata-batch',
                files: currentFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
            });
            showToast(`Connected! Sending transfer request for ${currentFiles.length} file(s)...`);
        }
    });

    conn.on('data', (data) => {
        if (!data) return;

        if (data.type === 'metadata-batch') {
            // Sender sent batch metadata, ask for acceptance
            incomingFiles = data.files || [];
            const totalSize = incomingFiles.reduce((acc, f) => acc + (f.size || 0), 0);
            const firstFile = incomingFiles[0] || { name: 'Document' };
            const names = incomingFiles.map(f => f.name).join(', ');
            
            incomingFileInfo.textContent = incomingFiles.length > 1
                ? `${incomingFiles.length} Documents: ${names.length > 36 ? names.substring(0, 33) + '...' : names} (${formatBytes(totalSize)})`
                : `"${firstFile.name}" (${formatBytes(totalSize)})`;
            
            if (incomingDocIcon) {
                incomingDocIcon.setAttribute('data-lucide', getFileIcon(firstFile.name));
            }
            incomingModal.classList.remove('hidden');
            lucide.createIcons();

        } else if (data.type === 'stream-start') {
            // Streaming start for incoming document
            isTransferAborted = false;
            receiveState.currentChunks = [];
            receiveState.receivedBytesForFile = 0;
            receiveState.currentFileIndex = data.index || 0;

            transferZone.classList.remove('hidden');
            if (radarContainer) radarContainer.classList.add('hidden');
            if (transferInfo) transferInfo.classList.remove('hidden');

            if (transferBadgeText) transferBadgeText.textContent = "📥 Downloading Document";
            if (progressStatusLabel) progressStatusLabel.textContent = "High-Speed P2P Downloading...";
            
            const totalCount = incomingFiles.length || 1;
            transferTitle.textContent = totalCount > 1 
                ? `Downloading (${(data.index || 0) + 1}/${totalCount}): ${data.name}`
                : `Downloading Document...`;
            
            fileNameText.textContent = data.name;
            fileNameText.title = data.name;
            fileSizeText.textContent = formatBytes(data.size || 0);

            if (batchCountBadge) {
                if (totalCount > 1) {
                    batchCountBadge.textContent = `${(data.index || 0) + 1} / ${totalCount}`;
                    batchCountBadge.classList.remove('hidden');
                } else {
                    batchCountBadge.classList.add('hidden');
                }
            }

            if (fileTypeIcon) {
                fileTypeIcon.setAttribute('data-lucide', getFileIcon(data.name));
                lucide.createIcons();
            }

            if (overallProgressContainer) {
                if (totalCount > 1) {
                    overallProgressContainer.classList.remove('hidden');
                } else {
                    overallProgressContainer.classList.add('hidden');
                }
            }

            // Start telemetry tracker if first document
            if (data.index === 0 || !metrics.active) {
                const totalBatchSize = incomingFiles.reduce((acc, f) => acc + (f.size || 0), 0) || data.size;
                startMetrics('receive', totalBatchSize, data.size);
            } else {
                metrics.currentFileBytes = 0;
                metrics.currentFileSize = data.size || 0;
                updateMetricsUI();
            }

        } else if (data.type === 'stream-chunk') {
            // Incoming chunk of document
            if (isTransferAborted) return;
            receiveState.currentChunks.push(data.data);
            const byteLen = data.data ? (data.data.byteLength || data.data.size || 0) : 0;
            receiveState.receivedBytesForFile += byteLen;
            recordProgressBytes(byteLen);

        } else if (data.type === 'stream-end') {
            // Document complete -> assemble and automatically trigger download/save
            const meta = incomingFiles[data.index] || {};
            const blob = new Blob(receiveState.currentChunks, { type: meta.mimeType || meta.type || 'application/octet-stream' });
            receivedBlobs.push({ name: data.name, blob: blob, size: blob.size });

            // Instant auto download to user's device
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 30000);

            const totalCount = incomingFiles.length || 1;
            if (data.index === totalCount - 1) {
                // All documents received!
                const totalDurationSec = Math.max(0.1, (performance.now() - metrics.startTime) / 1000);
                const avgSpeed = metrics.transferredTotalBytes / totalDurationSec;

                setTimeout(() => {
                    showSuccess(
                        `${totalCount} Document(s) received and downloaded successfully!`, 
                        true, 
                        metrics.transferredTotalBytes, 
                        avgSpeed, 
                        totalDurationSec
                    );
                    transferZone.classList.add('hidden');
                }, 400);
            }

        } else if (data.type === 'file-part') {
            // Fallback for legacy single-buffer transmissions
            const blob = new Blob([data.buffer]);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 30000);

            receivedBlobs.push({ name: data.name, blob: blob, size: blob.size });
            const progress = Math.round(((data.index + 1) / (incomingFiles.length || 1)) * 100);
            updateProgress(progress);

            if (data.index === (incomingFiles.length || 1) - 1) {
                showSuccess(`${incomingFiles.length} Document(s) received successfully.`, true, blob.size, 0, 1);
                transferZone.classList.add('hidden');
            } else {
                transferTitle.textContent = `Receiving (${data.index + 2}/${incomingFiles.length})...`;
            }

        } else if (data.type === 'accept') {
            // Receiver accepted, send all files with high-speed chunk streaming
            sendFileDataBatch();

        } else if (data.type === 'decline') {
            showToast("Transfer declined by receiver.", "error");
            transferZone.classList.add('hidden');
            if (radarContainer) radarContainer.classList.add('hidden');

        } else if (data.type === 'cancel') {
            isTransferAborted = true;
            transferZone.classList.add('hidden');
            if (radarContainer) radarContainer.classList.add('hidden');
            showToast("Transfer was cancelled by peer.", "error");
        }
    });

    conn.on('close', () => {
        showToast("Connection closed.", "info");
        console.log("Connection closed");
    });

    conn.on('error', (err) => {
        console.error("Connection error:", err);
        showToast("Connection error encountered.", "error");
    });
}

// --- Toast System ---
function showToast(msg, type = "info") {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- QR Scanner Logic ---
async function startScanner() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("Scanner requires HTTPS or localhost.", "error");
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        scanVideo.srcObject = stream;
        scanVideo.setAttribute("playsinline", true);
        scanVideo.play();
        scanning = true;
        scanModal.classList.remove('hidden');
        requestAnimationFrame(tick);
    } catch (err) {
        showToast("Camera access denied.", "error");
        console.error(err);
    }
}

function stopScanner() {
    scanning = false;
    if (scanVideo.srcObject) {
        scanVideo.srcObject.getTracks().forEach(track => track.stop());
    }
    scanModal.classList.add('hidden');
}

function tick() {
    if (!scanning) return;
    if (scanVideo.readyState === scanVideo.HAVE_ENOUGH_DATA) {
        canvasElement.height = scanVideo.videoHeight;
        canvasElement.width = scanVideo.videoWidth;
        canvas.drawImage(scanVideo, 0, 0, canvasElement.width, canvasElement.height);
        
        const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });

        if (code) {
            console.log("Found QR code", code.data);
            showToast("ID Found! Connecting...");
            targetIdInput.value = code.data;
            stopScanner();
            
            // Smarter redirection/action based on state
            if (currentFiles.length > 0) {
                initiateSend(code.data);
            } else {
                // If no file, assume we are receiving
                initiateReceive(code.data);
            }
        }
    }
    requestAnimationFrame(tick);
}

scanQrBtn.addEventListener('click', startScanner);
closeScanBtn.addEventListener('click', stopScanner);

// --- Interaction Logic ---

// Tab Switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
    });
});

// File Selection
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        prepareToSendBatch(Array.from(e.target.files));
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        prepareToSendBatch(Array.from(e.dataTransfer.files));
    }
});

function prepareToSendBatch(files) {
    currentFiles = files;
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    
    fileNameText.textContent = files.length > 1 ? `${files.length} Files Selected` : files[0].name;
    fileNameText.title = files.length > 1 ? `${files.length} Files Selected` : files[0].name;
    fileSizeText.textContent = formatBytes(totalSize);

    if (fileTypeIcon) {
        fileTypeIcon.setAttribute('data-lucide', getFileIcon(files[0].name));
        lucide.createIcons();
    }
    
    // Switch UI to show files are selected
    const dropZoneIcon = dropZone.querySelector('.drop-icon');
    const dropZoneText = dropZone.querySelector('p');
    
    if (dropZoneIcon && dropZoneText) {
        dropZoneIcon.setAttribute('data-lucide', 'check-circle-2');
        dropZoneIcon.className = 'drop-icon success-pulse';
        const fileLabel = files.length > 1 ? `${files.length} Document(s)` : files[0].name;
        dropZoneText.innerHTML = `Ready to send: <span class="gradient-text">${fileLabel}</span><br><small>${formatBytes(totalSize)}</small>`;
        lucide.createIcons();
    }

    const targetId = targetIdInput.value.trim().toUpperCase();
    if (targetId) {
        initiateSend(targetId);
    } else {
        showToast("Files ready. Share your ID or scan the QR code to connect.");
    }
}

function initiateSend(targetId) {
    if (!peer) return;
    isTransferAborted = false;
    
    transferZone.classList.remove('hidden');
    radarContainer.classList.remove('hidden');
    transferInfo.classList.add('hidden');
    if (radarStatusText) radarStatusText.textContent = "Connecting to peer device...";
    
    progressBarFill.style.width = '0%';
    progressPercent.textContent = '0%';
    if (transferSpeedText) transferSpeedText.textContent = '0 KB/s';
    if (transferredBytesText) transferredBytesText.textContent = '0 B';
    if (transferEtaText) transferEtaText.textContent = '--';

    const conn = peer.connect(targetId, { reliable: true });
    handleConnection(conn);

    conn.on('open', () => {
        radarContainer.classList.add('hidden');
        transferInfo.classList.remove('hidden');
        transferTitle.textContent = "Requesting Access from Peer...";
        if (transferBadgeText) transferBadgeText.textContent = "Connecting";
        if (progressStatusLabel) progressStatusLabel.textContent = "Waiting for approval...";
    });
    
    conn.on('error', (err) => {
        console.error("Connection error:", err);
        showToast("Device Discovery / Connection Failed", "error");
        transferZone.classList.add('hidden');
        radarContainer.classList.add('hidden');
    });
}

function initiateReceive(targetId) {
    if (!peer) return;
    isTransferAborted = false;

    transferZone.classList.remove('hidden');
    radarContainer.classList.remove('hidden');
    transferInfo.classList.add('hidden');
    if (radarStatusText) radarStatusText.textContent = "Connecting to sender host...";

    progressBarFill.style.width = '0%';
    progressPercent.textContent = '0%';
    if (transferSpeedText) transferSpeedText.textContent = '0 KB/s';
    if (transferredBytesText) transferredBytesText.textContent = '0 B';
    if (transferEtaText) transferEtaText.textContent = '--';

    const conn = peer.connect(targetId, { reliable: true });
    handleConnection(conn);

    conn.on('open', () => {
        radarContainer.classList.add('hidden');
        transferInfo.classList.remove('hidden');
        transferTitle.textContent = "Connected to Host";
        if (transferBadgeText) transferBadgeText.textContent = "Ready";
        if (progressStatusLabel) progressStatusLabel.textContent = "Waiting for sender to push files...";
    });

    conn.on('error', (err) => {
        console.error("Connection error:", err);
        showToast("Connection to Host Failed", "error");
        transferZone.classList.add('hidden');
        radarContainer.classList.add('hidden');
    });
}

async function sendFileDataBatch() {
    isTransferAborted = false;
    transferZone.classList.remove('hidden');
    radarContainer.classList.add('hidden');
    transferInfo.classList.remove('hidden');

    const totalBatchSize = currentFiles.reduce((acc, f) => acc + f.size, 0);
    startMetrics('send', totalBatchSize, currentFiles[0]?.size || 0);

    if (transferBadgeText) transferBadgeText.textContent = "📤 Sending Document";
    if (progressStatusLabel) progressStatusLabel.textContent = "High-Speed P2P Streaming...";

    if (currentFiles.length > 1) {
        overallProgressContainer.classList.remove('hidden');
    } else {
        overallProgressContainer.classList.add('hidden');
    }

    for (let i = 0; i < currentFiles.length; i++) {
        if (isTransferAborted) break;
        const file = currentFiles[i];

        metrics.currentFileBytes = 0;
        metrics.currentFileSize = file.size;

        fileNameText.textContent = file.name;
        fileNameText.title = file.name;
        fileSizeText.textContent = formatBytes(file.size);

        if (batchCountBadge) {
            if (currentFiles.length > 1) {
                batchCountBadge.textContent = `${i + 1} / ${currentFiles.length}`;
                batchCountBadge.classList.remove('hidden');
            } else {
                batchCountBadge.classList.add('hidden');
            }
        }

        if (fileTypeIcon) {
            fileTypeIcon.setAttribute('data-lucide', getFileIcon(file.name));
            lucide.createIcons();
        }

        transferTitle.textContent = currentFiles.length > 1
            ? `Sending Document (${i + 1}/${currentFiles.length})`
            : `Sending Document...`;

        const totalChunks = Math.ceil(file.size / CHUNK_SIZE) || 1;

        // Send stream-start
        currentConn.send({
            type: 'stream-start',
            index: i,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            totalChunks: totalChunks
        });

        // Fast chunk streaming directly from File slice
        let offset = 0;
        let chunkIndex = 0;

        while (offset < file.size && !isTransferAborted) {
            const slice = file.slice(offset, offset + CHUNK_SIZE);
            const buffer = await slice.arrayBuffer();

            // WebRTC dataChannel backpressure management
            const dc = currentConn.dataChannel;
            if (dc && dc.bufferedAmount > BUFFER_HIGH_WATER) {
                await new Promise(resolve => {
                    const checkBuffer = () => {
                        if (!dc || dc.readyState !== 'open' || isTransferAborted) {
                            resolve();
                            return;
                        }
                        if (dc.bufferedAmount <= BUFFER_LOW_WATER) {
                            resolve();
                        } else {
                            setTimeout(checkBuffer, 10);
                        }
                    };
                    if ('onbufferedamountlow' in dc) {
                        dc.bufferedAmountLowThreshold = BUFFER_LOW_WATER;
                        dc.onbufferedamountlow = () => {
                            dc.onbufferedamountlow = null;
                            resolve();
                        };
                    } else {
                        setTimeout(checkBuffer, 10);
                    }
                });
            }

            if (isTransferAborted) break;

            currentConn.send({
                type: 'stream-chunk',
                index: i,
                chunkIndex: chunkIndex,
                data: buffer
            });

            offset += buffer.byteLength;
            chunkIndex++;
            recordProgressBytes(buffer.byteLength);
        }

        if (isTransferAborted) break;

        // Send stream-end
        currentConn.send({
            type: 'stream-end',
            index: i,
            name: file.name
        });
    }

    if (!isTransferAborted) {
        const totalDurationSec = Math.max(0.1, (performance.now() - metrics.startTime) / 1000);
        const avgSpeed = metrics.transferredTotalBytes / totalDurationSec;

        setTimeout(() => {
            showSuccess(
                `${currentFiles.length} Document(s) sent successfully!`, 
                false, 
                metrics.transferredTotalBytes, 
                avgSpeed, 
                totalDurationSec
            );
            transferZone.classList.add('hidden');
        }, 400);
    }
}

function updateProgress(val) {
    if (progressBarFill) progressBarFill.style.width = `${val}%`;
    if (progressPercent) progressPercent.textContent = `${val}%`;
}

// Receiver actions
acceptBtn.addEventListener('click', () => {
    incomingModal.classList.add('hidden');
    transferZone.classList.remove('hidden');
    radarContainer.classList.add('hidden');
    transferInfo.classList.remove('hidden');

    const totalBatchSize = incomingFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    startMetrics('receive', totalBatchSize, incomingFiles[0]?.size || 0);

    if (transferBadgeText) transferBadgeText.textContent = "📥 Downloading Document";
    transferTitle.textContent = incomingFiles.length > 1 
        ? `Downloading Document (1/${incomingFiles.length})...`
        : `Downloading Document...`;
    if (progressStatusLabel) progressStatusLabel.textContent = "Requesting stream from sender...";

    receivedBlobs = [];
    if (currentConn && currentConn.open) {
        currentConn.send({ type: 'accept' });
    }
});

declineBtn.addEventListener('click', () => {
    incomingModal.classList.add('hidden');
    if (currentConn && currentConn.open) {
        currentConn.send({ type: 'decline' });
    }
});

// --- UI Helpers ---
function updateQR() {
    if (!myPeerId) return;
    
    qrContainer.innerHTML = '';
    let text = myPeerId;
    let label = "Scan this QR code from another device";
    const urlDisplay = document.getElementById('urlDisplay');

    if (currentQrType === 'url') {
        const baseUrl = window.location.origin + window.location.pathname;
        text = baseUrl + '#' + myPeerId;
        label = "Scan this to open site on another device";
        urlDisplay.classList.remove('hidden');
    } else {
        urlDisplay.classList.add('hidden');
    }

    new QRCode(qrContainer, {
        text: text,
        width: 160,
        height: 160,
        colorDark : "#0f172a",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    document.getElementById('qrLabel').textContent = label;
}

// Generate QR helper (legacy wrapper)
function generateQR(id) {
    myPeerId = id;
    updateQR();
}

// Check for auto-connect in URL hash
window.addEventListener('load', () => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
        const id = hash.substring(1);
        if (id && id.length === 6) { // Basic length check for our 6-char IDs
            targetIdInput.value = id;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            document.querySelector('[data-tab="receive"]').classList.add('active');
            document.getElementById('receiveTab').classList.add('active');
            
            showToast("Auto-filled sender ID from link!");
        }
    }
});

// QR Toggle Listeners
document.getElementById('qrIdBtn').addEventListener('click', () => {
    currentQrType = 'id';
    document.getElementById('qrIdBtn').classList.add('active');
    document.getElementById('qrUrlBtn').classList.remove('active');
    updateQR();
});

document.getElementById('qrUrlBtn').addEventListener('click', () => {
    currentQrType = 'url';
    document.getElementById('qrUrlBtn').classList.add('active');
    document.getElementById('qrIdBtn').classList.remove('active');
    updateQR();
});

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function showSuccess(msg, showDownload = false, totalBytes = 0, avgSpeed = 0, durationSec = 0) {
    successMsgText.textContent = msg;
    if (showDownload && receivedBlobs.length > 0) {
        downloadAgainBtn.classList.remove('hidden');
    } else {
        downloadAgainBtn.classList.add('hidden');
    }

    if (transferSummaryBox && totalBytes > 0) {
        transferSummaryBox.classList.remove('hidden');
        if (sumTotalSize) sumTotalSize.textContent = formatBytes(totalBytes);
        if (sumAvgSpeed) sumAvgSpeed.textContent = formatSpeed(avgSpeed);
        if (sumTimeTaken) sumTimeTaken.textContent = durationSec < 1 ? '< 1s' : `${durationSec.toFixed(1)}s`;
    } else if (transferSummaryBox) {
        transferSummaryBox.classList.add('hidden');
    }

    successModal.classList.remove('hidden');
    lucide.createIcons();
}

downloadAgainBtn.addEventListener('click', () => {
    receivedBlobs.forEach(item => {
        const url = URL.createObjectURL(item.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 30000);
    });
});

closeSuccessBtn.addEventListener('click', () => {
    successModal.classList.add('hidden');
    receivedBlobs = []; // Clear blobs after closing
});

// Copy ID
document.getElementById('copyIdBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(myIdEl.textContent);
    showToast("Connection ID copied!");
});

// Manual Connect Button
connectBtn.addEventListener('click', () => {
    const targetId = targetIdInput.value.trim().toUpperCase();
    if (!targetId) {
        showToast("Enter the ID of the receiver.", "error");
        return;
    }
    if (myPeerId && targetId === myPeerId.toUpperCase()) {
        showToast("Cannot connect to your own device ID.", "error");
        return;
    }
    if (currentFiles.length > 0) {
        initiateSend(targetId);
    } else {
        initiateReceive(targetId);
    }
});

// Cancel Transfer Logic
cancelTransferBtn.addEventListener('click', () => {
    isTransferAborted = true;
    metrics.active = false;
    if (currentConn && currentConn.open) {
        try {
            currentConn.send({ type: 'cancel' });
            currentConn.close();
        } catch (e) {}
    }
    transferZone.classList.add('hidden');
    if (radarContainer) radarContainer.classList.add('hidden');
    scanning = false;
    showToast("Transfer Aborted", "error");
});

// Method Switching Simulation
methodIcons.forEach(icon => {
    icon.addEventListener('click', () => {
        methodIcons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
        methodLabel.textContent = `Optimizing for ${icon.dataset.method}...`;
        showToast(`Switched to ${icon.dataset.method} mode`);
    });
});

// --- Logo QR Modal Logic ---
const logoBtn = document.getElementById('logoBtn');
const logoQrModal = document.getElementById('logoQrModal');
const closeLogoQrBtn = document.getElementById('closeLogoQrBtn');
const logoQrCodeContainer = document.getElementById('logoQrCodeContainer');
let logoQrInstance = null;

logoBtn.addEventListener('click', () => {
    logoQrModal.classList.remove('hidden');
    
    // Generate URL including Peer ID if available
    const baseUrl = window.location.origin + window.location.pathname;
    const text = baseUrl + (myPeerId ? '#' + myPeerId : '');
    
    if (!logoQrInstance) {
        logoQrInstance = new QRCode(logoQrCodeContainer, {
            text: text,
            width: 180,
            height: 180,
            colorDark : "#0f172a",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    } else {
        logoQrInstance.clear();
        logoQrInstance.makeCode(text);
    }
});

closeLogoQrBtn.addEventListener('click', () => {
    logoQrModal.classList.add('hidden');
});

// --- Help & Connection Guide Modal Logic ---
const syncHelpBtn = document.getElementById('syncHelpBtn');
const helpGuideModal = document.getElementById('helpGuideModal');
const closeHelpGuideBtn = document.getElementById('closeHelpGuideBtn');
const closeHelpGuideBtn2 = document.getElementById('closeHelpGuideBtn2');

function openHelpGuide() {
    if (!helpGuideModal) return;
    helpGuideModal.classList.remove('hidden');
    syncActiveGuideMethod();
    lucide.createIcons();
}

function closeHelpGuide() {
    if (!helpGuideModal) return;
    helpGuideModal.classList.add('hidden');
}

if (syncHelpBtn) {
    syncHelpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openHelpGuide();
    });
}

if (closeHelpGuideBtn) closeHelpGuideBtn.addEventListener('click', closeHelpGuide);
if (closeHelpGuideBtn2) closeHelpGuideBtn2.addEventListener('click', closeHelpGuide);

if (helpGuideModal) {
    helpGuideModal.addEventListener('click', (e) => {
        if (e.target === helpGuideModal) {
            closeHelpGuide();
        }
    });
}

// Sync active method with guide cards
function syncActiveGuideMethod() {
    const activeIcon = document.querySelector('.method-icon.active');
    const activeMethod = activeIcon ? activeIcon.dataset.method : 'Smart Connect';
    
    document.querySelectorAll('.help-option-card').forEach(card => {
        const cardMethod = card.getAttribute('data-guide-method');
        const btnSpan = card.querySelector('.option-select-btn span');
        if (cardMethod === activeMethod) {
            card.classList.add('active');
            if (btnSpan) btnSpan.textContent = 'Active Mode';
        } else {
            card.classList.remove('active');
            if (btnSpan) btnSpan.textContent = `Activate ${cardMethod}`;
        }
    });
}

// Method selection from help guide
document.querySelectorAll('.option-select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetMethod = btn.getAttribute('data-method-target');
        if (targetMethod) {
            methodIcons.forEach(icon => {
                if (icon.dataset.method === targetMethod) {
                    icon.classList.add('active');
                } else {
                    icon.classList.remove('active');
                }
            });
            methodLabel.textContent = `Optimizing for ${targetMethod}...`;
            showToast(`Switched to ${targetMethod} mode`);
            syncActiveGuideMethod();
        }
    });
});

// Allow clicking the card directly
document.querySelectorAll('.help-option-card').forEach(card => {
    card.addEventListener('click', () => {
        const targetMethod = card.getAttribute('data-guide-method');
        if (targetMethod) {
            methodIcons.forEach(icon => {
                if (icon.dataset.method === targetMethod) {
                    icon.classList.add('active');
                } else {
                    icon.classList.remove('active');
                }
            });
            methodLabel.textContent = `Optimizing for ${targetMethod}...`;
            showToast(`Switched to ${targetMethod} mode`);
            syncActiveGuideMethod();
        }
    });
});

// ESC key listener to dismiss modals
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (helpGuideModal && !helpGuideModal.classList.contains('hidden')) closeHelpGuide();
        if (logoQrModal && !logoQrModal.classList.contains('hidden')) logoQrModal.classList.add('hidden');
        if (scanModal && !scanModal.classList.contains('hidden')) stopScanner();
    }
});

// --- Theme Toggle Logic ---
const themeToggleBtn = document.getElementById('themeToggleBtn');

function getStoredTheme() {
    const saved = localStorage.getItem('sharewith-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
    }
    return 'dark';
}

function updateThemeUI(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (!themeToggleBtn) return;
    
    const isDark = theme === 'dark';
    themeToggleBtn.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}"></i>`;
    const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    themeToggleBtn.setAttribute('title', label);
    themeToggleBtn.setAttribute('aria-label', label);
    lucide.createIcons();
}

function setTheme(theme, showNotification = false) {
    localStorage.setItem('sharewith-theme', theme);
    updateThemeUI(theme);
    if (showNotification) {
        showToast(`Theme switched to ${theme.charAt(0).toUpperCase() + theme.slice(1)} mode`);
    }
}

// Initialize theme UI
updateThemeUI(getStoredTheme());

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme, true);
    });
}

// Listen to system theme preference changes if user hasn't explicitly set one
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
        if (!localStorage.getItem('sharewith-theme')) {
            updateThemeUI(e.matches ? 'light' : 'dark');
        }
    });
}

// Initial Start
initPeer();


