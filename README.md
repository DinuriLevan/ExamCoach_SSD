<div align="center">

# 🎓 ExamCoach

**AI-Powered Exam Preparation Platform**

[![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--Time-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)

[![Backend Live](https://img.shields.io/badge/Backend-Live%20on%20Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://examcoach-backend-mnoy.onrender.com)
[![Frontend Live](https://img.shields.io/badge/Frontend-Live%20on%20Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://exam-coach-sigma.vercel.app)

*SE3040 — Application Frameworks (2026)*  
*BSc (Hons) in Information Technology — Software Engineering *

</div>

---

## 📋 Table of Contents

| # | Section |
|---|---------|
| 1 | [Project Overview](#1-project-overview) |
| 2 | [Functional Components & Requirements](#2-functional-components-and-requirements) |
| 3 | [System Architecture](#3-system-architecture) |
| 4 | [Technology Stack](#4-technology-stack) |
| 5 | [Setup Instructions](#5-setup-instructions) |
| 6 | [API Endpoint Documentation](#6-api-endpoint-documentation) |
| 7 | [Authentication & Authorization](#7-authentication-and-authorization) |
| 8 | [Deployment Report](#8-deployment-report) |
| 9 | [Testing Instruction Report](#9-testing-instruction-report) |
| 10 | [Features](#10-features) |
| 11 | [Folder Structure](#11-folder-structure) |
| 12 | [Contributors](#12-contributors) |

---

## 1. Project Overview

**ExamCoach** is an intelligent, full-stack MERN exam-preparation platform where students can summarize learning materials, practice quizzes, build study plans, and track performance. Teachers and administrators can manage educational content, monitor quiz activities, and maintain platform quality.

### 🌟 Main Features

| Feature | Description |
|---------|-------------|
| 🤖 AI Learning Lab | Summarization of materials + related learning resources |
| 📝 Quiz & Assessment | Practice quizzes with real-time invigilation |
| 📅 Study Plans | AI-generated personalized study timetables |
| 📚 Course Management | Streams, subjects, and lesson management |
| 🔍 Cheating Detection | Real-time tab-switch alerts via Socket.io |
| 🎯 AI Quiz Generator | AI-powered quiz generation from documents and text |

### 👥 User Roles

| Role | Capabilities |
|------|-------------|
| 🎓 **Student** | Access AI tools, attempt quizzes, generate study plans, track progress |
| 👩‍🏫 **Teacher** | Manage lessons and quizzes |
| 🛡️ **Admin** | Manage users, subjects, and platform-level analytics |

---

## 2. Functional Components and Requirements

The backend is organized into multiple functional components, each with clear responsibilities and REST endpoints.

<details>
<summary><strong>📦 Component 1 — Authentication & User Management</strong></summary>

- Student registration and login
- OTP verification and password reset flow
- Profile retrieval for logged-in users
- Role assignment and protected route access

</details>

<details>
<summary><strong>🤖 Component 2 — AI Learning Lab</strong></summary>

- AI summarization from text or uploaded files
- Save summary history with related resources
- View and manage user summary history
- Third-party AI integration using **Google Gemini**

</details>

<details>
<summary><strong>📝 Component 3 — Quiz & Assessment</strong></summary>

- Quiz creation and listing
- Enrollment-key and password-protected access
- Quiz attempt submission and score calculation
- Real-time invigilation support via **Socket.io** events

</details>

<details>
<summary><strong>📅 Component 4 — Study Plan & Analytics</strong></summary>

- Personalized study plan generation
- Daily timetable and progress tracking
- Study-time logging and missed-goal handling
- Student analytics and journaling

</details>

<details>
<summary><strong>📚 Component 5 — Course Management</strong></summary>

- Subject creation and retrieval
- Lesson creation and retrieval per subject
- Learning material upload and link management

</details>

<details>
<summary><strong>🎯 Component 6 — AI Quiz Generator</strong></summary>

- AI-powered quiz generation from text or multiple PDFs
- Save and review completed quiz history
- Automatic evaluation and scoring with timers
- "Explain Simpler" (ELI5) functionality for incorrect answers

</details>

> All components follow REST principles, proper HTTP methods, validation, and error handling.

---

## 3. System Architecture

ExamCoach follows a **client-server architecture** with REST APIs and real-time sockets.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React + Vite)                    │
│                    http://localhost:5173                         │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/HTTPS + Socket.io
┌────────────────────────────▼────────────────────────────────────┐
│                      BACKEND (Express.js)                       │
│                    http://localhost:5000                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Controllers │  │  Middleware  │  │       Routes         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└───────┬──────────────┬──────────────┬──────────────────────────┘
        │              │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌────▼──────────────────────────┐
│   MongoDB    │ │ Socket.io  │ │   External Integrations       │
│  (Mongoose)  │ │  Real-Time │ │  Gemini AI · Cloudinary       │
│              │ │  Events    │ │  Google Calendar API          │
└──────────────┘ └────────────┘ └───────────────────────────────┘
```

### ⚡ Real-Time Socket Events

```
join-quiz          →  Student joins a quiz room
join-teacher-monitor →  Teacher starts monitoring
tab-switch         →  Triggered on suspicious tab switching
student-tab-switch →  Broadcast to teacher monitor
```

---

## 4. Technology Stack

<table>
<tr>
<td valign="top" width="50%">

### 🖥️ Frontend
- **React** (Vite)
- **JavaScript** (ES6+)
- CSS and UI component styling

### ⚙️ Backend
- **Node.js**
- **Express.js**
- **Socket.io**

### 🗄️ Database
- **MongoDB**
- **Mongoose**

</td>
<td valign="top" width="50%">

### 🧪 Testing
- **Jest** — Unit testing
- **Postman** — Integration/API testing
- **Artillery** — Performance testing

### 🔌 External APIs & Services
- **Google Gemini AI**
- **Cloudinary**
- **Google Calendar API**

</td>
</tr>
</table>

---

## 5. Setup Instructions

### ✅ Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 or higher |
| npm | 9 or higher |
| MongoDB | Atlas URI or local |
| API Keys | Gemini + Cloudinary |

---

### ⚙️ Backend Setup

**1. Clone the repository:**

```bash
git clone https://github.com/<your-username-or-org>/ExamCoach.git
cd ExamCoach
```

**2. Move to backend folder:**

```bash
cd Backend
```

**3. Install dependencies:**

```bash
npm install
```

**4. Create `.env` in `/Backend`:**

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
FRONTEND_URL=http://localhost:5173
JWT_EXPIRES_IN=30d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback
```

**5. Run the backend:**

```bash
npm run dev
```

**6. Verify** — visit `http://localhost:5000` → Expected: `ExamCoach API is running`

---

### 🌐 Frontend Setup

**1. Navigate to the frontend:**

```bash
cd Frontend
```

**2. Install dependencies:**

```bash
npm install
```

**3. Create `.env` in `/Frontend`:**

```env
VITE_API_URL=http://localhost:5000
```

**4. Run frontend:**

```bash
npm run dev
```

**5. Open** → `http://localhost:5173`

---

### 🚀 Run Full System Locally

```bash
# Terminal 1 — Backend
cd Backend && npm run dev

# Terminal 2 — Frontend
cd Frontend && npm run dev
```

---

## 6. API Endpoint Documentation

| Environment | Base URL |
|-------------|----------|
| 🏠 Local | `http://localhost:5000` |
| 🌐 Production | `https://examcoach-backend-mnoy.onrender.com` |

---

### 6.1 🔐 Authentication

<details>
<summary><code>POST</code> <strong>/api/auth/register</strong> — Register a new student</summary>

> ⚠️ Backend implements this as `/api/auth/register-student`  
> 🔓 Authentication: Not required

**Request Body:**
```json
{
  "firstName": "Nimal",
  "lastName": "Perera",
  "email": "nimal.perera@example.com",
  "password": "StrongPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "userId": "67f8f6132b4e7d7bcf06f123"
}
```

</details>

<details>
<summary><code>POST</code> <strong>/api/auth/login</strong> — Authenticate user & return JWT</summary>

> 🔓 Authentication: Not required

**Request Body:**
```json
{
  "email": "nimal.perera@example.com",
  "password": "StrongPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "67f8f6132b4e7d7bcf06f123",
    "name": "Nimal Perera",
    "email": "nimal.perera@example.com",
    "role": "student"
  }
}
```

</details>

---

### 6.2 🤖 AI Learning Lab

<details>
<summary><code>POST</code> <strong>/api/ai/summarize</strong> — Generate summary from text or file</summary>

> 🔓 Authentication: Not required (current implementation)

**Request Body:**
```json
{
  "text": "Photosynthesis converts light energy into chemical energy.",
  "summaryType": "paragraph"
}
```

**Response:**
```json
{
  "summary": "Photosynthesis converts sunlight, water, and CO2 into glucose and oxygen.",
  "relatedResources": [
    {
      "title": "Khan Academy Photosynthesis",
      "link": "https://www.khanacademy.org/science/biology/photosynthesis-in-plants",
      "type": "website"
    },
    {
      "title": "Photosynthesis Crash Course",
      "link": "https://www.youtube.com/watch?v=sQK3Yr4Sc_k",
      "type": "youtube"
    }
  ]
}
```

</details>

<details>
<summary><code>POST</code> <strong>/api/ai/save</strong> — Save AI summary to user history</summary>

> 🔓 Authentication: Not required (current implementation)

**Request Body:**
```json
{
  "title": "Photosynthesis Notes",
  "summary": "Plants produce glucose using light energy.",
  "type": "text",
  "originalText": "Long source content...",
  "userId": "67f8f66a2b4e7d7bcf06f128",
  "summaryType": "paragraph",
  "relatedResources": [
    { "title": "Biology LibreTexts", "link": "https://bio.libretexts.org/", "type": "website" }
  ]
}
```

**Response:**
```json
{
  "_id": "6800bb3f5c2a2ed8f012a900",
  "user": "67f8f66a2b4e7d7bcf06f128",
  "title": "Photosynthesis Notes",
  "summary": "Plants produce glucose using light energy.",
  "type": "text",
  "createdAt": "2026-04-11T08:15:00.000Z"
}
```

</details>

<details>
<summary><code>GET</code> <strong>/api/ai/history/:userId</strong> — Get summary history for a user</summary>

> 🔓 Authentication: Not required (current implementation)

**Request Body:**
```json
{}
```

**Response:**
```json
[
  {
    "_id": "6800bb3f5c2a2ed8f012a900",
    "user": "67f8f66a2b4e7d7bcf06f128",
    "title": "Photosynthesis Notes",
    "summary": "Plants produce glucose using light energy.",
    "summaryType": "paragraph",
    "type": "text",
    "createdAt": "2026-04-11T08:15:00.000Z"
  }
]
```

</details>

<details>
<summary><code>DELETE</code> <strong>/api/ai/history/:id</strong> — Delete a history item</summary>

> 🔓 Authentication: Not required (current implementation)

**Request Body:**
```json
{ "userId": "67f8f66a2b4e7d7bcf06f128" }
```

**Response:**
```json
{ "message": "History item deleted successfully" }
```

</details>

---

### 6.3 📚 Course Management

<details>
<summary><code>POST</code> <strong>/api/subjects</strong> — Create a new subject</summary>

> 🔒 Authentication: Required (Admin)

**Request Body:**
```json
{
  "name": "Advanced Biology",
  "stream": "67f9e74f2a9d1f2c6e3d1111",
  "teacher": "67f9e74f2a9d1f2c6e3d2222",
  "description": "Core biology syllabus for AL students"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "6800be115c2a2ed8f012b111",
    "name": "Advanced Biology",
    "description": "Core biology syllabus for AL students"
  }
}
```

</details>

<details>
<summary><code>GET</code> <strong>/api/subjects</strong> — Retrieve all subjects</summary>

> 🔓 Authentication: Not required

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6800be115c2a2ed8f012b111",
      "name": "Advanced Biology",
      "description": "Core biology syllabus for AL students"
    }
  ]
}
```

</details>

<details>
<summary><code>GET</code> <strong>/api/lessons/:subjectId</strong> — Get lessons for a subject</summary>

> ⚠️ Backend route: `/api/subjects/:subjectId/lessons`  
> 🔓 Authentication: Not required

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6800c0025c2a2ed8f012c111",
      "title": "Cell Structure",
      "description": "Introduction to cell organelles"
    }
  ]
}
```

</details>

---

### 6.4 📝 Quiz

<details>
<summary><code>POST</code> <strong>/api/quizzes</strong> — Create a quiz</summary>

> ⚠️ Auth not enforced by middleware currently; Teacher/Admin protection recommended

**Request Body:**
```json
{
  "title": "Cell Biology Revision Quiz",
  "description": "Practice quiz for unit revision",
  "subject": "Biology",
  "timeLimit": 30,
  "maxAttempts": 2,
  "enrollmentKey": "BIO-APR-2026",
  "quizPassword": "bio123",
  "questions": [
    {
      "question": "Which organelle is called the powerhouse of the cell?",
      "options": ["Nucleus", "Mitochondria", "Golgi body", "Ribosome"],
      "correctAnswer": 1,
      "explanation": "Mitochondria produce ATP."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "6800c3705c2a2ed8f012d111",
    "title": "Cell Biology Revision Quiz",
    "subject": "Biology",
    "totalQuestions": 1,
    "isActive": true
  }
}
```

</details>

<details>
<summary><code>GET</code> <strong>/api/quizzes</strong> — Retrieve active quizzes</summary>

> 🔓 Authentication: Not required

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "6800c3705c2a2ed8f012d111",
      "title": "Cell Biology Revision Quiz",
      "subject": "Biology",
      "timeLimit": 30
    }
  ]
}
```

</details>

---

### 6.5 📅 Study Plan

<details>
<summary><code>POST</code> <strong>/api/study-plan</strong> — Create personalized study plan</summary>

> 🔒 Authentication: Required (Student)

**Request Body:**
```json
{
  "studyHoursPerDay": 3,
  "subjects": [
    {
      "name": "Biology",
      "examDate": "2026-05-20",
      "isWeak": true,
      "topics": ["Cell Biology", "Genetics", "Ecology"]
    },
    {
      "name": "Chemistry",
      "examDate": "2026-05-28",
      "isWeak": false,
      "topics": ["Atomic Structure", "Bonding"]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "6800c7705c2a2ed8f012e111",
    "studyHoursPerDay": 3,
    "daysUntilNextExam": 39,
    "timetable": { "totalDays": 30 }
  }
}
```

</details>

<details>
<summary><code>GET</code> <strong>/api/study-plan</strong> — Retrieve student's study plan</summary>

> 🔒 Authentication: Required (Student)

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "6800c7705c2a2ed8f012e111",
    "studyHoursPerDay": 3,
    "subjects": [{ "name": "Biology", "isWeak": true }],
    "dailyLogs": [
      {
        "date": "2026-04-11T00:00:00.000Z",
        "totalMinutes": 150,
        "goalMet": false
      }
    ]
  }
}
```

</details>

---

### 6.6 🎯 AI Quiz Generator

<details>
<summary><code>POST</code> <strong>/api/quiz/generate</strong> — Generate quiz from text/PDFs</summary>

> 🔒 Authentication: Required (Student)

**Request Body:** (multipart/form-data)
- `files`: Array of PDFs (optional)
- `text`: Text content (optional)
- `topic`: Topic for the quiz
- `difficulty`: e.g., 'Medium'
- `questionCount`: e.g., '10'

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Generated Quiz Topic",
    "timeLimit": 15,
    "questions": [
      {
        "type": "mcq",
        "question": "Sample question?",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": "A",
        "explanation": "Because it is correct."
      }
    ]
  }
}
```

</details>

<details>
<summary><code>POST</code> <strong>/api/quiz/explain</strong> — Explain a concept simply (ELI5)</summary>

> 🔒 Authentication: Required (Student)

**Request Body:**
```json
{
  "concept": "Photosynthesis",
  "context": "The student got a question wrong about how plants make food."
}
```

**Response:**
```json
{
  "success": true,
  "explanation": "Imagine you are baking a cake..."
}
```

</details>

> 📬 **API Documentation Tooling** — Use the project Postman collection for endpoint validation. Swagger documentation can optionally be added for interactive API docs.

---

## 7. Authentication and Authorization

ExamCoach uses **JWT-based authentication** for all protected endpoints.

### 🔄 JWT Flow

```
1. User logs in via POST /api/auth/login
2. Server returns a signed JWT
3. Frontend stores token (session/local storage)
4. Frontend includes token in Authorization header
5. Backend protect middleware verifies token
6. authorize middleware applies role checks
```

### 📌 Authorization Header Format

```http
Authorization: Bearer <token>
```

### 🛡️ Protected Route Examples

| Route | Access Level |
|-------|-------------|
| `POST /api/subjects` | 🔴 Admin only |
| `POST /api/study-plan` | 🟡 Student only |
| `GET /api/study-plan` | 🟡 Student only |
| Lesson management | 🟠 Teacher / Admin |

---

## 8. Deployment Report

### ⚙️ Backend — Render

| | |
|---|---|
| **Platform** | Render |
| **Live URL** | https://examcoach-backend-mnoy.onrender.com |

**Deployment Steps:**

1. Push latest backend code to GitHub
2. Create a **Web Service** in Render
3. Set root directory to `Backend`
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Configure environment variables in Render dashboard

---

### 🌐 Frontend — Vercel

| | |
|---|---|
| **Platform** | Vercel |
| **Live URL** | https://exam-coach-sigma.vercel.app |

**Deployment Steps:**

1. Import repository into Vercel
2. Set root directory to `Frontend`
3. Configure environment variables:
   ```env
   VITE_API_URL=https://examcoach-backend-mnoy.onrender.com
   ```
4. Build and deploy from `main` branch

---

### 🔑 Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `PORT` | Backend server port |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | Token lifetime |
| `GEMINI_API_KEY` | Gemini AI key |
| `CLOUDINARY_URL` | Cloudinary connection URL |
| `FRONTEND_URL` | Frontend URL for CORS and callbacks |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Google OAuth callback URL |
| `VITE_API_URL` | Frontend API base URL |

---

### 📸 Deployment Screenshots

#### Backend Deployment — Render (Build Logs)

<img width="1600" height="898" alt="Render Build Logs" src="https://github.com/user-attachments/assets/62d41d68-a179-4291-813d-17459d58336b" />

#### Backend Deployment — Render (Service Live)

<img width="1600" height="862" alt="Render Service Live" src="https://github.com/user-attachments/assets/05716a0f-3820-4364-a6a8-c6a5fbbb0da6" />

#### Frontend Deployment — Vercel (Production Ready)

<img width="1600" height="900" alt="Vercel Production Deployment" src="https://github.com/user-attachments/assets/8d53b2b8-06ab-4da3-b870-a038622b288e" />

---

## 9. Testing Instruction Report

> Run all testing commands from the `Backend` directory.

### 9.1 📅 Study Plan Testing

```bash
# Unit Test
npx jest test/unit/studyPlan.test.js --verbose

# Integration Test
npx jest test/integration/studyPlan.test.js --verbose

# Performance Test
npx artillery run test/performance/performance-studyplan.yml
```

### 9.2 🤖 AI Learning Lab Testing

```bash
# Unit Test
npx --yes jest@29.7.0 --runInBand --testMatch "**/test/unit/aiLab.test.js"

# Integration Test
npx --yes jest@29.7.0 --runInBand --testMatch "**/test/integration/aiLab.test.js"

# Performance Test
npx artillery run test/performance/performance-ailab.yml --quiet --output test/performance/ailab-result.json
```

### 9.3 📚 Course Management Testing

```bash
# Unit Test
npx --yes jest@29.7.0 --runInBand --testMatch "**/test/unit/course.test.js"

# Integration Test
npx --yes jest@29.7.0 --runInBand --testMatch "**/test/integration/course.test.js"

# Performance Test
npx artillery run test/performance/performance-course.yml --quiet --output test/performance/course-result.json
```

### 9.4 🎯 AI Quiz Generator Testing

```bash
# Unit Test
npx jest test/unit/aiquizgen.test.js --verbose

# Integration Test
npx jest test/integration/aiquizgen.test.js --verbose

# Performance Test
npx artillery run test/performance/performance-aiquiz.yml --output test/performance/aiquiz-result.json
```

### 9.5 👤 User Management Testing

```bash
# Unit Test
npx jest test/unit/usercom.test.js --verbose

# Integration Test
npx jest test/integration/usercom.test.js --verbose

# Performance Test
npx artillery run test/performance/performance-registerstudent.yml --output test/performance/registerstudent-result.json
```

### 9.6 ⚙️ Testing Environment Configuration

| Requirement | Details |
|-------------|---------|
| Node.js & npm | Must be installed |
| Backend dependencies | Run `npm install` in `/Backend` |
| MongoDB | Accessible for integration scenarios |
| Backend server | Running for API and performance tests |

---

## 10. Features

| Feature | Details |
|---------|---------|
| ✅ Full RESTful API | Complete CRUD operations across all resources |
| 🛡️ Role-based Access Control | Protected routes per user role |
| 🤖 AI Summarization | Text/file summarization + resource suggestions |
| 🎯 AI Quiz Generation | Auto-generated quizzes with analytics |
| 📅 Study Plan Generation | Personalized plans with progress tracking |
| 📚 Content Management | Subject and lesson workflow management |
| 🔍 Real-time Detection | Socket.io-based cheating detection |
| ☁️ Cloud Media | Cloudinary integration for file storage |
| 📆 Calendar Integration | Google Calendar sync support |
| 🚀 Production Deployed | Live frontend and backend services |

---

## 11. Folder Structure

```
ExamCoach/
├── 📄 README.md
│
├── 📁 Backend/
│   ├── index.js
│   ├── package.json
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── test/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── performance/
│   └── uploads/
│
└── 📁 Frontend/
    ├── package.json
    ├── index.html
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   ├── layouts/
    │   ├── pages/
    │   ├── services/
    │   └── utils/
    └── public/
```

---

## 12. Contributors

| Name | Student ID | Contribution Area |
|------|------------|-------------------|
| T.D.S Peiris | IT23241800 | AI Learning Lab & Course Management |
| B. P. L. Fernando | IT23268258 | AI Quiz & User Managemant |
|T.G.D.L Munidasa | IT23291546 | Study Plans & Admin analytics |
| D.M.R.W Dissanayake | IT23166660 | Teacher Quiz & Cheating Detection |

---

<div align="center">

## 📌 Final Notes

This project satisfies the full-stack assignment requirements by combining **secure REST API development**, **React frontend integration**, **role-based security**, **external API usage**, **deployment**, and **multi-level testing**.

---



</div>
