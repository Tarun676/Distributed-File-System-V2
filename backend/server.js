const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

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
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let availableNode = STORAGE_NODES.find((node, index) => nodeStatus[`node${index + 1}`] === "Online");
        if (!availableNode) {
            return cb(new Error("No active nodes available!"), null);
        }
        cb(null, availableNode);
    },
    filename: (req, file, cb) => cb(null, file.originalname)
});


const upload = multer({ storage });

//Simulated Node Monitoring
const nodes = [
    { id: 1, status: "Online" },
    { id: 2, status: "Online" },
    { id: 3, status: "Offline" }
];

// Upload file and replicate across all nodes
app.post("/upload", upload.single("file"), (req, res) => {
    const uploadedFile = req.file.originalname;
    
    // Find first available node as the source
    let sourceNode = STORAGE_NODES.find((node, index) => nodeStatus[`node${index + 1}`] === "Online");

    if (!sourceNode) {
        return res.status(500).send({ message: "No active nodes available for file upload!" });
    }

    const filePath = path.join(sourceNode, uploadedFile);

    // Copy file to all **online** nodes
    STORAGE_NODES.forEach((node, index) => {
        // Check if the node is online before copying the file
        if (nodeStatus[`node${index + 1}`] === "Online") {
            const destPath = path.join(node, uploadedFile);
            try {
                fs.copyFileSync(filePath, destPath);
                console.log(`✅ File replicated to Node ${index + 1}`);
            } catch (error) {
                console.error(`❌ Failed to copy to Node ${index + 1}:`, error);
            }
        } else {
            console.log(`⚠️ Node ${index + 1} is offline, skipping replication.`);
        }
    });
    

    res.send({ message: "File uploaded and replicated to available nodes!" });
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
app.delete("/delete/:filename", (req, res) => {
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


// Monitor and sync missing files when a node comes online
app.get("/nodes", (req, res) => {
    let updatedNodes = Object.keys(nodeStatus).map((node, index) => ({
        id: index + 1,
        status: nodeStatus[node]
    }));

    res.send(updatedNodes);
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

