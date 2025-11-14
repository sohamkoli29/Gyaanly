# 🧭 [Gyaanly - Online Learning Platform](https://gyaanly.netlify.app)


A full-stack online learning platform that enables users to enroll in courses, track progress, watch video lectures, attempt quizzes, and receive certificates upon completion.

## 🎯 Project Overview

Gyaanly mimics systems like Udemy and Coursera, showcasing the ability to build scalable SaaS platforms with:
- **Secure authentication** for users and instructors
- **Course and video management** system
- **Payment integration** for premium content
- **Real-time progress tracking** and quiz evaluation
- **Admin dashboard** for platform monitoring

## 🛠 Tech Stack

### Frontend
- **React.js** - UI framework
- **React Router** - Navigation
- **Tailwind CSS** - Styling with custom cyber theme
- **Vite** - Build tool

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **JWT** - Authentication
- **Razorpay** - Payment processing

### Database & Storage
- **Supabase** - PostgreSQL database
- **Supabase Storage** - Video file storage
- **Supabase Auth** - User authentication

### Deployment
- **Vercel** - Frontend hosting
- **Render/Railway** - Backend hosting

## 🚀 Features

### 👤 Authentication System
- Secure JWT-based login/register
- Role-based access (Student, Instructor, Admin)
- Profile management

### 📚 Course Management
- Create, edit, and publish courses
- Video lesson upload and streaming
- Course enrollment and progress tracking

### 🎬 Video System
- Secure video upload to Supabase Storage
- Signed URL streaming
- Progress tracking per lesson

### 🧠 Quiz & Assessment
- Create quizzes with multiple-choice questions
- Automatic scoring and feedback
- Quiz attempts tracking

### 🏆 Certification
- Automatic certificate generation


### 💳 Payment Integration
- Razorpay payment gateway
- Secure payment processing
- Payment history tracking

## 🗂 Project Structure
```bash
online-learning-platform/
├── backend/
│ ├── src/
│ │ ├── config/ # Supabase configuration
│ │ ├── middleware/ # Auth and role middleware
│ │ ├── routes/ # API routes
│ │ └── server.js # Main server file
│ └── package.json
├── frontend/
│ ├── src/
│ │ ├── components/ # Reusable components
│ │ ├── pages/ # Page components
│ │ ├── services/ # API services
│ │ └── utils/ # Utility functions
│ └── package.json
└── package.json
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Razorpay account (for payments)

### Backend Setup
1. Navigate to backend directory:
```bash

npm install
npm run install:all

```
## Environment Variables

```bash
 #./backend/.env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
SUPABASE_ANON_KEY=your_supabase_anon_key
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
FRONTEND_URL=http://localhost:5173
PORT=5000

#./frontend/.env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=your_razorpay_key
```
## Start development locally
```bash
npm run dev
```