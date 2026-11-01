# Legal Helper ⚖️

**Making legal information easier to understand, access, and act upon.**

Legal Helper is an AI-powered legal-tech platform designed to help people navigate complex legal information through accessible explanations, practical tools, and a structured legal knowledge tree.

The platform combines AI-assisted legal information with tools for document understanding, legal preparation, scam awareness, and access to legal aid.

> Legal Helper provides general legal information and assistance. It is not a substitute for professional legal advice or representation.

## ✨ Features

### 🌳 Interactive Legal Knowledge Tree
Explore legal topics through an interactive 3D knowledge tree. Navigate from broad legal categories to specific tools and resources.

### 📄 Document Simplifier
Upload or provide legal documents and receive simplified explanations of complex legal language.

### 📝 Drafting Assistant
Get help preparing structured legal drafts based on the information you provide.

### 📬 Notice Reply
Understand legal notices and prepare a structured response based on your facts and position.

### 🔍 Legal Provision Converter
Explore legal provisions across different laws and legal frameworks. Understand provisions through simplified explanations and real-life examples.

### 🗂️ Legal Vault
Securely organize and manage legal documents in one place.

### 👨‍⚖️ Lawyer Preparation
Prepare for a legal consultation with:
- A structured summary of your situation
- Important information and documents to gather
- Questions to ask a lawyer
- A consultation preparation document

### 📍 Legal Aid Finder
Discover legal aid services and resources based on location and assistance needs.

### 🚨 Scam Detector
Analyze suspicious messages and identify potential warning signs, including:
- Urgent payment demands
- Requests for sensitive information
- Suspicious claims and impersonation signals
- Other potentially risky language

The detector explains the signals it identifies rather than treating an automated assessment as proof of fraud.

### 💬 Floating AI Legal Assistant
Ask legal-information questions and get assistance navigating Legal Helper's features.

### 🌐 Language and Theme Preferences
Switch between supported languages and light/dark themes for a more accessible experience.

## 🛠️ Tech Stack

### Frontend
- React
- Vite
- TypeScript
- Tailwind CSS
- Three.js / React Three Fiber
- GSAP

### Backend
- Python
- FastAPI
- PostgreSQL
- SQLAlchemy 2.0
- Alembic
- Pydantic

### AI
- Gemini API
- Retrieval-Augmented Generation (RAG)

## 🏗️ Architecture

Legal Helper follows a frontend-backend architecture:

```text
Legal Helper
│
├── Frontend
│   ├── React + Vite + TypeScript
│   ├── Tailwind CSS
│   ├── Interactive 3D Knowledge Tree
│   └── Feature Pages
│
├── Backend
│   ├── FastAPI
│   ├── Authentication
│   ├── REST API
│   ├── SQLAlchemy
│   └── PostgreSQL
│
└── AI Services
    ├── Gemini API
    └── Legal Knowledge Retrieval (RAG)
```

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- Node.js and npm
- Python
- PostgreSQL
- Git

You will also need the environment variables required by the existing backend and AI integration.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <repository-directory>
```

### 2. Configure the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create and activate a virtual environment:

```bash
python -m venv .venv
```

Activate it:

**Windows**

```bash
.venv\Scripts\activate
```

**macOS / Linux**

```bash
source .venv/bin/activate
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

Configure the required environment variables using the project's existing environment configuration.

Run database migrations:

```bash
alembic upgrade head
```

Start the FastAPI server:

```bash
uvicorn main:app --reload
```

The API documentation is typically available at:

```text
http://localhost:8000/docs
```

Use the actual backend entry point and migration configuration in the repository if they differ.

### 3. Configure the Frontend

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Configure the frontend environment variables according to the existing project configuration.

Start the development server:

```bash
npm run dev
```

Open the local URL displayed by Vite in your terminal.

## 🔐 Environment Variables

Configure secrets and service settings through environment variables.

Typical configuration may include:

| Variable | Purpose |
|---|---|
| Database connection URL | PostgreSQL connection |
| Gemini API key | AI service access |
| Authentication secret | Token/session security |
| Frontend API URL | Backend API endpoint |

Use the exact variable names defined in the repository. Never commit API keys, passwords, or other secrets.

## 🧪 Development

For frontend development:

```bash
npm run dev
```

For production frontend builds:

```bash
npm run build
```

For backend development:

```bash
uvicorn main:app --reload
```

Refer to the project's existing scripts and configuration for additional test, lint, and deployment commands.

## 🔒 Privacy and Safety

Legal Helper is designed with privacy and responsible AI usage in mind.

- User-specific records should be accessible only to their authorized owners.
- Sensitive credentials should never be requested by the platform.
- AI-generated legal information may be incomplete or uncertain.
- Legal sources should be shown where available.
- Automated scam assessments are indicators, not definitive proof.
- Users should verify important legal decisions with qualified professionals or relevant authorities.

## 🎯 Project Vision

Legal Helper aims to make legal information more approachable by combining interactive exploration, AI-assisted understanding, and practical legal support tools.

The goal is not to replace lawyers, but to help people become better informed and better prepared when dealing with legal matters.

## 👥 Contributors

Built as a hackathon project by the Legal Helper team.

Add contributor names, GitHub profiles, and acknowledgements here.

## 📄 Disclaimer

Legal Helper is an informational and educational platform. It does not provide a lawyer-client relationship, guarantee legal outcomes, or replace professional legal advice. Users should consult a qualified legal professional for advice regarding their specific circumstances.
