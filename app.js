// Initialize Lucide Icons
if (window.lucide) {
    lucide.createIcons();
}

// --- UI Elements ---
const myIdEl = document.getElementById('myId');
const connectionStatusEl = document.getElementById('connectionStatus');
const statusDot = connectionStatusEl?.querySelector('.status-dot');
const statusText = connectionStatusEl?.querySelector('.status-text');
const qrContainer = document.getElementById('qrcode');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

const targetIdInput = document.getElementById('targetIdInput');
const connectBtn = document.getElementById('connectBtn');

const transferZone = document.getElementById('transferZone');
const transferTitle = document.getElementById('transferTitle');
const fileNameText = document.getElementById('fileNameText');
const fileSizeText = document.getElementById('fileSizeText');
const progressBarFill = document.getElementById('progressBarFill');
const progressPercent = document.getElementById('progressPercent');
const progressStatusLabel = document.getElementById('progressStatusLabel');
const transferBadgeText = document.getElementById('transferBadgeText');
const batchCountBadge = document.getElementById('batchCountBadge');
const fileTypeIcon = document.getElementById('fileTypeIcon');

// Overall Progress and Telemetry HUD Elements
const overallProgressContainer = document.getElementById('overallProgressContainer');
const overallProgressLabel = document.getElementById('overallProgressLabel');
const overallProgressPercent = document.getElementById('overallProgressPercent');
const overallProgressBarFill = document.getElementById('overallProgressBarFill');
const transferSpeedText = document.getElementById('transferSpeedText');
const transferEtaText = document.getElementById('transferEtaText');

// Incoming Transfer Modal Elements
const incomingModal = document.getElementById('incomingModal');
const incomingFileInfo = document.getElementById('incomingFileInfo');
const incomingDocIcon = document.getElementById('incomingDocIcon');
const acceptBtn = document.getElementById('acceptBtn');
const declineBtn = document.getElementById('declineBtn');
const largeFileOptionBox = document.getElementById('largeFileOptionBox');
const directDiskSaveToggle = document.getElementById('directDiskSaveToggle');

// Success Modal Elements
const successModal = document.getElementById('successModal');
const successMsgText = document.getElementById('successMsgText');
const closeSuccessBtn = document.getElementById('closeSuccessBtn');
const downloadAgainBtn = document.getElementById('downloadAgainBtn');
const savedFilesList = document.getElementById('savedFilesList');
const sumAvgSpeed = document.getElementById('sumAvgSpeed');
const sumTimeTaken = document.getElementById('sumTimeTaken');

// QR Scanner Elements
const scanModal = document.getElementById('scanModal');
const scanVideo = document.getElementById('scanVideo');
const scanQrBtn = document.getElementById('scanQrBtn');
const closeScanBtn = document.getElementById('closeScanBtn');
const cancelTransferBtn = document.getElementById('cancelTransferBtn');
const toastContainer = document.getElementById('toastContainer');

// Radar and Channel Elements
const radarContainer = document.getElementById('radarAnimation');
const radarStatusText = document.getElementById('radarStatusText');
const transferInfo = document.getElementById('transferInfo');
const methodIcons = document.querySelectorAll('.method-icon');
const methodLabel = document.getElementById('methodLabel');

const btnZipBatchFiles = document.getElementById('btnZipBatchFiles');

// Selected Archive Banner Elements
const selectedArchiveBanner = document.getElementById('selectedArchiveBanner');
const archiveBannerTitle = document.getElementById('archiveBannerTitle');
const archiveBannerDesc = document.getElementById('archiveBannerDesc');
const btnInspectSelectedArchive = document.getElementById('btnInspectSelectedArchive');
const btnRunSelectedArchive = document.getElementById('btnRunSelectedArchive');

// Archive Inspector Modal Elements
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

// Sandboxed Runner Modal Elements
const archiveRunnerModal = document.getElementById('archiveRunnerModal');
const runnerAppTitle = document.getElementById('runnerAppTitle');
const runnerFrame = document.getElementById('runnerFrame');
const runnerLoader = document.getElementById('runnerLoader');
const runnerLoaderText = document.getElementById('runnerLoaderText');
const runnerReloadBtn = document.getElementById('runnerReloadBtn');
const runnerFullscreenBtn = document.getElementById('runnerFullscreenBtn');
const runnerNewTabBtn = document.getElementById('runnerNewTabBtn');
const closeRunnerBtn = document.getElementById('closeRunnerBtn');

// Archive Entry Preview Modal Elements
const archivePreviewModal = document.getElementById('archivePreviewModal');
const previewFileTitle = document.getElementById('previewFileTitle');
const previewBody = document.getElementById('previewBody');
const previewDownloadBtn = document.getElementById('previewDownloadBtn');
const closePreviewBtn = document.getElementById('closePreviewBtn');
const closePreviewBtn2 = document.getElementById('closePreviewBtn2');

// Share Application Packaging Elements
const navShareAppBtn = document.getElementById('navShareAppBtn');
const btnExportAppZip = document.getElementById('btnExportAppZip');
const btnSendAppToPeer = document.getElementById('btnSendAppToPeer');
const logoBtn = document.getElementById('logoBtn');
const logoQrModal = document.getElementById('logoQrModal');
const closeLogoQrBtn = document.getElementById('closeLogoQrBtn');
const logoQrCodeContainer = document.getElementById('logoQrCodeContainer');

// --- P2P & Streaming State ---
let peer = null;
let currentConn = null;
let currentFiles = [];
let currentFileIndex = 0;
let receivedBlobs = [];
let incomingFiles = [];
let currentQrType = 'id';
let myPeerId = '';
let scanning = false;
let canvasElement = document.createElement("canvas");
let canvas = canvasElement.getContext("2d", { willReadFrequently: true });
let logoQrInstance = null;

