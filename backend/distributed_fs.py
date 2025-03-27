import os
import random

class DistributedFileSystem:
    def __init__(self, nodes, replication_factor=3):
        self.nodes = nodes  # List of storage nodes
        self.replication_factor = replication_factor  # Number of copies
        self.load_balancer = LoadBalancer(nodes)  # Load balancer
        self.file_metadata = {}  # Stores file -> nodes mapping

    def store_file(self, filename):
        if filename in self.file_metadata:
            print(f"File '{filename}' already exists!")
            return
        
        assigned_nodes = set()
        while len(assigned_nodes) < self.replication_factor:
            assigned_nodes.add(self.load_balancer.get_next_node())

        self.file_metadata[filename] = list(assigned_nodes)
        print(f"Stored '{filename}' in nodes: {self.file_metadata[filename]}")

    def retrieve_file(self, filename):
        if filename in self.file_metadata:
            print(f"File '{filename}' found in: {self.file_metadata[filename]}")
            return self.file_metadata[filename]
        else:
            print(f"File '{filename}' not found!")
            return None

    def handle_node_failure(self, failed_node):
        print(f"Node {failed_node} failed! Re-replicating files...")
        for filename, nodes in self.file_metadata.items():
            if failed_node in nodes:
                nodes.remove(failed_node)
                new_node = self.load_balancer.get_next_node()
                nodes.append(new_node)
                print(f"File '{filename}' moved from {failed_node} to {new_node}")

class LoadBalancer:
    def __init__(self, nodes):
        self.nodes = nodes
        self.index = 0

    def get_next_node(self):
        node = self.nodes[self.index]
        self.index = (self.index + 1) % len(self.nodes)
        return node

# Example Usage
nodes = ["Node1", "Node2", "Node3", "Node4"]
dfs = DistributedFileSystem(nodes)

# Storing files
dfs.store_file("fileA.txt")
dfs.store_file("fileB.txt")
dfs.store_file("fileC.txt")

# Retrieving file locations
dfs.retrieve_file("fileA.txt")

# Simulating a node failure
dfs.handle_node_failure("Node2")
