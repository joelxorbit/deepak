# Elite Pitch – Football Turf Booking Management System

A production-ready, full-stack Football Turf Booking Management System built with React, Vite, Express, Node.js, and MongoDB Atlas.

---

## 📁 Repository Structure

```
elite-turf/
├── front-end/               # React + Vite Client Application (Vercel)
│   ├── public/              # Static assets, sitemap.xml, robots.txt, manifest.json
│   ├── src/                 # Components, Pages, Routes, Context, Services
│   ├── index.html           # HTML entry point with Open Graph meta tags
│   ├── package.json         # Frontend dependencies
│   ├── vite.config.js       # Vite configuration
│   ├── tailwind.config.js   # Tailwind CSS configuration
│   ├── vercel.json          # Vercel SPA rewrite rules
│   └── .env.example         # Frontend environment template
│
├── back-end/                # Node.js + Express API Server (Render)
│   ├── config/              # MongoDB & Environment configs
│   ├── controllers/         # Thin HTTP request controllers
│   ├── middlewares/         # Auth, Rate Limiter, Error & 404 handlers
│   ├── models/              # Mongoose schemas (Booking, Customer, Event, Admin, Counter)
│   ├── routes/              # Express API routers
│   ├── services/            # Business logic & Mongoose ACID transactions
│   ├── utils/               # Logger, Response helpers, Atomic ID generators
│   ├── validators/          # Input validation rules (express-validator)
│   ├── app.js               # Express application configuration
│   ├── server.js            # Server entry point
│   ├── package.json         # Backend dependencies
│   └── .env.example         # Backend environment template
│
├── README.md                # Project documentation
└── .gitignore               # Monorepo git ignore rules
```

---

## 🚀 Quick Start Guide

### 1. Installation

Install dependencies for both frontend and backend:

```bash
# Frontend
cd front-end
npm install

# Backend
cd ../back-end
npm install
```

### 2. Local Development

#### Start Backend API Server:
```bash
cd back-end
npm run dev
# Server runs on http://localhost:5000
```

#### Start Frontend Client Application:
```bash
cd front-end
npm run dev
# Client runs on http://localhost:5173
```

---

## ☁️ Deployment Instructions

### Frontend (Vercel)
1. Import repository on **Vercel**.
2. Set **Root Directory** to `front-end`.
3. Add Environment Variable:
   - `VITE_API_URL` = `https://your-backend-app.onrender.com/api`
4. Deploy!

### Backend (Render)
1. Create a Web Service on **Render**.
2. Set **Root Directory** to `back-end`.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add Environment Variables:
   - `PORT` = `5000`
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = `mongodb+srv://<user>:<password>@cluster.mongodb.net/elite_pitch`
   - `JWT_SECRET` = `your_jwt_secret_key`
   - `JWT_EXPIRES_IN` = `7d`
   - `CLIENT_URL` = `https://your-frontend-app.vercel.app`
6. Deploy!