// Chunk Streaming & Performance Constants for Large .ZIP & .RAR Files
const CHUNK_SIZE = 128 * 1024; // 128 KB standard chunk size
const LARGE_CHUNK_SIZE = 256 * 1024; // 256 KB turbo chunk size for large files (>= 50 MB)
const BUFFER_HIGH_WATER = 1024 * 1024 * 4; // 4 MB backpressure threshold
const BUFFER_LOW_WATER = 1024 * 1024 * 1;  // 1 MB resume drain threshold
let isTransferAborted = false;

// Direct Disk Stream Handles for Huge Files (Zero RAM consumption)
let activeWritableStream = null;
let activeFileHandle = null;

// Receiver State for Chunk Reassembly & Stream Management
let receiveState = {
    active: false,
    currentFileIndex: 0,
    currentChunks: [],
    subBlobs: [],
    activeFileStream: null,
    receivedBytesForFile: 0
};

// Archive Inspection and Runner State
let currentArchiveData = null;
let currentArchiveBlob = null;
let currentArchiveName = '';
let activeRunnerBlobUrls = [];
let selectedArchiveFile = null;

// Telemetry & Metrics Tracker
let metrics = {
    active: false,
    mode: 'send', // 'send' or 'receive'
    startTime: 0,
    totalBatchBytes: 0,
    transferredTotalBytes: 0,
    currentFileSize: 0,
    currentFileBytes: 0,
    lastTickTime: 0,
    lastTickBytes: 0,
    currentSpeedBps: 0,
    intervalId: null
};

// Serialized Download Tracker for preventing filename collision
const downloadedFileNames = new Set();

function getUniqueDownloadName(filename) {
    if (!downloadedFileNames.has(filename)) {
        downloadedFileNames.add(filename);
        return filename;
    }
    const lastDot = filename.lastIndexOf('.');
    const base = lastDot !== -1 ? filename.slice(0, lastDot) : filename;
    const ext = lastDot !== -1 ? filename.slice(lastDot) : '';
    let counter = 1;
    while (downloadedFileNames.has(`${base} (${counter})${ext}`)) {
        counter++;
    }
    const unique = `${base} (${counter})${ext}`;
    downloadedFileNames.add(unique);
    return unique;
}

// Format Speed Helper
function formatSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
    if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

// Format Duration Helper
function formatDuration(seconds) {
    if (seconds < 1) return '< 1s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
}

// Format Bytes Helper
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Get File Icon for Lucide
function getFileIcon(filename) {
    const ext = (filename || '').split('.').pop().toLowerCase();
    switch (ext) {
        case 'zip':
        case 'rar':
        case '7z':
        case 'tar':
        case 'gz':
            return 'archive';
        case 'pdf':
            return 'file-text';
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'svg':
        case 'webp':
            return 'image';
        case 'mp4':
        case 'webm':
        case 'mkv':
        case 'avi':
            return 'video';
        case 'mp3':
        case 'wav':
        case 'ogg':
        case 'flac':
            return 'music';
        case 'html':
        case 'htm':
        case 'js':
        case 'ts':
        case 'css':
        case 'json':
            return 'code-2';
        default:
            return 'file';
    }
}

// Telemetry Logic
function startMetrics(mode, totalBatchBytes, currentFileSize) {
    metrics.active = true;
    metrics.mode = mode;
    metrics.startTime = performance.now();
    metrics.totalBatchBytes = totalBatchBytes || 0;
    metrics.transferredTotalBytes = 0;
    metrics.currentFileSize = currentFileSize || 0;
    metrics.currentFileBytes = 0;
    metrics.lastTickTime = performance.now();
    metrics.lastTickBytes = 0;
    metrics.currentSpeedBps = 0;

    if (metrics.intervalId) clearInterval(metrics.intervalId);
    metrics.intervalId = setInterval(updateMetricsTick, 250);
    updateMetricsUI();
}

function recordProgressBytes(bytes) {
    metrics.transferredTotalBytes += bytes;
    metrics.currentFileBytes += bytes;
    updateMetricsUI();
}

function updateMetricsTick() {
    if (!metrics.active) return;
    const now = performance.now();
    const elapsedSec = (now - metrics.lastTickTime) / 1000;
    if (elapsedSec >= 0.25) {
        const bytesSinceTick = metrics.transferredTotalBytes - metrics.lastTickBytes;
        metrics.currentSpeedBps = bytesSinceTick / elapsedSec;
        metrics.lastTickTime = now;
        metrics.lastTickBytes = metrics.transferredTotalBytes;
        updateMetricsUI();
    }
}

function updateMetricsUI() {
    // Current File Progress
    const fileRatio = metrics.currentFileSize > 0 
        ? Math.min(1, metrics.currentFileBytes / metrics.currentFileSize) 
        : 0;
    const filePercent = Math.round(fileRatio * 100);
    if (progressBarFill) progressBarFill.style.width = `${filePercent}%`;
    if (progressPercent) progressPercent.textContent = `${filePercent}%`;

    // Overall Batch Progress
    if (overallProgressBarFill && overallProgressPercent && metrics.totalBatchBytes > 0) {
        const batchRatio = Math.min(1, metrics.transferredTotalBytes / metrics.totalBatchBytes);
        const batchPercent = Math.round(batchRatio * 100);
        overallProgressBarFill.style.width = `${batchPercent}%`;
        overallProgressPercent.textContent = `${batchPercent}%`;
    }

    // Telemetry Speed & ETA
    if (transferSpeedText) {
        transferSpeedText.textContent = formatSpeed(metrics.currentSpeedBps);
    }

    if (transferEtaText) {
        if (metrics.currentSpeedBps > 1024) {
            const remainingBytes = Math.max(0, metrics.totalBatchBytes - metrics.transferredTotalBytes);
            const remainingSeconds = remainingBytes / metrics.currentSpeedBps;
            transferEtaText.textContent = formatDuration(remainingSeconds);
        } else {
            transferEtaText.textContent = '--';
        }
    }
}

