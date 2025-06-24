# ALCOR_GPUGest

A full-stack GPU management project that combines a Python backend with FastAPI and a modern frontend.

## 📋 Prerequisites

Before starting, make sure you have installed:

- **Python 3.12** or higher
- **Node.js** (LTS version recommended)
- **npm** (included with Node.js)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ALCOR_GPUGest
```

### 2. Install Python Dependencies

Python dependencies are specified in the `requirements.txt` file. To install them:

```bash
pip install -r requirements.txt
```

### 3. Install NPM Dependencies

Frontend dependencies are specified in the `package.json` file. To install them:

```bash
npm install
```

## 🚀 Running the Project

The project requires starting both the backend and frontend.

### Backend (API Server)

To start the backend server with FastAPI and uvicorn:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Command parameters:**
- `--reload`: Enables automatic reloading during development
- `--host 0.0.0.0`: Makes the server accessible from all IP addresses
- `--port 8000`: Specifies the server port

The backend will be accessible at: **http://localhost:8000**

### Frontend (Development Server)

To start the frontend development server:

```bash
npm run dev
```

The frontend will be accessible at: **http://localhost:3000** (or another configured port)

## 🔗 Frontend-Backend Communication

Once both services are running:

- The **frontend** will automatically communicate with the **backend** through REST APIs
- Make sure both services are running simultaneously for the application to work correctly

## 📁 Project Structure

```
ALCOR_GPUGest/
├── main.py              # FastAPI backend entry point
├── requirements.txt     # Python dependencies
├── package.json         # NPM dependencies and scripts
├── [other backend files]
└── [frontend folders]
```
