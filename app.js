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

// --- PeerJS / P2P Logic ---
let peer = null;
let currentConn = null;
let currentFiles = []; // Array to store multiple files
let currentFileIndex = 0;
let receivedBlobs = []; // Array to store multiple received files
let incomingFiles = []; // Array to store incoming file metadata
let currentQrType = 'id';
let myPeerId = '';
let scanning = false;
let canvasElement = document.createElement("canvas");
let canvas = canvasElement.getContext("2d", { willReadFrequently: true });

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
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Offline (Retry in 5s)';
        setTimeout(initPeer, 5000);
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
                files: currentFiles.map(f => ({ name: f.name, size: f.size }))
            });
            showToast(`Connected! Requesting to send ${currentFiles.length} file(s)...`);
        }
    });

    conn.on('data', (data) => {
        if (data.type === 'metadata-batch') {
            // Sender sent batch metadata, ask for acceptance
            incomingFiles = data.files;
            const totalSize = incomingFiles.reduce((acc, f) => acc + f.size, 0);
            const names = incomingFiles.map(f => f.name).join(', ');
            
            incomingFileInfo.textContent = `${incomingFiles.length} Files: ${names.length > 40 ? names.substring(0, 37) + '...' : names} (${formatBytes(totalSize)})`;
            incomingModal.classList.remove('hidden');
        } else if (data.type === 'file-part') {
            // Sender sent a single file in the batch
            const blob = new Blob([data.buffer]);
            const url = URL.createObjectURL(blob);
            
            // Auto download
            const a = document.createElement('a');
            a.href = url;
            a.download = data.name;
            a.click();
            
            receivedBlobs.push({ name: data.name, blob: blob });
            
            const progress = Math.round(((data.index + 1) / incomingFiles.length) * 100);
            updateProgress(progress);
            
            if (data.index === incomingFiles.length - 1) {
                showSuccess(`${incomingFiles.length} file(s) received successfully.`, true);
                transferZone.classList.add('hidden');
            } else {
                transferTitle.textContent = `Receiving (${data.index + 2}/${incomingFiles.length})...`;
            }
        } else if (data.type === 'accept') {
            // Receiver accepted, send all files
            sendFileDataBatch();
        } else if (data.type === 'decline') {
            showToast("Transfer declined by receiver.", "error");
            transferZone.classList.add('hidden');
        }
    });

    conn.on('close', () => {
        showToast("Connection lost.", "error");
        console.log("Connection closed");
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
    fileSizeText.textContent = formatBytes(totalSize);
    
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

    const targetId = targetIdInput.value.trim();
    if (targetId) {
        initiateSend(targetId);
    } else {
        showToast("Files ready. Share your ID or scan the QR code.");
    }
}

function initiateSend(targetId) {
    if (!peer) return;
    
    transferZone.classList.remove('hidden');
    radarContainer.classList.remove('hidden'); // Show radar first
    transferInfo.classList.add('hidden');
    progressBarFill.style.width = '0%';
    progressPercent.textContent = '0%';

    // Simulate "Finding device" through the chosen method
    setTimeout(() => {
        const conn = peer.connect(targetId);
        handleConnection(conn);

        conn.on('open', () => {
            radarContainer.classList.add('hidden');
            transferInfo.classList.remove('hidden');
            transferTitle.textContent = "Requesting Access...";
            // Metadata-batch is already sent via handleConnection's 'open' listener
        });
        
        conn.on('error', () => {
            showToast("Device Discovery Failed", "error");
            transferZone.classList.add('hidden');
        });
    }, 2000); // 2s of radar scanning
}

function initiateReceive(targetId) {
    if (!peer) return;

    transferZone.classList.remove('hidden');
    radarContainer.classList.remove('hidden');
    transferInfo.classList.add('hidden');
    progressBarFill.style.width = '0%';
    progressPercent.textContent = '0%';

    setTimeout(() => {
        const conn = peer.connect(targetId);
        handleConnection(conn);

        conn.on('open', () => {
            radarContainer.classList.add('hidden');
            transferInfo.classList.remove('hidden');
            transferTitle.textContent = "Connecting to Host...";
            // We are the receiver, we just wait for metadata.
            // handleConnection will trigger the incoming modal when metadata arrives.
        });

        conn.on('error', () => {
            showToast("Connection to Host Failed", "error");
            transferZone.classList.add('hidden');
        });
    }, 1500);
}

async function sendFileDataBatch() {
    transferZone.classList.remove('hidden');
    radarContainer.classList.add('hidden');
    transferInfo.classList.remove('hidden');
    transferTitle.textContent = "Optimizing Route...";
    
    // Simulate some "Connecting" time for aesthetics
    setTimeout(async () => {
        for (let i = 0; i < currentFiles.length; i++) {
            const file = currentFiles[i];
            transferTitle.textContent = `Sending (${i + 1}/${currentFiles.length}): ${file.name}`;
            
            const reader = new FileReader();
            await new Promise((resolve) => {
                reader.onload = (event) => {
                    currentConn.send({
                        type: 'file-part',
                        index: i,
                        name: file.name,
                        buffer: event.target.result
                    });
                    
                    const progress = Math.round(((i + 1) / currentFiles.length) * 100);
                    updateProgress(progress);
                    resolve();
                };
                reader.readAsArrayBuffer(file);
            });
            
            // Short delay between files to ensure orderly transmission
            await new Promise(r => setTimeout(r, 500));
        }
        
        setTimeout(() => {
            showSuccess(`${currentFiles.length} Document(s) sent successfully!`);
            transferZone.classList.add('hidden');
        }, 1000);
    }, 1500);
}

function updateProgress(val) {
    progressBarFill.style.width = `${val}%`;
    progressPercent.textContent = `${val}%`;
}

// --- Receivers Actions ---
acceptBtn.addEventListener('click', () => {
    incomingModal.classList.add('hidden');
    transferTitle.textContent = `Receiving (1/${incomingFiles.length})...`;
    transferZone.classList.remove('hidden');
    updateProgress(0);
    
    receivedBlobs = [];
    currentConn.send({ type: 'accept' });
});

declineBtn.addEventListener('click', () => {
    incomingModal.classList.add('hidden');
    currentConn.send({ type: 'decline' });
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
        const url = URL.createObjectURL(item.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        a.click();
        URL.revokeObjectURL(url);
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
    const targetId = targetIdInput.value.trim();
    if (targetId) {
        if (currentFiles.length > 0) {
            initiateSend(targetId);
        } else {
            initiateReceive(targetId);
        }
    } else {
        showToast("Enter the ID of the receiver.");
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

// Initial Start
initPeer();