function stopMetrics() {
    metrics.active = false;
    if (metrics.intervalId) {
        clearInterval(metrics.intervalId);
        metrics.intervalId = null;
    }
}

// Toast Notification
function showToast(msg, type = "info") {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// ============================================================
// PEERJS CONNECTION & HIGH-SPEED CHANNEL MANAGEMENT
// ============================================================
function initPeer() {
    const customId = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    peer = new Peer(customId, {
        debug: 1
    });

    peer.on('open', (id) => {
        myPeerId = id;
        if (myIdEl) myIdEl.textContent = id;
        if (statusDot) statusDot.className = 'status-dot online';
        if (statusText) statusText.textContent = 'Ready to sync';
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
        if (statusDot) statusDot.className = 'status-dot offline';
        if (statusText) statusText.textContent = 'Offline (Retry in 5s)';
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
        // If we have files ready to send, initiate the metadata exchange
        if (currentFiles.length > 0) {
            conn.send({
                type: 'metadata-batch',
                files: currentFiles.map(f => ({ 
                    name: f.name, 
                    size: f.size, 
                    type: f.type || 'application/octet-stream' 
                }))
            });
            showToast(`Connected! Transfer request sent for ${currentFiles.length} file(s)...`);
        }
    });

    conn.on('data', async (data) => {
        if (!data || !data.type) return;

        if (data.type === 'metadata-batch') {
            // Sender sent batch metadata, ask for acceptance
            incomingFiles = data.files || [];
            const totalSize = incomingFiles.reduce((acc, f) => acc + (f.size || 0), 0);
            const firstFile = incomingFiles[0] || { name: 'Document' };
            const names = incomingFiles.map(f => f.name).join(', ');
            
            if (incomingFileInfo) {
                incomingFileInfo.textContent = incomingFiles.length > 1
                    ? `${incomingFiles.length} Documents: ${names.length > 36 ? names.substring(0, 33) + '...' : names} (${formatBytes(totalSize)})`
                    : `"${firstFile.name}" (${formatBytes(totalSize)})`;
            }
            
            if (incomingDocIcon) {
                incomingDocIcon.setAttribute('data-lucide', getFileIcon(firstFile.name));
            }

            // Detect large archive transfers (>= 50 MB) and show Direct-to-Disk streaming option if supported
            if (largeFileOptionBox) {
                const isLarge = totalSize >= 50 * 1024 * 1024;
                const hasFsAccess = 'showSaveFilePicker' in window;
                if (isLarge && hasFsAccess) {
                    largeFileOptionBox.classList.remove('hidden');
                    if (directDiskSaveToggle) directDiskSaveToggle.checked = true;
                } else {
                    largeFileOptionBox.classList.add('hidden');
                }
            }

            if (incomingModal) incomingModal.classList.remove('hidden');
            if (window.lucide) lucide.createIcons();

        } else if (data.type === 'stream-start') {
            // Streaming start for incoming document / large archive
            isTransferAborted = false;
            receiveState.currentChunks = [];
            receiveState.subBlobs = [];
            receiveState.activeFileStream = activeWritableStream;
            receiveState.receivedBytesForFile = 0;
            receiveState.currentFileIndex = data.index || 0;

            if (transferZone) transferZone.classList.remove('hidden');
            if (radarContainer) radarContainer.classList.add('hidden');
            if (transferInfo) transferInfo.classList.remove('hidden');

            if (transferBadgeText) transferBadgeText.textContent = "📥 Downloading Document";
            if (progressStatusLabel) {
                progressStatusLabel.textContent = receiveState.activeFileStream 
                    ? "Direct-to-Disk Turbo Streaming..." 
                    : "High-Speed P2P Downloading...";
            }
            
            const totalCount = incomingFiles.length || 1;
            if (transferTitle) {
                transferTitle.textContent = totalCount > 1 
                    ? `Downloading (${(data.index || 0) + 1}/${totalCount}): ${data.name}`
                    : `Downloading Document...`;
            }
            
            if (fileNameText) {
                fileNameText.textContent = data.name;
                fileNameText.title = data.name;
            }
            if (fileSizeText) {
                fileSizeText.textContent = formatBytes(data.size || 0);
            }

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
                if (window.lucide) lucide.createIcons();
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
            // Incoming chunk of document or large archive
            if (isTransferAborted) return;
            const byteLen = data.data ? (data.data.byteLength || data.data.size || 0) : 0;
            receiveState.receivedBytesForFile += byteLen;
            recordProgressBytes(byteLen);

            if (receiveState.activeFileStream) {
                // Direct-to-Disk streaming write: bypasses browser RAM allocation completely
                receiveState.activeFileStream.write(data.data).catch(err => {
                    console.error("Direct disk stream write error:", err);
                });
            } else {
                receiveState.currentChunks.push(data.data);
                // Consolidate every 128 chunks (~16 MB to 32 MB) into sub-Blobs to release ArrayBuffers from V8 active heap
                if (receiveState.currentChunks.length >= 128) {
                    const subBlob = new Blob(receiveState.currentChunks, { type: 'application/octet-stream' });
                    receiveState.subBlobs.push(subBlob);
                    receiveState.currentChunks = []; // clear active heap immediately
                }
            }

        } else if (data.type === 'stream-end') {
            // Document complete -> assemble and automatically trigger download/save with serialized continuous naming
            const meta = incomingFiles[data.index] || {};
            const uniqueName = getUniqueDownloadName(data.name);
            const wasRenamed = uniqueName !== data.name;

            if (receiveState.activeFileStream) {
                // Finalize and close the direct disk file handle
                try {
                    await receiveState.activeFileStream.close();
                } catch (e) {
                    console.error("Error closing direct disk stream:", e);
                }
                receiveState.activeFileStream = null;
                activeWritableStream = null;

                receivedBlobs.push({ 
                    name: uniqueName, 
                    originalName: data.name, 
                    blob: null, 
                    isDirectSaved: true,
                    size: meta.size || receiveState.receivedBytesForFile,
                    wasRenamed: wasRenamed 
                });

                showToast(`Directly streamed & saved to disk: "${uniqueName}"`);
            } else {
                // Combine sub-Blobs and any remaining chunks
                const allParts = [...(receiveState.subBlobs || []), ...receiveState.currentChunks];
                const blob = new Blob(allParts, { type: meta.mimeType || meta.type || 'application/octet-stream' });
                receiveState.subBlobs = [];
                receiveState.currentChunks = [];

                receivedBlobs.push({ 
                    name: uniqueName, 
                    originalName: data.name, 
                    blob: blob, 
                    isDirectSaved: false,
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
            }

            const totalCount = incomingFiles.length || 1;
            if (data.index === totalCount - 1) {
                // All documents received!
                const totalDurationSec = Math.max(0.1, (performance.now() - metrics.startTime) / 1000);
                const avgSpeed = metrics.transferredTotalBytes / totalDurationSec;
                stopMetrics();

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
                    if (transferZone) transferZone.classList.add('hidden');
                }, 400);
            }

        } else if (data.type === 'accept') {
            // Receiver accepted, stream all files with high-speed chunking
            sendFileDataBatch();
        } else if (data.type === 'decline') {
            showToast("Transfer declined by receiver.", "error");
            if (transferZone) transferZone.classList.add('hidden');
            stopMetrics();
        }
    });

    conn.on('close', () => {
        showToast("Connection closed.", "info");
        console.log("Connection closed");
        stopMetrics();
    });

    conn.on('error', (err) => {
        console.error("Connection error:", err);
        showToast("P2P DataChannel Error", "error");
        stopMetrics();
    });
}

// ============================================================
// HIGH-SPEED ADAPTIVE CHUNK STREAMING SENDER ENGINE
// ============================================================
async function sendFileDataBatch() {
    if (!currentFiles || currentFiles.length === 0 || !currentConn) return;

    isTransferAborted = false;
    if (transferZone) transferZone.classList.remove('hidden');
    if (radarContainer) radarContainer.classList.add('hidden');
    if (transferInfo) transferInfo.classList.remove('hidden');

    if (transferBadgeText) transferBadgeText.textContent = "🚀 Turbo P2P Streaming";
    if (progressStatusLabel) progressStatusLabel.textContent = "Connecting high-speed stream...";

    const totalBatchBytes = currentFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    startMetrics('send', totalBatchBytes, currentFiles[0].size);

    if (overallProgressContainer) {
        if (currentFiles.length > 1) {
            overallProgressContainer.classList.remove('hidden');
        } else {
            overallProgressContainer.classList.add('hidden');
        }
    }

    const totalFiles = currentFiles.length;

    for (let i = 0; i < totalFiles; i++) {
        if (isTransferAborted) break;

        const file = currentFiles[i];
        currentFileIndex = i;

        // Reset current file progress metrics
        metrics.currentFileBytes = 0;
        metrics.currentFileSize = file.size || 0;
        updateMetricsUI();

        if (transferTitle) {
            transferTitle.textContent = totalFiles > 1 
                ? `Sending (${i + 1}/${totalFiles}): ${file.name}`
                : `Streaming: ${file.name}`;
        }
        if (fileNameText) {
            fileNameText.textContent = file.name;
            fileNameText.title = file.name;
        }
        if (fileSizeText) {
            fileSizeText.textContent = formatBytes(file.size);
        }

        if (batchCountBadge) {
            if (totalFiles > 1) {
                batchCountBadge.textContent = `${i + 1} / ${totalFiles}`;
                batchCountBadge.classList.remove('hidden');
            } else {
                batchCountBadge.classList.add('hidden');
            }
        }

        if (fileTypeIcon) {
            fileTypeIcon.setAttribute('data-lucide', getFileIcon(file.name));
            if (window.lucide) lucide.createIcons();
        }

        if (progressStatusLabel) {
            progressStatusLabel.textContent = file.size >= 50 * 1024 * 1024 
                ? "Streaming Large Archive (256 KB Chunks)..." 
                : "Streaming Document (128 KB Chunks)...";
        }

        // Adaptive chunk sizing: 256 KB for files >= 50 MB (large archives), 128 KB for smaller
        const currentChunkSize = file.size >= 50 * 1024 * 1024 ? LARGE_CHUNK_SIZE : CHUNK_SIZE;
        const totalChunks = Math.ceil(file.size / currentChunkSize) || 1;

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
            const slice = file.slice(offset, offset + currentChunkSize);
            const buffer = await slice.arrayBuffer();

            // WebRTC dataChannel backpressure management
            const dc = currentConn.dataChannel;
            if (dc && dc.bufferedAmount > BUFFER_HIGH_WATER) {
                await new Promise(resolve => {
                    if (!dc || dc.readyState !== 'open' || isTransferAborted || dc.bufferedAmount <= BUFFER_LOW_WATER) {
                        resolve();
                        return;
                    }
                    let resolved = false;
                    const done = () => {
                        if (!resolved) {
                            resolved = true;
                            if (dc) dc.onbufferedamountlow = null;
                            resolve();
                        }
                    };
                    if ('onbufferedamountlow' in dc) {
                        dc.bufferedAmountLowThreshold = BUFFER_LOW_WATER;
                        dc.onbufferedamountlow = done;
                    }
                    setTimeout(done, 40); // Safety timeout so large transfers never freeze
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

        if (!isTransferAborted) {
            // Signal stream-end for this file
            currentConn.send({
                type: 'stream-end',
                index: i,
                name: file.name
            });

            // Small delay between multiple files to ensure orderly drain
            if (i < totalFiles - 1) {
                await new Promise(r => setTimeout(r, 60));
            }
        }
    }

    if (!isTransferAborted) {
        const totalDurationSec = Math.max(0.1, (performance.now() - metrics.startTime) / 1000);
        const avgSpeed = metrics.transferredTotalBytes / totalDurationSec;
        stopMetrics();

        setTimeout(() => {
            showSuccess(
                totalFiles > 1 
                    ? `${totalFiles} Document(s) streamed successfully!` 
                    : `Document streamed successfully!`, 
                false, 
                metrics.transferredTotalBytes, 
                avgSpeed, 
                totalDurationSec
            );
            if (transferZone) transferZone.classList.add('hidden');
        }, 500);
    }
}

// Receiver Accept Handler
if (acceptBtn) {
    acceptBtn.addEventListener('click', async () => {
        activeWritableStream = null;
        activeFileHandle = null;

        // Check if Direct Disk Stream Mode is enabled for single large archive
        if (directDiskSaveToggle && directDiskSaveToggle.checked && 'showSaveFilePicker' in window && incomingFiles.length === 1) {
            try {
                const suggested = getUniqueDownloadName(incomingFiles[0].name);
                activeFileHandle = await window.showSaveFilePicker({
                    suggestedName: suggested
                });
                activeWritableStream = await activeFileHandle.createWritable();
                showToast(`Direct stream enabled: ${activeFileHandle.name}`);
            } catch (e) {
                console.log('Direct disk save cancelled or unsupported, fallback to memory-safe stream:', e);
                activeWritableStream = null;
                activeFileHandle = null;
            }
        }

        if (incomingModal) incomingModal.classList.add('hidden');
        if (transferZone) transferZone.classList.remove('hidden');
        if (radarContainer) radarContainer.classList.add('hidden');
        if (transferInfo) transferInfo.classList.remove('hidden');

        const totalBatchSize = incomingFiles.reduce((acc, f) => acc + (f.size || 0), 0);
        startMetrics('receive', totalBatchSize, incomingFiles[0]?.size || 0);

        if (transferBadgeText) transferBadgeText.textContent = "📥 Downloading Document";
        if (transferTitle) {
            transferTitle.textContent = incomingFiles.length > 1 
                ? `Downloading Document (1/${incomingFiles.length})...` 
                : `Downloading Document...`;
        }
        if (progressStatusLabel) {
            progressStatusLabel.textContent = activeWritableStream
                ? "Direct-to-Disk Turbo Streaming..."
                : "Requesting stream from sender...";
        }

        if (currentConn) {
            currentConn.send({ type: 'accept' });
        }
    });
}

if (declineBtn) {
    declineBtn.addEventListener('click', () => {
        if (incomingModal) incomingModal.classList.add('hidden');
        if (currentConn) {
            currentConn.send({ type: 'decline' });
        }
    });
}

// ============================================================
// SUCCESS MODAL & SUMMARY METRICS DISPLAY
// ============================================================
function showSuccess(msg, showDownload = false, totalBytes = 0, avgSpeed = 0, durationSec = 0) {
    if (successMsgText) successMsgText.textContent = msg;

    if (downloadAgainBtn) {
        if (showDownload && receivedBlobs.length > 0 && receivedBlobs.some(r => r.blob)) {
            downloadAgainBtn.classList.remove('hidden');
        } else {
            downloadAgainBtn.classList.add('hidden');
        }
    }

    if (sumAvgSpeed) {
        sumAvgSpeed.textContent = formatSpeed(avgSpeed || (durationSec > 0 ? totalBytes / durationSec : 0));
    }
    if (sumTimeTaken) {
        sumTimeTaken.textContent = formatDuration(durationSec);
    }

    if (savedFilesList) {
        savedFilesList.innerHTML = '';
        if (showDownload && receivedBlobs.length > 0) {
            savedFilesList.classList.remove('hidden');
            receivedBlobs.forEach(item => {
                const row = document.createElement('div');
                row.className = 'saved-file-row';

                const left = document.createElement('div');
                left.className = 'saved-file-left';

                const icon = document.createElement('i');
                icon.setAttribute('data-lucide', getFileIcon(item.name));

                const nameSpan = document.createElement('span');
                nameSpan.className = 'saved-file-name';
                nameSpan.textContent = item.name;
                nameSpan.title = item.name;

                left.appendChild(icon);
                left.appendChild(nameSpan);

                const right = document.createElement('div');
                right.className = 'saved-file-right';

                if (item.wasRenamed) {
                    const badge = document.createElement('span');
                    badge.className = 'saved-file-badge';
                    badge.textContent = 'Numbered (duplicate)';
                    badge.title = 'File name was already in use. Saved with continuous serial number.';
                    right.appendChild(badge);
                }

                if (item.isDirectSaved) {
                    const directBadge = document.createElement('span');
                    directBadge.className = 'saved-file-badge direct-disk-badge';
                    directBadge.textContent = 'Direct to Disk';
                    directBadge.title = 'Saved directly to your storage drive with zero RAM usage.';
                    right.appendChild(directBadge);
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
                        if (item.blob) {
                            openArchiveInspector(item.blob, item.name);
                        } else {
                            showToast(`Saved to your storage drive: "${item.name}". Open directly from your device.`, 'info');
                        }
                    });
                    right.appendChild(inspectBtn);

                    if (ext === 'zip' && item.blob) {
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
        } else {
            savedFilesList.classList.add('hidden');
        }
    }

    if (window.lucide) lucide.createIcons();
    if (successModal) successModal.classList.remove('hidden');
}

if (downloadAgainBtn) {
    downloadAgainBtn.addEventListener('click', () => {
        receivedBlobs.forEach(item => {
            if (item.blob) {
                const url = URL.createObjectURL(item.blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = item.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 20000);
            }
        });
    });
}

if (closeSuccessBtn) {
    closeSuccessBtn.addEventListener('click', () => {
        if (successModal) successModal.classList.add('hidden');
    });
}

// ============================================================
// PREPARE BATCH & QUICK ARCHIVE SHARING
// ============================================================
function prepareToSendBatch(files) {
    if (!files || files.length === 0) return;
    currentFiles = files;
    const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
    
    if (fileNameText) {
        fileNameText.textContent = files.length > 1 ? `${files.length} Files Selected` : files[0].name;
        fileNameText.title = files.length > 1 ? `${files.length} Files Selected` : files[0].name;
    }
    if (fileSizeText) {
        fileSizeText.textContent = formatBytes(totalSize);
    }

    if (fileTypeIcon) {
        fileTypeIcon.setAttribute('data-lucide', getFileIcon(files[0].name));
        if (window.lucide) lucide.createIcons();
    }
    
    // Switch DropZone UI to show files are ready
    if (dropZone) {
        const dropZoneIcon = dropZone.querySelector('.drop-icon');
        const dropZoneText = dropZone.querySelector('p');
        
        if (dropZoneIcon && dropZoneText) {
            dropZoneIcon.setAttribute('data-lucide', 'check-circle-2');
            dropZoneIcon.className = 'drop-icon success-pulse';
            const fileLabel = files.length > 1 ? `${files.length} Document(s)` : files[0].name;
            dropZoneText.innerHTML = `Ready to send: <span class="gradient-text">${fileLabel}</span><br><small>${formatBytes(totalSize)}</small>`;
            if (window.lucide) lucide.createIcons();
        }
    }

    // Check if an archive (.zip or .rar) is among the selected files
    checkSelectedArchiveBanner(files);

    // If already connected to peer, send transfer request immediately!
    if (currentConn && currentConn.open) {
        currentConn.send({
            type: 'metadata-batch',
            files: currentFiles.map(f => ({
                name: f.name,
                size: f.size,
                type: f.type || 'application/octet-stream'
            }))
        });
        if (transferZone) transferZone.classList.remove('hidden');
        if (transferTitle) transferTitle.textContent = "Waiting for Peer to Accept...";
        if (transferBadgeText) transferBadgeText.textContent = "Request Sent";
        if (progressStatusLabel) progressStatusLabel.textContent = "Waiting for peer approval...";
        showToast("Files ready! Transfer request sent to connected peer.");
        return;
    }

    const targetId = targetIdInput ? targetIdInput.value.trim().toUpperCase() : '';
    if (targetId) {
        initiateSend(targetId);
    } else {
        showToast("Files ready. Share your ID or scan the QR code.");
    }
}

// Zip Selected Batch Files
async function zipSelectedBatchFiles(files) {
    if (!files || files.length === 0) return;
    if (!window.JSZip) {
        showToast("ZIP engine is loading. Please try again.", "error");
        return;
    }

    showToast(`Zipping ${files.length} documents into .ZIP bundle...`);
    try {
        const zip = new JSZip();
        for (const file of files) {
            zip.file(file.name, file);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        const zipFile = new File([zipBlob], `Batch_${files.length}_Files.zip`, { type: 'application/zip' });
        prepareToSendBatch([zipFile]);
        showToast(`Created "Batch_${files.length}_Files.zip" and ready to send!`);
    } catch (err) {
        console.error("Batch compression error:", err);
        showToast(`Failed to zip documents: ${err.message}`, 'error');
    }
}

if (btnZipBatchFiles) {
    btnZipBatchFiles.addEventListener('click', () => {
        if (currentFiles.length > 1) {
            zipSelectedBatchFiles(currentFiles);
        }
    });
}

// Check if archive file is selected in Send Tab
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
        
        if (btnInspectSelectedArchive) btnInspectSelectedArchive.style.display = '';
        if (btnZipBatchFiles) {
            btnZipBatchFiles.style.display = files.length > 1 ? 'inline-flex' : 'none';
        }

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
        if (window.lucide) lucide.createIcons();
    } else {
        selectedArchiveFile = null;
        selectedArchiveBanner.classList.add('hidden');
        if (btnZipBatchFiles) {
            btnZipBatchFiles.style.display = files.length > 1 ? 'inline-flex' : 'none';
        }
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

// ============================================================
// ARCHIVE INSPECTOR & PARSER ENGINE (.ZIP & .RAR)
// ============================================================
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
                if (pos + 11 <= bytes.length) {
                    const addSize = view.getUint32(pos + 7, true);
                    headSize += addSize;
                }
            }

            if (headType === 0x74 && pos + 32 <= bytes.length) {
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
                if (currentArchiveBlob) {
                    const url = URL.createObjectURL(currentArchiveBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = currentArchiveName;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                }
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

    if (window.lucide) lucide.createIcons();
}

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
            const normPath = path.replace(/^\.\//, '');
            assetMap[normPath] = objUrl;
            const basename = path.split('/').pop();
            assetMap[basename] = objUrl;
        }

        // Resolve main HTML and replace relative links with virtual ObjectURLs
        let htmlText = await zip.files[targetHtmlPath].async('text');

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

if (navShareAppBtn) {
    navShareAppBtn.addEventListener('click', () => {
        if (logoBtn) logoBtn.click();
    });
}

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

if (btnSendAppToPeer) {
    btnSendAppToPeer.addEventListener('click', async () => {
        showToast('Bundling application for direct P2P transfer...');
        try {
            const blob = await createApplicationZipBundle();
            const appFile = new File([blob], 'ShareWith-Application.zip', { type: 'application/zip' });

            if (logoQrModal) logoQrModal.classList.add('hidden');

            const sendTabBtn = document.querySelector('[data-tab="send"]');
            if (sendTabBtn) sendTabBtn.click();

            prepareToSendBatch([appFile]);
            showToast('ShareWith packaged! Share your ID or connect to send.');
        } catch (err) {
            showToast(`Failed to package app: ${err.message}`, 'error');
        }
    });
}

// ============================================================
// UI HELPERS, QR CODE & SCANNER LOGIC
// ============================================================
function updateQR() {
    if (!myPeerId || !qrContainer) return;
    
    qrContainer.innerHTML = '';
    let text = myPeerId;
    let label = "Scan this QR code from another device";
    const urlDisplay = document.getElementById('urlDisplay');

    if (currentQrType === 'url') {
        const baseUrl = window.location.origin + window.location.pathname;
        text = baseUrl + '#' + myPeerId;
        label = "Scan this to open site on another device";
        if (urlDisplay) urlDisplay.classList.remove('hidden');
    } else {
        if (urlDisplay) urlDisplay.classList.add('hidden');
    }

    new QRCode(qrContainer, {
        text: text,
        width: 160,
        height: 160,
        colorDark : "#0f172a",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    const qrLabel = document.getElementById('qrLabel');
    if (qrLabel) qrLabel.textContent = label;
}

function generateQR(id) {
    myPeerId = id;
    updateQR();
}

window.addEventListener('load', () => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
        const id = hash.substring(1);
        if (id && id.length === 6) {
            if (targetIdInput) targetIdInput.value = id;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            const rTabBtn = document.querySelector('[data-tab="receive"]');
            if (rTabBtn) rTabBtn.classList.add('active');
            const rTabContent = document.getElementById('receiveTab');
            if (rTabContent) rTabContent.classList.add('active');
            
            showToast("Auto-filled sender ID from link!");
        }
    }
});

const qrIdBtn = document.getElementById('qrIdBtn');
const qrUrlBtn = document.getElementById('qrUrlBtn');

if (qrIdBtn) {
    qrIdBtn.addEventListener('click', () => {
        currentQrType = 'id';
        qrIdBtn.classList.add('active');
        if (qrUrlBtn) qrUrlBtn.classList.remove('active');
        updateQR();
    });
}

if (qrUrlBtn) {
    qrUrlBtn.addEventListener('click', () => {
        currentQrType = 'url';
        qrUrlBtn.classList.add('active');
        if (qrIdBtn) qrIdBtn.classList.remove('active');
        updateQR();
    });
}

const copyIdBtn = document.getElementById('copyIdBtn');
if (copyIdBtn) {
    copyIdBtn.addEventListener('click', () => {
        if (myIdEl) {
            navigator.clipboard.writeText(myIdEl.textContent);
            showToast("Connection ID copied!");
        }
    });
}

// QR Scanner Logic
async function startScanner() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("Scanner requires HTTPS or localhost.", "error");
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (scanVideo) {
            scanVideo.srcObject = stream;
            scanVideo.setAttribute("playsinline", true);
            scanVideo.play();
        }
        scanning = true;
        if (scanModal) scanModal.classList.remove('hidden');
        requestAnimationFrame(tick);
    } catch (err) {
        showToast("Camera access denied.", "error");
        console.error(err);
    }
}

function stopScanner() {
    scanning = false;
    if (scanVideo && scanVideo.srcObject) {
        scanVideo.srcObject.getTracks().forEach(track => track.stop());
    }
    if (scanModal) scanModal.classList.add('hidden');
}

function tick() {
    if (!scanning || !scanVideo) return;
    if (scanVideo.readyState === scanVideo.HAVE_ENOUGH_DATA) {
        canvasElement.height = scanVideo.videoHeight;
        canvasElement.width = scanVideo.videoWidth;
        canvas.drawImage(scanVideo, 0, 0, canvasElement.width, canvasElement.height);
        
        const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
        if (window.jsQR) {
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code) {
                console.log("Found QR code", code.data);
                showToast("ID Found! Connecting...");
                if (targetIdInput) targetIdInput.value = code.data;
                stopScanner();
                
                if (currentFiles.length > 0) {
                    initiateSend(code.data);
                } else {
                    initiateReceive(code.data);
                }
            }
        }
    }
    requestAnimationFrame(tick);
}

if (scanQrBtn) scanQrBtn.addEventListener('click', startScanner);
if (closeScanBtn) closeScanBtn.addEventListener('click', stopScanner);

// Tab Switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const content = document.getElementById(btn.dataset.tab + 'Tab');
        if (content) content.classList.add('active');
    });
});

