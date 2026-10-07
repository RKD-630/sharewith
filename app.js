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
const fileNameText = document.getElementById('fileNameText');
const fileSizeText = document.getElementById('fileSizeText');
const progressBarFill = document.getElementById('progressBarFill');
const progressPercent = document.getElementById('progressPercent');
const quickDownloadBadge = document.getElementById('quickDownloadBadge');
const downloadStatusText = document.getElementById('downloadStatusText');
const radarText = document.getElementById('radarText');

const incomingModal = document.getElementById('incomingModal');
const incomingFileInfo = document.getElementById('incomingFileInfo');
const acceptBtn = document.getElementById('acceptBtn');
const declineBtn = document.getElementById('declineBtn');

const successModal = document.getElementById('successModal');
const successMsgText = document.getElementById('successMsgText');
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

// --- PeerJS & Offline State Variables ---
let peer = null;
let currentConn = null;
let currentFiles = []; // Array of files to send
let currentFileIndex = 0;
let receivedBlobs = []; // Array of received files
let incomingFiles = []; // Incoming metadata
let currentReceivingFile = null; // Currently streaming file object
let isQrScanConnection = false; // Flag for QR scan quick download
let isOfflineSharingActive = false; // Offline mode flag
let lanChannel = null; // BroadcastChannel for LAN sync
let currentQrType = 'id';
let myPeerId = '';
let scanning = false;
const CHUNK_SIZE = 64 * 1024; // 64 KB chunk size for WebRTC streaming

let canvasElement = document.createElement("canvas");
let canvas = canvasElement.getContext("2d", { willReadFrequently: true });

// --- Offline Local Sharing Fallback System ---
function initOfflineSharing() {
    if ('BroadcastChannel' in window) {
        lanChannel = new BroadcastChannel('sharewith_lan_channel');
        lanChannel.onmessage = (e) => {
            handleLanMessage(e.data);
        };
    }

    // Storage event fallback for same-origin tabs/windows
    window.addEventListener('storage', (e) => {
        if (e.key === 'sharewith_lan_msg' && e.newValue) {
            try {
                const data = JSON.parse(e.newValue);
                handleLanMessage(data);
            } catch (err) {}
        }
    });

    // Detect browser offline/online status automatically
    window.addEventListener('offline', () => {
        showToast("Internet disconnected. Switching to Offline Local Sharing mode...", "warning");
        enableOfflineSharingMode();
    });

    window.addEventListener('online', () => {
        showToast("Internet reconnected. Ready for Global & Local sharing.", "info");
        statusDot.className = 'status-dot online';
        statusText.textContent = 'Ready to sync';
        isOfflineSharingActive = false;
    });

    if (!navigator.onLine) {
        enableOfflineSharingMode();
    }
}

function enableOfflineSharingMode() {
    isOfflineSharingActive = true;
    statusDot.className = 'status-dot offline-lan';
    statusText.textContent = 'Offline LAN Mode (Wi-Fi / Hotspot)';
    
    // Auto highlight Local Wi-Fi icon
    methodIcons.forEach(icon => {
        if (icon.dataset.method === 'Local Wi-Fi') {
            icon.classList.add('active');
        } else {
            icon.classList.remove('active');
        }
    });
    if (methodLabel) methodLabel.textContent = 'Active Mode: Local Wi-Fi / Hotspot (Offline Sharing)';
}

function broadcastLan(data) {
    if (lanChannel) {
        try {
            lanChannel.postMessage(data);
        } catch (err) {
            console.warn("BroadcastChannel postMessage error:", err);
        }
    }
    // Only save metadata to localStorage if there is no large raw ArrayBuffer
    if (!data.buffer) {
        try {
            localStorage.setItem('sharewith_lan_msg', JSON.stringify({ ...data, _ts: Date.now() }));
        } catch (err) {}
    }
}

