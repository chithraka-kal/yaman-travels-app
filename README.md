# 🌍 Yaman Travels - AI-Powered Travel Planner

[![CI/CD Pipeline](https://github.com/chithraka-kal/Yaman-Travels-App/actions/workflows/deploy.yml/badge.svg)](https://github.com/chithraka-kal/Yaman-Travels-App/actions)
![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Docker](https://img.shields.io/badge/Docker-Containerized-blue)
![AWS](https://img.shields.io/badge/AWS-EC2_Production-orange)
![Testing](https://img.shields.io/badge/Tests-Passing-success)

**Yaman Travels** is a full-stack modern web application that leverages Generative AI to create personalized travel itineraries. It features a production-grade DevOps architecture with automated CI/CD pipelines, containerization, and unit testing.

🔗 **Live Demo:** [https://yamantravels.live](https://yamantravels.live)

---

## 🚀 Key Features

* **🤖 AI Trip Planner:** Generates detailed day-by-day travel itineraries using the **Gemini AI API**.
* **🔄 Automated CI/CD:** Zero-touch deployment pipeline using **GitHub Actions**. Commits are automatically tested, built, and deployed to AWS.
* **🛡️ Quality Assurance:** Integrated **Jest** unit testing suite prevents regression bugs before deployment.
* **🔐 Secure Infrastructure:** Hosted behind an **Nginx Reverse Proxy** with **SSL/TLS** encryption (Let's Encrypt).
* **🐳 Fully Containerized:** Consistent development and production environments using **Docker**.

---

## 🏗️ System Architecture

**User** ➡ **Nginx (Reverse Proxy)** ➡ **Docker Container (Next.js 14)** ➡ **MongoDB Atlas**

* **Traffic Flow:** Incoming HTTPS requests are handled by Nginx on AWS EC2, which forwards traffic to the Dockerized application running on port 3000.
* **CI/CD Flow:**
  1. **Push Code:** Developer pushes to `main`.
  2. **Test:** GitHub Actions runs `npm test`. (Build fails if tests fail).
  3. **Build:** Docker image is built and pushed to **Docker Hub**.
  4. **Deploy:** AWS EC2 instance pulls the new image and restarts the container automatically.

---

## 🛠️ Tech Stack

### **Frontend & Backend**
* **Framework:** Next.js 14 (App Router)
* **Language:** JavaScript / React
* **Styling:** Tailwind CSS
* **Authentication:** NextAuth.js

### **DevOps & Infrastructure**
* **Cloud Provider:** AWS EC2 (Ubuntu Linux)
* **Containerization:** Docker & Docker Compose
* **CI/CD:** GitHub Actions (Automated Workflows)
* **Web Server:** Nginx (Reverse Proxy & SSL)
* **Testing:** Jest & React Testing Library

---

## 📸 Screenshots

| AI Planner | AI Suggetions |
|:---:|:---:|
| ![AI Planner](./yaman-next/public/Yaman%20Travels%20-%20AI%20planner.png) | ![AI Suggetions](./yaman-next/public/Yaman%20Travels%20-%20AI%20suggetions.png) |


---

## ⚙️ Installation & Local Setup

### **1. Clone the Repository**
```bash
git clone [https://github.com/chithraka-kal/Yaman-Travels-App.git](https://github.com/chithraka-kal/Yaman-Travels-App.git)
cd Yaman-Travels-App/yaman-next
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Configure Environment Variables**
Create a `.env.local` file in the `yaman-next` directory and add the following keys:

```env
# Database Connection (MongoDB Atlas)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/yaman_travels

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_super_secret_key_here

# AI API Key (Gemini)
GEMINI_API_KEY=your_gemini_api_key_here
```
### **4. Run Tests**
Ensure the build is stable before coding.
```bash
npm test
```
### **5. Run the Development Server**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 🐳 Docker Setup (The "Engineer" Way)

This project is fully containerized. You can run the entire stack with a single command.

**1. Build and Run**
```bash
docker compose up -d --build
```

**2. Seed the Database**
If your database is empty, run the seeding script to populate it with initial data:
* Visit: `http://localhost:3000/api/seed`

---




## 🤝 Contributing

Contributions are welcome!
1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📧 Contact

**Email** - [chithrakakalanamith@gmail.com]
**Linkedin** - [https://www.linkedin.com/in/chithraka-kalanamith/]