// File Selection & Drag & Drop
if (dropZone && fileInput) {
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
}

function initiateSend(targetId) {
    if (!peer) return;
    
    if (transferZone) transferZone.classList.remove('hidden');
    if (radarContainer) radarContainer.classList.remove('hidden');
    if (transferInfo) transferInfo.classList.add('hidden');
    if (progressBarFill) progressBarFill.style.width = '0%';
    if (progressPercent) progressPercent.textContent = '0%';

    setTimeout(() => {
        const conn = peer.connect(targetId);
        handleConnection(conn);

        conn.on('open', () => {
            if (radarContainer) radarContainer.classList.add('hidden');
            if (transferInfo) transferInfo.classList.remove('hidden');
            if (transferTitle) transferTitle.textContent = "Requesting Access...";
        });
        
        conn.on('error', () => {
            showToast("Device Discovery Failed", "error");
            if (transferZone) transferZone.classList.add('hidden');
        });
    }, 1500);
}

function initiateReceive(targetId) {
    if (!peer) return;

    if (transferZone) transferZone.classList.remove('hidden');
    if (radarContainer) radarContainer.classList.remove('hidden');
    if (transferInfo) transferInfo.classList.add('hidden');
    if (progressBarFill) progressBarFill.style.width = '0%';
    if (progressPercent) progressPercent.textContent = '0%';

    setTimeout(() => {
        const conn = peer.connect(targetId);
        handleConnection(conn);

        conn.on('open', () => {
            if (radarContainer) radarContainer.classList.add('hidden');
            if (transferInfo) transferInfo.classList.remove('hidden');
            if (transferTitle) transferTitle.textContent = "Connecting to Host...";
        });

        conn.on('error', () => {
            showToast("Connection to Host Failed", "error");
            if (transferZone) transferZone.classList.add('hidden');
        });
    }, 1200);
}

