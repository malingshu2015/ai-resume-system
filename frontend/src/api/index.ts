/**
 * 统一 API 配置文件
 * 自动识别开发环境与生产环境
 */

// 生产环境下从环境变量读取，开发环境下默认使用本地地址
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
    JOBS: `${API_BASE_URL}/api/v1/jobs`,
    RESUMES: `${API_BASE_URL}/api/v1/resumes`,
    MATCH: `${API_BASE_URL}/api/v1/match`,
    RESUME_GENERATOR: `${API_BASE_URL}/api/v1/resume-generator`,
    AI: `${API_BASE_URL}/api/v1/ai`,
};

export default API_BASE_URL;
