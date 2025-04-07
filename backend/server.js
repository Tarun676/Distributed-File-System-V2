

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Define storage nodes
const STORAGE_NODES = [
    path.join(__dirname, "node1"),
    path.join(__dirname, "node2"),
    path.join(__dirname, "node3")
];
let nodeStatus = {
    node1: "Online",
    node2: "Online",
    node3: "Online"
};

// Create storage directories if they don’t exist
STORAGE_NODES.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// Multer configuration (Upload to Node 1 initially)
// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Upload directly to first online node, others will be handled in the upload endpoint
        let availableNode = STORAGE_NODES.find((node, index) => nodeStatus[`node${index + 1}`] === "Online");
        if (!availableNode) {
            return cb(new Error("No active nodes available!"), null);
        }
        cb(null, availableNode);
    },
    filename: (req, file, cb) => cb(null, file.originalname)
});

const upload = multer({ storage });

app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: "No file uploaded!" });
        }

        const uploadedFile = req.file.originalname;
        let fileDistribution = [];

        // Write to all online nodes simultaneously
        const writePromises = STORAGE_NODES.map((node, index) => {
            return new Promise((resolve) => {
                const nodeId = `node${index + 1}`;
                const filePath = path.join(node, uploadedFile);

                if (nodeStatus[nodeId] === "Online") {
                    try {
                        // Read the uploaded file
                        const fileContent = fs.readFileSync(req.file.path);
                        // Write to each online node
                        fs.writeFileSync(filePath, fileContent);
                        fileDistribution[index] = true;
                        resolve(true);
                    } catch (error) {
                        console.error(`Error writing to ${nodeId}:`, error);
                        fileDistribution[index] = false;
                        resolve(false);
                    }
                } else {
                    fileDistribution[index] = false;
                    resolve(false);
                }
            });
        });

        // Wait for all writes to complete
        await Promise.all(writePromises);

        res.status(200).send({ 
            message: "File uploaded successfully!",
            file: uploadedFile,
            distribution: fileDistribution
        });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).send({ 
            message: "File upload failed!", 
            error: error.message 
        });
    }
});

//Simulated Node Monitoring
const nodes = [
    { id: 1, status: "Online" },
    { id: 2, status: "Online" },
    { id: 3, status: "Offline" }
];

// Update the upload endpoint
// Remove the duplicate upload endpoint and keep only this one
app.post("/upload", upload.single("file"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: "No file uploaded!" });
        }

        const uploadedFile = req.file.originalname;
        const fileContent = fs.readFileSync(req.file.path);
        let fileDistribution = [];

        // Write to all online nodes directly
        STORAGE_NODES.forEach((node, index) => {
            const nodeId = `node${index + 1}`;
            const filePath = path.join(node, uploadedFile);
            
            try {
                if (nodeStatus[nodeId] === "Online") {
                    fs.writeFileSync(filePath, fileContent);
                    fileDistribution.push(true);
                } else {
                    fileDistribution.push(false);
                }
            } catch (error) {
                console.error(`Error writing to ${nodeId}:`, error);
                fileDistribution.push(false);
            }
        });

        res.status(200).send({ 
            message: "File uploaded successfully!",
            file: uploadedFile,
            distribution: fileDistribution
        });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).send({ 
            message: "File upload failed!", 
            error: error.message 
        });
    }
});

app.post("/fail/:node", (req, res) => {
    const node = req.params.node;
    if (nodeStatus[node]) {
        nodeStatus[node] = "Offline";
        
        // Sync with nodes array
        let index = parseInt(node.replace("node", "")) - 1;
        nodes[index].status = "Offline";

        res.send({ message: `${node} is now Offline!` });
    } else {
        res.status(400).send({ error: "Invalid node!" });
    }
});

app.post("/recover/:node", (req, res) => {
    const node = req.params.node;
    if (!nodeStatus[node]) {
        return res.status(400).send({ error: "Invalid node!" });
    }

    nodeStatus[node] = "Online";
    let index = parseInt(node.replace("node", "")) - 1;
    nodes[index].status = "Online";

    // Restore missing files from other online nodes
    const recoveredNodePath = STORAGE_NODES[index];

    STORAGE_NODES.forEach((sourceNode, sourceIndex) => {
        if (sourceIndex !== index && nodeStatus[`node${sourceIndex + 1}`] === "Online") {
            fs.readdirSync(sourceNode).forEach(file => {
                const srcPath = path.join(sourceNode, file);
                const destPath = path.join(recoveredNodePath, file);

                if (!fs.existsSync(destPath)) {
                    fs.copyFileSync(srcPath, destPath);
                }
            });
        }
    });

    res.send({ message: `${node} is back online and files are restored!` });
});






