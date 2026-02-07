import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Dashboard from './pages/Dashboard'
import Library from './pages/Library'
import JobInput from './pages/jobs/JobInput'
import JobSearch from './pages/jobs/JobSearch'
import MatchAnalysis from './pages/match/MatchAnalysis'
import ModelSettings from './pages/settings/ModelSettings'
import MainLayout from './components/MainLayout'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 无需 Layout 的页面 */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 需要 Layout 的页面 */}
        <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
        <Route path="/library" element={<MainLayout><Library /></MainLayout>} />
        <Route path="/jobs/create" element={<MainLayout><JobInput /></MainLayout>} />
        <Route path="/jobs/search" element={<MainLayout><JobSearch /></MainLayout>} />
        <Route path="/match" element={<MainLayout><MatchAnalysis /></MainLayout>} />
        <Route path="/settings/model" element={<MainLayout><ModelSettings /></MainLayout>} />

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
