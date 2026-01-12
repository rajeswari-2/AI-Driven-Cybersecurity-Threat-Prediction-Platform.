# Threat Predict

Threat Predict is a comprehensive security monitoring and scanning platform built with modern web technologies. It provides real-time threat detection, AI-powered predictions, and various security scanning tools to ensure the integrity and safety of your digital assets.

## 🚀 Key Features

### 🛡️ Real-time Monitoring
- **Live Threat Map**: Interactive visualization of global security threats using Three.js.
- **Analytics Dashboard**: Comprehensive view of security metrics and attack patterns.
- **Threat Feed**: Real-time stream of security incidents and blocked attacks.
- **Globe View**: 3D globe visualization for geographic threat analysis.

### 🔍 Advanced Scanners
- **Website Scanner**: Comprehensive vulnerability assessment for web applications.
- **API Scanner**: Security auditing for RESTful endpoints.
- **QR Scanner**: Secure QR code analysis and verification.
- **Static Scanner**: File-based security analysis.

### 🤖 AI-Powered Insights
- **Threat Predictions**: Machine learning-driven analysis to anticipate potential security breaches.
- **Incident Management**: Automated tracking and resolution workflow for security alerts.

### 👥 Management & Security
- **User Management**: Role-based access control and user activity tracking.
- **Secure Authentication**: Robust auth system powered by Supabase.
- **Customizable Settings**: Fine-tune scanning parameters and monitoring preferences.

## 🛠️ Tech Stack

- **Frontend**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Visualization**: [Three.js](https://threejs.org/) (@react-three/fiber) + [Recharts](https://recharts.org/)
- **Backend/Database**: [Supabase](https://supabase.com/)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)

## 🏁 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or bun

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd threat-predict
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:8080`.

## 🏗️ Project Structure

- `src/pages`: Main application views (Dashboard, Scanners, Monitors, etc.)
- `src/components`: Reusable UI components built with shadcn/ui.
- `src/hooks`: Custom React hooks for logic reuse.
- `src/integrations`: Supabase and other third-party integrations.
- `supabase/`: Database migrations and edge functions.

## 📄 License

This project is licensed under the MIT License.

## 🚀 Deployment Link:
https://ai-threatpredict.vercel.app/

## 🎥 Project-Demo Recording

https://drive.google.com/file/d/1TSdRanyzf6fCj0JgvhkLk0rfrz6YV-QR/view?usp=drive_link
https://github.com/user-attachments/assets/ac7e15e8-a81c-4cd7-a6a8-866b49f42651
