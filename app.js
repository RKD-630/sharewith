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
const savedFilesList = document.getElementById('savedFilesList');
const transferSummaryBox = document.getElementById('transferSummaryBox');
const sumTotalSize = document.getElementById('sumTotalSize');
const sumAvgSpeed = document.getElementById('sumAvgSpeed');
const sumTimeTaken = document.getElementById('sumTimeTaken');
const closeSuccessBtn = document.getElementById('closeSuccessBtn');
const downloadAgainBtn = document.getElementById('downloadAgainBtn');

const refreshBtn = document.getElementById('refreshBtn');

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

// --- Continuous Serial Numbering for Downloaded Files ---
const sessionDownloadedFiles = new Set();

function getDownloadedFilesHistory() {
    try {
        const stored = localStorage.getItem('sharewith-downloaded-files');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

function recordDownloadedFileName(filename) {
    if (!filename) return;
    sessionDownloadedFiles.add(filename.toLowerCase());
    try {
        const history = getDownloadedFilesHistory();
        if (!history.some(item => item.toLowerCase() === filename.toLowerCase())) {
            history.push(filename);
            if (history.length > 500) history.shift();
            localStorage.setItem('sharewith-downloaded-files', JSON.stringify(history));
        }
    } catch (e) {}
}

function isFileNameTaken(filename) {
    if (!filename) return false;
    const lower = filename.toLowerCase();
    if (sessionDownloadedFiles.has(lower)) return true;
    const history = getDownloadedFilesHistory();
    return history.some(item => item.toLowerCase() === lower);
}

/**
 * Returns a unique, serialized file name if a file with this name was already saved.
 * Automatically continues serial numbers:
 *   "document.pdf" -> if exists: "document (1).pdf" -> "document (2).pdf" -> "document (3).pdf"
 *   "report (1).pdf" -> if exists: "report (2).pdf"
 */
function getUniqueDownloadName(originalName) {
    if (!originalName) originalName = 'document';

    // If not taken, record and return as is
    if (!isFileNameTaken(originalName)) {
        recordDownloadedFileName(originalName);
        return originalName;
    }

    // Split base name and extension
    const dotIndex = originalName.lastIndexOf('.');
    let base = originalName;
    let ext = '';
    if (dotIndex > 0) {
        base = originalName.substring(0, dotIndex);
        ext = originalName.substring(dotIndex); // includes '.'
    }

    // Check if the base already has a serial number like "name (1)" or "name (2)"
    const serialMatch = base.match(/^(.*?)\s*\((\d+)\)$/);
    let cleanBase = base;
    let seq = 1;

    if (serialMatch) {
        cleanBase = serialMatch[1].trim();
        seq = parseInt(serialMatch[2], 10) + 1;
    }

    // Find the next available continuous serial number
    let candidate = '';
    while (true) {
        candidate = `${cleanBase} (${seq})${ext}`;
        if (!isFileNameTaken(candidate)) {
            recordDownloadedFileName(candidate);
            return candidate;
        }
        seq++;
    }
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
        statusText.textContent = '';
        if (refreshBtn) refreshBtn.classList.remove('spinning');
        updateQR();
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (refreshBtn) refreshBtn.classList.remove('spinning');
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

// Refresh P2P Connection & ID
function refreshConnection() {
    if (refreshBtn) refreshBtn.classList.add('spinning');
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Refreshing ID & server...';
    showToast('Refreshing Connection & ID...');

    if (currentConn) {
        try { currentConn.close(); } catch (e) {}
        currentConn = null;
    }

    if (peer && !peer.destroyed) {
        try { peer.destroy(); } catch (e) {}
        peer = null;
    }

    setTimeout(() => {
        initPeer();
        setTimeout(() => {
            if (refreshBtn) refreshBtn.classList.remove('spinning');
        }, 1200);
    }, 300);
}

if (refreshBtn) {
    refreshBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        refreshConnection();
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
            // Document complete -> assemble and automatically trigger download/save with serialized continuous naming
            const meta = incomingFiles[data.index] || {};
            const uniqueName = getUniqueDownloadName(data.name);
            const wasRenamed = uniqueName !== data.name;
            const blob = new Blob(receiveState.currentChunks, { type: meta.mimeType || meta.type || 'application/octet-stream' });
            receivedBlobs.push({ 
                name: uniqueName, 
                originalName: data.name, 
                blob: blob, 
                size: blob.size,
                wasRenamed: wasRenamed 
            });

            // Instant auto download to user's device
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = uniqueName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 30000);

            if (wasRenamed) {
                showToast(`Saved as "${uniqueName}" (filename already exists)`);
            }

            const totalCount = incomingFiles.length || 1;
            if (data.index === totalCount - 1) {
                // All documents received!
                const totalDurationSec = Math.max(0.1, (performance.now() - metrics.startTime) / 1000);
                const avgSpeed = metrics.transferredTotalBytes / totalDurationSec;

                setTimeout(() => {
                    showSuccess(
                        totalCount > 1 
                            ? `${totalCount} Document(s) received and downloaded successfully!` 
                            : wasRenamed 
                                ? `Saved as "${uniqueName}" (numbered sequentially)` 
                                : `Document received and saved successfully!`, 
                        true, 
                        metrics.transferredTotalBytes, 
                        avgSpeed, 
                        totalDurationSec
                    );
                    transferZone.classList.add('hidden');
                }, 400);
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

    // Check if an archive (.zip or .rar) is among the selected files
    checkSelectedArchiveBanner(files);

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
    if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 Bytes';
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

        if (savedFilesList) {
            savedFilesList.innerHTML = '';
            receivedBlobs.forEach(item => {
                const row = document.createElement('div');
                row.className = 'saved-file-item';

                const left = document.createElement('div');
                left.className = 'saved-file-name-wrap';

                const icon = document.createElement('i');
                icon.setAttribute('data-lucide', getFileIcon(item.name));

                const nameSpan = document.createElement('span');
                nameSpan.className = 'saved-file-name';
                nameSpan.textContent = item.name;
                nameSpan.title = item.wasRenamed 
                    ? `Originally: ${item.originalName} → Saved as: ${item.name}` 
                    : item.name;

                left.appendChild(icon);
                left.appendChild(nameSpan);

                const right = document.createElement('div');
                right.className = 'saved-file-meta-right';

                if (item.wasRenamed) {
                    const badge = document.createElement('span');
                    badge.className = 'saved-file-badge';
                    badge.textContent = 'Numbered (duplicate)';
                    badge.title = `File name was already in use. Saved with continuous serial number.`;
                    right.appendChild(badge);
                }

                const sizeSpan = document.createElement('span');
                sizeSpan.className = 'saved-file-size';
                sizeSpan.textContent = formatBytes(item.size || 0);
                right.appendChild(sizeSpan);

                // Add Archive action buttons if received file is a ZIP or RAR
                const ext = (item.name || '').split('.').pop().toLowerCase();
                if (['zip', 'rar'].includes(ext)) {
                    const inspectBtn = document.createElement('button');
                    inspectBtn.type = 'button';
                    inspectBtn.className = 'action-pill-btn';
                    inspectBtn.innerHTML = '<i data-lucide="archive"></i> Inspect';
                    inspectBtn.title = 'Inspect and extract files inside archive';
                    inspectBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openArchiveInspector(item.blob, item.name);
                    });
                    right.appendChild(inspectBtn);

                    if (ext === 'zip') {
                        const runBtn = document.createElement('button');
                        runBtn.type = 'button';
                        runBtn.className = 'action-pill-btn primary';
                        runBtn.innerHTML = '<i data-lucide="play"></i> Run';
                        runBtn.title = 'Execute web application in sandboxed runner';
                        runBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            launchArchiveRunner(item.blob, item.name);
                        });
                        right.appendChild(runBtn);
                    }
                }

                row.appendChild(left);
                row.appendChild(right);
                savedFilesList.appendChild(row);
            });
            savedFilesList.classList.remove('hidden');
        }
    } else {
        downloadAgainBtn.classList.add('hidden');
        if (savedFilesList) {
            savedFilesList.innerHTML = '';
            savedFilesList.classList.add('hidden');
        }
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
    if (savedFilesList) {
        savedFilesList.innerHTML = '';
        savedFilesList.classList.add('hidden');
    }
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

// Global keyboard shortcuts (ESC to dismiss modals, Ctrl+R to open Test Suite)
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (helpGuideModal && !helpGuideModal.classList.contains('hidden')) closeHelpGuide();
        if (logoQrModal && !logoQrModal.classList.contains('hidden')) logoQrModal.classList.add('hidden');
        if (scanModal && !scanModal.classList.contains('hidden')) stopScanner();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        refreshConnection();
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

// --- First-Time Welcome Onboarding Notification ---
const welcomeNotification = document.getElementById('welcomeNotification');
const closeWelcomeBtn = document.getElementById('closeWelcomeBtn');
const welcomeGuideBtn = document.getElementById('welcomeGuideBtn');
const welcomeDismissBtn = document.getElementById('welcomeDismissBtn');

const FIRST_TIME_WELCOME_KEY = 'sharewith-welcome-shown';

function isFirstTimeUser() {
    try {
        return !localStorage.getItem(FIRST_TIME_WELCOME_KEY);
    } catch (e) {
        return false;
    }
}

function showWelcomeNotification() {
    if (!welcomeNotification) return;
    welcomeNotification.classList.remove('hidden');
    lucide.createIcons();
}

function dismissWelcomeNotification() {
    if (!welcomeNotification) return;
    welcomeNotification.classList.add('hidden');
    try {
        localStorage.setItem(FIRST_TIME_WELCOME_KEY, 'true');
    } catch (e) {}
}

function checkFirstTimeWelcome() {
    if (isFirstTimeUser()) {
        setTimeout(() => {
            showWelcomeNotification();
        }, 500);
    }
}

if (closeWelcomeBtn) closeWelcomeBtn.addEventListener('click', dismissWelcomeNotification);
if (welcomeDismissBtn) welcomeDismissBtn.addEventListener('click', dismissWelcomeNotification);
if (welcomeGuideBtn) {
    welcomeGuideBtn.addEventListener('click', () => {
        dismissWelcomeNotification();
        openHelpGuide();
    });
}

// Check first-time welcome notification on startup
checkFirstTimeWelcome();

// Initial Start
initPeer();

// ============================================================
// NEW FEATURES: ARCHIVE (.ZIP / .RAR) INSPECTOR, RUNNER & APP SHARING
// ============================================================

let currentArchiveData = null;
let currentArchiveBlob = null;
let currentArchiveName = '';
let activeRunnerBlobUrls = [];
let selectedArchiveFile = null;

// DOM Elements for Archive Features
const selectedArchiveBanner = document.getElementById('selectedArchiveBanner');
const archiveBannerTitle = document.getElementById('archiveBannerTitle');
const archiveBannerDesc = document.getElementById('archiveBannerDesc');
const btnInspectSelectedArchive = document.getElementById('btnInspectSelectedArchive');
const btnRunSelectedArchive = document.getElementById('btnRunSelectedArchive');

const archiveModal = document.getElementById('archiveModal');
const archiveModalTitle = document.getElementById('archiveModalTitle');
const archiveModalSubtitle = document.getElementById('archiveModalSubtitle');
const closeArchiveBtn = document.getElementById('closeArchiveBtn');
const closeArchiveBtn2 = document.getElementById('closeArchiveBtn2');
const archiveSearchInput = document.getElementById('archiveSearchInput');
const archiveFilesList = document.getElementById('archiveFilesList');
const archiveSummaryText = document.getElementById('archiveSummaryText');
const btnArchiveRunApp = document.getElementById('btnArchiveRunApp');
const btnArchiveExtractAll = document.getElementById('btnArchiveExtractAll');

const archiveRunnerModal = document.getElementById('archiveRunnerModal');
const runnerAppTitle = document.getElementById('runnerAppTitle');
const runnerFrame = document.getElementById('runnerFrame');
const runnerLoader = document.getElementById('runnerLoader');
const runnerLoaderText = document.getElementById('runnerLoaderText');
const runnerReloadBtn = document.getElementById('runnerReloadBtn');
const runnerFullscreenBtn = document.getElementById('runnerFullscreenBtn');
const runnerNewTabBtn = document.getElementById('runnerNewTabBtn');
const closeRunnerBtn = document.getElementById('closeRunnerBtn');

const archivePreviewModal = document.getElementById('archivePreviewModal');
const previewFileTitle = document.getElementById('previewFileTitle');
const previewBody = document.getElementById('previewBody');
const previewDownloadBtn = document.getElementById('previewDownloadBtn');
const closePreviewBtn = document.getElementById('closePreviewBtn');
const closePreviewBtn2 = document.getElementById('closePreviewBtn2');

const navShareAppBtn = document.getElementById('navShareAppBtn');
const btnExportAppZip = document.getElementById('btnExportAppZip');
const btnSendAppToPeer = document.getElementById('btnSendAppToPeer');

// Helper: Check if archive file is selected in Send Tab
function checkSelectedArchiveBanner(files) {
    if (!selectedArchiveBanner) return;
    const archive = files.find(f => {
        const ext = (f.name || '').split('.').pop().toLowerCase();
        return ['zip', 'rar'].includes(ext);
    });

    if (archive) {
        selectedArchiveFile = archive;
        selectedArchiveBanner.classList.remove('hidden');
        if (archiveBannerTitle) archiveBannerTitle.textContent = `Archive: ${archive.name}`;
        if (archiveBannerDesc) archiveBannerDesc.textContent = `${formatBytes(archive.size)} • Click Inspect or Run to explore`;
        
        // Check if zip contains web app HTML
        if (archive.name.toLowerCase().endsWith('.zip') && window.JSZip) {
            JSZip.loadAsync(archive).then(zip => {
                const hasHtml = Object.keys(zip.files).some(p => p.toLowerCase().endsWith('.html') || p.toLowerCase().endsWith('.htm'));
                if (btnRunSelectedArchive) {
                    btnRunSelectedArchive.classList.toggle('hidden', !hasHtml);
                }
            }).catch(() => {
                if (btnRunSelectedArchive) btnRunSelectedArchive.classList.add('hidden');
            });
        } else if (btnRunSelectedArchive) {
            btnRunSelectedArchive.classList.add('hidden');
        }
        lucide.createIcons();
    } else {
        selectedArchiveFile = null;
        selectedArchiveBanner.classList.add('hidden');
    }
}

if (btnInspectSelectedArchive) {
    btnInspectSelectedArchive.addEventListener('click', () => {
        if (selectedArchiveFile) {
            openArchiveInspector(selectedArchiveFile, selectedArchiveFile.name);
        }
    });
}

if (btnRunSelectedArchive) {
    btnRunSelectedArchive.addEventListener('click', () => {
        if (selectedArchiveFile) {
            launchArchiveRunner(selectedArchiveFile, selectedArchiveFile.name);
        }
    });
}

// MIME Type Helper for extracted assets
function getMimeType(filePath) {
    const ext = (filePath || '').split('.').pop().toLowerCase();
    const map = {
        'html': 'text/html',
        'htm': 'text/html',
        'js': 'text/javascript',
        'mjs': 'text/javascript',
        'css': 'text/css',
        'json': 'application/json',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
        'ico': 'image/x-icon',
        'txt': 'text/plain',
        'md': 'text/markdown',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'pdf': 'application/pdf',
        'woff': 'font/woff',
        'woff2': 'font/woff2',
        'ttf': 'font/ttf'
    };
    return map[ext] || 'application/octet-stream';
}

// Pure JS Parser for RAR v4 / v5 Header Inspection
async function parseRarHeader(fileOrBlob) {
    const buffer = await fileOrBlob.slice(0, Math.min(fileOrBlob.size, 1024 * 1024 * 4)).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const entries = [];

    // Signature check
    // RAR v4: 0x52 0x61 0x72 0x21 0x1A 0x07 0x00
    // RAR v5: 0x52 0x61 0x72 0x21 0x1A 0x07 0x01 0x00
    const isRar4 = bytes[0] === 0x52 && bytes[1] === 0x61 && bytes[2] === 0x72 && bytes[3] === 0x21 && bytes[4] === 0x1A && bytes[5] === 0x07 && bytes[6] === 0x00;
    const isRar5 = bytes[0] === 0x52 && bytes[1] === 0x61 && bytes[2] === 0x72 && bytes[3] === 0x21 && bytes[4] === 0x1A && bytes[5] === 0x07 && bytes[6] === 0x01 && bytes[7] === 0x00;

    if (!isRar4 && !isRar5) {
        throw new Error('Not a valid RAR archive signature.');
    }

    if (isRar4) {
        let pos = 7;
        const view = new DataView(buffer);
        while (pos < bytes.length - 7) {
            const headType = view.getUint8(pos + 2);
            const headFlags = view.getUint16(pos + 3, true);
            let headSize = view.getUint16(pos + 5, true);

            if (headFlags & 0x8000) {
                // Add size
                if (pos + 11 <= bytes.length) {
                    const addSize = view.getUint32(pos + 7, true);
                    headSize += addSize;
                }
            }

            if (headType === 0x74 && pos + 32 <= bytes.length) {
                // FILE_HEAD
                const packSize = view.getUint32(pos + 7, true);
                const unpSize = view.getUint32(pos + 11, true);
                const nameSize = view.getUint16(pos + 26, true);
                let name = '';
                if (pos + 32 + nameSize <= bytes.length) {
                    const nameBytes = bytes.subarray(pos + 32, pos + 32 + nameSize);
                    name = new TextDecoder('utf-8').decode(nameBytes);
                }
                if (name) {
                    entries.push({
                        path: name,
                        name: name.split('/').pop() || name,
                        dir: (headFlags & 0x00E0) === 0x00E0,
                        size: unpSize,
                        compressedSize: packSize,
                        isRar: true
                    });
                }
                pos += headSize + packSize;
            } else {
                if (headSize <= 0) break;
                pos += headSize;
            }
        }
    }

    // If no entries extracted via header parse, return informative fallback entry
    if (entries.length === 0) {
        entries.push({
            path: fileOrBlob.name || 'archive_contents.rar',
            name: fileOrBlob.name || 'archive_contents.rar',
            dir: false,
            size: fileOrBlob.size,
            compressedSize: fileOrBlob.size,
            isRar: true
        });
    }

    return { type: 'rar', entries };
}

// Master Archive Parser (Handles .zip and .rar)
async function parseArchive(fileOrBlob, fileName) {
    const ext = (fileName || fileOrBlob.name || '').split('.').pop().toLowerCase();

    if (ext === 'zip') {
        if (!window.JSZip) {
            throw new Error('JSZip library is initializing. Please try again in a moment.');
        }
        const zip = await JSZip.loadAsync(fileOrBlob);
        const entries = [];
        zip.forEach((relativePath, zipEntry) => {
            entries.push({
                path: relativePath,
                name: relativePath.split('/').filter(Boolean).pop() || relativePath,
                dir: zipEntry.dir,
                size: zipEntry._data ? (zipEntry._data.uncompressedSize || 0) : 0,
                entry: zipEntry,
                isZip: true
            });
        });
        return { type: 'zip', zipInstance: zip, entries };
    } else if (ext === 'rar') {
        return await parseRarHeader(fileOrBlob);
    } else {
        throw new Error('Unsupported archive type. Only .zip and .rar are supported.');
    }
}

// Open Archive Inspector Modal
async function openArchiveInspector(fileOrBlob, fileName) {
    if (!archiveModal) return;
    currentArchiveBlob = fileOrBlob;
    currentArchiveName = fileName || fileOrBlob.name || 'archive.zip';

    if (archiveModalTitle) archiveModalTitle.textContent = currentArchiveName;
    if (archiveModalSubtitle) archiveModalSubtitle.textContent = 'Reading archive contents...';
    if (archiveFilesList) archiveFilesList.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Scanning files...</div>';

    archiveModal.classList.remove('hidden');

    try {
        const parsed = await parseArchive(fileOrBlob, currentArchiveName);
        currentArchiveData = parsed;
        renderArchiveFilesList(parsed.entries);

        // Check if there is an HTML app to run
        const htmlEntry = parsed.entries.find(e => !e.dir && (e.path.toLowerCase().endsWith('.html') || e.path.toLowerCase().endsWith('.htm')));
        if (btnArchiveRunApp) {
            btnArchiveRunApp.classList.toggle('hidden', !htmlEntry || parsed.type !== 'zip');
            if (htmlEntry) {
                btnArchiveRunApp.onclick = () => launchArchiveRunner(fileOrBlob, currentArchiveName, htmlEntry.path);
            }
        }
        if (archiveModalSubtitle) {
            archiveModalSubtitle.textContent = `${parsed.type.toUpperCase()} Archive • ${formatBytes(fileOrBlob.size)}`;
        }
    } catch (err) {
        console.error('Archive parse error:', err);
        if (archiveFilesList) {
            archiveFilesList.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: #ef4444;">Unable to inspect archive: ${err.message}</div>`;
        }
        showToast(err.message, 'error');
    }
}

// Render files inside Archive Inspector table
function renderArchiveFilesList(entries, filterText = '') {
    if (!archiveFilesList) return;
    archiveFilesList.innerHTML = '';

    const q = filterText.toLowerCase().trim();
    const filtered = entries.filter(e => !q || e.path.toLowerCase().includes(q));

    if (filtered.length === 0) {
        archiveFilesList.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No matching files found inside archive.</div>';
        if (archiveSummaryText) archiveSummaryText.textContent = `0 of ${entries.length} files`;
        return;
    }

    filtered.forEach(item => {
        const row = document.createElement('div');
        row.className = `archive-file-row ${item.dir ? 'is-dir' : ''}`;

        const left = document.createElement('div');
        left.className = 'archive-file-left';

        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', item.dir ? 'folder' : getFileIcon(item.name));

        const nameSpan = document.createElement('span');
        nameSpan.className = 'archive-file-name';
        nameSpan.textContent = item.path;
        nameSpan.title = item.path;

        left.appendChild(icon);
        left.appendChild(nameSpan);

        const right = document.createElement('div');
        right.className = 'archive-file-right';

        if (!item.dir && item.size >= 0) {
            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'archive-file-size';
            sizeSpan.textContent = formatBytes(item.size);
            right.appendChild(sizeSpan);
        }

        // Action buttons
        if (!item.dir && item.isZip && currentArchiveData?.zipInstance) {
            const ext = item.name.split('.').pop().toLowerCase();

            // Preview button for media & text
            if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'txt', 'md', 'json', 'js', 'css', 'mp3', 'wav', 'mp4'].includes(ext)) {
                const prevBtn = document.createElement('button');
                prevBtn.type = 'button';
                prevBtn.className = 'archive-row-btn';
                prevBtn.innerHTML = '<i data-lucide="eye"></i> Preview';
                prevBtn.addEventListener('click', () => previewArchiveEntry(item));
                right.appendChild(prevBtn);
            }

            // Run button for HTML web applications
            if (['html', 'htm'].includes(ext)) {
                const runBtn = document.createElement('button');
                runBtn.type = 'button';
                runBtn.className = 'archive-row-btn run-btn';
                runBtn.innerHTML = '<i data-lucide="play"></i> Run';
                runBtn.addEventListener('click', () => {
                    launchArchiveRunner(currentArchiveBlob, currentArchiveName, item.path);
                });
                right.appendChild(runBtn);
            }

            // Extract single file button
            const dlBtn = document.createElement('button');
            dlBtn.type = 'button';
            dlBtn.className = 'archive-row-btn';
            dlBtn.innerHTML = '<i data-lucide="download"></i>';
            dlBtn.title = 'Extract & Download this file';
            dlBtn.addEventListener('click', () => extractSingleZipEntry(item));
            right.appendChild(dlBtn);
        } else if (!item.dir && item.isRar) {
            const dlBtn = document.createElement('button');
            dlBtn.type = 'button';
            dlBtn.className = 'archive-row-btn';
            dlBtn.innerHTML = '<i data-lucide="download"></i> Save Archive';
            dlBtn.addEventListener('click', () => {
                const url = URL.createObjectURL(currentArchiveBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = currentArchiveName;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            });
            right.appendChild(dlBtn);
        }

        row.appendChild(left);
        row.appendChild(right);
        archiveFilesList.appendChild(row);
    });

    if (archiveSummaryText) {
        const totalSize = entries.reduce((acc, e) => acc + (e.size || 0), 0);
        archiveSummaryText.textContent = `${entries.length} items (${formatBytes(totalSize)} uncompressed)`;
    }

    lucide.createIcons();
}

