// Application state
let currentUser = null;
let authToken = null;
let currentFile = null;

// Change this to your deployed backend URL
const API_BASE = 'http://localhost:3000/api';

// DOM elements
const sections = {
    login: document.getElementById('loginSection'),
    signup: document.getElementById('signupSection'),
    upload: document.getElementById('uploadSection'),
    share: document.getElementById('shareSection'),
    dashboard: document.getElementById('dashboardSection')
};

const navButtons = {
    login: document.getElementById('navLoginBtn'),
    signup: document.getElementById('navSignupBtn'),
    upload: document.getElementById('navUploadBtn'),
    share: document.getElementById('navShareBtn'),
    dashboard: document.getElementById('navDashboardBtn')
};

const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const fileDetailsPanel = document.getElementById('fileDetailsPanel');
const userInfo = document.getElementById('userInfo');
const userDetails = document.getElementById('userDetails');
const fileListContainer = document.getElementById('fileListContainer');
const dashboardResponseDiv = document.getElementById('dashboardResponse');

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('SecureShare frontend initialized');
    setupEventListeners();
    checkExistingAuth();
});

function setupEventListeners() {
    // Navigation buttons
    Object.keys(navButtons).forEach(section => {
        navButtons[section].addEventListener('click', () => showSection(section));
    });

    document.getElementById('logoutBtn').addEventListener('click', logout);
    navButtons.dashboard.addEventListener('click', showDashboard);

    // Forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);
    document.getElementById('shareForm').addEventListener('submit', handleShare);

    // File upload
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
}

function checkExistingAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        showLoggedInState();
    } else {
        showSection('login');
    }
}

function showSection(sectionName) {
    // Hide all sections
    Object.values(sections).forEach(section => section.classList.remove('active'));
    Object.values(navButtons).forEach(btn => btn.classList.remove('active'));

    // Show selected section
    if (sections[sectionName]) {
        sections[sectionName].classList.add('active');
        navButtons[sectionName].classList.add('active');
    }
}

function showLoggedInState() {
    userInfo.style.display = 'flex';
    userDetails.textContent = `Welcome, ${currentUser.name}`;
    
    navButtons.upload.style.display = 'inline-block';
    navButtons.share.style.display = 'inline-block';
    navButtons.dashboard.style.display = 'inline-block';
    navButtons.login.style.display = 'none';
    navButtons.signup.style.display = 'none';
    
    showDashboard();
}

function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    userInfo.style.display = 'none';
    navButtons.upload.style.display = 'none';
    navButtons.share.style.display = 'none';
    navButtons.dashboard.style.display = 'none';
    navButtons.login.style.display = 'inline-block';
    navButtons.signup.style.display = 'inline-block';
    
    resetFileUpload();
    showSection('login');
}

// File drag & drop
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        handleFileSelect();
    }
}

// File selection
function handleFileSelect() {
    const file = fileInput.files[0];
    if (file) {
        currentFile = file;
        displayFileInfo(file);
        displayFilePreview(file);
    }
}

// Update main upload area
function displayFileInfo(file) {
    uploadArea.classList.add('has-file');
    
    const fileInfoDisplay = document.getElementById('fileInfoDisplay');
    fileInfoDisplay.style.display = 'block';
    fileInfoDisplay.innerHTML = `
        <div class="file-info">
            <h4>Selected File</h4>
            <div class="file-details">
                <p><strong>Name:</strong> ${file.name}</p>
                <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
                <p><strong>Type:</strong> ${file.type || 'Unknown'}</p>
            </div>
        </div>
    `;

    uploadArea.innerHTML = `
        <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div class="upload-text">File Selected: ${file.name}</div>
        <div class="upload-subtext">Click to change file or drag and drop a different one</div>
    `;
}

// Side panel preview
function displayFilePreview(file) {
    const isImage = file.type.startsWith('image/');
    let previewHTML = `
        <div class="share-item">
            <div class="share-label">Selected File (Not Uploaded)</div>
            <p><strong>Name:</strong> ${file.name}</p>
            <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
            <p><strong>Type:</strong> ${file.type || 'Unknown'}</p>
    `;

    if (isImage) {
        const imgURL = URL.createObjectURL(file);
        previewHTML += `
            <div style="margin-top: 0.5rem;">
                <img src="${imgURL}" alt="Preview"
                     style="max-width: 100%; max-height: 200px; border-radius: 8px; box-shadow: var(--shadow-sm);" />
            </div>
        `;
    }

    previewHTML += `</div>`;
    fileDetailsPanel.innerHTML = previewHTML;
}

