import React, { useState, useEffect } from 'react'
import {
    Card, Select, Button, Typography, message, Progress, Tag, Space, List, Alert, Row, Col, Steps, Empty, Divider, Tabs, Modal
} from 'antd'
import {
    ThunderboltOutlined, CheckCircleOutlined, CloseCircleOutlined, BulbOutlined, RocketOutlined,
    FileTextOutlined, AimOutlined, ArrowRightOutlined, TrophyOutlined, StarOutlined,
    HighlightOutlined, DeploymentUnitOutlined
} from '@ant-design/icons'
import axios from 'axios'
import ResumeGenerator from '../../components/ResumeGenerator'
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
    // 新增：自动保存的简历信息
    saved_resume_id?: string
    saved_resume_name?: string
    job_company?: string
    job_title?: string
}

import { useNavigate, useLocation } from 'react-router-dom'

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
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)
    const [editedResumeData, setEditedResumeData] = useState<any>(null)

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

    useEffect(() => {
        fetchData()

        // 如果是从职位列表跳转过来的，自动选中该职位
        if (location.state && location.state.jobId) {
            setSelectedJob(location.state.jobId)
        }
    }, [location])

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
            setResumes(resumeRes.data.filter((r: Resume) => r.status === 'parsed'))
            setJobs(jobRes.data.filter((j: Job) => j.status === 'parsed'))
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
                                                <div className="summary-content-box">
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
                                            </Card>
                                        </div>

                                        {/* 技能矩阵 */}
                                        <Title level={4} className="module-title">
                                            <DeploymentUnitOutlined /> 技能比对矩阵 (Skill Matrix)
                                        </Title>
                                        <div className="skill-matrix-grid">
                                            <Card title={<><CheckCircleOutlined style={{ color: '#52c41a' }} /> 优势项 (已具备)</>} className="matrix-card matched">
                                                <div className="matrix-content">
                                                    {result.analysis.skill_match.matched?.map((s, i) => (
                                                        <Tag key={i} className="skill-item-tag matched">{s}</Tag>
                                                    ))}
                                                </div>
                                            </Card>
                                            <Card title={<><CloseCircleOutlined style={{ color: '#ff4d4f' }} /> 待提升 (建议针对性扩充)</>} className="matrix-card missing">
                                                <div className="matrix-content">
                                                    {result.analysis.skill_match.missing?.map((s, i) => (
                                                        <Tag key={i} className="skill-item-tag missing">{s}</Tag>
                                                    ))}
                                                </div>
                                            </Card>
                                        </div>

                                        {/* 深度改写处方 */}
                                        <Title level={4} className="module-title" style={{ marginTop: 40 }}>
                                            <RocketOutlined /> 岗定改写“处方” (AI Refactor Suggestions)
                                        </Title>
                                        <div className="suggestion-prescription-list">
                                            {result.suggestions.map((s, i) => (
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

                                        <Card className="optimized-preview-card" title="改写方案预览">
                                            <div className="optimized-content-scroll">
                                                <pre className="resume-pre">
                                                    {renderTaggedText(result.optimized_resume || '未生成完整简历，请参考下方优化总结。')}
                                                </pre>
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
                                                    icon={<CheckCircleOutlined />}
                                                    onClick={() => setIsGeneratorOpen(true)}
                                                >
                                                    直接应用此改写
                                                </Button>
                                            </div>
                                        </Card>
                                    </div>
                                )
                            }
                        ]}
                    />
                </div>
            )}

            {/* 简历生成器 Modal */}
            <Modal
                title={<span><ThunderboltOutlined style={{ color: '#1890ff', marginRight: 8 }} /> 智能简历生产线</span>}
                open={isGeneratorOpen}
                onCancel={() => setIsGeneratorOpen(false)}
                footer={null}
                width={1000}
                style={{ top: 20 }}
                destroyOnClose
            >
                <div style={{ padding: '0 0 20px 0' }}>
                    <Alert
                        message="应用说明"
                        description="我们将为您选择的简历应用上述 AI 改写方案。您可以进一步选择模板样式和导出格式。"
                        type="success"
                        showIcon
                        style={{ marginBottom: 20 }}
                    />
                    <ResumeGenerator
                        resumeId={selectedResume}
                        jobId={selectedJob}
                        initialSuggestions={result?.suggestions}
                        onClose={() => setIsGeneratorOpen(false)}
                    />
                </div>
            </Modal>
        </div>
    )
}

export default MatchAnalysis