// Search Filter inside Archive Inspector
if (archiveSearchInput) {
    archiveSearchInput.addEventListener('input', (e) => {
        if (currentArchiveData?.entries) {
            renderArchiveFilesList(currentArchiveData.entries, e.target.value);
        }
    });
}

// Extract single file from ZIP
async function extractSingleZipEntry(item) {
    try {
        const blob = await item.entry.async('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 20000);
        showToast(`Extracted: ${item.name}`);
    } catch (err) {
        showToast(`Failed to extract ${item.name}`, 'error');
    }
}

// Extract all files from ZIP archive
if (btnArchiveExtractAll) {
    btnArchiveExtractAll.addEventListener('click', async () => {
        if (!currentArchiveData || !currentArchiveData.zipInstance) {
            // If RAR or raw archive, trigger standard download
            if (currentArchiveBlob) {
                const url = URL.createObjectURL(currentArchiveBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = currentArchiveName;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 10000);
                showToast(`Downloaded: ${currentArchiveName}`);
            }
            return;
        }

        const entries = currentArchiveData.entries.filter(e => !e.dir);
        let extractedCount = 0;
        showToast(`Extracting ${entries.length} files...`);

        for (const item of entries) {
            try {
                const blob = await item.entry.async('blob');
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = item.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 25000);
                extractedCount++;
            } catch (e) {
                console.error('Error extracting item:', item.path, e);
            }
        }
        showToast(`Extracted ${extractedCount} files successfully!`);
    });
}