function handleLanMessage(data) {
    if (!data || !data.targetId) return;
    
    if (myPeerId && data.targetId.toUpperCase() === myPeerId.toUpperCase()) {
        if (data.type === 'lan-connect') {
            showToast("Offline connection request received!", "info");
            if (currentFiles.length > 0) {
                sendFileDataBatchLan(data.senderId);
            }
        } else if (data.type === 'lan-metadata-batch') {
            incomingFiles = data.files;
            acceptIncomingFilesQuickly();
        } else if (data.type === 'lan-file-start') {
            currentReceivingFile = {
                fileId: data.fileId,
                name: data.name,
                size: data.size,
                mimeType: data.mimeType || 'application/octet-stream',
                fileIndex: data.fileIndex,
                totalFiles: data.totalFiles,
                chunks: [],
                receivedBytes: 0,
                startTime: Date.now()
            };
            transferZone.classList.remove('hidden');
            radarContainer.classList.add('hidden');
            transferInfo.classList.remove('hidden');
            if (quickDownloadBadge) quickDownloadBadge.classList.remove('hidden');

            transferTitle.textContent = data.totalFiles > 1 
                ? `Offline Downloading (${data.fileIndex + 1}/${data.totalFiles})...`
                : `Offline Downloading File...`;

            fileNameText.textContent = data.name;
            fileSizeText.textContent = `0 B / ${formatBytes(data.size)}`;
            if (downloadStatusText) downloadStatusText.textContent = 'Downloading via Local Wi-Fi...';
            updateProgress(0);
        } else if (data.type === 'lan-file-chunk') {
            if (currentReceivingFile && currentReceivingFile.fileId === data.fileId) {
                let chunkBuffer;
                if (data.buffer instanceof ArrayBuffer) {
                    chunkBuffer = data.buffer;
                } else if (data.base64) {
                    const binary = atob(data.base64);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    chunkBuffer = bytes.buffer;
                }
                if (chunkBuffer) {
                    currentReceivingFile.chunks.push(chunkBuffer);
                    currentReceivingFile.receivedBytes += chunkBuffer.byteLength;
                    const percent = Math.min(100, Math.round((currentReceivingFile.receivedBytes / currentReceivingFile.size) * 100));
                    updateProgress(percent);
                    fileSizeText.textContent = `${formatBytes(currentReceivingFile.receivedBytes)} / ${formatBytes(currentReceivingFile.size)}`;

                    const elapsedSec = (Date.now() - currentReceivingFile.startTime) / 1000;
                    if (elapsedSec > 0.2 && downloadStatusText) {
                        const speed = currentReceivingFile.receivedBytes / elapsedSec;
                        downloadStatusText.textContent = `${formatBytes(speed)}/s • Offline LAN`;
                    }
                }
            }
        } else if (data.type === 'lan-file-end') {
            if (currentReceivingFile && currentReceivingFile.fileId === data.fileId) {
                const blob = new Blob(currentReceivingFile.chunks, { type: currentReceivingFile.mimeType });
                const fileName = currentReceivingFile.name;
                triggerFileDownload(blob, fileName);
                receivedBlobs.push({ name: fileName, blob: blob });
                updateProgress(100);
                showToast(`Offline Downloaded: ${fileName}`, "success");
                if (currentReceivingFile.fileIndex === currentReceivingFile.totalFiles - 1) {
                    setTimeout(() => {
                        showSuccess(`${currentReceivingFile.totalFiles} file(s) downloaded offline successfully!`, true);
                        transferZone.classList.add('hidden');
                    }, 800);
                }
            }
        }
    }
}

// Initialize Peer
function initPeer() {
    const customId = Math.random().toString(36).substr(2, 6).toUpperCase();
    myPeerId = customId;
    myIdEl.textContent = customId;
    updateQR();
    
    initOfflineSharing();

    try {
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
                showToast("Cloud connection unavailable. Attempting Offline Local Sharing...", "warning");
                return;
            }
            if (err.type === 'unavailable-id') {
                setTimeout(initPeer, 500);
                return;
            }
            // Auto fallback on server connection error
            enableOfflineSharingMode();
            showToast("Online server unreachable. Automatically switched to Offline Local Sharing mode!", "warning");
        });

        peer.on('connection', (conn) => {
            handleConnection(conn);
        });
    } catch (e) {
        console.warn("PeerJS failed to initialize, switching to offline mode:", e);
        enableOfflineSharingMode();
    }
}

