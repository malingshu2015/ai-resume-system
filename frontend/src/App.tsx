import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ResumeList from './pages/resumes/ResumeList'
import ResumeDetail from './pages/resumes/ResumeDetail'
import JobList from './pages/jobs/JobList'
import MatchAnalysis from './pages/match/MatchAnalysis'
import SmartSourcing from './pages/match/SmartSourcing'
import ModelSettings from './pages/settings/ModelSettings'
import MainLayout from './components/MainLayout'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 主要路由结构，使用 MainLayout 作为父组件 */}
        <Route element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="resume" element={<ResumeList />} />
          <Route path="resume/:resumeId" element={<ResumeDetail />} />
          <Route path="jobs" element={<JobList />} />
          <Route path="match" element={<MatchAnalysis />} />
          <Route path="sourcing" element={<SmartSourcing />} />
          <Route path="settings" element={<ModelSettings />} />
        </Route>

        {/* 备选页面 */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 404 或者 重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