// Connect Button Click
if (connectBtn) {
    connectBtn.addEventListener('click', () => {
        const targetId = targetIdInput ? targetIdInput.value.trim().toUpperCase() : '';
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
}

// Cancel Transfer
if (cancelTransferBtn) {
    cancelTransferBtn.addEventListener('click', () => {
        isTransferAborted = true;
        if (currentConn) {
            currentConn.close();
        }
        if (transferZone) transferZone.classList.add('hidden');
        if (radarContainer) radarContainer.classList.add('hidden');
        scanning = false;
        stopMetrics();
        showToast("Transfer Aborted", "error");
    });
}

// Method Switching Simulation
methodIcons.forEach(icon => {
    icon.addEventListener('click', () => {
        methodIcons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
        if (methodLabel) methodLabel.textContent = `Optimizing for ${icon.dataset.method}...`;
        showToast(`Switched to ${icon.dataset.method} mode`);
    });
});

// Logo QR Modal
if (logoBtn && logoQrModal) {
    logoBtn.addEventListener('click', () => {
        logoQrModal.classList.remove('hidden');
        const baseUrl = window.location.origin + window.location.pathname;
        const text = baseUrl + (myPeerId ? '#' + myPeerId : '');
        
        if (logoQrCodeContainer) {
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
        }
    });
}

if (closeLogoQrBtn && logoQrModal) {
    closeLogoQrBtn.addEventListener('click', () => {
        logoQrModal.classList.add('hidden');
    });
}

// Help Guide Modal
const syncHelpBtn = document.getElementById('syncHelpBtn');
const helpGuideModal = document.getElementById('helpGuideModal');
const closeHelpGuideBtn = document.getElementById('closeHelpGuideBtn');
const closeHelpGuideBtn2 = document.getElementById('closeHelpGuideBtn2');

function openHelpGuide() {
    if (!helpGuideModal) return;
    helpGuideModal.classList.remove('hidden');
    syncActiveGuideMethod();
    if (window.lucide) lucide.createIcons();
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
            if (methodLabel) methodLabel.textContent = `Optimizing for ${targetMethod}...`;
            showToast(`Switched to ${targetMethod} mode`);
            syncActiveGuideMethod();
        }
    });
});

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
            if (methodLabel) methodLabel.textContent = `Optimizing for ${targetMethod}...`;
            showToast(`Switched to ${targetMethod} mode`);
            syncActiveGuideMethod();
        }
    });
});