// Reset file input
function resetFileUpload() {
    currentFile = null;
    fileInput.value = '';
    document.getElementById('citiesInput').value = '';
    document.getElementById('passwordInput').value = '';
    uploadArea.classList.remove('has-file', 'drag-over');
    uploadArea.innerHTML = `
        <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
        <div class="upload-text">Click to upload or drag and drop</div>
        <div class="upload-subtext">Supports: PDF, Word, PowerPoint, Images, Text files (max 300MB)</div>
    `;
    document.getElementById('fileInfoDisplay').style.display = 'none';
    showEmptyFileDetails();
}

// Clear form but keep side panel
function clearUploadForm() {
    currentFile = null;
    fileInput.value = '';
    document.getElementById('citiesInput').value = '';
    document.getElementById('passwordInput').value = '';
    uploadArea.classList.remove('has-file', 'drag-over');
    uploadArea.innerHTML = `
        <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
        <div class="upload-text">Click to upload or drag and drop</div>
        <div class="upload-subtext">Supports: PDF, Word, PowerPoint, Images, Text files (max 300MB)</div>
    `;
    document.getElementById('fileInfoDisplay').style.display = 'none';
}

// Show empty state in side panel
function showEmptyFileDetails() {
    fileDetailsPanel.innerHTML = `
        <div class="empty-state">
            <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <p>Upload a file or access a shared file to view details here</p>
        </div>
    `;
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('loginSubmitBtn');
    const responseDiv = document.getElementById('loginResponse');

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    setButtonLoading(submitBtn, true);
    hideAlert(responseDiv);

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            signal: AbortSignal.timeout(15000)
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.data.user;

            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            showAlert(responseDiv, 'Login successful! Welcome back.', 'success');
            setTimeout(() => showLoggedInState(), 1000);
        } else {
            showAlert(responseDiv, data.message || 'Login failed. Please check your credentials.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        if (error.name === 'TimeoutError') {
            showAlert(responseDiv, 'Request timeout. Please try again.', 'error');
        } else {
            showAlert(responseDiv, 'Network error. Please check your connection and try again.', 'error');
        }
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// Handle Signup
async function handleSignup(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('signupSubmitBtn');
    const responseDiv = document.getElementById('signupResponse');

    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        showAlert(responseDiv, 'Passwords do not match.', 'error');
        return;
    }

    setButtonLoading(submitBtn, true);
    hideAlert(responseDiv);

    try {
        const response = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, confirmPassword }),
            signal: AbortSignal.timeout(15000)
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.data.user;

            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            showAlert(responseDiv, 'Account created successfully!', 'success');
            setTimeout(() => showLoggedInState(), 1000);
        } else {
            showAlert(responseDiv, data.message || 'Signup failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        if (error.name === 'TimeoutError') {
            showAlert(responseDiv, 'Request timeout. Please try again.', 'error');
        } else {
            showAlert(responseDiv, 'Network error. Please check your connection and try again.', 'error');
        }
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// Handle File Upload
async function handleUpload(e) {
    e.preventDefault();

    if (!currentFile) {
        showAlert(document.getElementById('uploadResponse'), 'Please select a file first.', 'error');
        return;
    }

    const submitBtn = document.getElementById('uploadSubmitBtn');
    const responseDiv = document.getElementById('uploadResponse');
    const progressContainer = document.getElementById('progressContainer');

    const cities = document.getElementById('citiesInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();

    setButtonLoading(submitBtn, true);
    hideAlert(responseDiv);
    showProgress(progressContainer, 0, 'Preparing upload...');

    try {
        const formData = new FormData();
        formData.append('file', currentFile);
        if (cities) formData.append('cities', cities);
        if (password) formData.append('password', password);

        showProgress(progressContainer, 20, 'Uploading file...');

        const response = await fetch(`${API_BASE}/files/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData,
            signal: AbortSignal.timeout(120000)
        });

        const data = await response.json();

        if (response.ok) {
            showProgress(progressContainer, 100, 'Upload complete!');
            displayUploadSuccess(data);
            clearUploadForm(); // ✅ keep side panel intact
            setTimeout(() => hideProgress(progressContainer), 2000);
        } else {
            showAlert(responseDiv, data.message || `Upload failed with status: ${response.status}`, 'error');
            hideProgress(progressContainer);
        }
    } catch (error) {
        console.error('Upload error:', error);
        hideProgress(progressContainer);
        showAlert(responseDiv, 'Network error. Please try again.', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// Handle Share Access
async function handleShare(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('shareSubmitBtn');
    const responseDiv = document.getElementById('shareResponse');

    let tokenInput = document.getElementById('shareToken').value.trim();
    const password = document.getElementById('accessPasswordInput').value.trim();
    let token;

    if (tokenInput.includes('/share/')) {
        token = tokenInput.split('/share/')[1].split('?')[0];
    } else {
        token = tokenInput;
    }

    setButtonLoading(submitBtn, true);
    hideAlert(responseDiv);

    try {
        const response = await fetch(`${API_BASE}/files/share/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
            signal: AbortSignal.timeout(30000)
        });

        const data = await response.json();

        if (response.ok) {
            displayFileAccess(data);
            showAlert(responseDiv, 'File details loaded successfully!', 'success');
        } else {
            showEmptyFileDetails();
            showAlert(responseDiv, data.message || 'Failed to access file.', 'error');
        }
    } catch (error) {
        console.error('Share error:', error);
        showEmptyFileDetails();
        showAlert(responseDiv, 'Network error. Please try again.', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// New function to handle dashboard view
async function showDashboard() {
    showSection('dashboard');
    hideAlert(dashboardResponseDiv);
    fileListContainer.innerHTML = 'Loading your files...';

    try {
        const response = await fetch(`${API_BASE}/files/my-files`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json' 
            },
            signal: AbortSignal.timeout(10000)
        });

        const data = await response.json();

        if (response.ok) {
            renderFileList(data.files);
        } else {
            showAlert(dashboardResponseDiv, data.message || 'Failed to load files.', 'error');
            fileListContainer.innerHTML = '';
        }

    } catch (error) {
        console.error('Dashboard files error:', error);
        showAlert(dashboardResponseDiv, 'Network error. Please try again.', 'error');
        fileListContainer.innerHTML = '';
    }
}

// New function to render the list of files
function renderFileList(files) {
    if (!files || files.length === 0) {
        fileListContainer.innerHTML = `
            <div class="empty-state">
                <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2m14 0V9a2 2 0 00-2-2H8m2-4v4m0 0a2 2 0 01-2 2H5a2 2 0 00-2 2v2a2 2 0 002 2h11m-1m4-4H9.5a2.5 2.5 0 01-2.5-2.5V9a2.5 2.5 0 012.5-2.5H12"></path>
                </svg>
                <p>You haven't uploaded any files yet.</p>
            </div>
        `;
        return;
    }

    let html = '';
    files.forEach(file => {
        const expires = new Date(file.expiresAt).toLocaleString();
        const cities = file.allowedCities.length > 0 ? file.allowedCities.join(', ') : 'Worldwide';
        const isPasswordProtected = file.password ? 'Password Protected' : 'No Password';
        const shareLink = `${window.location.protocol}//${window.location.host}/api/files/share/${file.shareToken}`;

        html += `
            <div class="share-item" style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 0.5rem; color: var(--primary-blue);">${file.originalName}</h4>
                <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
                <p><strong>Type:</strong> ${file.mimetype}</p>
                <p><strong>Access:</strong> ${cities}</p>
                <p><strong>Security:</strong> ${isPasswordProtected}</p>
                <p><strong>Downloads:</strong> ${file.downloadCount}</p>
                <p><strong>Expires:</strong> ${expires}</p>
                <div style="margin-top: 1rem;">
                    <input type="text" class="share-input" value="${shareLink}" readonly id="link-${file._id}">
                    <button class="btn-secondary" onclick="copyToClipboard('link-${file._id}')" style="margin-top: 0.5rem;">Copy Link</button>
                    <a href="${shareLink}" class="btn-secondary" style="margin-top: 0.5rem; margin-left: 0.5rem;">View Details</a>
                </div>
            </div>
        `;
    });

    fileListContainer.innerHTML = html;
}


// Display after successful upload
function displayUploadSuccess(data) {
    const citiesInfo = data.allowedCities?.length > 0
        ? data.allowedCities.join(', ')
        : 'Worldwide access';

    fileDetailsPanel.innerHTML = `
        <div class="share-item">
            <div class="share-label">Upload Successful</div>
            <h4 style="color: var(--success-green); margin-bottom: 0.5rem;">File Details</h4>
            <p><strong>Name:</strong> ${data.fileData.originalName}</p>
            <p><strong>Size:</strong> ${formatFileSize(data.fileData.size)}</p>
            <p><strong>Type:</strong> ${data.fileData.mimetype}</p>
            <p><strong>Access:</strong> ${citiesInfo}</p>
            <p><strong>Security:</strong> ${data.password ? 'Password Protected' : 'No Password'}</p>
        </div>

        <div class="share-item">
            <div class="share-label">Shareable Link</div>
            <input type="text" class="share-input" value="${data.shareableLink}" readonly id="shareableLink">
            <button class="btn-secondary" onclick="copyToClipboard('shareableLink')">Copy Link</button>
        </div>

        <div class="share-item">
            <div class="share-label">QR Code for Sharing</div>
            <div id="qrCode"></div>
        </div>
    `;

    // Correctly call the QR code generation function
    if (typeof QRCode !== 'undefined') {
        generateQRCode(data.shareableLink);
    } else {
        document.getElementById('qrCode').innerHTML = '<p style="color: var(--text-secondary);">QR code unavailable</p>';
    }
}

// Display after accessing a shared file
function displayFileAccess(data) {
    const fileData = data.data;
    const verificationBadge = fileData.message && fileData.message.includes('verified')
        ? '<span class="status-badge verified">Verified</span>'
        : '<span class="status-badge warning">Not Verified</span>';

    const citiesInfo = fileData.allowedCities?.length > 0
        ? fileData.allowedCities.join(', ')
        : 'Worldwide access';

    fileDetailsPanel.innerHTML = `
        <div class="share-item">
            <div class="share-label">File Information ${verificationBadge}</div>
            <p><strong>Name:</strong> ${fileData.originalName}</p>
            <p><strong>Size:</strong> ${formatFileSize(fileData.size)}</p>
            <p><strong>Access:</strong> ${citiesInfo}</p>
            <p><strong>Uploaded by:</strong> ${fileData.uploadedBy}</p>
            <p><strong>Downloads:</strong> ${fileData.downloadCount}</p>
            <p><strong>Expires:</strong> ${new Date(fileData.expiresAt).toLocaleString()}</p>
            <a href="${fileData.downloadLink}" class="btn-success" target="_blank">Download File</a>
        </div>

        <div class="share-item">
            <div class="share-label">Verification Status</div>
            <p style="font-size: 0.875rem; color: var(--text-secondary);">${fileData.message}</p>
        </div>

        <div class="qr-container" id="qrContainer">
            <div class="share-label">QR Code for Download</div>
            <div id="qrCode"></div>
        </div>
    `;

    if (typeof QRCode !== 'undefined') {
        generateQRCode(fileData.downloadLink);
    } else {
        document.getElementById('qrCode').innerHTML = '<p style="color: var(--text-secondary);">QR code unavailable</p>';
    }
}

// QR Code
function generateQRCode(url) {
    const qrCodeDiv = document.getElementById('qrCode');
    if (!qrCodeDiv) return;

    qrCodeDiv.innerHTML = ''; // Clear previous QR code

    QRCode.toDataURL(url, {
        width: 150,
        height: 150,
        color: { dark: '#1e293b', light: '#ffffff' },
        margin: 1
    }, (error, dataURL) => {
        if (error) {
            console.error('QR code error:', error);
            qrCodeDiv.innerHTML = '<p style="color: var(--error-red);">Failed to generate QR code</p>';
        } else {
            qrCodeDiv.innerHTML = `<img src="${dataURL}" alt="QR Code" class="qr-code">`;
        }
    });
}

// Utilities
function setButtonLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.innerHTML = `<span class="loading-spinner"></span>Processing...`;
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || 'Submit';
    }
}

function showAlert(element, message, type) {
    element.textContent = message;
    element.className = `alert ${type}`;
    element.style.display = 'block';

    if (type === 'success') {
        setTimeout(() => hideAlert(element), 5000);
    }
}

function hideAlert(element) {
    element.style.display = 'none';
}

function showProgress(container, percentage, text) {
    container.style.display = 'block';
    document.getElementById('progressFill').style.width = `${percentage}%`;
    document.getElementById('progressText').textContent = text;
}

function hideProgress(container) {
    container.style.display = 'none';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function copyToClipboard(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.select();
    input.setSelectionRange(0, 99999);

    try {
        document.execCommand('copy');
        showNotification('Copied to clipboard!');
    } catch (err) {
        console.error('Copy failed:', err);
        showNotification('Failed to copy');
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px; right: 20px;
        background-color: var(--success-green);
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        font-size: 0.875rem;
        font-weight: 500;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px)';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}