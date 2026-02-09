# AI 智能简历优化应用 - API 接口文档

## 基础信息

- **Base URL**: `http://localhost:8000/api/v1`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

---

## 通用响应格式

### 成功响应
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

### 错误响应
```json
{
  "code": 400,
  "message": "错误描述",
  "detail": "详细错误信息"
}
```

### 常见状态码
| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（未登录或 Token 失效） |
| 403 | 禁止访问（无权限） |
| 404 | 资源不存在 |
| 422 | 数据验证失败 |
| 500 | 服务器内部错误 |

---

## 1. 认证模块

### 1.1 用户注册

**接口**: `POST /auth/register`

**请求参数**:
```json
{
  "username": "string",      // 用户名，3-20 字符
  "email": "string",         // 邮箱地址
  "password": "string"       // 密码，至少 8 字符
}
```

**响应示例**:
```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "id": "uuid",
    "username": "testuser",
    "email": "test@example.com",
    "created_at": "2026-02-05T15:00:00Z"
  }
}
```

---

### 1.2 用户登录

**接口**: `POST /auth/login`

**请求参数**:
```json
{
  "email": "string",         // 邮箱地址
  "password": "string"       // 密码
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 604800,
    "user": {
      "id": "uuid",
      "username": "testuser",
      "email": "test@example.com"
    }
  }
}
```

---

### 1.3 刷新 Token

**接口**: `POST /auth/refresh`

**请求头**:
```
Authorization: Bearer {access_token}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Token 刷新成功",
  "data": {
    "access_token": "new_token_here",
    "token_type": "bearer",
    "expires_in": 604800
  }
}
```

---

### 1.4 获取当前用户信息

**接口**: `GET /auth/me`

**请求头**:
```
Authorization: Bearer {access_token}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "username": "testuser",
    "email": "test@example.com",
    "created_at": "2026-02-05T15:00:00Z"
  }
}
```

---

## 2. 简历模块

### 2.1 上传简历

**接口**: `POST /resumes/upload`

**请求头**:
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**请求参数**:
```
file: File  // 简历文件（PDF、Word、TXT）
```

**响应示例**:
```json
{
  "code": 201,
  "message": "简历上传成功，正在解析...",
  "data": {
    "id": "uuid",
    "title": "解析中...",
    "file_path": "/uploads/resumes/xxx.pdf",
    "file_type": "pdf",
    "status": "parsing",
    "created_at": "2026-02-05T15:00:00Z"
  }
}
```

---

### 2.2 获取简历列表

**接口**: `GET /resumes`

**请求头**:
```
Authorization: Bearer {access_token}
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码，默认 1 |
| page_size | integer | 否 | 每页数量，默认 10 |
| search | string | 否 | 搜索关键词 |
| sort_by | string | 否 | 排序字段（created_at/updated_at） |
| order | string | 否 | 排序方式（asc/desc），默认 desc |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 15,
    "page": 1,
    "page_size": 10,
    "items": [
      {
        "id": "uuid",
        "title": "张三 - 高级前端工程师",
        "file_type": "pdf",
        "is_default": true,
        "created_at": "2026-02-05T15:00:00Z",
        "updated_at": "2026-02-05T15:00:00Z"
      }
    ]
  }
}
```

---

### 2.3 获取简历详情

**接口**: `GET /resumes/{resume_id}`

**请求头**:
```
Authorization: Bearer {access_token}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "title": "张三 - 高级前端工程师",
    "file_path": "/uploads/resumes/xxx.pdf",
    "file_type": "pdf",
    "is_default": true,
    "parsed_data": {
      "basic_info": {
        "name": "张三",
        "phone": "13800138000",
        "email": "zhangsan@example.com",
        "location": "北京"
      },
      "education": [
        {
          "school": "清华大学",
          "major": "计算机科学与技术",
          "degree": "本科",
          "start_date": "2015-09",
          "end_date": "2019-06"
        }
      ],
      "work_experience": [
        {
          "company": "字节跳动",
          "position": "高级前端工程师",
          "start_date": "2019-07",
          "end_date": "2024-12",
          "responsibilities": [
            "负责抖音前端架构设计",
            "带领团队完成核心功能开发"
          ]
        }
      ],
      "projects": [
        {
          "name": "抖音直播间优化",
          "role": "技术负责人",
          "tech_stack": ["React", "TypeScript", "WebRTC"],
          "description": "优化直播间性能，提升用户体验",
          "achievements": [
            "首屏加载时间降低 40%",
            "用户留存率提升 15%"
          ]
        }
      ],
      "skills": ["React", "Vue", "TypeScript", "Node.js", "Webpack"]
    },
    "created_at": "2026-02-05T15:00:00Z",
    "updated_at": "2026-02-05T15:00:00Z"
  }
}
```

