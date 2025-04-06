document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const fileTable = document.getElementById('fileTable');

    // Handle file upload
    // Update the upload form handler
    // Remove the first upload handler and replace with this one
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        const fileInput = document.getElementById('fileInput');
        const progressBar = document.getElementById('uploadProgress');
        const progressText = document.getElementById('progressText');
        
        if (!fileInput.files[0]) {
            alert('Please select a file first!');
            return;
        }
    
        formData.append('file', fileInput.files[0]);
        
        try {
            progressBar.style.display = 'block';
            progressText.textContent = 'Uploading...';
            
            const response = await fetch('http://localhost:5000/upload', {
                method: 'POST',
                body: formData
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            alert(data.message);
            
            // Reset form and progress
            fileInput.value = '';
            progressBar.style.display = 'none';
            progressText.textContent = '';
            
            // Refresh the file list and nodes
            await loadFiles();
            await loadNodes();
                
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed! Node Failure.');
            progressBar.style.display = 'none';
            progressText.textContent = '';  
        }
    });

    // Global functions
    // Add this function after your other window functions
    window.lockFile = async function(filename) {
        try {
            const response = await fetch(`http://localhost:5000/lock/${filename}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            return response.ok;
        } catch (error) {
            console.error('Lock error:', error);
            return false;
        }
    };

    window.unlockFile = async function(filename) {
        try {
            await fetch(`http://localhost:5000/unlock/${filename}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Unlock error:', error);
        }
    };

    // Modify the loadFiles function to show lock status
    // In the loadFiles function, update the row template
    window.loadFiles = async function() {
        try {
            const response = await fetch('http://localhost:5000/files');
            const files = await response.json();
            
            // Render controls in the dedicated container
            const fileControls = document.getElementById('fileControls');
            fileControls.innerHTML = `
                <div class="file-controls">
                    <input type="text" id="fileSearch" placeholder="Search files..." oninput="filterFiles()">
                    <select id="typeFilter" onchange="filterFiles()">
                        <option value="all">All Types</option>
                        ${[...new Set(files.map(f => f.name.split('.').pop()))].map(type => 
                            `<option value="${type}">${type.toUpperCase()}</option>`
                        ).join('')}
                    </select>
                    <button onclick="deleteSelectedFiles()" class="bulk-action">Delete Selected</button>
                </div>
            `;
            
            // Render table rows
            // Update the node distribution rendering
            const rows = files.map(file => {
                const nodeDistribution = `
                    <div class="file-distribution">
                        ${Array(3).fill().map((_, index) => {
                            const isActive = file.locations.some(loc => 
                                loc.includes(`node${index + 1}`)
                            );
                            return `<span class="node-indicator ${isActive ? 'active' : 'inactive'}" 
                                title="Node ${index + 1}"></span>`;
                        }).join('')}
                    </div>
                `;
    
                return `
                    <tr>
                        <td>
                            <input type="checkbox" class="file-select" value="${file.name}">
                            ${getFileIcon(file.name)} ${file.name}
                        </td>
                        <td>
                            <button onclick="window.location.href='http://localhost:5000/download/${file.name}'">Download</button>
                            <button onclick="deleteFile('${file.name}')">Delete</button>
                        </td>
                        <td>${nodeDistribution}</td>
                    </tr>
                `;
            }).join('');
    
            const fileTable = document.getElementById('fileTable');
            fileTable.innerHTML = `
                <tr class="header-row">
                    <th>File Name</th>
                    <th>Actions</th>
                    <th>Node Distribution</th>
                </tr>
                ${rows}
            `;
        } catch (error) {
            console.error('Error loading files:', error);
        }
    };

    // Add bulk delete function
    window.deleteSelectedFiles = async function() {
        const selected = Array.from(document.querySelectorAll('.file-select:checked'))
            .map(checkbox => checkbox.value);
        
        if (selected.length === 0) {
            alert('Please select files to delete');
            return;
        }
        
        if (confirm(`Delete ${selected.length}`)) {
            for (const filename of selected) {
                try {
                    const response = await fetch(`http://localhost:5000/delete/${filename}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': sessionStorage.getItem('authenticated')
                        }
                    });
    
                    const data = await response.json();
                    if (response.status === 207) {
                        console.error(`Partial deletion for ${filename}:`, data.errors);
                    }
                } catch (error) {
                    console.error(`Error deleting ${filename}:`, error);
                }
            }
            await loadFiles();
            await loadNodes();
        }
    }

    window.loadNodes = async function() {
        try {
            const response = await fetch('http://localhost:5000/nodes');
            const nodes = await response.json();
            
            nodes.forEach(node => {
                const nodeElement = document.getElementById(`node${node.id}`);
                if (nodeElement) {
                    const statusElement = nodeElement.querySelector('.node-status');
                    statusElement.textContent = node.status;
                    
                    const statusClass = node.status.toLowerCase();
                    nodeElement.className = `node ${statusClass}`;
                    statusElement.className = `node-status ${statusClass}`;
                    
                    const filesElement = nodeElement.querySelector('.node-files');
                    filesElement.innerHTML = node.status === 'Online' ? 
                        '<span class="status-indicator online">●</span> Ready for files' : 
                        '<span class="status-indicator offline">●</span> Node Offline';
                }
            });
        } catch (error) {
            console.error('Error loading nodes:', error);
        }
    };

    // Keep the rest of your code the same, but make these functions global too
    window.deleteFile = async function(filename) {
        if (confirm(`Delete ${filename}? This will permanently remove the file from all nodes (including offline nodes).`)) {
            try {
                const response = await fetch(`http://localhost:5000/delete/${filename}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': sessionStorage.getItem('authenticated')
                    }
                });
    
                const data = await response.json();
                
                if (response.status === 207) {
                    // Partial deletion occurred
                    alert(`${data.message}\n${data.errors.join('\n')}`);
                } else {
                    alert(data.message);
                }
                
                await loadFiles();
                await loadNodes();
            } catch (error) {
                console.error('Delete error:', error);
                alert('Delete operation failed! Please try again.');
            }
        }
    };

    window.toggleNode = async function(nodeName) {
        const nodeElement = document.getElementById(nodeName);
        const currentStatus = nodeElement.querySelector('.node-status').textContent.trim();
        
        try {
            console.log('Current status:', currentStatus);
            console.log('Node name:', nodeName);
            
            const endpoint = currentStatus.toLowerCase() === 'online' ? 'fail' : 'recover';
            const response = await fetch(`http://localhost:5000/${endpoint}/${nodeName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Server response:', data);
            
            // Now these functions will be available globally
            await window.loadNodes();
            await window.loadFiles();
            
        } catch (error) {
            console.error('Error details:', error);
            alert(`Failed to toggle node status: ${error.message}`);
        }
    };

    // Remove all nested DOMContentLoaded events and simplify the initialization
    // At the very beginning of the file, add authentication check and initial load
    window.onload = async function() {
        if (!sessionStorage.getItem('authenticated')) {
            window.location.href = 'login.html';
            return;
        }
        
        // Initial load of files and nodes
        await window.loadFiles();
        await window.loadNodes();
        
        // Set up auto-refresh
        setInterval(async () => {
            await window.loadFiles();
            await window.loadNodes();
        }, 5000);
    };
    
    // Keep your existing DOMContentLoaded event and other functions as they are
    document.addEventListener('DOMContentLoaded', () => {
        // Add logout button
        const header = document.querySelector('h1');
        const logoutButton = document.createElement('button');
        logoutButton.textContent = 'Logout';
        logoutButton.className = 'logout-button';
        logoutButton.onclick = () => {
            sessionStorage.removeItem('authenticated');
            sessionStorage.removeItem('username');
            window.location.href = 'login.html';
        };
        header.after(logoutButton);
    
        // Initialize upload form handler
        const uploadForm = document.getElementById('uploadForm');
        // Replace the upload form handler
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData();
            const fileInput = document.getElementById('fileInput');
            const progressBar = document.getElementById('uploadProgress');
            const progressText = document.getElementById('progressText');
            
            if (!fileInput.files[0]) {
                alert('Please select a file first!');
                return;
            }
        
            formData.append('file', fileInput.files[0]);
            
            try {
                const response = await fetch('http://localhost:5000/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                alert(data.message);
                
                // Reset form and progress
                fileInput.value = '';
                progressBar.style.display = 'none';
                progressText.textContent = '';
                
                // Refresh the file list and nodes
                await loadFiles();
                await loadNodes();
                    
            } catch (error) {
                console.error('Upload error:', error);
                alert('Upload failed! Node Failure.');
                progressBar.style.display = 'none';
                progressText.textContent = '';
            }
        });
    
        // Replace the toggleLock function with this fixed version
        window.toggleLock = async function(filename) {
            try {
                let result = await fetch(`http://localhost:5000/lock/${filename}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
    
                let data = await result.json();
                
                if (result.status === 423) {
                    // File is locked, try to unlock it
                    result = await fetch(`http://localhost:5000/unlock/${filename}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    data = await result.json();
                }
    
                if (!result.ok) {
                    throw new Error(data.message);
                }
    
                console.log('Lock/Unlock response:', data);
                alert(data.message);
                await window.loadFiles(); // Refresh the file list
            } catch (error) {
                console.error('Toggle lock error:', error);
                alert(`Failed to toggle lock status: ${error.message}`);
            }
        };    
        // Remove duplicate functions (lockFile, unlockFile)
        
        // Initial load
        window.loadFiles();
        window.loadNodes();
        
        // Update interval
        setInterval(() => {
            window.loadFiles();
            window.loadNodes();
        }, 5000);
    });
});

// Add this function at the top level
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        pdf: '📄',
        doc: '📝',
        docx: '📝',
        txt: '📃',
        jpg: '🖼️',
        jpeg: '🖼️',
        png: '🖼️',
        gif: '🖼️',
        mp3: '🎵',
        mp4: '🎥',
        zip: '📦',
        rar: '📦'
    };
    return icons[ext] || '📄';
}

// Add this function to handle file filtering
// Update the filterFiles function to work with the correct table structure
function filterFiles() {
    const searchTerm = document.getElementById('fileSearch').value.toLowerCase();
    const fileType = document.getElementById('typeFilter').value;
    const tableRows = document.querySelectorAll('#fileTable tr:not(.header-row)');

    tableRows.forEach(row => {
        if (!row.cells.length) return; // Skip non-data rows
        
        const fileCell = row.cells[0];
        if (!fileCell) return; // Skip if no cells
        
        const fileName = fileCell.textContent.replace(/[📄📝📃🖼️🎵🎥📦]/g, '').trim().toLowerCase();
        const extension = fileName.split('.').pop();
        
        const matchesSearch = fileName.includes(searchTerm);
        const matchesType = fileType === 'all' || extension === fileType;
        
        row.style.display = matchesSearch && matchesType ? '' : 'none';
    });
}

// Update loadFiles function to include file type options
window.loadFiles = async function() {
    try {
        const response = await fetch('http://localhost:5000/files');
        const files = await response.json();
        
        // Update file type filter options
        const fileTypes = [...new Set(files.map(file => file.name.split('.').pop()))];
        const typeFilter = document.getElementById('typeFilter');
        typeFilter.innerHTML = '<option value="all">All Types</option>' +
            fileTypes.map(type => `<option value="${type}">${type.toUpperCase()}</option>`).join('');

        // ... rest of your existing loadFiles code ...
    } catch (error) {
        console.error('Error loading files:', error);
    }
};

// Add event listeners for search and filter
document.getElementById('fileSearch').addEventListener('input', filterFiles);
document.getElementById('typeFilter').addEventListener('change', filterFiles);

// Add this to your script.js
function updateHeartbeatStatus(nodeId, isOnline) {
    const node = document.getElementById(nodeId);
    const heartbeat = node.querySelector('.heartbeat-indicator');
    
    if (isOnline) {
        heartbeat.classList.remove('error');
    } else {
        heartbeat.classList.add('error');
    }
}

// Modify your existing toggleNode function
function toggleNode(nodeId) {
    const node = document.getElementById(nodeId);
    const status = node.querySelector('.node-status');
    const isOnline = status.textContent === 'Online';
    
    if (isOnline) {
        status.textContent = 'Offline';
        status.classList.remove('online');
        status.classList.add('offline');
    } else {
        status.textContent = 'Online';
        status.classList.remove('offline');
        status.classList.add('online');
    }
    
    updateHeartbeatStatus(nodeId, !isOnline);
}

// Initialize all nodes' status
document.addEventListener('DOMContentLoaded', function() {
    ['node1', 'node2', 'node3'].forEach(nodeId => {
        const node = document.getElementById(nodeId);
        const status = node.querySelector('.node-status');
        status.textContent = 'Online';
        status.classList.add('online');
        updateHeartbeatStatus(nodeId, true);
    });
});
