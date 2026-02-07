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
}

const MatchAnalysis: React.FC = () => {
    const [resumes, setResumes] = useState<Resume[]>([])
    const [jobs, setJobs] = useState<Job[]>([])
    const [selectedResume, setSelectedResume] = useState<string>('')
    const [selectedJob, setSelectedJob] = useState<string>('')
    const [analyzing, setAnalyzing] = useState(false)
    const [result, setResult] = useState<MatchResult | null>(null)
    const [currentStep, setCurrentStep] = useState(0)
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)

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
            message.success('深度分析完成，已为您生成优化方案！')
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
                    <Tabs
                        defaultActiveKey="report"
                        className="match-tabs"
                        items={[
                            {
                                key: 'report',
                                label: <Space><DeploymentUnitOutlined /> 分析报告</Space>,
                                children: (
                                    <div className="report-tab">
                                        {/* 评分卡片 */}
                                        <Card className="score-card">
                                            <Row align="middle" gutter={48}>
                                                <Col xs={24} md={8} className="score-col">
                                                    <Progress
                                                        type="dashboard"
                                                        percent={result.match_score}
                                                        strokeColor={getScoreColor(result.match_score)}
                                                        size={180}
                                                        format={percent => (
                                                            <div className="score-format">
                                                                <span className="score-number">{percent}</span>
                                                                <span className="score-unit">分</span>
                                                            </div>
                                                        )}
                                                    />
                                                    <Tag
                                                        color={getScoreLevel(result.match_score).color}
                                                        icon={getScoreLevel(result.match_score).icon}
                                                        className="score-tag"
                                                    >
                                                        {getScoreLevel(result.match_score).text}
                                                    </Tag>
                                                </Col>
                                                <Col xs={24} md={16}>
                                                    <Title level={4}>匹配度分析概览</Title>
                                                    <Row gutter={[16, 16]}>
                                                        <Col span={24}>
                                                            <div className="overview-item">
                                                                <Text type="secondary">核心分析：</Text>
                                                                <Paragraph style={{ marginTop: 8 }}>
                                                                    {result.analysis.experience_match || '暂无分析'}
                                                                </Paragraph>
                                                            </div>
                                                        </Col>
                                                    </Row>
                                                </Col>
                                            </Row>
                                        </Card>

                                        {/* 技能匹配 */}
                                        <Card
                                            title={<><BulbOutlined style={{ color: '#1890ff', marginRight: 8 }} />技能匹配分析</>}
                                            style={{ marginTop: 24 }}
                                            className="skill-card"
                                        >
                                            <Row gutter={48}>
                                                <Col xs={24} md={12}>
                                                    <div className="skill-section">
                                                        <div className="skill-header matched">
                                                            <CheckCircleOutlined /> 已匹配技能
                                                        </div>
                                                        <Space wrap style={{ marginTop: 12 }}>
                                                            {result.analysis.skill_match.matched?.map((s, i) => (
                                                                <Tag key={i} color="green" className="skill-tag">{s}</Tag>
                                                            ))}
                                                        </Space>
                                                    </div>
                                                </Col>
                                                <Col xs={24} md={12}>
                                                    <div className="skill-section">
                                                        <div className="skill-header missing">
                                                            <CloseCircleOutlined /> 缺失技能 (建议补充)
                                                        </div>
                                                        <Space wrap style={{ marginTop: 12 }}>
                                                            {result.analysis.skill_match.missing?.map((s, i) => (
                                                                <Tag key={i} color="red" className="skill-tag">{s}</Tag>
                                                            ))}
                                                        </Space>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </Card>

                                        {/* 优化建议列表 */}
                                        <Card
                                            title={<><RocketOutlined style={{ color: '#722ed1', marginRight: 8 }} />可落地的改写建议</>}
                                            style={{ marginTop: 24 }}
                                            className="suggestion-card"
                                        >
                                            <List
                                                dataSource={result.suggestions}
                                                renderItem={(s, i) => (
                                                    <div className="suggestion-item-box" key={i}>
                                                        <div className="suggestion-head">
                                                            <Tag color="purple">{s.category}</Tag>
                                                            <Text strong>{s.content}</Text>
                                                        </div>
                                                        {s.template && (
                                                            <div className="template-box">
                                                                <div className="template-label">推荐改写模版：</div>
                                                                <Paragraph className="template-content" copyable>
                                                                    {s.template}
                                                                </Paragraph>
                                                            </div>
                                                        )}
                                                        <Divider />
                                                    </div>
                                                )}
                                            />
                                        </Card>
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
                        initialSuggestions={{
                            suggestions: result?.suggestions,
                            optimized_summary: result?.optimized_summary
                        }}
                        onClose={() => setIsGeneratorOpen(false)}
                    />
                </div>
            </Modal>
        </div>
    )
}

export default MatchAnalysis