---

### 2.4 更新简历

**接口**: `PUT /resumes/{resume_id}`

**请求头**:
```
Authorization: Bearer {access_token}
```

**请求参数**:
```json
{
  "title": "string",
  "parsed_data": {
    "basic_info": { ... },
    "education": [ ... ],
    "work_experience": [ ... ],
    "projects": [ ... ],
    "skills": [ ... ]
  }
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "简历更新成功",
  "data": {
    "id": "uuid",
    "title": "更新后的标题",
    "updated_at": "2026-02-05T16:00:00Z"
  }
}
```

---

### 2.5 删除简历

**接口**: `DELETE /resumes/{resume_id}`

**请求头**:
```
Authorization: Bearer {access_token}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "简历删除成功"
}
```

---

### 2.6 设置默认简历

**接口**: `POST /resumes/{resume_id}/set-default`

**请求头**:
```
Authorization: Bearer {access_token}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "已设置为默认简历"
}
```

---

## 3. 职位模块

### 3.1 创建职位

**接口**: `POST /jobs`

**请求头**:
```
Authorization: Bearer {access_token}
```

**请求参数**:
```json
{
  "title": "string",           // 职位标题
  "company": "string",         // 公司名称
  "description": "string",     // 职位描述
  "source_url": "string"       // 来源 URL（可选）
}
```

**响应示例**:
```json
{
  "code": 201,
  "message": "职位创建成功，正在分析...",
  "data": {
    "id": "uuid",
    "title": "高级前端工程师",
    "company": "字节跳动",
    "status": "analyzing",
    "created_at": "2026-02-05T15:00:00Z"
  }
}
```

---

### 3.2 获取职位列表

**接口**: `GET /jobs`

**请求头**:
```
Authorization: Bearer {access_token}
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码，默认 1 |
| page_size | integer | 否 | 每页数量，默认 10 |
| search | string | 否 | 搜索关键词 |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 8,
    "page": 1,
    "page_size": 10,
    "items": [
      {
        "id": "uuid",
        "title": "高级前端工程师",
        "company": "字节跳动",
        "created_at": "2026-02-05T15:00:00Z"
      }
    ]
  }
}
```

---

### 3.3 获取职位详情

**接口**: `GET /jobs/{job_id}`

**请求头**:
```
Authorization: Bearer {access_token}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "title": "高级前端工程师",
    "company": "字节跳动",
    "description": "职位描述...",
    "source_url": "https://...",
    "requirements": {
      "hard_skills": [
        {
          "skill": "React",
          "level": "精通",
          "priority": "必须"
        },
        {
          "skill": "TypeScript",
          "level": "熟练",
          "priority": "必须"
        }
      ],
      "soft_skills": ["团队协作", "沟通能力"],
      "experience": {
        "years": "3-5年",
        "industry": "互联网"
      },
      "education": {
        "degree": "本科及以上",
        "major": "计算机相关专业"
      },
      "bonus_points": ["大厂经验", "开源贡献"]
    },
    "created_at": "2026-02-05T15:00:00Z"
  }
}
```

---

### 3.4 更新职位

**接口**: `PUT /jobs/{job_id}`

**请求头**:
```
Authorization: Bearer {access_token}
```

**请求参数**:
```json
{
  "title": "string",
  "company": "string",
  "description": "string"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "职位更新成功",
  "data": {
    "id": "uuid",
    "updated_at": "2026-02-05T16:00:00Z"
  }
}
```

---

### 3.5 分析职位截图

**接口**: `POST /jobs/analyze-screenshot`

**请求头**:
```
Authorization: Bearer {access_token}
```

**请求参数**:
```json
{
  "image": "string"  // Base64 编码的图片数据
}
```