function handleConnection(conn) {
    currentConn = conn;
    
    conn.on('open', () => {
        console.log("Connection established with:", conn.peer);
        if (currentFiles.length > 0) {
            conn.send({
                type: 'metadata-batch',
                files: currentFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
                isQrScan: isQrScanConnection
            });
            showToast(`Connected! Sending request for ${currentFiles.length} file(s)...`);
        }
    });

    conn.on('data', (data) => {
        if (data.type === 'metadata-batch') {
            incomingFiles = data.files;
            const totalSize = incomingFiles.reduce((acc, f) => acc + f.size, 0);
            const names = incomingFiles.map(f => f.name).join(', ');

            if (isQrScanConnection || data.isQrScan) {
                showToast("QR Code Scanned! Quick Download starting...", "info");
                acceptIncomingFilesQuickly();
            } else {
                incomingFileInfo.textContent = `${incomingFiles.length} File(s): ${names.length > 40 ? names.substring(0, 37) + '...' : names} (${formatBytes(totalSize)})`;
                incomingModal.classList.remove('hidden');
            }

        } else if (data.type === 'accept') {
            sendFileDataBatch();

        } else if (data.type === 'decline') {
            showToast("Transfer declined by receiver.", "error");
            transferZone.classList.add('hidden');

        } else if (data.type === 'file-start') {
            currentReceivingFile = {
                fileId: data.fileId,
                name: data.name,
                size: data.size,
                mimeType: data.mimeType || 'application/octet-stream',
                fileIndex: data.fileIndex,
                totalFiles: data.totalFiles,
                totalChunks: data.totalChunks,
                chunks: [],
                receivedBytes: 0,
                startTime: Date.now()
            };

            transferZone.classList.remove('hidden');
            radarContainer.classList.add('hidden');
            transferInfo.classList.remove('hidden');

            if (quickDownloadBadge) {
                if (isQrScanConnection || data.isQrScan) {
                    quickDownloadBadge.classList.remove('hidden');
                } else {
                    quickDownloadBadge.classList.add('hidden');
                }
            }

            transferTitle.textContent = data.totalFiles > 1 
                ? `Quick Downloading (${data.fileIndex + 1}/${data.totalFiles})...`
                : `Quick Downloading File...`;

            fileNameText.textContent = data.name;
            fileSizeText.textContent = `0 B / ${formatBytes(data.size)}`;
            if (downloadStatusText) downloadStatusText.textContent = 'Starting download...';
            updateProgress(0);

        } else if (data.type === 'file-chunk') {
            if (currentReceivingFile && currentReceivingFile.fileId === data.fileId) {
                currentReceivingFile.chunks.push(data.buffer);
                currentReceivingFile.receivedBytes += data.buffer.byteLength;

                const percent = Math.min(100, Math.round((currentReceivingFile.receivedBytes / currentReceivingFile.size) * 100));
                updateProgress(percent);
                fileSizeText.textContent = `${formatBytes(currentReceivingFile.receivedBytes)} / ${formatBytes(currentReceivingFile.size)}`;

                const elapsedSec = (Date.now() - currentReceivingFile.startTime) / 1000;
                if (elapsedSec > 0.2) {
                    const speed = currentReceivingFile.receivedBytes / elapsedSec;
                    if (downloadStatusText) downloadStatusText.textContent = `${formatBytes(speed)}/s • Downloading`;
                }
            }

        } else if (data.type === 'file-end') {
            if (currentReceivingFile && currentReceivingFile.fileId === data.fileId) {
                const blob = new Blob(currentReceivingFile.chunks, { type: currentReceivingFile.mimeType });
                const fileName = currentReceivingFile.name;

                triggerFileDownload(blob, fileName);
                receivedBlobs.push({ name: fileName, blob: blob });
                updateProgress(100);

                showToast(`Downloaded: ${fileName}`, "success");
                if (downloadStatusText) downloadStatusText.textContent = 'Download Complete!';

                if (currentReceivingFile.fileIndex === currentReceivingFile.totalFiles - 1) {
                    setTimeout(() => {
                        showSuccess(`${currentReceivingFile.totalFiles} file(s) downloaded successfully!`, true);
                        transferZone.classList.add('hidden');
                    }, 800);
                }
            }

        } else if (data.type === 'file-part') {
            const blob = new Blob([data.buffer]);
            triggerFileDownload(blob, data.name);
            receivedBlobs.push({ name: data.name, blob: blob });
            updateProgress(100);
            showSuccess(`Downloaded ${data.name}`, true);
            transferZone.classList.add('hidden');
        }
    });

    conn.on('close', () => {
        showToast("Connection lost.", "error");
        console.log("Connection closed");
    });
}

