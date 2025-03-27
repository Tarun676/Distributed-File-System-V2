const backendUrl = "http://localhost:5000"; // Change this if your backend is deployed

// Fetch stored files
async function fetchFiles() {
    const response = await fetch(`${backendUrl}/files`);
    const files = await response.json();
    
    const fileTable = document.getElementById("fileTable");
    fileTable.innerHTML = "<tr><th>File Name</th><th>Size</th><th>Location</th><th>Action</th></tr>";

    files.forEach(file => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${file.name}</td>
            <td>${file.size} KB</td>
            <td>${file.locations.join(", ")}</td>
            <td>
                <button onclick="downloadFile('${file.name}')">Download</button>
                <button onclick="deleteFile('${file.name}')">Delete</button>
            </td>
        `;
        fileTable.appendChild(row);
    });
}

// Upload File
document.getElementById("uploadForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById("fileInput").files[0];
    const formData = new FormData();
    formData.append("file", fileInput);

    await fetch(`${backendUrl}/upload`, { method: "POST", body: formData });
    alert("File uploaded successfully!");
    fetchFiles();
});

// Download File
async function downloadFile(fileName) {
    window.location.href = `${backendUrl}/download/${fileName}`;
}

// Delete File
async function deleteFile(fileName) {
    await fetch(`${backendUrl}/delete/${fileName}`, { method: "DELETE" });
    alert("File deleted!");
    fetchFiles();
}

// Fetch Storage Node Status
async function fetchNodeStatus() {
    const response = await fetch(`${backendUrl}/nodes`);
    const nodes = await response.json();

    const nodeList = document.getElementById("nodeStatus");
    nodeList.innerHTML = "";

    nodes.forEach(node => {
        const listItem = document.createElement("li");
        listItem.innerHTML = `
            Node ${node.id} - Status: ${node.status} 
            <button onclick="changeNodeStatus(${node.id}, '${node.status}')">
                ${node.status === "Online" ? "Set Offline" : "Set Online"}
            </button>
        `;
        nodeList.appendChild(listItem);
    });
}

// Change Node Status
async function changeNodeStatus(nodeId, currentStatus) {
    const action = currentStatus === "Online" ? "fail" : "recover";
    await fetch(`${backendUrl}/${action}/node${nodeId}`, { method: "POST" });
    alert(`Node ${nodeId} is now ${currentStatus === "Online" ? "Offline" : "Online"}`);
    fetchNodeStatus();
}

// Refresh data every 5 seconds
setInterval(fetchFiles, 5000);
setInterval(fetchNodeStatus, 5000);

// Initial fetch
fetchFiles();
fetchNodeStatus();