// List files across all nodes
app.get("/files", (req, res) => {
    let allFiles = new Map();

    STORAGE_NODES.forEach((node, index) => {
        if (fs.existsSync(node)) {
            let files = fs.readdirSync(node);
            files.forEach(file => {
                const filePath = path.join(node, file);
                if (!allFiles.has(file)) {
                    allFiles.set(file, {
                        name: file,
                        size: fs.statSync(filePath).size,
                        locations: [node]
                    });
                } else {
                    allFiles.get(file).locations.push(node);
                }
            });
        }
    });

    res.send(Array.from(allFiles.values()));
});

// Download file from any available node
app.get("/download/:filename", (req, res) => {
    for (let i = 0; i < STORAGE_NODES.length; i++) {
        if (nodeStatus[`node${i + 1}`] === "Online") {
            const filePath = path.join(STORAGE_NODES[i], req.params.filename);
            if (fs.existsSync(filePath)) {
                return res.download(filePath);
            }
        }
    }
    res.status(404).send({ message: "File not found on any active node!" });
});


// Delete file from all nodes
// Delete file from all nodes
// Add this near the top with other constants
const pendingDeletions = new Map();

// Update delete endpoint
app.delete("/delete/:filename", (req, res) => {
    const filename = req.params.filename;
    if (fileLocks.has(filename)) {
        return res.status(423).json({ message: "File is locked and cannot be deleted" });
    }
    
    let deleted = false;
    let errors = [];

    // Try to delete from all nodes regardless of status
    STORAGE_NODES.forEach((node, index) => {
        const filePath = path.join(node, filename);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                deleted = true;
            }
        } catch (error) {
            errors.push(`Error deleting from Node ${index + 1}: ${error.message}`);
        }
    });

    if (deleted) {
        if (errors.length > 0) {
            res.status(207).json({
                message: "File partially deleted",
                errors: errors
            });
        } else {
            res.json({ message: "File successfully deleted from all nodes" });
        }
    } else {
        res.status(404).json({ message: "File not found in any node" });
    }
});

// Update recover endpoint to handle pending deletions
app.post("/recover/:node", (req, res) => {
    const node = req.params.node;
    if (!nodeStatus[node]) {
        return res.status(400).send({ error: "Invalid node!" });
    }

    nodeStatus[node] = "Online";
    let index = parseInt(node.replace("node", "")) - 1;
    nodes[index].status = "Online";

    // Process any pending deletions first
    

    // Continue with normal recovery process...
});






// Monitor and sync missing files when a node comes online
app.get("/nodes", (req, res) => {
    let updatedNodes = Object.keys(nodeStatus).map((node, index) => ({
        id: index + 1,
        status: nodeStatus[node]
    }));

    res.send(updatedNodes);
});


// Start server
// Move to top with other constants
const fileLocks = new Map();
const users = {
    "admin": "admin123",
    "user1": "password123",
    "Eren_yeager": "freedom"
};

// Move these right after app.use(express.json())
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH']
}));

// Authentication endpoint should be before the authenticateUser middleware
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt:', { username, password }); // Debug log
    
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
    }

    if (users[username] && users[username] === password) {
        return res.json({ message: "Login successful" });
    }

    return res.status(401).json({ message: "Invalid credentials" });
});

// Authentication middleware comes after login route
const authenticateUser = (req, res, next) => {
    if (req.path === '/login') return next();
    
    const isAuthenticated = req.headers.authorization;
    if (!isAuthenticated) {
        return res.status(401).json({ message: "Authentication required" });
    }
    next();
};

app.use(authenticateUser);

app.post("/lock/:filename", (req, res) => {
    const filename = req.params.filename;
    console.log('Attempting to lock:', filename);
    
    if (fileLocks.has(filename)) {
        console.log('File already locked:', filename);
        return res.status(423).json({ message: "File is locked by another user" });
    }

    fileLocks.set(filename, Date.now());
    console.log('File locked successfully:', filename);
    res.json({ message: "File locked successfully" });
});

app.post("/unlock/:filename", (req, res) => {
    const filename = req.params.filename;
    console.log('Attempting to unlock:', filename);

    if (!fileLocks.has(filename)) {
        console.log('File was not locked:', filename);
        return res.status(400).json({ message: "File was not locked" });
    }

    fileLocks.delete(filename);
    console.log('File unlocked successfully:', filename);
    res.json({ message: "File unlocked successfully" });
});

// Remove the duplicate endpoints and declarations at the bottom
app.delete("/delete/:filename", (req, res) => {
    const filename = req.params.filename;
    if (fileLocks.has(filename)) {
        return res.status(423).json({ message: "File is locked and cannot be deleted" });
    }
    
    let deleted = false;

    STORAGE_NODES.forEach(node => {
        const filePath = path.join(node, req.params.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);  // Deletes the file
            deleted = true;
        }
    });

    if (deleted) {
        res.send({ message: "File deleted successfully from all nodes!" });
    } else {
        res.status(404).send({ message: "File not found on any node!" });
    }
});

// Start server should be at the very end
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));