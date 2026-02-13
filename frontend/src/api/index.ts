/**
 * 统一 API 配置文件
 * 自动识别开发环境与生产环境
 */

// 生产环境下从环境变量读取，开发环境下默认使用本地地址
const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
// 强力移除末尾可能存在的 /api/v1 或 /api/v1/ 以防路径重复
let API_BASE_URL = rawBase.replace(/\/api\/v1\/?$/, '');

// 调试：确保生产环境使用正确的 API 地址
if (typeof window !== 'undefined' && !rawBase.includes('localhost')) {
  // 生产环境强制使用 Render 后端
  API_BASE_URL = 'https://ai-resume-system-cees.onrender.com';
}

// 调试日志
if (typeof window !== 'undefined') {
  console.log('[API Config Debug]', {
    rawBase,
    API_BASE_URL,
    env: import.meta.env.VITE_API_BASE_URL,
    isDev: rawBase.includes('localhost')
  });
}

// 确保 BASE 路径的使用是统一的
export const API_ENDPOINTS = {
    JOBS: `${API_BASE_URL}/api/v1/jobs`,
    RESUMES: `${API_BASE_URL}/api/v1/resumes`,
    MATCH: `${API_BASE_URL}/api/v1/match`,
    DASHBOARD: `${API_BASE_URL}/api/v1/dashboard`,
    RESUME_GENERATOR: `${API_BASE_URL}/api/v1/resume-generator`,
    JOB_SEARCH: `${API_BASE_URL}/api/v1/job-search`,
    CONFIG: `${API_BASE_URL}/api/v1/config`,
    AI: `${API_BASE_URL}/api/v1/ai`,
};

export default API_BASE_URL;
