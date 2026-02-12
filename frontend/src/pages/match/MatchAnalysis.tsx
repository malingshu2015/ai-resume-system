import React, { useState, useEffect } from 'react'
import {
    Card, Select, Button, Typography, message, Progress, Tag, Space, Alert, Row, Col, Steps, Empty, Divider, Tabs, Input
} from 'antd'
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts'
import {
    ThunderboltOutlined, CheckCircleOutlined, CloseCircleOutlined, BulbOutlined, RocketOutlined,
    FileTextOutlined, AimOutlined, ArrowRightOutlined, TrophyOutlined, StarOutlined,
    HighlightOutlined, DeploymentUnitOutlined, EditOutlined, DownloadOutlined, FileWordOutlined
} from '@ant-design/icons'
import axios from 'axios'
import { useNavigate, useLocation } from 'react-router-dom'
import EditableResumePreview from '../../components/EditableResumePreview'
import './MatchAnalysis.css'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

interface Resume {
    id: string
    filename: string
    status: string
}

interface Job {
    id: string
    title: string
    company: string
    status: string
}

interface MatchResult {
    match_score: number
    analysis: {
        strengths: string[]
        weaknesses: string[]
        skill_match: {
            matched: string[]
            missing: string[]
        }
        experience_match: string
        education_match: string
    }
    suggestions: Array<{
        category: string
        content: string
        template?: string
    }>
    optimized_resume?: string
    optimized_summary: string
    skill_mastery_blueprints?: Array<{
        skill: string
        priority: string
        gap_description: string
        learning_path: {
            stage1_theory: { title: string; points: string[]; resources: string[] }
            stage2_practice: { title: string; task: string; tech_stack: string[] }
            stage3_project: { title: string; project_name: string; implementation: string; resume_bullet: string }
        }
        interview_prep: { critical_question: string; answer_strategy: string }
    }>
    learning_path?: Array<{
        skill: string
        level: string
        steps: Array<{
            title: string
            content: string
        }>
    }>
    // 新增：自动保存的简历信息
    saved_resume_id?: string
    saved_resume_name?: string
    job_company?: string
    job_title?: string
}