function acceptIncomingFilesQuickly() {
    incomingModal.classList.add('hidden');
    transferZone.classList.remove('hidden');
    radarContainer.classList.add('hidden');
    transferInfo.classList.remove('hidden');
    if (quickDownloadBadge) quickDownloadBadge.classList.remove('hidden');

    if (incomingFiles && incomingFiles.length > 0) {
        fileNameText.textContent = incomingFiles[0].name;
        fileSizeText.textContent = `0 B / ${formatBytes(incomingFiles[0].size)}`;
    }
    transferTitle.textContent = "Quick Downloading File...";
    if (downloadStatusText) downloadStatusText.textContent = "Connecting stream...";
    updateProgress(0);

    receivedBlobs = [];
    if (currentConn) {
        currentConn.send({ type: 'accept' });
    }
}

function triggerFileDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
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
            showToast("QR Code Scanned! Connecting for Quick Download...");
            
            let extractedId = code.data;
            if (extractedId.includes('#')) {
                extractedId = extractedId.split('#').pop();
            }
            targetIdInput.value = extractedId;
            isQrScanConnection = true;
            stopScanner();
            
            if (currentFiles.length > 0) {
                initiateSend(extractedId);
            } else {
                initiateReceive(extractedId);
            }
        }
    }
    requestAnimationFrame(tick);
}

scanQrBtn.addEventListener('click', () => {
    isQrScanConnection = true;
    startScanner();
});
closeScanBtn.addEventListener('click', stopScanner);

// --- Interaction Logic ---
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
    });
});

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
    fileSizeText.textContent = formatBytes(totalSize);
    
    const dropZoneIcon = dropZone.querySelector('.drop-icon');
    const dropZoneText = dropZone.querySelector('p');
    
    if (dropZoneIcon && dropZoneText) {
        dropZoneIcon.setAttribute('data-lucide', 'check-circle-2');
        dropZoneIcon.className = 'drop-icon success-pulse';
        const fileLabel = files.length > 1 ? `${files.length} Document(s)` : files[0].name;
        dropZoneText.innerHTML = `Ready to send: <span class="gradient-text">${fileLabel}</span><br><small>${formatBytes(totalSize)}</small>`;
        lucide.createIcons();
    }

    const targetId = targetIdInput.value.trim();
    if (targetId) {
        initiateSend(targetId);
    } else {
        showToast("Files ready. Share your ID or scan the QR code.");
    }
}

function initiateSend(targetId) {
    if (!peer || !navigator.onLine) {
        fallbackToOfflineSend(targetId);
        return;
    }
    
    transferZone.classList.remove('hidden');
    radarContainer.classList.remove('hidden');
    if (radarText) radarText.textContent = "Connecting to receiver...";
    transferInfo.classList.add('hidden');
    progressBarFill.style.width = '0%';
    progressPercent.textContent = '0%';

    let connected = false;

    try {
        const conn = peer.connect(targetId);
        handleConnection(conn);

        conn.on('open', () => {
            connected = true;
            radarContainer.classList.add('hidden');
            transferInfo.classList.remove('hidden');
            transferTitle.textContent = "Requesting Access...";
        });
        
        conn.on('error', (err) => {
            console.warn("Online send connection error, switching to Offline LAN...", err);
            fallbackToOfflineSend(targetId);
        });
    } catch (e) {
        fallbackToOfflineSend(targetId);
        return;
    }

    // Auto fallback if online PeerJS connection fails to open within 3 seconds
    setTimeout(() => {
        if (!connected) {
            console.warn("Peer connection timed out. Falling back to Offline Local Sharing mode...");
            fallbackToOfflineSend(targetId);
        }
    }, 3000);
}

function fallbackToOfflineSend(targetId) {
    enableOfflineSharingMode();
    showToast("Online server unreachable. Switched automatically to Offline Local Sharing mode!", "warning");
    
    broadcastLan({
        type: 'lan-metadata-batch',
        targetId: targetId,
        senderId: myPeerId,
        files: currentFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });
    
    sendFileDataBatchLan(targetId);
}

