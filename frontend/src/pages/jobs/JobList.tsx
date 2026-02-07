import { useState, useEffect } from 'react'
import {
    Button, Card, Space, Tag, Modal, Typography, message,
    Descriptions, Divider, Badge, Empty, Row, Col, Tooltip, Spin
} from 'antd'
import {
    PlusOutlined, EyeOutlined, DeleteOutlined, SyncOutlined,
    AimOutlined, EnvironmentOutlined, DollarOutlined, CalendarOutlined,
    SearchOutlined, ThunderboltOutlined, FileTextOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { Input } from 'antd'
import axios from 'axios'
import './JobList.css'

const { Title, Text, Paragraph } = Typography

interface Job {
    id: string
    title: string
    company: string
    status: string
    description: string
    created_at: string
    parsed_data?: any
}

const JobList: React.FC<{ showHeader?: boolean }> = ({ showHeader = true }) => {
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(false)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [currentJob, setCurrentJob] = useState<Job | null>(null)
    const [searchText, setSearchText] = useState('')

    const navigate = useNavigate()
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

    const fetchJobs = async () => {
        setLoading(true)
        try {
            const response = await axios.get(`${baseUrl}/jobs/`)
            setJobs(response.data)
        } catch {
            message.error('获取职位列表失败')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchJobs()
    }, [])

    const handleViewDetail = async (id: string) => {
        try {
            const response = await axios.get(`${baseUrl}/jobs/${id}`)
            setCurrentJob(response.data)
            setIsDetailOpen(true)
        } catch {
            message.error('获取详情失败')
        }
    }

    const handleDelete = async (id: string) => {
        Modal.confirm({
            title: '确认删除',
            content: '删除后将无法找回该职位的相关解析数据，是否继续？',
            okText: '确认删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await axios.delete(`${baseUrl}/jobs/${id}`)
                    message.success('职位已移出库')
                    fetchJobs()
                } catch {
                    message.error('删除失败')
                }
            }
        })
    }

    const filteredJobs = jobs.filter(job =>
        job.title.toLowerCase().includes(searchText.toLowerCase()) ||
        job.company.toLowerCase().includes(searchText.toLowerCase())
    )

    const renderJobCard = (job: Job) => (
        <Col xs={24} sm={12} xl={8} key={job.id}>
            <Card
                className="job-item-card"
                hoverable
                actions={[
                    <Tooltip title="查看解析详情"><EyeOutlined key="view" onClick={() => handleViewDetail(job.id)} /></Tooltip>,
                    <Tooltip title="与简历匹配"><ThunderboltOutlined key="match" style={{ color: '#1890ff' }} onClick={() => message.info('请前往匹配分析页面选择此职位')} /></Tooltip>,
                    <Tooltip title="删除职位"><DeleteOutlined key="delete" style={{ color: '#ff4d4f' }} onClick={() => handleDelete(job.id)} /></Tooltip>
                ]}
            >
                <div className="job-card-header">
                    <div className="company-logo-type">
                        {job.company.substring(0, 1)}
                    </div>
                    <div className="job-basic">
                        <Title level={5} className="job-title-text" ellipsis>{job.title}</Title>
                        <Text type="secondary" className="company-text">{job.company}</Text>
                    </div>
                    <Badge status={job.status === 'parsed' ? 'success' : 'processing'} text={job.status === 'parsed' ? '已收录' : '处理中'} />
                </div>

                <div className="job-card-content">
                    {job.parsed_data ? (
                        <>
                            <div className="job-tags">
                                {job.parsed_data.location && <Tag icon={<EnvironmentOutlined />}>{job.parsed_data.location}</Tag>}
                                {job.parsed_data.salary_range && <Tag color="gold" icon={<DollarOutlined />}>{job.parsed_data.salary_range}</Tag>}
                            </div>
                            <div className="skill-preview">
                                {job.parsed_data.requirements?.skills?.slice(0, 3).map((s: string, i: number) => (
                                    <Tag key={i} color="blue" bordered={false}>{s}</Tag>
                                ))}
                                {job.parsed_data.requirements?.skills?.length > 3 && <Text type="secondary">...</Text>}
                            </div>
                        </>
                    ) : (
                        <div className="parsing-placeholder">
                            <SyncOutlined spin /> AI 正在解析职责与技能...
                        </div>
                    )}
                </div>
            </Card>
        </Col>
    )

    const renderParsedDetail = () => {
        if (!currentJob?.parsed_data) return <Empty description="AI 还未完成对此职位描述的深度学习" />
        const data = currentJob.parsed_data
        return (
            <div className="job-detail-modal">
                <Descriptions column={2} bordered size="middle" className="classic-desc">
                    <Descriptions.Item label="职位名称" span={2}><Text strong style={{ fontSize: 16 }}>{data.job_title || currentJob.title}</Text></Descriptions.Item>
                    <Descriptions.Item label={<Space><EnvironmentOutlined /> 工作地点</Space>}>{data.location || '未标注'}</Descriptions.Item>
                    <Descriptions.Item label={<Space><DollarOutlined /> 薪资范围</Space>}>{data.salary_range || '面议'}</Descriptions.Item>
                    <Descriptions.Item label={<Space><CalendarOutlined /> 经验要求</Space>}>{data.requirements?.experience_years || '不限'}</Descriptions.Item>
                    <Descriptions.Item label={<Space><FileTextOutlined /> 学历要求</Space>}>{data.requirements?.education || '不限'}</Descriptions.Item>
                </Descriptions>

                <Divider>关键技能要求 (Must Have)</Divider>
                <div className="skill-grid">
                    {data.requirements?.skills?.map((skill: string, i: number) => (
                        <Tag key={i} color="processing" className="large-skill-tag">{skill}</Tag>
                    ))}
                </div>

                <Divider>核心岗位职责</Divider>
                <ul className="responsibility-list">
                    {data.responsibilities?.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                    ))}
                </ul>

                {data.benefits && data.benefits.length > 0 && (
                    <>
                        <Divider>福利待遇</Divider>
                        <Space wrap>
                            {data.benefits.map((b: string, i: number) => (
                                <Tag key={i} color="orange">{b}</Tag>
                            ))}
                        </Space>
                    </>
                )}

                <Divider>原始职位描述</Divider>
                <div className="raw-description">
                    <Paragraph>{currentJob.description}</Paragraph>
                </div>
            </div>
        )
    }

    return (
        <div className="job-list-page">
            {showHeader && (
                <div className="page-header-section">
                    <div className="header-info">
                        <Title level={2}><AimOutlined /> 职位 JD 管理库</Title>
                        <Text type="secondary">在这里管理您感兴趣的职位，AI 将自动分析其核心需求</Text>
                    </div>
                    <div className="header-actions">
                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="搜索职位或公司..."
                            onChange={e => setSearchText(e.target.value)}
                            style={{ width: 250, marginRight: 16 }}
                        />
                        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => navigate('/jobs/create')}>录入新职位</Button>
                    </div>
                </div>
            )}

            <div style={{ paddingBottom: 16, display: showHeader ? 'none' : 'flex', justifyContent: 'flex-end' }}>
                <Space>
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="检索职位..."
                        onChange={e => setSearchText(e.target.value)}
                        style={{ width: 200 }}
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/jobs/create')}>录入新职位</Button>
                </Space>
            </div>

            {loading ? (
                <div className="loading-state"><Spin size="large" tip="正在同步并解析职位..." /></div>
            ) : filteredJobs.length > 0 ? (
                <Row gutter={[20, 20]} className="jobs-grid">
                    {filteredJobs.map(renderJobCard)}
                </Row>
            ) : (
                <Card className="empty-state">
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={searchText ? "未找到相关职位" : "您的职位库还是空的"}
                    >
                        {!searchText && <Button type="primary" onClick={() => navigate('/jobs/create')}>立刻添加第一个职位</Button>}
                    </Empty>
                </Card>
            )}

            <Modal title={null} open={isDetailOpen} onCancel={() => setIsDetailOpen(false)} footer={null} width={850} className="job-detail-modal-root">
                <div className="modal-custom-header">
                    <Badge status="success" />
                    <Title level={3} style={{ margin: '0 0 4px 0' }}>{currentJob?.title}</Title>
                    <Text type="secondary">{currentJob?.company}</Text>
                </div>
                {renderParsedDetail()}
            </Modal>
        </div>
    )
}

export default JobList
