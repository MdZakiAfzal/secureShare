# 🔒 SecureShare: Blockchain-Verified & Geo-Fenced File Sharing

SecureShare is a high-performance, full-stack secure file-sharing platform that allows users to upload, manage, and share files with advanced security constraints, including blockchain-based file integrity verification, geo-fenced access control, and ephemeral password-protected links.

By leveraging Node.js streams for efficient large-file handling and integrating with Ethereum smart contracts, SecureShare provides high-throughput file processing along with cryptographic proof of file integrity.

---

## ✨ Key Features

### 🔗 Blockchain Integrity Verification

SecureShare automatically generates SHA-256 hashes of uploaded files using streaming and commits them to the blockchain.

When a file is downloaded, its hash is recalculated and verified against the blockchain to detect any server-side tampering.

### 🌍 Geo-Fenced Access

Restrict file access to specific cities globally using IP-based geolocation data.

This prevents unauthorized downloads from locations outside the allowed access region.

### ⚡ Memory-Efficient File Processing

SecureShare uses Node.js `fs.createReadStream` and streaming pipelines to hash and download files efficiently without loading large files into memory.

The platform is designed to support large files up to `300MB`.

### ⏱️ Ephemeral & Protected Links

Shareable links automatically expire after 24 hours using MongoDB TTL indexes.

Files can also be protected with bcrypt-hashed passwords for an additional layer of access control.

### 🚨 Automated Tamper Alerts

If a file fails blockchain verification during a download attempt, SecureShare automatically sends a security alert email to the original uploader.

### 🛡️ Robust Authentication

SecureShare includes JWT-based authentication and route protection with automatic token expiration and password-change detection.

---

## 🛠️ Technical Stack

### Backend

- Node.js
- Express.js

### Database

- MongoDB
- Mongoose
- MongoDB TTL indexes

### Blockchain / Web3

- Ethers.js
- Ethereum / EVM-compatible smart contracts

### Security & Cryptography

- JSON Web Tokens `JWT`
- bcryptjs
- Node.js `crypto`

### File Handling

- Multer
- Node.js Streams API
- `fs.createReadStream`

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed or configured:

- Node.js `v16+`
- MongoDB instance, either local or MongoDB Atlas
- Ethereum/EVM wallet with a private key
- Infura or Alchemy RPC URL
- Deployed smart contract address

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/YourUsername/secureshare.git
cd secureshare