// ESC Key Listener
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (helpGuideModal && !helpGuideModal.classList.contains('hidden')) closeHelpGuide();
        if (logoQrModal && !logoQrModal.classList.contains('hidden')) logoQrModal.classList.add('hidden');
        if (scanModal && !scanModal.classList.contains('hidden')) stopScanner();
        if (archiveModal && !archiveModal.classList.contains('hidden')) archiveModal.classList.add('hidden');
        if (archiveRunnerModal && !archiveRunnerModal.classList.contains('hidden')) {
            archiveRunnerModal.classList.add('hidden');
            if (runnerFrame) runnerFrame.src = 'about:blank';
            cleanupRunnerUrls();
        }
        if (archivePreviewModal && !archivePreviewModal.classList.contains('hidden')) archivePreviewModal.classList.add('hidden');
    }
});

// Theme Management
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
    if (window.lucide) lucide.createIcons();
}

function setTheme(theme, showNotification = false) {
    localStorage.setItem('sharewith-theme', theme);
    updateThemeUI(theme);
    if (showNotification) {
        showToast(`Theme switched to ${theme.charAt(0).toUpperCase() + theme.slice(1)} mode`);
    }
}

updateThemeUI(getStoredTheme());

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme, true);
    });
}

if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
        if (!localStorage.getItem('sharewith-theme')) {
            updateThemeUI(e.matches ? 'light' : 'dark');
        }
    });
}

// Initial Start
initPeer();