function initiateReceive(targetId) {
    if (!peer || !navigator.onLine) {
        fallbackToOfflineReceive(targetId);
        return;
    }

    transferZone.classList.remove('hidden');
    radarContainer.classList.remove('hidden');
    if (radarText) radarText.textContent = isQrScanConnection ? "Connecting via QR Quick Link..." : "Scanning Network...";
    transferInfo.classList.add('hidden');
    progressBarFill.style.width = '0%';
    progressPercent.textContent = '0%';

    let connected = false;

    try {
        const conn = peer.connect(targetId);
        handleConnection(conn);

        conn.on('open', () => {
            connected = true;
            radarContainer.classList.add('hidden');
            transferInfo.classList.remove('hidden');
            transferTitle.textContent = "Connecting to Host...";
        });

        conn.on('error', () => {
            console.warn("Online receive connection error, switching to Offline LAN...");
            fallbackToOfflineReceive(targetId);
        });
    } catch (e) {
        fallbackToOfflineReceive(targetId);
        return;
    }

    setTimeout(() => {
        if (!connected) {
            console.warn("Receive connection timed out. Falling back to Offline Local Sharing mode...");
            fallbackToOfflineReceive(targetId);
        }
    }, 3000);
}

function fallbackToOfflineReceive(targetId) {
    enableOfflineSharingMode();
    showToast("Online server unreachable. Switched automatically to Offline Local Sharing mode!", "warning");
    
    broadcastLan({
        type: 'lan-connect',
        targetId: targetId,
        senderId: myPeerId
    });
    
    radarContainer.classList.add('hidden');
    transferInfo.classList.remove('hidden');
    transferTitle.textContent = "Waiting for Offline Transmission...";
    if (downloadStatusText) downloadStatusText.textContent = "Listening on Local Wi-Fi / Hotspot...";
}

async function sendFileDataBatch() {
    transferZone.classList.remove('hidden');
    radarContainer.classList.add('hidden');
    transferInfo.classList.remove('hidden');
    transferTitle.textContent = "Preparing Transmission...";
    if (quickDownloadBadge) quickDownloadBadge.classList.add('hidden');

    for (let i = 0; i < currentFiles.length; i++) {
        const file = currentFiles[i];
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const fileId = 'file_' + Math.random().toString(36).substr(2, 7);

        fileNameText.textContent = file.name;
        transferTitle.textContent = `Sending (${i + 1}/${currentFiles.length}): ${file.name}`;
        if (downloadStatusText) downloadStatusText.textContent = 'Sending file...';

        currentConn.send({
            type: 'file-start',
            fileId: fileId,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            fileIndex: i,
            totalFiles: currentFiles.length,
            totalChunks: totalChunks
        });

        let offset = 0;
        let chunkIndex = 0;
        const startTime = Date.now();

        while (offset < file.size) {
            if (currentConn._dc && currentConn._dc.bufferedAmount > 256 * 1024) {
                await new Promise(r => setTimeout(r, 40));
                continue;
            }

            const chunk = file.slice(offset, offset + CHUNK_SIZE);
            const arrayBuffer = await chunk.arrayBuffer();

            currentConn.send({
                type: 'file-chunk',
                fileId: fileId,
                chunkIndex: chunkIndex,
                buffer: arrayBuffer
            });

            offset += chunk.size;
            chunkIndex++;

            const pct = Math.min(100, Math.round((offset / file.size) * 100));
            updateProgress(pct);
            fileSizeText.textContent = `${formatBytes(Math.min(offset, file.size))} / ${formatBytes(file.size)}`;

            const elapsedSec = (Date.now() - startTime) / 1000;
            if (elapsedSec > 0.2 && downloadStatusText) {
                const speed = offset / elapsedSec;
                downloadStatusText.textContent = `${formatBytes(speed)}/s • Sending`;
            }

            if (chunkIndex % 4 === 0) {
                await new Promise(r => setTimeout(r, 5));
            }
        }

        currentConn.send({
            type: 'file-end',
            fileId: fileId,
            name: file.name
        });

        await new Promise(r => setTimeout(r, 200));
    }

    setTimeout(() => {
        showSuccess(`${currentFiles.length} File(s) sent successfully!`);
        transferZone.classList.add('hidden');
    }, 800);
}