const MatchAnalysis: React.FC = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const [resumes, setResumes] = useState<Resume[]>([])
    const [jobs, setJobs] = useState<Job[]>([])
    const [selectedResume, setSelectedResume] = useState<string>('')
    const [selectedJob, setSelectedJob] = useState<string>('')
    const [analyzing, setAnalyzing] = useState(false)
    const [result, setResult] = useState<MatchResult | null>(null)
    const [currentStep, setCurrentStep] = useState(0)
    const [isEditing, setIsEditing] = useState(false)
    const [editingResume, setEditingResume] = useState('')
    const [generatingFinal, setGeneratingFinal] = useState(false)
    const [finalResumeResult, setFinalResumeResult] = useState<any>(null)
    const [editedResumeData, setEditedResumeData] = useState<any>(null)

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        if (selectedResume && selectedJob) {
            setCurrentStep(2)
        } else if (selectedResume || selectedJob) {
            setCurrentStep(1)
        } else {
            setCurrentStep(0)
        }
    }, [selectedResume, selectedJob])

    const fetchData = async () => {
        try {
            const [resumeRes, jobRes] = await Promise.all([
                axios.get(`${baseUrl}/resumes/`),
                axios.get(`${baseUrl}/jobs/`)
            ])
            const parsedResumes = resumeRes.data.filter((r: Resume) => r.status === 'parsed')
            const parsedJobs = jobRes.data.filter((j: Job) => j.status === 'parsed')
            setResumes(parsedResumes)
            setJobs(parsedJobs)

            // NOTE: 必须在数据加载完成后再设置选中项，
            // 否则 Select 组件中找不到对应的 Option 导致静默失败
            const state = location.state as any
            if (state?.jobId) {
                // 验证该 jobId 确实存在于列表中
                const jobExists = parsedJobs.some((j: Job) => j.id === state.jobId)
                if (jobExists) {
                    setSelectedJob(state.jobId)
                    message.info('已从寻访页自动选中目标职位')
                } else {
                    message.warning('寻访职位尚未成功导入，请手动选择')
                }
            }
            if (state?.resumeId) {
                const resumeExists = parsedResumes.some((r: Resume) => r.id === state.resumeId)
                if (resumeExists) {
                    setSelectedResume(state.resumeId)
                }
            }

            // 如果是从寻访页跳过来的，给一个引导提示
            if (state?.fromSourcing) {
                message.info({
                    content: '职位已导入成功！请选择简历后点击"开始深度分析"',
                    duration: 5
                })
            }
        } catch {
            message.error('加载数据失败')
        }
    }

    const handleAnalyze = async () => {
        if (!selectedResume || !selectedJob) {
            message.warning('请选择简历和职位')
            return
        }

        setAnalyzing(true)
        setResult(null)

        try {
            const response = await axios.post(`${baseUrl}/match/analyze`, {
                resume_id: selectedResume,
                job_id: selectedJob
            })
            setResult(response.data)
            setEditingResume(response.data.optimized_resume || '')

            // 显示成功信息，包含自动保存提示
            if (response.data.saved_resume_id) {
                message.success({
                    content: '深度分析完成，优化版简历已自动保存到简历库！',
                    duration: 5
                })
            } else {
                message.success('深度分析完成，已为您生成优化方案！')
            }
        } catch {
            message.error('分析失败，请重试')
        } finally {
            setAnalyzing(false)
        }
    }

    // 渲染带有 AI 标记的文本
    const renderTaggedText = (text: string) => {
        if (!text) return null;

        // 分割 [[ADD]]...[[/ADD]] 和 [[MOD]]...[[/MOD]]
        const parts = text.split(/(\[\[ADD\].*?\[\[\/ADD\]\]|\[\[MOD\].*?\[\[\/MOD\]\])/gs);

        return parts.map((part, index) => {
            if (part && part.startsWith('[[ADD]]')) {
                const content = part.replace('[[ADD]]', '').replace('[[/ADD]]', '');
                return <span key={index} className="resume-highlight add-mark">{content}</span>;
            } else if (part && part.startsWith('[[MOD]]')) {
                const content = part.replace('[[MOD]]', '').replace('[[/MOD]]', '');
                return <span key={index} className="resume-highlight mod-mark">{content}</span>;
            }
            return <span key={index}>{part}</span>;
        });
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return '#52c41a'
        if (score >= 60) return '#faad14'
        return '#f5222d'
    }

    const getScoreLevel = (score: number) => {
        if (score >= 80) return { text: '高度匹配', color: 'success', icon: <TrophyOutlined /> }
        if (score >= 60) return { text: '中等匹配', color: 'warning', icon: <StarOutlined /> }
        return { text: '需要提升', color: 'error', icon: <BulbOutlined /> }
    }

    // 解析简历数据
    const parseResumeData = (resumeText: string | object) => {
        // 如果已经是对象，直接返回
        if (typeof resumeText === 'object' && resumeText !== null) {
            return resumeText;
        }

        // 如果是 JSON 字符串，解析它
        if (typeof resumeText === 'string') {
            try {
                return JSON.parse(resumeText);
            } catch {
                console.warn('无法解析简历数据，返回空结构');
                return {
                    work_experience: [],
                    project_experience: [],
                    skills_sections: []
                };
            }
        }

        return {
            work_experience: [],
            project_experience: [],
            skills_sections: []
        };
    };

    // 保存简历修改
    const handleSaveResume = async (updatedData: any) => {
        try {
            setEditedResumeData(updatedData);
            message.success('简历修改已保存');

            // 可选：调用后端 API 保存修改
            // await axios.post(`${baseUrl}/resume/save`, {
            //     resume_id: selectedResume,
            //     data: updatedData
            // });
        } catch (error) {
            message.error('保存失败，请重试');
            console.error('保存简历失败:', error);
        }
    };

    // 直接应用改写并生成最终简历
    const handleApplyAndGenerate = async () => {
        if (!selectedResume || !result) return;

        setGeneratingFinal(true);
        try {
            const response = await axios.post(`${baseUrl}/resume-generator/generate`, {
                resume_id: selectedResume,
                job_id: selectedJob,
                template: 'modern',
                refined_content: result.optimized_resume,
                save_to_library: true
            });

            setFinalResumeResult(response.data);
            message.success('最终简历生成成功！您可以在下方直接进行最后微调。');

            // 滚动到编辑器位置
            setTimeout(() => {
                const editorElement = document.getElementById('final-resume-editor');
                if (editorElement) {
                    editorElement.scrollIntoView({ behavior: 'smooth' });
                }
            }, 500);
        } catch (error) {
            message.error('生成最终简历失败，请重试');
        } finally {
            setGeneratingFinal(false);
        }
    };

    const handleSaveFinalChanges = async (updatedData: any) => {
        setFinalResumeResult({
            ...finalResumeResult,
            data: {
                ...finalResumeResult.data,
                content: updatedData
            }
        });
    };

    const handleDownloadFinal = async (format: string = 'pdf') => {
        if (!finalResumeResult?.data) return;

        try {
            message.loading({ content: '正在导出...', key: 'exporting' });
            const response = await axios.post(`${baseUrl}/resume-generator/export`, {
                resume_data: finalResumeResult.data,
                format: format
            });

            if (response.data.download_url) {
                window.open(`${baseUrl}${response.data.download_url}`, '_blank');
                message.success({ content: '导出成功！', key: 'exporting' });
            }
        } catch {
            message.error({ content: '导出失败', key: 'exporting' });
        }
    };

    const selectedResumeName = resumes.find(r => r.id === selectedResume)?.filename
    const selectedJobInfo = jobs.find(j => j.id === selectedJob)

    return (
        <div className="match-analysis-container">
            {/* 页面头部 */}
            <div className="match-header">
                <div className="header-content">
                    <div className="header-icon">
                        <ThunderboltOutlined />
                    </div>
                    <div className="header-text">
                        <Title level={2} style={{ margin: 0, color: '#fff' }}>智能匹配分析</Title>
                        <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
                            AI 深度分析简历与职位的匹配程度，并为您提供“一键优化”级预览
                        </Text>
                    </div>
                </div>
            </div>

            {/* 步骤指引 */}
            <Card className="steps-card">
                <Steps
                    current={currentStep}
                    items={[
                        { title: '选择简历', icon: <FileTextOutlined /> },
                        { title: '选择职位', icon: <AimOutlined /> },
                        { title: '结果产出', icon: <RocketOutlined /> },
                    ]}
                />
            </Card>

            {/* 选择区域 */}
            <Row gutter={24} className="selection-row">
                <Col xs={24} md={11}>
                    <Card
                        className={`selection-card ${selectedResume ? 'selected' : ''}`}
                        hoverable
                    >
                        <div className="card-icon resume-icon">
                            <FileTextOutlined />
                        </div>
                        <Title level={4}>选择简历</Title>
                        <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
                            选择一份已解析的简历进行匹配
                        </Text>
                        <Select
                            style={{ width: '100%' }}
                            placeholder="请选择简历"
                            value={selectedResume || undefined}
                            onChange={setSelectedResume}
                            size="large"
                        >
                            {resumes.map(r => (
                                <Option key={r.id} value={r.id}>
                                    <FileTextOutlined style={{ marginRight: 8 }} />
                                    {r.filename}
                                </Option>
                            ))}
                        </Select>
                        {resumes.length === 0 && (
                            <Empty description="暂无已解析的简历" style={{ marginTop: 16 }} />
                        )}
                    </Card>
                </Col>

                <Col xs={24} md={2} className="arrow-col">
                    <div className="arrow-icon">
                        <ArrowRightOutlined />
                    </div>
                </Col>

                <Col xs={24} md={11}>
                    <Card
                        className={`selection-card ${selectedJob ? 'selected' : ''}`}
                        hoverable
                    >
                        <div className="card-icon job-icon">
                            <AimOutlined />
                        </div>
                        <Title level={4}>选择目标职位</Title>
                        <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
                            选择一个目标职位进行对比
                        </Text>
                        <Select
                            style={{ width: '100%' }}
                            placeholder="请选择职位"
                            value={selectedJob || undefined}
                            onChange={setSelectedJob}
                            size="large"
                        >
                            {jobs.map(j => (
                                <Option key={j.id} value={j.id}>
                                    <AimOutlined style={{ marginRight: 8 }} />
                                    {j.title} - {j.company}
                                </Option>
                            ))}
                        </Select>
                        {jobs.length === 0 && (
                            <Empty description="暂无已解析的职位" style={{ marginTop: 16 }} />
                        )}
                    </Card>
                </Col>
            </Row>

            {/* 分析按钮 */}
            <div className="analyze-button-wrapper">
                <Button
                    type="primary"
                    size="large"
                    icon={<ThunderboltOutlined />}
                    loading={analyzing}
                    onClick={handleAnalyze}
                    disabled={!selectedResume || !selectedJob}
                    className="analyze-button"
                >
                    {analyzing ? 'AI 正在深度比对并生成优化模版...' : '开始匹配分析 & 智能优化'}
                </Button>
                {selectedResume && selectedJob && (
                    <div className="selection-summary">
                        <Text type="secondary">
                            即将针对 <Text strong>{selectedResumeName}</Text> 对标 <Text strong>{selectedJobInfo?.title}</Text> 产出建议
                        </Text>
                    </div>
                )}
            </div>

            {/* 分析结果 */}
            {result && (
                <div className="result-section">
                    {/* 优化版简历已保存提示 */}
                    {result.saved_resume_id && (
                        <Alert
                            message={
                                <Space>
                                    <CheckCircleOutlined />
                                    <span>优化版简历已自动保存到简历库</span>
                                </Space>
                            }
                            description={
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Text>
                                        📄 <Text strong>{result.saved_resume_name}</Text>
                                    </Text>
                                    <Text type="secondary">
                                        针对【{result.job_company} - {result.job_title}】岗位深度优化
                                    </Text>
                                    <Button
                                        type="primary"
                                        icon={<RocketOutlined />}
                                        onClick={() => navigate(`/resume/${result.saved_resume_id}`)}
                                        style={{ marginTop: 8 }}
                                    >
                                        去简历库查看并操作
                                    </Button>
                                </Space>
                            }
                            type="success"
                            showIcon={false}
                            style={{
                                marginBottom: 24,
                                borderRadius: 12,
                                background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                                border: '1px solid #b7eb8f'
                            }}
                        />
                    )}

                    <Tabs
                        defaultActiveKey="report"
                        className="match-tabs"
                        items={[
                            {
                                key: 'report',
                                label: <Space><DeploymentUnitOutlined /> 分析报告</Space>,
                                children: (
                                    <div className="report-tab">
                                        {/* 评分与摘要区 */}
                                        <div className="diagnostic-header-grid">
                                            <Card className="score-mini-card">
                                                <div className="score-main-container">
                                                    <Progress
                                                        type="dashboard"
                                                        percent={result.match_score}
                                                        strokeColor={getScoreColor(result.match_score)}
                                                        size={160}
                                                        strokeWidth={10}
                                                        format={percent => (
                                                            <div className="dynamic-score">
                                                                <span className="num">{percent}</span>
                                                                <span className="unit">契合度</span>
                                                            </div>
                                                        )}
                                                    />
                                                    <div className="score-badge-container">
                                                        <Tag
                                                            color={getScoreLevel(result.match_score).color}
                                                            icon={getScoreLevel(result.match_score).icon}
                                                            className="premium-status-tag"
                                                        >
                                                            {getScoreLevel(result.match_score).text}
                                                        </Tag>
                                                    </div>
                                                </div>
                                            </Card>

                                            <Card className="executive-summary-card">
                                                <div className="summary-title">
                                                    <BulbOutlined className="title-icon" /> AI 核心诊断报告
                                                </div>
                                                <div className="summary-content-box" style={{ display: 'flex', gap: 20 }}>
                                                    <div style={{ flex: 1.5 }}>
                                                        <Paragraph className="summary-p">
                                                            {result.analysis.experience_match || '正在进行全维度神经网络比对...'}
                                                        </Paragraph>
                                                        <div className="summary-footer-stats">
                                                            <Space split={<Divider type="vertical" />}>
                                                                <Text type="secondary">行业匹配: <Text strong>高</Text></Text>
                                                                <Text type="secondary">岗位经验: <Text strong>{result.match_score > 70 ? '基本契合' : '有待补偿'}</Text></Text>
                                                                <Text type="secondary">技能栈: <Text strong>{result.analysis.skill_match.matched.length} 项匹配</Text></Text>
                                                            </Space>
                                                        </div>
                                                    </div>
                                                    <div style={{ flex: 1, height: 200, marginTop: -20 }}>
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                                                                { subject: '核心技能', A: result.analysis.skill_match.matched.length, B: 10, fullMark: 10 },
                                                                { subject: '项目契合', A: result.match_score / 10, B: 10, fullMark: 10 },
                                                                { subject: '履历深度', A: result.match_score / 12, B: 10, fullMark: 10 },
                                                                { subject: '职位意向', A: 9, B: 10, fullMark: 10 },
                                                                { subject: '通用素质', A: 8, B: 10, fullMark: 10 },
                                                            ]}>
                                                                <PolarGrid stroke="#e2e8f0" />
                                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                                                                <Radar
                                                                    name="当前匹配"
                                                                    dataKey="A"
                                                                    stroke="var(--apple-blue)"
                                                                    fill="var(--apple-blue)"
                                                                    fillOpacity={0.5}
                                                                />
                                                            </RadarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>
                                            </Card>
                                        </div>

                                        {/* 技能矩阵 */}
                                        <Title level={4} className="module-title">
                                            <DeploymentUnitOutlined /> 技能比对矩阵 (Skill Matrix)
                                        </Title>
                                        <div className="skill-matrix-grid">
                                            <Card title={<><CheckCircleOutlined style={{ color: '#52c41a' }} /> 优势项 (已具备)</>} className="matrix-card matched">
                                                <div className="matrix-content">
                                                    {result.analysis.skill_match.matched?.map((s: string, i: number) => (
                                                        <Tag key={i} className="skill-item-tag matched">{s}</Tag>
                                                    ))}
                                                </div>
                                            </Card>
                                            <Card title={<><CloseCircleOutlined style={{ color: '#ff4d4f' }} /> 待提升 (建议针对性扩充)</>} className="matrix-card missing">
                                                <div className="matrix-content">
                                                    {result.analysis.skill_match.missing?.map((s: string, i: number) => (
                                                        <Tag key={i} className="skill-item-tag missing">{s}</Tag>
                                                    ))}
                                                </div>
                                            </Card>
                                        </div>

                                        {/* 深度技能通关图谱 */}
                                        {result.skill_mastery_blueprints && result.skill_mastery_blueprints.length > 0 && (
                                            <>
                                                <Title level={4} className="module-title" style={{ marginTop: 40 }}>
                                                    <DeploymentUnitOutlined /> 深度技能通关图谱 (Skill Mastery Blueprint)
                                                </Title>
                                                <div className="blueprint-container">
                                                    {result.skill_mastery_blueprints.map((item: any, idx: number) => (
                                                        <Card key={idx} className="blueprint-card" bordered={false}>
                                                            <div className="blueprint-header">
                                                                <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                                                                    <Space>
                                                                        <div className="blueprint-dot"></div>
                                                                        <Text strong style={{ fontSize: 18 }}>{item.skill}</Text>
                                                                        <Tag color={item.priority === '高' ? 'red' : 'orange'}>{item.priority}优先级</Tag>
                                                                    </Space>
                                                                    <Text type="secondary" italic>{item.gap_description}</Text>
                                                                </Space>
                                                            </div>

                                                            <Row gutter={[24, 24]}>
                                                                <Col span={16}>
                                                                    <div className="roadmap-grid">
                                                                        {/* 阶段 1：原理 */}
                                                                        <div className="roadmap-phase phase-1">
                                                                            <Title level={5}><BulbOutlined /> {item.learning_path.stage1_theory.title}</Title>
                                                                            <ul className="points-list">
                                                                                {item.learning_path.stage1_theory.points.map((p: string, pi: number) => (
                                                                                    <li key={pi}>{p}</li>
                                                                                ))}
                                                                            </ul>
                                                                            <div className="resource-box">
                                                                                <Text strong>推荐资源：</Text>
                                                                                {item.learning_path.stage1_theory.resources.map((r: string, ri: number) => (
                                                                                    <Tag key={ri} className="res-tag">{r}</Tag>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        {/* 阶段 2：实战 */}
                                                                        <div className="roadmap-phase phase-2">
                                                                            <Title level={5}><ThunderboltOutlined /> {item.learning_path.stage2_practice.title}</Title>
                                                                            <Paragraph className="task-desc">{item.learning_path.stage2_practice.task}</Paragraph>
                                                                            <div className="stack-box">
                                                                                {item.learning_path.stage2_practice.tech_stack.map((t: string, ti: number) => (
                                                                                    <Tag key={ti} color="blue" bordered={false}>{t}</Tag>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        {/* 阶段 3：项目 */}
                                                                        <div className="roadmap-phase phase-3">
                                                                            <Title level={5}><RocketOutlined /> {item.learning_path.stage3_project.title}</Title>
                                                                            <Text strong className="proj-name">项目：{item.learning_path.stage3_project.project_name}</Text>
                                                                            <Paragraph className="impl-desc">{item.learning_path.stage3_project.implementation}</Paragraph>
                                                                            <div className="resume-tip-box">
                                                                                <Text strong><HighlightOutlined /> 简历话术卡：</Text>
                                                                                <Paragraph className="bullet-text">{item.learning_path.stage3_project.resume_bullet}</Paragraph>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </Col>
                                                                <Col span={8}>
                                                                    <div className="interview-prep-section">
                                                                        <div className="prep-header">
                                                                            <Title level={5}><StarOutlined /> 面试前哨站</Title>
                                                                        </div>
                                                                        <div className="prep-body">
                                                                            <div className="prep-item">
                                                                                <Text strong className="q-label">夺命追问：</Text>
                                                                                <Paragraph className="q-text">{item.interview_prep.critical_question}</Paragraph>
                                                                            </div>
                                                                            <div className="prep-item">
                                                                                <Text strong className="q-label">对策锦囊：</Text>
                                                                                <Paragraph className="a-text">{item.interview_prep.answer_strategy}</Paragraph>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </Col>
                                                            </Row>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        {/* 旧版技能树保留备份（仅在有数据时显示） */}
                                        {result.learning_path && result.learning_path.length > 0 && !result.skill_mastery_blueprints && (
                                            <>
                                                <Title level={4} className="module-title" style={{ marginTop: 40 }}>
                                                    <DeploymentUnitOutlined /> 技能通关路径 (Learning Skill Tree)
                                                </Title>
                                                <div className="learning-tree-container">
                                                    {result.learning_path.map((item: any, idx: number) => (
                                                        <Card key={idx} className="learning-path-card" bordered={false}>
                                                            <div className="learning-path-header">
                                                                <Space>
                                                                    <div className="skill-dot"></div>
                                                                    <Text strong style={{ fontSize: 16 }}>{item.skill}</Text>
                                                                    <Tag color="blue">{item.level}</Tag>
                                                                </Space>
                                                            </div>
                                                            <div className="learning-steps-wrapper">
                                                                <Steps
                                                                    direction="vertical"
                                                                    size="small"
                                                                    current={-1}
                                                                    items={item.steps.map((step: any, sidx: number) => ({
                                                                        title: <Text strong>{step.title}</Text>,
                                                                        description: step.content,
                                                                        status: 'wait',
                                                                        icon: <div className="step-node-icon">{sidx + 1}</div>
                                                                    }))}
                                                                />
                                                            </div>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        {/* 深度改写处方 */}
                                        <Title level={4} className="module-title" style={{ marginTop: 40 }}>
                                            <RocketOutlined /> 岗定改写“处方” (AI Refactor Suggestions)
                                        </Title>
                                        <div className="suggestion-prescription-list">
                                            {result.suggestions.map((s: any, i: number) => (
                                                <Card key={i} className="prescription-item-card" bordered={false}>
                                                    <div className="prescription-inner">
                                                        <div className="prescription-left-bar">
                                                            <div className="category-label">{s.category}</div>
                                                            <div className="action-icon">
                                                                {i % 2 === 0 ? <HighlightOutlined /> : <BulbOutlined />}
                                                            </div>
                                                        </div>
                                                        <div className="prescription-right-content">
                                                            <Title level={5} className="item-title">{s.content}</Title>
                                                            {s.template && (
                                                                <div className="ai-refactor-box">
                                                                    <div className="box-header">
                                                                        <Space>
                                                                            <ThunderboltOutlined />
                                                                            <span>AI 推荐改写模版</span>
                                                                        </Space>
                                                                        <Button type="link" size="small" onClick={() => {
                                                                            navigator.clipboard.writeText(s.template || '');
                                                                            message.success('已复制到剪贴板');
                                                                        }}>复制</Button>
                                                                    </div>
                                                                    <Paragraph className="refactor-code-style">
                                                                        {renderTaggedText(s.template)}
                                                                    </Paragraph>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: 'optimize',
                                label: <Space><HighlightOutlined /> 优化简历预览</Space>,
                                children: (
                                    <div className="optimize-tab">
                                        <Alert
                                            message="匹配建议说明"
                                            description={
                                                <span>
                                                    图中 <span className="legend-box add">绿色高亮</span> 代表针对该职位新增的关键词，
                                                    <span className="legend-box mod">蓝色下划线</span> 代表为您进行的描述性润色。
                                                </span>
                                            }
                                            type="info"
                                            showIcon
                                            style={{ marginBottom: 20 }}
                                        />

                                        <Card
                                            className="optimized-preview-card"
                                            title="改写方案预览"
                                            extra={
                                                <Space>
                                                    {isEditing ? (
                                                        <>
                                                            <Button size="small" onClick={() => {
                                                                setIsEditing(false);
                                                                setEditingResume(result.optimized_resume || '');
                                                            }}>取消</Button>
                                                            <Button type="primary" size="small" onClick={() => {
                                                                setIsEditing(false);
                                                                setResult({ ...result, optimized_resume: editingResume });
                                                                message.success('本地修改已保存');
                                                            }}>保存</Button>
                                                        </>
                                                    ) : (
                                                        <Button icon={<EditOutlined />} size="small" onClick={() => setIsEditing(true)}>编辑文本</Button>
                                                    )}
                                                </Space>
                                            }
                                        >
                                            <div className="optimized-content-scroll">
                                                {isEditing ? (
                                                    <Input.TextArea
                                                        value={editingResume}
                                                        onChange={(e) => setEditingResume(e.target.value)}
                                                        rows={25}
                                                        className="resume-edit-textarea"
                                                        style={{
                                                            fontFamily: 'monospace',
                                                            fontSize: '13px',
                                                            backgroundColor: '#fafafa',
                                                            borderRadius: '8px'
                                                        }}
                                                    />
                                                ) : (
                                                    <pre className="resume-pre">
                                                        {renderTaggedText(result.optimized_resume || '未生成完整简历，请参考下方优化总结。')}
                                                    </pre>
                                                )}
                                            </div>
                                        </Card>

                                        <Card
                                            title={<><StarOutlined style={{ color: '#faad14' }} /> 针对性个人优势改写 (针对该职位)</>}
                                            style={{ marginTop: 24 }}
                                        >
                                            <div className="summary-box">
                                                {renderTaggedText(result.optimized_summary)}
                                            </div>
                                            <div style={{ textAlign: 'right', marginTop: 16 }}>
                                                <Button
                                                    type="primary"
                                                    size="large"
                                                    icon={<ThunderboltOutlined />}
                                                    onClick={handleApplyAndGenerate}
                                                    loading={generatingFinal}
                                                >
                                                    {generatingFinal ? '正在精排最终产物...' : '应用此方案并生成最终简历'}
                                                </Button>
                                            </div>
                                        </Card>
                                    </div>
                                )
                            }
                        ]}
                    />

                    {/* 最终结果编辑区 */}
                    {finalResumeResult && (
                        <div id="final-resume-editor" className="final-editor-section" style={{ marginTop: 40 }}>
                            <Divider>
                                <Space>
                                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                    <span style={{ fontSize: 18, fontWeight: 600 }}>最终版本微调与导出</span>
                                </Space>
                            </Divider>

                            <Alert
                                message="最后微调"
                                description="这是根据您的要求生成的最终结构化简历。您可以直接在下面的表单中修改任何不满意的地方，完成后点击右侧导出。"
                                type="success"
                                showIcon
                                style={{ marginBottom: 24, borderRadius: 12 }}
                                action={
                                    <Space direction="vertical">
                                        <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleDownloadFinal('pdf')}>
                                            导出 PDF
                                        </Button>
                                        <Button icon={<FileWordOutlined />} onClick={() => handleDownloadFinal('docx')}>
                                            导出 Word
                                        </Button>
                                    </Space>
                                }
                            />

                            <Card className="final-editor-card">
                                <EditableResumePreview
                                    resumeData={finalResumeResult.data.content}
                                    onSave={handleSaveFinalChanges}
                                />
                            </Card>
                        </div>
                    )}
                </div>
            )}

        </div>
    )
}

export default MatchAnalysis