**功能说明**:
- 使用 AI 视觉模型分析职位截图
- 自动提取职位名称、公司名称和职位描述
- 支持常见图片格式（JPG、PNG）

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "title": "高级 Python 后端工程师",
    "company": "某科技有限公司",
    "description": "我们正在寻找一位经验丰富的 Python 后端工程师...\n\n岗位职责：\n1. 负责后端服务的设计、开发和维护\n2. 参与系统架构设计和技术选型\n\n任职要求：\n1. 本科及以上学历\n2. 3年以上 Python 开发经验\n3. 熟悉 FastAPI、Django 等框架"
  }
}
```

**错误响应**:
```json
{
  "code": 400,
  "detail": "当前 AI 模型不支持图片分析（视觉功能），请检查 API 配置或手动粘贴文本。"
}
```

---

### 3.6 分析职位文档

**接口**: `POST /jobs/analyze-document`

**请求头**:
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**请求参数**:
```
file: File  // 职位文档文件（PDF 或 Word）
```

**功能说明**:
- 支持上传 PDF (.pdf) 和 Word (.doc, .docx) 格式的职位文档
- 自动提取文档中的文本内容
- 使用 AI 识别职位名称、公司名称和职位描述
- 文件大小限制：10MB

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "title": "高级 Python 后端工程师",
    "company": "某科技有限公司",
    "description": "高级 Python 后端工程师\n\n公司：某科技有限公司\n地点：北京 · 朝阳区\n薪资：25K-40K\n\n职位描述：\n我们正在寻找一位经验丰富的 Python 后端工程师加入我们的团队。\n\n岗位职责：\n1. 负责后端服务的设计、开发和维护\n2. 参与系统架构设计和技术选型\n3. 优化系统性能，提升用户体验\n\n任职要求：\n1. 本科及以上学历，计算机相关专业\n2. 3年以上 Python 开发经验\n3. 熟悉 FastAPI、Django 等 Web 框架\n4. 熟悉 PostgreSQL、Redis 等数据库\n5. 具有良好的代码规范和文档习惯",
    "parsed_data": {
      "job_title": "高级 Python 后端工程师",
      "company": "某科技有限公司",
      "location": "北京 · 朝阳区",
      "salary_range": "25K-40K",
      "requirements": {
        "education": "本科及以上",
        "experience_years": "3年以上",
        "skills": ["Python", "FastAPI", "Django", "PostgreSQL", "Redis"],
        "certifications": [],
        "other": ["良好的代码规范", "文档习惯"]
      },
      "responsibilities": [
        "负责后端服务的设计、开发和维护",
        "参与系统架构设计和技术选型",
        "优化系统性能，提升用户体验"
      ],
      "benefits": [],
      "keywords": ["Python", "后端", "FastAPI", "Django", "PostgreSQL", "Redis"]
    }
  }
}
```

**错误响应**:
```json
{
  "code": 400,
  "detail": "不支持的文件类型。请上传 PDF 或 Word 文档（.pdf, .doc, .docx）"
}
```

```json
{
  "code": 400,
  "detail": "文件大小超过限制（最大 10MB）"
}
```

```json
{
  "code": 500,
  "detail": "文档解析失败，未能提取到文本内容。请确保文档包含可读文本。"
}
```

---

### 3.7 删除职位

**接口**: `DELETE /jobs/{job_id}`

**请求头**:
```
Authorization: Bearer {access_token}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "职位删除成功"
}
```

---

## 4. 匹配模块

### 4.1 创建匹配分析

**接口**: `POST /match/analyze`

**请求头**:
```
Authorization: Bearer {access_token}
```

**请求参数**:
```json
{
  "resume_id": "uuid",
  "job_id": "uuid"
}
```

**响应示例**:
```json
{
  "code": 201,
  "message": "匹配分析已创建，正在计算...",
  "data": {
    "id": "uuid",
    "resume_id": "uuid",
    "job_id": "uuid",
    "status": "analyzing",
    "created_at": "2026-02-05T15:00:00Z"
  }
}
```

---

### 4.2 获取匹配结果

**接口**: `GET /match/{match_id}`

**请求头**:
```
Authorization: Bearer {access_token}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "resume_id": "uuid",
    "job_id": "uuid",
    "match_score": 85.5,
    "match_level": "优秀",
    "match_details": {
      "skills": {
        "score": 90,
        "matched": ["React", "TypeScript", "Node.js"],
        "missing": ["GraphQL"],
        "weight": 0.4
      },
      "experience": {
        "score": 85,
        "years_matched": true,
        "industry_matched": true,
        "weight": 0.3
      },
      "education": {
        "score": 80,
        "degree_matched": true,
        "major_matched": true,
        "weight": 0.15
      },
      "projects": {
        "score": 88,
        "relevant_projects": 3,
        "weight": 0.15
      }
    },
    "strengths": [
      "技能匹配度高，掌握所有核心技术栈",
      "工作经验丰富，符合岗位要求",
      "有相关项目经验"
    ],
    "gaps": [
      "缺少 GraphQL 相关经验",
      "可以补充更多量化成果"
    ],
    "suggestions": [
      "建议学习 GraphQL，补充技能短板",
      "在简历中添加更多数据支撑的成果"
    ],
    "created_at": "2026-02-05T15:00:00Z"
  }
}
```

---

### 4.3 获取匹配历史

**接口**: `GET /match/history`