async function sendFileDataBatchLan(targetId) {
    transferZone.classList.remove('hidden');
    radarContainer.classList.add('hidden');
    transferInfo.classList.remove('hidden');
    transferTitle.textContent = "Offline Transmitting...";
    if (quickDownloadBadge) quickDownloadBadge.classList.add('hidden');

    for (let i = 0; i < currentFiles.length; i++) {
        const file = currentFiles[i];
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const fileId = 'file_lan_' + Math.random().toString(36).substr(2, 7);

        fileNameText.textContent = file.name;
        transferTitle.textContent = `Offline Sending (${i + 1}/${currentFiles.length}): ${file.name}`;
        if (downloadStatusText) downloadStatusText.textContent = 'Sending over Local Wi-Fi...';

        broadcastLan({
            type: 'lan-file-start',
            targetId: targetId,
            senderId: myPeerId,
            fileId: fileId,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            fileIndex: i,
            totalFiles: currentFiles.length,
            totalChunks: totalChunks
        });

        let offset = 0;
        let chunkIndex = 0;
        const startTime = Date.now();

        while (offset < file.size) {
            const chunk = file.slice(offset, offset + CHUNK_SIZE);
            const arrayBuffer = await chunk.arrayBuffer();

            broadcastLan({
                type: 'lan-file-chunk',
                targetId: targetId,
                senderId: myPeerId,
                fileId: fileId,
                chunkIndex: chunkIndex,
                buffer: arrayBuffer
            });

            offset += chunk.size;
            chunkIndex++;

            const pct = Math.min(100, Math.round((offset / file.size) * 100));
            updateProgress(pct);
            fileSizeText.textContent = `${formatBytes(Math.min(offset, file.size))} / ${formatBytes(file.size)}`;

            const elapsedSec = (Date.now() - startTime) / 1000;
            if (elapsedSec > 0.2 && downloadStatusText) {
                const speed = offset / elapsedSec;
                downloadStatusText.textContent = `${formatBytes(speed)}/s • Offline LAN`;
            }

            if (chunkIndex % 3 === 0) {
                await new Promise(r => setTimeout(r, 10));
            }
        }

        broadcastLan({
            type: 'lan-file-end',
            targetId: targetId,
            senderId: myPeerId,
            fileId: fileId,
            name: file.name
        });

        await new Promise(r => setTimeout(r, 200));
    }

    setTimeout(() => {
        showSuccess(`${currentFiles.length} File(s) sent via Offline Local Sharing!`);
        transferZone.classList.add('hidden');
    }, 800);
}

function updateProgress(val) {
    progressBarFill.style.width = `${val}%`;
    progressPercent.textContent = `${val}%`;
}

// --- Receivers Actions ---
acceptBtn.addEventListener('click', () => {
    acceptIncomingFilesQuickly();
});

declineBtn.addEventListener('click', () => {
    incomingModal.classList.add('hidden');
    if (currentConn) {
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

function generateQR(id) {
    myPeerId = id;
    updateQR();
}

// Check for auto-connect in URL hash
window.addEventListener('load', () => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
        const id = hash.substring(1).toUpperCase();
        if (id && id.length === 6) {
            targetIdInput.value = id;
            isQrScanConnection = true;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            document.querySelector('[data-tab="receive"]').classList.add('active');
            document.getElementById('receiveTab').classList.add('active');
            
            showToast("Quick Download Link detected from QR Code!");
            initiateReceive(id);
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

function showSuccess(msg, showDownload = false) {
    successMsgText.textContent = msg;
    if (showDownload && receivedBlobs.length > 0) {
        downloadAgainBtn.classList.remove('hidden');
    } else {
        downloadAgainBtn.classList.add('hidden');
    }
    successModal.classList.remove('hidden');
}

downloadAgainBtn.addEventListener('click', () => {
    receivedBlobs.forEach(item => {
        triggerFileDownload(item.blob, item.name);
    });
});

closeSuccessBtn.addEventListener('click', () => {
    successModal.classList.add('hidden');
    receivedBlobs = [];
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
    if (currentConn) {
        currentConn.close();
    }
    transferZone.classList.add('hidden');
    radarContainer.classList.add('hidden');
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
            methodLabel.textContent = `Optimizing for ${targetMethod}...`;
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
            methodLabel.textContent = `Optimizing for ${targetMethod}...`;
            showToast(`Switched to ${targetMethod} mode`);
            syncActiveGuideMethod();
        }
    });
});

// ESC key listener
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
