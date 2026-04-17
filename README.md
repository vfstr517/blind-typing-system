# ⚡ NeonType - Real-Time Speed Typing Application

This project is a high-performance, real-time typing test application designed for up to 100 concurrent users to take a synchronized test simultaneously.

## 🛠️ Prerequisites

To run this application on any new computer, you must have the following installed:
1. **Node.js**: Download and install the LTS version from [https://nodejs.org/](https://nodejs.org/)

## 🚀 How to Set Up & Run on a New System

1. **Copy the Code**
   Copy this entire project folder (`speed`) to the new system (via USB, Google Drive, ZIP file, or Git).

2. **Install Dependencies**
   Open a Terminal / Command Prompt / PowerShell inside the `speed` folder on the new system and run:
   ```bash
   npm install
   ```
   *(This downloads Express, Socket.io, and SQLite)*

3. **Start the Server**
   In that same terminal, start the backend engine by running:
   ```bash
   node server.js
   ```
   You should see:
   > `Connected to SQLite database.`
   > `Server running on http://localhost:3000`

## 🌍 How to Let 100 People Connect (LAN Setup)

If you are running the test for 100 people, they cannot use `localhost` because that only points to their own devices. They must connect to your computer's **Local IP Address** over the shared Wi-Fi network.

1. Keep the `node server.js` terminal running on your main Admin computer.
2. Find your computer's local IP address:
   - **On Windows**: Open a new Command Prompt and type `ipconfig`. Look for the "IPv4 Address" (e.g., `192.168.1.45`).
   - **On Mac**: Open Terminal and type `ipconfig getifaddr en0`.
3. Open the **Admin Panel** on your computer by going to:
   👉 `http://localhost:3000/admin.html`
4. Tell all 100 users to ensure they are connected to the **same Wi-Fi network** as your Admin PC.
5. Instruct the users to open their browser and visit your IP address with port 3000. For example:
   👉 `http://192.168.1.45:3000`
6. Once they enter their Name and Registration number, wait for them to load on your Admin dashboard, then click **Broadcast Test Start**!

## 🔒 Admin Security

The Admin Panel (`/admin.html`) is protected by a password to prevent unauthorized users from tampering with the test.
- **Default Login:** Username: `admin` | Password: `password123`
- **How to Change:** Open the `admin-credentials.json` file located in the project root, change the "id" and "password" values to your preference, and restart the Node server.

## 💾 Database Reset
All user results, connection data, and passage configurations are securely saved locally inside `speed.db`.
- If you ever want to completely wipe the system and start fresh, simply delete the `speed.db` file while the node server is shut down, or use the "Reset Session" button on the Admin dashboard.