**请求头**:
```
Authorization: Bearer {access_token}
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| resume_id | uuid | 否 | 筛选指定简历 |
| job_id | uuid | 否 | 筛选指定职位 |
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量 |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 12,
    "page": 1,
    "page_size": 10,
    "items": [
      {
        "id": "uuid",
        "resume_title": "张三 - 高级前端工程师",
        "job_title": "高级前端工程师 - 字节跳动",
        "match_score": 85.5,
        "match_level": "优秀",
        "created_at": "2026-02-05T15:00:00Z"
      }
    ]
  }
}
```

---

## 5. 优化模块

### 5.1 生成优化建议

**接口**: `POST /optimize/suggestions`

**请求头**:
```
Authorization: Bearer {access_token}
```

**请求参数**:
```json
{
  "resume_id": "uuid",
  "job_id": "uuid"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "优化建议生成成功",
  "data": {
    "keyword_optimization": [
      {
        "type": "添加关键词",
        "keyword": "GraphQL",
        "reason": "职位要求中提到，但简历中未体现",
        "suggestion": "在技能清单中添加 GraphQL",
        "priority": "高"
      }
    ],
    "content_optimization": [
      {
        "type": "量化成果",
        "section": "工作经历",
        "original": "负责前端架构设计",
        "optimized": "负责前端架构设计，支撑日活 2 亿用户",
        "reason": "添加数据支撑，更有说服力",
        "priority": "高"
      }
    ],
    "structure_optimization": [
      {
        "type": "调整顺序",
        "suggestion": "将最相关的项目经验前置",
        "priority": "中"
      }
    ],
    "format_optimization": [
      {
        "type": "ATS 优化",
        "suggestion": "使用标准的章节标题，便于 ATS 识别",
        "priority": "中"
      }
    ]
  }
}
```

---

### 5.2 一键生成优化简历

**接口**: `POST /optimize/generate`

**请求头**:
```
Authorization: Bearer {access_token}
```

**请求参数**:
```json
{
  "resume_id": "uuid",
  "job_id": "uuid",
  "apply_suggestions": true  // 是否应用所有建议
}
```

**响应示例**:
```json
{
  "code": 201,
  "message": "优化简历生成成功",
  "data": {
    "id": "uuid",
    "original_resume_id": "uuid",
    "job_id": "uuid",
    "optimized_content": {
      "basic_info": { ... },
      "education": [ ... ],
      "work_experience": [ ... ],
      "projects": [ ... ],
      "skills": [ ... ]
    },
    "changes": [
      {
        "section": "skills",
        "type": "添加",
        "content": "GraphQL"
      },
      {
        "section": "work_experience",
        "type": "修改",
        "before": "负责前端架构设计",
        "after": "负责前端架构设计，支撑日活 2 亿用户"
      }
    ],
    "improvement": {
      "before_score": 75.5,
      "after_score": 85.5,
      "improvement": 10.0
    },
    "created_at": "2026-02-05T15:00:00Z"
  }
}
```

---

### 5.3 获取优化简历详情

**接口**: `GET /optimize/{optimized_id}`

**请求头**:
```
Authorization: Bearer {access_token}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "original_resume_id": "uuid",
    "job_id": "uuid",
    "optimized_content": { ... },
    "changes": [ ... ],
    "improvement": { ... },
    "created_at": "2026-02-05T15:00:00Z"
  }
}
```

---

### 5.4 导出优化简历

**接口**: `POST /optimize/{optimized_id}/export`

**请求头**:
```
Authorization: Bearer {access_token}
```

**请求参数**:
```json
{
  "format": "pdf",           // pdf | docx | markdown
  "template": "modern"       // classic | modern | creative | tech
}
```

**响应**:
- Content-Type: application/pdf 或 application/vnd.openxmlformats-officedocument.wordprocessingml.document
- 文件流

---

## 6. 异步任务查询

### 6.1 查询任务状态

**接口**: `GET /tasks/{task_id}`

**请求头**:
```
Authorization: Bearer {access_token}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "task_id": "uuid",
    "status": "processing",  // pending | processing | completed | failed
    "progress": 60,
    "result": null,
    "error": null,
    "created_at": "2026-02-05T15:00:00Z",
    "updated_at": "2026-02-05T15:01:00Z"
  }
}
```

---

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 1001 | 用户名已存在 |
| 1002 | 邮箱已注册 |
| 1003 | 用户名或密码错误 |
| 1004 | Token 无效或已过期 |
| 2001 | 文件格式不支持 |
| 2002 | 文件大小超限 |
| 2003 | 简历解析失败 |
| 2004 | 简历不存在 |
| 3001 | 职位不存在 |
| 3002 | 职位分析失败 |
| 4001 | 匹配分析失败 |
| 5001 | 优化建议生成失败 |
| 5002 | 简历导出失败 |

---

**文档版本**：v1.0  
**最后更新**：2026-02-05
