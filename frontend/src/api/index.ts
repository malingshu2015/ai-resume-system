/**
 * 统一 API 配置文件
 * 生产环境和开发环境的 API 地址配置
 */

// 判断环境：如果在生产环境，使用 Render 后端；否则使用本地后端
const isProduction = typeof window !== 'undefined' &&
                     (window.location.hostname !== 'localhost' &&
                      window.location.hostname !== '127.0.0.1');

const API_BASE_URL = isProduction
  ? 'https://ai-resume-system-cees.onrender.com'
  : 'http://localhost:8000';

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

// 调试日志 - 在生产环境中必须可见
if (typeof window !== 'undefined') {
  // 强制在页面标题中显示
  const debugInfo = `[API: ${API_BASE_URL}]`;
  if (!document.title.includes('[API:')) {
    document.title = debugInfo + ' ' + document.title;
  }

  // 同时也记录到控制台
  console.log('[API Config]', {
    hostname: window.location.hostname,
    isProduction,
    API_BASE_URL,
    JOBS: API_ENDPOINTS.JOBS
  });
}

export default API_BASE_URL;