if (closeArchiveBtn) closeArchiveBtn.addEventListener('click', () => archiveModal.classList.add('hidden'));
if (closeArchiveBtn2) closeArchiveBtn2.addEventListener('click', () => archiveModal.classList.add('hidden'));

// Preview an individual file inside archive
async function previewArchiveEntry(item) {
    if (!archivePreviewModal || !previewBody) return;
    if (previewFileTitle) previewFileTitle.textContent = item.path;
    previewBody.innerHTML = '<div style="padding: 1rem; color: var(--text-muted);">Loading preview...</div>';
    archivePreviewModal.classList.remove('hidden');

    try {
        const ext = item.name.split('.').pop().toLowerCase();
        const blob = await item.entry.async('blob');
        const url = URL.createObjectURL(blob);

        if (previewDownloadBtn) {
            previewDownloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = url;
                a.download = item.name;
                a.click();
            };
        }

        if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
            previewBody.innerHTML = `<img src="${url}" alt="${item.name}" />`;
        } else if (['mp4', 'webm'].includes(ext)) {
            previewBody.innerHTML = `<video controls autoplay src="${url}" style="max-width:100%;"></video>`;
        } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
            previewBody.innerHTML = `<audio controls autoplay src="${url}"></audio>`;
        } else if (['txt', 'md', 'json', 'js', 'css', 'html'].includes(ext)) {
            const text = await item.entry.async('text');
            const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            previewBody.innerHTML = `<pre><code>${safeText}</code></pre>`;
        } else {
            previewBody.innerHTML = `<p style="color: var(--text-muted);">Preview not available for this format.</p>`;
        }
    } catch (err) {
        previewBody.innerHTML = `<p style="color: #ef4444;">Failed to load preview: ${err.message}</p>`;
    }
}

