import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Table, Button, Card, Upload, message, Space, Tag, Modal, Typography,
    Divider, Spin, Row, Col, Tabs
} from 'antd'
import {
    UploadOutlined, FileTextOutlined, DeleteOutlined, EyeOutlined,
    SyncOutlined, InboxOutlined, CheckCircleOutlined, InfoCircleOutlined,
    ThunderboltOutlined, MailOutlined, ArrowRightOutlined,
    PhoneOutlined, EnvironmentOutlined
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import axios from 'axios'
import './ResumeList.css'

const { Title, Text, Paragraph } = Typography
const { Dragger } = Upload

interface Resume {
    id: string
    filename: string
    status: string
    created_at: string
    parsed_data?: any
    is_optimized?: boolean
    target_job_title?: string
    target_job_company?: string
    optimization_notes?: string
}

const ResumeList: React.FC = () => {
    const navigate = useNavigate()
    const [resumes, setResumes] = useState<Resume[]>([])
    const [loading, setLoading] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [currentResume, setCurrentResume] = useState<Resume | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('original')

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

    const fetchResumes = async () => {
        setLoading(true)
        try {
            const response = await axios.get(`${baseUrl}/resumes/`)
            // 兼容性处理
            const data = Array.isArray(response.data) ? response.data : response.data?.data || []
            setResumes(data)
        } catch (error) {
            console.error('获取简历列表失败:', error)
            message.error('获取简历列表失败')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchResumes()
    }, [])


    const handleDelete = (id: string) => {
        Modal.confirm({
            title: '确认移除此简历？',
            icon: <InfoCircleOutlined style={{ color: '#FF3B30' }} />,
            content: '删除后将丢失该简历的所有解析数据，无法恢复。',
            okText: '移除',
            okType: 'danger',
            cancelText: '取消',
            centered: true,
            onOk: async () => {
                try {
                    await axios.delete(`${baseUrl}/resumes/${id}`)
                    message.success('简历已成功移出库')
                    fetchResumes()
                } catch (error) {
                    message.error('删除操作失败')
                }
            }
        })
    }

    const uploadProps: UploadProps = {
        name: 'file',
        action: `${baseUrl}/resumes/upload`,
        multiple: true,
        showUploadList: false,
        onChange(info) {
            if (info.file.status === 'uploading') {
                return
            }
            if (info.file.status === 'done') {
                message.success(`${info.file.name} 已入库并开始解析`)
                fetchResumes()
            } else if (info.file.status === 'error') {
                message.error(`${info.file.name} 上传失败`)
            }
        },
    }

    const columns = [
        {
            title: '简历名称',
            dataIndex: 'filename',
            key: 'filename',
            render: (text: string, record: Resume) => (
                <Space size={12}>
                    <div className={`apple-icon-circle ${record.is_optimized ? 'green' : 'blue'}`}>
                        {record.is_optimized ? <ThunderboltOutlined /> : <FileTextOutlined />}
                    </div>
                    <div>
                        <Space size={4}>
                            <Text strong style={{ fontSize: 15 }}>{text}</Text>
                        </Space>
                        {!record.is_optimized && (
                            <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>结构化解析完成</Text>
                            </div>
                        )}
                    </div>
                </Space>
            )
        },
        {
            title: activeTab === 'optimized' ? '针对岗位' : '分类',
            key: 'target_job',
            hidden: false,
            render: (_: any, record: Resume) => {
                if (record.is_optimized) {
                    return (
                        <Space direction="vertical" size={0}>
                            <Tag color="cyan" style={{ border: 'none', background: '#e6fffb', color: '#08979c', fontWeight: 600, padding: '2px 10px', borderRadius: 4 }}>
                                🎯 {record.target_job_title}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                                {record.target_job_company}
                            </Text>
                        </Space>
                    )
                }
                return <Tag color="blue" style={{ border: 'none' }}>原始简历</Tag>
            }
        },
        {
            title: '解析状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const config: any = {
                    parsed: { color: '#34C759', text: '就绪' },
                    parsing: { color: '#007AFF', text: '解析中' },
                    optimized: { color: '#52c41a', text: 'AI 优化' },
                    failed: { color: '#FF3B30', text: '异常' }
                }
                const { color, text } = config[status] || { color: '#8E8E93', text: '待处理' }
                return (
                    <Space>
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />
                        <Text style={{ color }}>{text}</Text>
                    </Space>
                )
            }
        },
        {
            title: '操作时间',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => (
                <Text type="secondary" style={{ fontSize: 13 }}>
                    {new Date(date).toLocaleDateString()}
                </Text>
            )
        },
        {
            title: '',
            key: 'action',
            align: 'right' as const,
            render: (_: any, record: Resume) => (
                <Space size={8}>
                    <Button
                        type="primary"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/resume/${record.id}`)}
                    >
                        查看 / 编辑
                    </Button>
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record.id)}
                        className="apple-icon-btn danger"
                    />
                </Space>
            )
        }
    ].filter(col => !col.hidden)

    return (
        <div className="resume-list-container">
            <div className="page-header">
                <div className="header-left">
                    <Title level={1}>我的简历库</Title>
                    <Text type="secondary" style={{ fontSize: 17 }}>
                        系统会自动对每一份简历进行深度解析，将其转化为可供 AI 匹配的数据结构。
                    </Text>
                </div>
                <div className="header-right">
                    <Upload {...uploadProps}>
                        <Button type="primary" size="large" icon={<UploadOutlined />} style={{ height: 48, borderRadius: 24, padding: '0 24px' }}>
                            导入简历
                        </Button>
                    </Upload>
                </div>
            </div>

            <Row gutter={[32, 32]}>
                <Col xs={24} lg={16}>
                    <Card className="apple-card shadow-soft" extra={<Button type="text" icon={<SyncOutlined />} onClick={fetchResumes} />}>
                        <Tabs
                            activeKey={activeTab}
                            onChange={setActiveTab}
                            className="resume-tabs"
                            items={[
                                {
                                    key: 'original',
                                    label: (
                                        <Space>
                                            <FileTextOutlined />
                                            我的原件
                                            <Tag bordered={false} style={{ marginLeft: 4 }}>
                                                {resumes.filter(r => !r.is_optimized).length}
                                            </Tag>
                                        </Space>
                                    ),
                                    children: (
                                        <Table
                                            columns={columns}
                                            dataSource={resumes.filter(r => !r.is_optimized)}
                                            rowKey="id"
                                            loading={loading}
                                            pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                            className="apple-table"
                                        />
                                    )
                                },
                                {
                                    key: 'optimized',
                                    label: (
                                        <Space>
                                            <ThunderboltOutlined />
                                            岗定定制
                                            <Tag bordered={false} style={{ marginLeft: 4 }}>
                                                {resumes.filter(r => r.is_optimized).length}
                                            </Tag>
                                        </Space>
                                    ),
                                    children: (
                                        <Table
                                            columns={columns}
                                            dataSource={resumes.filter(r => r.is_optimized)}
                                            rowKey="id"
                                            loading={loading}
                                            pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                            className="apple-table"
                                        />
                                    )
                                }
                            ]}
                        />
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card className="apple-card shadow-soft" title="快速上传">
                        <Dragger {...uploadProps} className="apple-dragger">
                            <p className="dragger-icon"><InboxOutlined /></p>
                            <p className="dragger-text">拖拽简历至此</p>
                            <p className="dragger-hint">支持 PDF, Word, TXT</p>
                        </Dragger>
                        <Divider style={{ margin: '24px 0' }} />
                        <div className="upload-notice">
                            <Title level={5}>💡 解析说明</Title>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                后台 AI 正在从您的简历中提取技能词云、项目履历和 STAR 成就。解析完成后，您可以立即进行智能匹配分析。
                            </Text>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Modal
                title={null}
                open={isPreviewOpen}
                onCancel={() => setIsPreviewOpen(false)}
                footer={null}
                width={800}
                centered
                destroyOnClose
            >
                {detailLoading ? (
                    <div className="modal-loading"><Spin size="large" tip="AI 正在读取结构化数据..." /></div>
                ) : (
                    <div className="resume-detail-overlay">
                        <div className="resume-detail-header">
                            <Title level={2}>{currentResume?.parsed_data?.basic_info?.name || '未命名简历'}</Title>
                            <Row gutter={[16, 8]}>
                                <Col><Space><PhoneOutlined /> {currentResume?.parsed_data?.basic_info?.phone || '--'}</Space></Col>
                                <Col><Space><MailOutlined /> {currentResume?.parsed_data?.basic_info?.email || '--'}</Space></Col>
                                <Col><Space><EnvironmentOutlined /> {currentResume?.parsed_data?.basic_info?.location || '--'}</Space></Col>
                            </Row>
                        </div>

                        <div className="resume-detail-content">
                            <section className="detail-section">
                                <Title level={4}>核心技能</Title>
                                <div className="skill-cloud">
                                    {currentResume?.parsed_data?.skills?.map((s: string, i: number) => (
                                        <Tag key={i} className="apple-tag">{s}</Tag>
                                    ))}
                                </div>
                            </section>

                            <section className="detail-section">
                                <Title level={4}>经历概览</Title>
                                {currentResume?.parsed_data?.work_experience?.map((work: any, i: number) => (
                                    <div className="exp-item" key={i}>
                                        <div className="exp-dot" />
                                        <div className="exp-header">
                                            <Text strong style={{ fontSize: 16 }}>{work.company}</Text>
                                            <Text type="secondary">{work.start_date} - {work.end_date}</Text>
                                        </div>
                                        <Paragraph style={{ marginBottom: 4, fontWeight: 600 }}>{work.position}</Paragraph>
                                        <Paragraph type="secondary" style={{ fontSize: 14 }}>{work.description}</Paragraph>
                                    </div>
                                ))}
                            </section>
                        </div>

                        {/* 操作面板：根据简历类型显示不同操作 */}
                        {currentResume?.is_optimized ? (
                            <div className="optimized-resume-actions">
                                {/* AI 优化版简历的信息卡片 */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                                    borderRadius: 12,
                                    padding: 16,
                                    marginBottom: 16,
                                    border: '1px solid #b7eb8f'
                                }}>
                                    <Space>
                                        <ThunderboltOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                                        <Text strong>AI 优化版简历</Text>
                                    </Space>
                                    <div style={{ marginTop: 8 }}>
                                        <Text type="secondary">
                                            🎯 目标岗位：{currentResume.target_job_company} - {currentResume.target_job_title}
                                        </Text>
                                    </div>
                                    {currentResume.optimization_notes && (
                                        <div style={{ marginTop: 4 }}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {currentResume.optimization_notes}
                                            </Text>
                                        </div>
                                    )}
                                </div>

                                {/* 操作按钮组 */}
                                <Row gutter={[12, 12]}>
                                    <Col span={12}>
                                        <Button
                                            type="primary"
                                            icon={<MailOutlined />}
                                            size="large"
                                            block
                                            style={{ height: 48, borderRadius: 8 }}
                                            onClick={() => message.info('邮件发送功能开发中')}
                                        >
                                            邮件发送
                                        </Button>
                                    </Col>
                                    <Col span={12}>
                                        <Button
                                            icon={<FileTextOutlined />}
                                            size="large"
                                            block
                                            style={{ height: 48, borderRadius: 8 }}
                                            onClick={() => message.info('PDF 导出功能开发中')}
                                        >
                                            导出 PDF
                                        </Button>
                                    </Col>
                                    <Col span={12}>
                                        <Button
                                            icon={<ThunderboltOutlined />}
                                            size="large"
                                            block
                                            style={{ height: 48, borderRadius: 8 }}
                                            onClick={() => message.info('生成长图功能开发中')}
                                        >
                                            生成长图
                                        </Button>
                                    </Col>
                                    <Col span={12}>
                                        <Button
                                            icon={<ArrowRightOutlined />}
                                            size="large"
                                            block
                                            style={{ height: 48, borderRadius: 8 }}
                                            onClick={() => message.info('生成链接功能开发中')}
                                        >
                                            生成链接
                                        </Button>
                                    </Col>
                                </Row>
                            </div>
                        ) : (
                            <div className="modal-actions">
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<ThunderboltOutlined />}
                                    style={{ width: '100%', height: 48, borderRadius: 12 }}
                                    onClick={() => {
                                        setIsPreviewOpen(false)
                                        window.location.href = `/match?resumeId=${currentResume?.id}`
                                    }}
                                >
                                    针对此简历进行职位匹配
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    )
}

export default ResumeList
