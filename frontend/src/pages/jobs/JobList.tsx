import { useState, useEffect } from 'react'
import {
    Button, Card, Space, Tag, Modal, Typography, message,
    Divider, Badge, Empty, Row, Col, Tooltip, Spin, Input, Tabs
} from 'antd'
import {
    PlusOutlined, EyeOutlined, DeleteOutlined, SyncOutlined,
    AimOutlined, EnvironmentOutlined, DollarOutlined, CalendarOutlined,
    SearchOutlined, ThunderboltOutlined, FileTextOutlined,
    EditOutlined, GlobalOutlined, ScissorOutlined, RocketOutlined,
    ArrowRightOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './JobList.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface Job {
    id: string
    title: string
    company: string
    status: string
    description: string
    created_at: string
    parsed_data?: any
}

const JobList: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(false)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [currentJob, setCurrentJob] = useState<Job | null>(null)
    const [searchText, setSearchText] = useState('')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    const navigate = useNavigate()
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

    const fetchJobs = async () => {
        setLoading(true)
        try {
            const response = await axios.get(`${baseUrl}/jobs/`)
            const data = Array.isArray(response.data) ? response.data : response.data?.data || []
            setJobs(data)
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
            title: '确认删除此职位？',
            content: '删除后相关的分析数据将不可找回。',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            centered: true,
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

    return (
        <div className="job-list-container">
            <div className="page-header">
                <div className="header-left">
                    <Title level={1}>职位管理库</Title>
                    <Text type="secondary" style={{ fontSize: 17 }}>
                        在这里集纳您感兴趣的职位 JD，AI 会自动为您分析岗位胜任力模型。
                    </Text>
                </div>
                <div className="header-right">
                    <Space size={16}>
                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="搜索职位或公司..."
                            variant="filled"
                            onChange={e => setSearchText(e.target.value)}
                            style={{ width: 260, borderRadius: 12, height: 48 }}
                        />
                        <Button
                            type="primary"
                            size="large"
                            icon={<PlusOutlined />}
                            onClick={() => setIsCreateModalOpen(true)}
                            style={{ height: 48, borderRadius: 24, padding: '0 24px' }}
                        >
                            录入新职位
                        </Button>
                    </Space>
                </div>
            </div>

            {loading ? (
                <div className="loading-state"><Spin size="large" tip="正在同步职位清单..." /></div>
            ) : filteredJobs.length > 0 ? (
                <Row gutter={[24, 24]}>
                    {filteredJobs.map(job => (
                        <Col xs={24} md={12} xl={8} key={job.id}>
                            <Card className="apple-job-card shadow-soft" hoverable>
                                <div className="job-card-top">
                                    <div className="company-logo-placeholder">
                                        {job.company.substring(0, 1).toUpperCase()}
                                    </div>
                                    <div className="job-meta">
                                        <Title level={4} style={{ margin: 0 }}>{job.title}</Title>
                                        <Text type="secondary" style={{ fontSize: 15 }}>{job.company}</Text>
                                    </div>
                                    <Badge status={job.status === 'parsed' ? 'success' : 'processing'} />
                                </div>

                                <div className="job-card-middle">
                                    {job.parsed_data ? (
                                        <Space wrap size={4}>
                                            <Tag bordered={false} className="apple-tag-pill">{job.parsed_data.location || '远程'}</Tag>
                                            <Tag bordered={false} className="apple-tag-pill green">{job.parsed_data.salary_range || '面议'}</Tag>
                                            {job.parsed_data.requirements?.skills?.slice(0, 2).map((s: string, i: number) => (
                                                <Tag key={i} bordered={false} className="apple-tag-pill">{s}</Tag>
                                            ))}
                                        </Space>
                                    ) : (
                                        <Text type="secondary" style={{ fontSize: 13 }}>AI 正在解析职位细节...</Text>
                                    )}
                                </div>

                                <div className="job-card-bottom">
                                    <Button type="text" onClick={() => handleViewDetail(job.id)} className="apple-btn-text">
                                        查看详情
                                    </Button>
                                    <Space>
                                        <Tooltip title="前往分析">
                                            <Button type="text" icon={<ThunderboltOutlined />} onClick={() => navigate('/match')} />
                                        </Tooltip>
                                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(job.id)} />
                                    </Space>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            ) : (
                <Empty description="暂无职位记录" style={{ marginTop: 100 }}>
                    <Button type="primary" onClick={() => setIsCreateModalOpen(true)}>添加第一个职位</Button>
                </Empty>
            )}

            {/* 查看详情 Modal */}
            <Modal title={null} open={isDetailOpen} onCancel={() => setIsDetailOpen(false)} footer={null} width={750} centered>
                {currentJob && (
                    <div className="job-detail-overlay">
                        <div className="detail-header">
                            <Title level={2}>{currentJob.title}</Title>
                            <Text strong style={{ fontSize: 18, color: 'var(--apple-blue)' }}>{currentJob.company}</Text>
                        </div>
                        <Divider />
                        <div className="detail-sections">
                            <section>
                                <Title level={4}>任职核心要求</Title>
                                <Space wrap>
                                    {currentJob.parsed_data?.requirements?.skills?.map((s: string, i: number) => (
                                        <Tag key={i} className="apple-tag">{s}</Tag>
                                    ))}
                                </Space>
                            </section>
                            <section style={{ marginTop: 24 }}>
                                <Title level={4}>岗位职责</Title>
                                <ul className="apple-list">
                                    {currentJob.parsed_data?.responsibilities?.map((r: string, i: number) => (
                                        <li key={i}>{r}</li>
                                    ))}
                                </ul>
                            </section>
                        </div>
                        <div className="modal-actions">
                            <Button
                                type="primary"
                                size="large"
                                style={{ width: '100%', height: 48, borderRadius: 12, fontWeight: 600, fontSize: 16 }}
                                icon={<ThunderboltOutlined />}
                                onClick={() => {
                                    setIsDetailOpen(false);
                                    navigate('/match', { state: { jobId: currentJob.id } });
                                }}
                            >
                                开始与我的简历进行匹配
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* 录入职位 Modal (整合 JobInput) */}
            <Modal
                title="录入新职位"
                open={isCreateModalOpen}
                onCancel={() => setIsCreateModalOpen(false)}
                footer={null}
                width={700}
                centered
                destroyOnClose
            >
                <Tabs defaultActiveKey="1" className="apple-tabs">
                    <Tabs.TabPane tab={<span><EditOutlined /> 直接输入</span>} key="1">
                        <div style={{ padding: '20px 0' }}>
                            <Input placeholder="公司名称" size="large" style={{ marginBottom: 16 }} id="new_job_company" />
                            <Input placeholder="职位名称" size="large" style={{ marginBottom: 16 }} id="new_job_title" />
                            <TextArea placeholder="粘贴 JD (职位描述) 正文..." rows={10} style={{ borderRadius: 12 }} id="new_job_desc" />
                            <Button
                                type="primary"
                                block
                                size="large"
                                style={{ marginTop: 24, height: 48, borderRadius: 12 }}
                                onClick={async () => {
                                    const company = (document.getElementById('new_job_company') as HTMLInputElement).value
                                    const title = (document.getElementById('new_job_title') as HTMLInputElement).value
                                    const description = (document.getElementById('new_job_desc') as HTMLTextAreaElement).value
                                    if (!company || !title || !description) return message.warning('请填写完整信息')
                                    try {
                                        await axios.post(`${baseUrl}/jobs/`, { company, title, description })
                                        message.success('录入成功')
                                        setIsCreateModalOpen(false)
                                        fetchJobs()
                                    } catch { message.error('录入失败') }
                                }}
                            >
                                提交并智能解析
                            </Button>
                        </div>
                    </Tabs.TabPane>
                    <Tabs.TabPane tab={<span><GlobalOutlined /> 链接采集</span>} key="2">
                        <div style={{ padding: '20px 0', textAlign: 'center' }}>
                            <Text type="secondary">支持 Boss直聘、猎聘、拉勾等主流招聘渠道链接</Text>
                            <Input placeholder="https://..." size="large" style={{ marginTop: 16, marginBottom: 24 }} />
                            <Button type="primary" block size="large" style={{ height: 48, borderRadius: 12 }}>抓取数据</Button>
                        </div>
                    </Tabs.TabPane>
                </Tabs>
            </Modal>
        </div>
    )
}

export default JobList