if (closePreviewBtn) closePreviewBtn.addEventListener('click', () => archivePreviewModal.classList.add('hidden'));
if (closePreviewBtn2) closePreviewBtn2.addEventListener('click', () => archivePreviewModal.classList.add('hidden'));

// ============================================================
// IN-BROWSER EXECUTION SANDBOX RUNNER ENGINE
// ============================================================
let currentRunnerState = {
    fileOrBlob: null,
    fileName: '',
    entryHtmlPath: '',
    mainUrl: null
};

function cleanupRunnerUrls() {
    activeRunnerBlobUrls.forEach(url => URL.revokeObjectURL(url));
    activeRunnerBlobUrls = [];
}

async function launchArchiveRunner(fileOrBlob, fileName, targetHtmlPath = null) {
    if (!archiveRunnerModal || !runnerFrame) return;

    currentRunnerState = {
        fileOrBlob,
        fileName: fileName || 'Application',
        entryHtmlPath: targetHtmlPath || '',
        mainUrl: null
    };

    cleanupRunnerUrls();
    archiveRunnerModal.classList.remove('hidden');
    if (runnerLoader) runnerLoader.classList.remove('hidden');
    if (runnerLoaderText) runnerLoaderText.textContent = `Unpacking ${fileName}...`;
    if (runnerAppTitle) runnerAppTitle.textContent = fileName;

    try {
        const zip = await JSZip.loadAsync(fileOrBlob);

        // Find main HTML file if not specified
        if (!targetHtmlPath) {
            const files = Object.keys(zip.files).filter(k => !zip.files[k].dir);
            targetHtmlPath = files.find(f => f.toLowerCase() === 'index.html' || f.toLowerCase().endsWith('/index.html'))
                || files.find(f => f.toLowerCase().endsWith('.html') || f.toLowerCase().endsWith('.htm'));
        }

        if (!targetHtmlPath) {
            throw new Error('No executable HTML entry file (like index.html) found in this archive.');
        }

        currentRunnerState.entryHtmlPath = targetHtmlPath;
        if (runnerAppTitle) runnerAppTitle.textContent = `${fileName} — ${targetHtmlPath}`;

        // Map all assets to in-memory Blob ObjectURLs
        const assetMap = {};
        const entries = Object.keys(zip.files).filter(k => !zip.files[k].dir);

        for (const path of entries) {
            const mime = getMimeType(path);
            const blob = await zip.files[path].async('blob');
            const typedBlob = new Blob([blob], { type: mime });
            const objUrl = URL.createObjectURL(typedBlob);
            activeRunnerBlobUrls.push(objUrl);

            assetMap[path] = objUrl;
            // Also map relative path from root and normalized forms
            const normPath = path.replace(/^\.\//, '');
            assetMap[normPath] = objUrl;
            const basename = path.split('/').pop();
            assetMap[basename] = objUrl;
        }

        // Resolve main HTML and replace relative links with virtual ObjectURLs
        let htmlText = await zip.files[targetHtmlPath].async('text');

        // Clean relative asset resolution
        Object.keys(assetMap).forEach(key => {
            if (!key.endsWith('.html')) {
                const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regexSrc = new RegExp(`(src|href)=["']([^"']*${escapedKey})["']`, 'gi');
                htmlText = htmlText.replace(regexSrc, `$1="${assetMap[key]}"`);
            }
        });

        const mainBlob = new Blob([htmlText], { type: 'text/html' });
        const mainUrl = URL.createObjectURL(mainBlob);
        activeRunnerBlobUrls.push(mainUrl);
        currentRunnerState.mainUrl = mainUrl;

        runnerFrame.src = mainUrl;

        if (runnerLoader) {
            setTimeout(() => {
                runnerLoader.classList.add('hidden');
            }, 300);
        }
        showToast(`Running ${targetHtmlPath} in sandbox!`);
    } catch (err) {
        console.error('Runner error:', err);
        if (runnerLoaderText) runnerLoaderText.textContent = `Execution failed: ${err.message}`;
        showToast(err.message, 'error');
    }
}

if (runnerReloadBtn) {
    runnerReloadBtn.addEventListener('click', () => {
        if (currentRunnerState.fileOrBlob) {
            launchArchiveRunner(currentRunnerState.fileOrBlob, currentRunnerState.fileName, currentRunnerState.entryHtmlPath);
        }
    });
}

if (runnerFullscreenBtn) {
    runnerFullscreenBtn.addEventListener('click', () => {
        const content = document.querySelector('.runner-modal-content');
        if (content) {
            if (!document.fullscreenElement) {
                content.requestFullscreen?.().catch(() => {});
            } else {
                document.exitFullscreen?.().catch(() => {});
            }
        }
    });
}

if (runnerNewTabBtn) {
    runnerNewTabBtn.addEventListener('click', () => {
        if (currentRunnerState.mainUrl) {
            window.open(currentRunnerState.mainUrl, '_blank');
        }
    });
}

if (closeRunnerBtn) {
    closeRunnerBtn.addEventListener('click', () => {
        if (archiveRunnerModal) archiveRunnerModal.classList.add('hidden');
        if (runnerFrame) runnerFrame.src = 'about:blank';
        cleanupRunnerUrls();
    });
}

// ============================================================
// "SHARE THIS APPLICATION" BUNDLE & EXPORT ENGINE
// ============================================================
async function createApplicationZipBundle() {
    if (!window.JSZip) {
        throw new Error('ZIP engine is initializing. Please try again.');
    }

    const zip = new JSZip();

    // Fetch live application source files
    let htmlContent = document.documentElement.outerHTML;
    let cssContent = '';
    let jsContent = '';

    try {
        const cssResp = await fetch('style.css');
        if (cssResp.ok) cssContent = await cssResp.text();
    } catch (e) {
        console.warn('Could not fetch style.css directly, extracting styles.');
        Array.from(document.querySelectorAll('style')).forEach(s => cssContent += s.textContent + '\n');
    }

    try {
        const jsResp = await fetch('app.js');
        if (jsResp.ok) jsContent = await jsResp.text();
    } catch (e) {
        console.warn('Could not fetch app.js directly.');
    }

    zip.file('index.html', htmlContent);
    if (cssContent) zip.file('style.css', cssContent);
    if (jsContent) zip.file('app.js', jsContent);

    zip.file('README.txt', 
`======================================================
ShareWith — Ultra-Fast P2P File & Archive Sharing App
======================================================

How to run offline:
1. Extract all files to a folder.
2. Double click 'index.html' in Chrome, Edge, Safari, or Firefox.
3. No server or internet installation required!

Features:
- Pure WebRTC Peer-to-Peer file sharing
- ZIP and RAR archive inspection and extraction
- In-browser sandboxed execution for web apps
- Encrypted direct transfer
`);

    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

// Nav Share App button click
if (navShareAppBtn) {
    navShareAppBtn.addEventListener('click', () => {
        if (logoBtn) logoBtn.click();
    });
}

// Export Application as .ZIP
if (btnExportAppZip) {
    btnExportAppZip.addEventListener('click', async () => {
        showToast('Packaging ShareWith application into .ZIP...');
        try {
            const blob = await createApplicationZipBundle();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ShareWith-Application.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 20000);
            showToast('ShareWith-Application.zip downloaded successfully!');
        } catch (err) {
            showToast(`Export failed: ${err.message}`, 'error');
        }
    });
}

// Send Application directly to Peer over P2P
if (btnSendAppToPeer) {
    btnSendAppToPeer.addEventListener('click', async () => {
        showToast('Bundling application for direct P2P transfer...');
        try {
            const blob = await createApplicationZipBundle();
            const appFile = new File([blob], 'ShareWith-Application.zip', { type: 'application/zip' });

            // Close modal
            if (logoQrModal) logoQrModal.classList.add('hidden');

            // Switch to Send tab
            const sendTabBtn = document.querySelector('[data-tab="send"]');
            if (sendTabBtn) sendTabBtn.click();

            // Prepare send batch with the packaged app
            prepareToSendBatch([appFile]);
            showToast('ShareWith packaged! Share your ID or connect to send.');
        } catch (err) {
            showToast(`Failed to package app: ${err.message}`, 'error');
        }
    });
}





