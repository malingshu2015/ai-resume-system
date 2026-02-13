/**
 * 简历详情页面
 * 功能：
 * 1. 完整展示简历内容（支持编辑）
 * 2. 风格/模板选择
 * 3. 导出操作（PDF、邮件发送、生成链接、长图等）
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, Button, message, Typography, Space, Tag, Row, Col, Spin,
    Select, Divider, Input, Tabs, Alert, Upload
} from 'antd';
import {
    SaveOutlined, ArrowLeftOutlined, ThunderboltOutlined,
    EyeOutlined, FormOutlined, ReloadOutlined, PlusOutlined, UserOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { API_ENDPOINTS } from '../../api';
import './ResumeDetail.css';
import ResumeExportModal from '../../components/ResumeExportModal';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface ResumeData {
    id: string;
    filename: string;
    status: string;
    parsed_data: any;
    is_optimized?: boolean;
    target_job_title?: string;
    target_job_company?: string;
    optimization_notes?: string;
    parent_resume_id?: string;
}

interface Template {
    id: string;
    name: string;
    description: string;
    color_scheme: string;
}

const ResumeDetail: React.FC = () => {
    const { resumeId } = useParams<{ resumeId: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resume, setResume] = useState<ResumeData | null>(null);
    const [editedData, setEditedData] = useState<any>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState('modern');
    const [activeTab, setActiveTab] = useState('preview');

    // 导出 Modal
    const [exportModalVisible, setExportModalVisible] = useState(false);

    useEffect(() => {
        if (resumeId) {
            fetchResume();
            fetchTemplates();
        }
    }, [resumeId]);

    const fetchResume = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_ENDPOINTS.RESUMES}/${resumeId}`);
            setResume(response.data);
            setEditedData(response.data.parsed_data);
        } catch (error) {
            message.error('获取简历详情失败');
            navigate('/resume');
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const response = await axios.get(`${API_ENDPOINTS.RESUME_GENERATOR}/templates`);
            setTemplates(response.data.templates || []);
        } catch (error) {
            console.error('获取模板失败');
        }
    };

    // 保存编辑内容
    const handleSave = async () => {
        if (!resume || !editedData) return;

        setSaving(true);
        try {
            await axios.put(`${API_ENDPOINTS.RESUMES}/${resumeId}`, {
                parsed_data: editedData,
                avatar_url: editedData.avatar_url // 显式传递给后端
            });
            setHasChanges(false);
            message.success('简历内容已保存');
        } catch (error) {
            message.error('保存失败');
        } finally {
            setSaving(false);
        }
    };

    // 头像上传
    const handleAvatarUpload = async (info: any) => {
        if (info.file.status === 'uploading') {
            return;
        }
        if (info.file.status === 'done') {
            const avatarUrl = info.file.response.avatar_url;
            setEditedData((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
            setHasChanges(true);
            message.success('头像上传成功');
        } else if (info.file.status === 'error') {
            message.error('头像上传失败');
        }
    };




    // 更新字段
    const updateField = (path: string[], value: any) => {
        const newData = { ...editedData };

        // 特殊处理单层字段（如 avatar_url）
        if (path.length === 1) {
            newData[path[0]] = value;
            setEditedData(newData);
            setHasChanges(true);
            return;
        }

        let current = newData;
        for (let i = 0; i < path.length - 1; i++) {
            if (!current[path[i]]) {
                current[path[i]] = {};
            }
            current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
        setEditedData(newData);
        setHasChanges(true);
    };

    // 渲染个人信息编辑区
    const renderPersonalInfo = () => {
        const info = editedData?.personal_info || editedData?.basic_info || {};
        const avatarUrl = editedData?.avatar_url;

        return (
            <Card title="个人信息" className="section-card">
                <Row gutter={24}>
                    <Col span={18}>
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <div className="field-group">
                                    <Text type="secondary">姓名</Text>
                                    <Input
                                        value={info.name || ''}
                                        onChange={(e) => updateField(['personal_info', 'name'], e.target.value)}
                                        placeholder="姓名"
                                    />
                                </div>
                            </Col>
                            <Col span={12}>
                                <div className="field-group">
                                    <Text type="secondary">职位头衔</Text>
                                    <Input
                                        value={info.title || ''}
                                        onChange={(e) => updateField(['personal_info', 'title'], e.target.value)}
                                        placeholder="职位头衔"
                                    />
                                </div>
                            </Col>
                            <Col span={8}>
                                <div className="field-group">
                                    <Text type="secondary">性别 / 年龄 / 工作年限</Text>
                                    <Input
                                        value={info.extra_info || ''}
                                        onChange={(e) => updateField(['personal_info', 'extra_info'], e.target.value)}
                                        placeholder="例如：男 / 32岁 / 10年工作经验"
                                    />
                                </div>
                            </Col>
                            <Col span={8}>
                                <div className="field-group">
                                    <Text type="secondary">电话</Text>
                                    <Input
                                        value={info.contact?.phone || info.phone || ''}
                                        onChange={(e) => updateField(['personal_info', 'contact', 'phone'], e.target.value)}
                                        placeholder="电话"
                                    />
                                </div>
                            </Col>
                            <Col span={8}>
                                <div className="field-group">
                                    <Text type="secondary">邮箱</Text>
                                    <Input
                                        value={info.contact?.email || info.email || ''}
                                        onChange={(e) => updateField(['personal_info', 'contact', 'email'], e.target.value)}
                                        placeholder="邮箱"
                                    />
                                </div>
                            </Col>
                            <Col span={24}>
                                <div className="field-group">
                                    <Text type="secondary">个人简介 (展示在简历主页核心区域)</Text>
                                    <TextArea
                                        value={info.summary || ''}
                                        onChange={(e) => updateField(['personal_info', 'summary'], e.target.value)}
                                        placeholder="个人简介/职业目标"
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                    />
                                </div>
                            </Col>
                        </Row>
                    </Col>
                    <Col span={6} style={{ textAlign: 'center' }}>
                        <div className="field-group">
                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>简历照片/头像</Text>
                            <Upload
                                name="file"
                                listType="picture-card"
                                className="avatar-uploader"
                                showUploadList={false}
                                action={`${API_ENDPOINTS.RESUMES}/${resumeId}/avatar`}
                                onChange={handleAvatarUpload}
                            >
                                {avatarUrl ? (
                                    <img src={avatarUrl.startsWith('http') ? avatarUrl : `${API_ENDPOINTS.RESUMES.replace('/api/v1/resumes', '')}${avatarUrl}`} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div>
                                        <PlusOutlined />
                                        <div style={{ marginTop: 8 }}>上传照片</div>
                                    </div>
                                )}
                            </Upload>
                        </div>
                    </Col>
                </Row>
            </Card>
        );
    };

    // 渲染求职意向编辑区
    const renderJobIntention = () => {
        const intention = editedData?.job_intention || {};

        return (
            <Card title="求职意向" className="section-card">
                <Row gutter={[16, 16]}>
                    <Col span={6}>
                        <div className="field-group">
                            <Text type="secondary">意向岗位</Text>
                            <Input
                                value={intention.position || ''}
                                onChange={(e) => updateField(['job_intention', 'position'], e.target.value)}
                                placeholder="如：架构师 / 技术总监"
                            />
                        </div>
                    </Col>
                    <Col span={6}>
                        <div className="field-group">
                            <Text type="secondary">意向城市</Text>
                            <Input
                                value={intention.city || ''}
                                onChange={(e) => updateField(['job_intention', 'city'], e.target.value)}
                                placeholder="如：北京、深圳"
                            />
                        </div>
                    </Col>
                    <Col span={6}>
                        <div className="field-group">
                            <Text type="secondary">期望薪资</Text>
                            <Input
                                value={intention.salary || ''}
                                onChange={(e) => updateField(['job_intention', 'salary'], e.target.value)}
                                placeholder="如：30k-50k"
                            />
                        </div>
                    </Col>
                    <Col span={6}>
                        <div className="field-group">
                            <Text type="secondary">求职类型</Text>
                            <Select
                                value={intention.type || '全职'}
                                onChange={(value) => updateField(['job_intention', 'type'], value)}
                                style={{ width: '100%' }}
                            >
                                <Option value="全职">全职</Option>
                                <Option value="兼职">兼职</Option>
                                <Option value="自由职业">自由职业</Option>
                                <Option value="社招">社招</Option>
                                <Option value="校招">校招</Option>
                            </Select>
                        </div>
                    </Col>
                </Row>
            </Card>
        );
    };

    // 渲染工作经历编辑区
    const renderWorkExperience = () => {
        const experiences = editedData?.work_experience || [];

        return (
            <Card title="工作经历" className="section-card">
                {experiences.map((exp: any, index: number) => (
                    <div key={index} className="experience-item">
                        <Row gutter={[16, 12]}>
                            <Col span={12}>
                                <Input
                                    value={exp.company || ''}
                                    onChange={(e) => {
                                        const newExp = [...experiences];
                                        newExp[index].company = e.target.value;
                                        updateField(['work_experience'], newExp);
                                    }}
                                    placeholder="公司名称"
                                    addonBefore="公司"
                                />
                            </Col>
                            <Col span={12}>
                                <Input
                                    value={exp.position || ''}
                                    onChange={(e) => {
                                        const newExp = [...experiences];
                                        newExp[index].position = e.target.value;
                                        updateField(['work_experience'], newExp);
                                    }}
                                    placeholder="职位"
                                    addonBefore="职位"
                                />
                            </Col>
                            <Col span={12}>
                                <Input
                                    value={exp.duration || ''}
                                    onChange={(e) => {
                                        const newExp = [...experiences];
                                        newExp[index].duration = e.target.value;
                                        updateField(['work_experience'], newExp);
                                    }}
                                    placeholder="时间范围"
                                    addonBefore="时间"
                                />
                            </Col>
                            <Col span={24}>
                                <TextArea
                                    value={exp.description || ''}
                                    onChange={(e) => {
                                        const newExp = [...experiences];
                                        newExp[index].description = e.target.value;
                                        updateField(['work_experience'], newExp);
                                    }}
                                    placeholder="工作描述"
                                    autoSize={{ minRows: 2, maxRows: 4 }}
                                />
                            </Col>
                            <Col span={24}>
                                <Text type="secondary" style={{ fontSize: 12 }}>主要成就（每行一条）</Text>
                                <TextArea
                                    value={(exp.achievements || []).join('\n')}
                                    onChange={(e) => {
                                        const newExp = [...experiences];
                                        newExp[index].achievements = e.target.value.split('\n').filter(Boolean);
                                        updateField(['work_experience'], newExp);
                                    }}
                                    placeholder="主要成就，每行一条"
                                    autoSize={{ minRows: 2, maxRows: 6 }}
                                />
                            </Col>
                        </Row>
                        {index < experiences.length - 1 && <Divider />}
                    </div>
                ))}
            </Card>
        );
    };

    // 渲染项目经验编辑区
    const renderProjectExperience = () => {
        const projects = editedData?.project_experience || [];

        return (
            <Card title="项目经验" className="section-card">
                {projects.map((proj: any, index: number) => (
                    <div key={index} className="experience-item">
                        <Row gutter={[16, 12]}>
                            <Col span={12}>
                                <Input
                                    value={proj.name || ''}
                                    onChange={(e) => {
                                        const newProj = [...projects];
                                        newProj[index].name = e.target.value;
                                        updateField(['project_experience'], newProj);
                                    }}
                                    placeholder="项目名称"
                                    addonBefore="项目"
                                />
                            </Col>
                            <Col span={12}>
                                <Input
                                    value={proj.role || ''}
                                    onChange={(e) => {
                                        const newProj = [...projects];
                                        newProj[index].role = e.target.value;
                                        updateField(['project_experience'], newProj);
                                    }}
                                    placeholder="承担角色"
                                    addonBefore="角色"
                                />
                            </Col>
                            <Col span={12}>
                                <Input
                                    value={proj.duration || ''}
                                    onChange={(e) => {
                                        const newProj = [...projects];
                                        newProj[index].duration = e.target.value;
                                        updateField(['project_experience'], newProj);
                                    }}
                                    placeholder="时间范围"
                                    addonBefore="时间"
                                />
                            </Col>
                            <Col span={24}>
                                <TextArea
                                    value={proj.description || ''}
                                    onChange={(e) => {
                                        const newProj = [...projects];
                                        newProj[index].description = e.target.value;
                                        updateField(['project_experience'], newProj);
                                    }}
                                    placeholder="项目描述/背景"
                                    autoSize={{ minRows: 2, maxRows: 4 }}
                                />
                            </Col>
                            <Col span={24}>
                                <Text type="secondary" style={{ fontSize: 12 }}>关键动作与技术方案（每行一条）</Text>
                                <TextArea
                                    value={(proj.actions || []).join('\n')}
                                    onChange={(e) => {
                                        const newProj = [...projects];
                                        newProj[index].actions = e.target.value.split('\n').filter(Boolean);
                                        updateField(['project_experience'], newProj);
                                    }}
                                    placeholder="关键行动，每行一条"
                                    autoSize={{ minRows: 2, maxRows: 6 }}
                                />
                            </Col>
                            <Col span={24}>
                                <Input
                                    value={proj.results || ''}
                                    onChange={(e) => {
                                        const newProj = [...projects];
                                        newProj[index].results = e.target.value;
                                        updateField(['project_experience'], newProj);
                                    }}
                                    placeholder="量化成果/技术指标"
                                    addonBefore="成果"
                                />
                            </Col>
                        </Row>
                        {index < projects.length - 1 && <Divider />}
                    </div>
                ))}
                {projects.length === 0 && <Text type="secondary">暂无项目经验</Text>}
            </Card>
        );
    };


    // 渲染教育背景编辑区
    const renderEducation = () => {
        const education = editedData?.education || [];

        return (
            <Card title="教育背景" className="section-card">
                {education.map((edu: any, index: number) => (
                    <div key={index} className="experience-item">
                        <Row gutter={[16, 12]}>
                            <Col span={8}>
                                <Input
                                    value={edu.school || ''}
                                    onChange={(e) => {
                                        const newEdu = [...education];
                                        newEdu[index].school = e.target.value;
                                        updateField(['education'], newEdu);
                                    }}
                                    placeholder="学校"
                                    addonBefore="学校"
                                />
                            </Col>
                            <Col span={8}>
                                <Input
                                    value={edu.major || ''}
                                    onChange={(e) => {
                                        const newEdu = [...education];
                                        newEdu[index].major = e.target.value;
                                        updateField(['education'], newEdu);
                                    }}
                                    placeholder="专业"
                                    addonBefore="专业"
                                />
                            </Col>
                            <Col span={8}>
                                <Input
                                    value={edu.degree || ''}
                                    onChange={(e) => {
                                        const newEdu = [...education];
                                        newEdu[index].degree = e.target.value;
                                        updateField(['education'], newEdu);
                                    }}
                                    placeholder="学位"
                                    addonBefore="学位"
                                />
                            </Col>
                        </Row>
                    </div>
                ))}
            </Card>
        );
    };

    // 渲染技能编辑区
    const renderSkills = () => {
        const skills = editedData?.skills || editedData?.skills_sections || [];

        if (Array.isArray(skills) && skills.every((s: any) => typeof s === 'string')) {
            // 简单数组格式
            return (
                <Card title="技能" className="section-card">
                    <TextArea
                        value={skills.join('、')}
                        onChange={(e) => {
                            const newSkills = e.target.value.split(/[、,，]/).map(s => s.trim()).filter(Boolean);
                            updateField(['skills'], newSkills);
                        }}
                        placeholder="技能列表，用顿号分隔"
                        autoSize={{ minRows: 2, maxRows: 6 }}
                    />
                </Card>
            );
        }

        // 分类格式
        return (
            <Card title="技能" className="section-card">
                {skills.map((section: any, index: number) => (
                    <div key={index} style={{ marginBottom: 12 }}>
                        <Input
                            value={section.category || ''}
                            onChange={(e) => {
                                const newSkills = [...skills];
                                newSkills[index].category = e.target.value;
                                updateField(['skills_sections'], newSkills);
                            }}
                            placeholder="技能分类"
                            style={{ marginBottom: 8 }}
                            addonBefore="分类"
                        />
                        <TextArea
                            value={(section.skills || []).join('、')}
                            onChange={(e) => {
                                const newSkills = [...skills];
                                newSkills[index].skills = e.target.value.split(/[、,，]/).map(s => s.trim()).filter(Boolean);
                                updateField(['skills_sections'], newSkills);
                            }}
                            placeholder="技能列表"
                            autoSize={{ minRows: 1, maxRows: 3 }}
                        />
                    </div>
                ))}
            </Card>
        );
    };

    // 渲染荣誉认证编辑区
    const renderOthers = () => {
        const others = editedData?.others || {};
        const certifications = others.certifications || [];
        const awards = others.awards || [];

        return (
            <Card title="荣誉认证" className="section-card">
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>资质证书（每行一条）</Text>
                    <TextArea
                        value={certifications.join('\n')}
                        onChange={(e) => {
                            const val = e.target.value.split('\n').filter(Boolean);
                            updateField(['others', 'certifications'], val);
                        }}
                        placeholder="证书名称，如：CISSP、PMP、英语六级"
                        autoSize={{ minRows: 2, maxRows: 6 }}
                    />
                </div>
                <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>荣誉奖项（每行一条）</Text>
                    <TextArea
                        value={awards.join('\n')}
                        onChange={(e) => {
                            const val = e.target.value.split('\n').filter(Boolean);
                            updateField(['others', 'awards'], val);
                        }}
                        placeholder="获奖名称"
                        autoSize={{ minRows: 2, maxRows: 4 }}
                    />
                </div>
            </Card>
        );
    };

    /**
     * 解析文本中的 AI 标记并渲染为高亮组件
     * 支持的标记：[[ADD]]...[[/ADD]], [[MODIFY]]...[[/MODIFY]]
     */
    const renderHighlightedText = (text: string) => {
        if (!text) return null;

        // 匹配 [[ADD]]...[[/ADD]] 和 [[MODIFY]]...[[/MODIFY]] 标记
        const pattern = /\[\[(ADD|MODIFY)\]\](.*?)\[\[\/\1\]\]/gs;
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;
        let keyIndex = 0;

        while ((match = pattern.exec(text)) !== null) {
            // 添加标记前的普通文本
            if (match.index > lastIndex) {
                parts.push(<span key={keyIndex++}>{text.slice(lastIndex, match.index)}</span>);
            }

            // 添加高亮的 AI 内容
            const tagType = match[1]; // ADD 或 MODIFY
            const content = match[2];
            const isAdd = tagType === 'ADD';

            parts.push(
                <span
                    key={keyIndex++}
                    className={`ai-highlight ${isAdd ? 'ai-add' : 'ai-modify'}`}
                    title={isAdd ? 'AI 新增内容' : 'AI 修改建议'}
                >
                    {content}
                </span>
            );

            lastIndex = match.index + match[0].length;
        }

        // 添加剩余的普通文本
        if (lastIndex < text.length) {
            parts.push(<span key={keyIndex++}>{text.slice(lastIndex)}</span>);
        }

        return parts.length > 0 ? parts : text;
    };

    /**
     * 获取当前模板的样式类名
     */
    const getTemplateClassName = () => {
        const templateMap: Record<string, string> = {
            'modern': 'template-modern',
            'professional': 'template-professional',
            'creative': 'template-creative',
            'minimal': 'template-minimal'
        };
        return templateMap[selectedTemplate] || 'template-modern';
    };

    // 渲染预览模式
    const renderPreview = () => {
        const info = editedData?.personal_info || editedData?.basic_info || {};
        const experiences = editedData?.work_experience || [];
        const skills = editedData?.skills || [];
        const avatarUrl = editedData?.avatar_url;
        const jobIntention = editedData?.job_intention || {};

        return (
            <div className={`resume-preview ${getTemplateClassName()}`}>
                {/* 个人核心信息页眉 (参考截图布局) */}
                <div className="preview-header-container">
                    <div className="preview-header-main">
                        <div className="header-left">
                            <Text className="resume-label">PERSONAL RESUME</Text>
                            <Divider className="label-divider" />
                            <Title level={1} className="person-name">
                                {renderHighlightedText(info.name) || '姓名'}
                            </Title>

                            {/* 个人信息网格 */}
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">性别：</span>
                                    <span className="info-value">{info.gender || '男'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">电话：</span>
                                    <span className="info-value">{info.contact?.phone || info.phone || '未填写'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">邮箱：</span>
                                    <span className="info-value">{info.contact?.email || info.email || '未填写'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">所在地：</span>
                                    <span className="info-value">{info.contact?.location || info.location || '深圳'}</span>
                                </div>
                            </div>
                        </div>

                        {/* 右侧头像 */}
                        <div className="header-right">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl.startsWith('http') ? avatarUrl : `${API_ENDPOINTS.RESUMES.replace('/api/v1/resumes', '')}${avatarUrl}`}
                                    alt="avatar"
                                    className="profile-avatar"
                                />
                            ) : (
                                <div className="avatar-placeholder">
                                    <UserOutlined />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 求职意向 (参考截图布局) */}
                <div className="preview-section intention-section">
                    <Title level={4} className="section-title">求职意向</Title>
                    <div className="intention-grid">
                        <div className="intention-item">
                            <span className="info-label">意向岗位：</span>
                            <span className="info-value">{renderHighlightedText(jobIntention.position || info.title) || '安全专家'}</span>
                        </div>
                        <div className="intention-item">
                            <span className="info-label">意向城市：</span>
                            <span className="info-value">{jobIntention.city || '深圳 北京 广州 上海'}</span>
                        </div>
                        <div className="intention-item">
                            <span className="info-label">期望薪资：</span>
                            <span className="info-value">{jobIntention.salary || '面议'}</span>
                        </div>
                        <div className="intention-item">
                            <span className="info-label">求职类型：</span>
                            <span className="info-value">{jobIntention.type || '社招'}</span>
                        </div>
                    </div>
                </div>

                {/* 个人简介 / 核心优势 */}
                {info.summary && (
                    <div className="preview-section">
                        <Title level={4} className="section-title">个人简介</Title>
                        <Paragraph className="summary-text">{renderHighlightedText(info.summary)}</Paragraph>
                    </div>
                )}

                {/* 工作经历 */}
                {experiences.length > 0 && (
                    <div className="preview-section">
                        <Title level={4} className="section-title">工作经历</Title>
                        {experiences.map((exp: any, index: number) => (
                            <div key={index} className="experience-preview">
                                <div className="exp-header">
                                    <Text strong className="company-name">{renderHighlightedText(exp.company)}</Text>
                                    <Text type="secondary" className="duration">{exp.duration}</Text>
                                </div>
                                <div className="position-row">
                                    <Text className="position-text">{renderHighlightedText(exp.position)}</Text>
                                </div>
                                <Paragraph className="exp-desc">{renderHighlightedText(exp.description)}</Paragraph>
                                {exp.achievements && exp.achievements.length > 0 && (
                                    <ul className="achievements">
                                        {exp.achievements.map((ach: string, i: number) => (
                                            <li key={i}>{renderHighlightedText(ach)}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* 项目经验 */}
                {editedData?.project_experience && editedData.project_experience.length > 0 && (
                    <div className="preview-section">
                        <Title level={4} className="section-title">项目经验</Title>
                        {editedData.project_experience.map((proj: any, index: number) => (
                            <div key={index} className="experience-preview project-preview">
                                <div className="exp-header">
                                    <Text strong className="company-name">{renderHighlightedText(proj.name)}</Text>
                                    <Text type="secondary" className="duration">{proj.duration}</Text>
                                </div>
                                <div className="position-row">
                                    <Text className="position-text">{renderHighlightedText(proj.role)}</Text>
                                </div>
                                <Paragraph className="exp-desc">{renderHighlightedText(proj.description)}</Paragraph>
                                {proj.actions && proj.actions.length > 0 && (
                                    <ul className="achievements">
                                        {proj.actions.map((action: string, i: number) => (
                                            <li key={i}>{renderHighlightedText(action)}</li>
                                        ))}
                                    </ul>
                                )}
                                {proj.results && (
                                    <div className="project-result-preview">
                                        <Text strong>项目成果：</Text>
                                        <Text>{renderHighlightedText(proj.results)}</Text>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* 技能特长 */}
                {skills.length > 0 && (
                    <div className="preview-section">
                        <Title level={4} className="section-title">技能特长</Title>
                        <div className="skills-preview">
                            {Array.isArray(skills) && skills.every((s: any) => typeof s === 'string') ? (
                                <Space wrap>
                                    {skills.map((skill: string, index: number) => (
                                        <Tag key={index} color="blue" className="skill-tag">{skill}</Tag>
                                    ))}
                                </Space>
                            ) : (
                                skills.map((section: any, index: number) => (
                                    <div key={index} className="skill-group">
                                        <Text strong className="skill-category">{section.category}：</Text>
                                        <Space wrap style={{ marginLeft: 8 }}>
                                            {(section.skills || []).map((s: string, i: number) => (
                                                <Tag key={i} className="skill-tag">{s}</Tag>
                                            ))}
                                        </Space>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* 教育背景 */}
                {editedData?.education && editedData.education.length > 0 && (
                    <div className="preview-section">
                        <Title level={4} className="section-title">教育背景</Title>
                        {editedData.education.map((edu: any, index: number) => (
                            <div key={index} className="experience-preview">
                                <div className="exp-header">
                                    <Text strong className="company-name">{renderHighlightedText(edu.school)}</Text>
                                    <Text type="secondary" className="duration">{edu.start_date} - {edu.end_date}</Text>
                                </div>
                                <div className="position-row">
                                    <Text className="position-text">
                                        {renderHighlightedText(edu.major)} · {renderHighlightedText(edu.degree)}
                                    </Text>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 荣誉认证 */}
                {(editedData?.others?.certifications?.length > 0 || editedData?.others?.awards?.length > 0) && (
                    <div className="preview-section">
                        <Title level={4} className="section-title">荣誉认证</Title>
                        <div className="others-preview">
                            {editedData.others.certifications?.length > 0 && (
                                <div style={{ marginBottom: 8 }}>
                                    <Text strong>资质证书：</Text>
                                    <Space wrap style={{ marginLeft: 8 }}>
                                        {editedData.others.certifications.map((cert: string, i: number) => (
                                            <Tag key={i} color="orange">{renderHighlightedText(cert)}</Tag>
                                        ))}
                                    </Space>
                                </div>
                            )}
                            {editedData.others.awards?.length > 0 && (
                                <div>
                                    <Text strong>获奖经历：</Text>
                                    <Space wrap style={{ marginLeft: 8 }}>
                                        {editedData.others.awards.map((award: string, i: number) => (
                                            <Tag key={i} color="gold">{renderHighlightedText(award)}</Tag>
                                        ))}
                                    </Space>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="resume-detail-loading">
                <Spin size="large" tip="加载简历中..." />
            </div>
        );
    }

    return (
        <div className="resume-detail-container">
            {/* 顶部导航 */}
            <div className="detail-header">
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/resume')}>
                    返回简历库
                </Button>
                <Title level={3} style={{ margin: 0, flex: 1, textAlign: 'center' }}>
                    {resume?.filename}
                </Title>
                <Space>
                    {hasChanges && (
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={handleSave}
                            loading={saving}
                        >
                            保存修改
                        </Button>
                    )}
                </Space>
            </div>

            {/* AI 优化版提示 */}
            {resume?.is_optimized && (
                <Alert
                    message={
                        <Space>
                            <ThunderboltOutlined />
                            <span>AI 优化版简历</span>
                        </Space>
                    }
                    description={
                        <Space direction="vertical">
                            <Text>🎯 目标岗位：{resume.target_job_company} - {resume.target_job_title}</Text>
                            {resume.optimization_notes && <Text type="secondary">{resume.optimization_notes}</Text>}
                        </Space>
                    }
                    type="success"
                    showIcon={false}
                    style={{
                        marginBottom: 24,
                        background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                        border: '1px solid #b7eb8f'
                    }}
                />
            )}

            <Row gutter={24}>
                {/* 左侧：简历内容 */}
                <Col xs={24} lg={16}>
                    <Card className="content-card">
                        <Tabs
                            activeKey={activeTab}
                            onChange={setActiveTab}
                            items={[
                                {
                                    key: 'preview',
                                    label: <Space><EyeOutlined /> 预览</Space>,
                                    children: renderPreview()
                                },
                                {
                                    key: 'edit',
                                    label: <Space><FormOutlined /> 编辑</Space>,
                                    children: (
                                        <div className="edit-mode">
                                            {renderPersonalInfo()}
                                            {renderJobIntention()}
                                            {renderWorkExperience()}
                                            {renderProjectExperience()}
                                            {renderEducation()}
                                            {renderSkills()}
                                            {renderOthers()}

                                            {/* 编辑模式底部保存按钮 */}
                                            <div className="edit-save-bar">
                                                <Button
                                                    type="primary"
                                                    icon={<SaveOutlined />}
                                                    size="large"
                                                    onClick={handleSave}
                                                    loading={saving}
                                                    disabled={!hasChanges}
                                                    style={{ minWidth: 160 }}
                                                >
                                                    {hasChanges ? '保存修改' : '无修改'}
                                                </Button>
                                                {hasChanges && (
                                                    <Text type="secondary" style={{ marginLeft: 12 }}>
                                                        您有未保存的修改
                                                    </Text>
                                                )}
                                            </div>
                                        </div>
                                    )
                                }
                            ]}
                        />
                    </Card>
                </Col>

                {/* 右侧：操作面板 */}
                <Col xs={24} lg={8}>
                    <Card title="风格模板" className="action-card">
                        <Select
                            value={selectedTemplate}
                            onChange={setSelectedTemplate}
                            style={{ width: '100%' }}
                            size="large"
                        >
                            {templates.map(t => (
                                <Option key={t.id} value={t.id}>
                                    <Space>
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                width: 14,
                                                height: 14,
                                                borderRadius: 4,
                                                background: t.color_scheme === 'blue' ? 'linear-gradient(135deg, #0050b3, #1890ff)' :
                                                    t.color_scheme === 'gold' ? 'linear-gradient(135deg, #1a1a2e, #d4a574)' :
                                                        t.color_scheme === 'purple' ? 'linear-gradient(135deg, #667eea, #764ba2)' :
                                                            'linear-gradient(135deg, #000000, #333333)',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }}
                                        />
                                        {t.name}
                                    </Space>
                                </Option>
                            ))}
                        </Select>
                        <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                            {templates.find(t => t.id === selectedTemplate)?.description}
                        </Text>
                    </Card>

                    <Card title="导出操作" className="action-card" style={{ marginTop: 16 }}>
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            <Button
                                type="primary"
                                icon={<ThunderboltOutlined />}
                                block
                                size="large"
                                onClick={() => setExportModalVisible(true)}
                                style={{ height: 48, borderRadius: 8, fontSize: 16, fontWeight: 600 }}
                            >
                                📦 导出与分发
                            </Button>
                        </Space>
                    </Card>

                    {resume?.parent_resume_id && (
                        <Card title="关联信息" className="action-card" style={{ marginTop: 16 }}>
                            <Button
                                type="link"
                                icon={<ReloadOutlined />}
                                onClick={() => navigate(`/resume/${resume.parent_resume_id}`)}
                            >
                                查看原始简历
                            </Button>
                        </Card>
                    )}
                </Col>
            </Row>

            {/* 导出与展示 Modal */}
            {resume && (
                <ResumeExportModal
                    visible={exportModalVisible}
                    onCancel={() => setExportModalVisible(false)}
                    resumeContent={editedData}
                    resumeId={resumeId || ''}
                    jobId={resume.target_job_title || ''}
                />
            )}
        </div>
    );
};

export default ResumeDetail;
