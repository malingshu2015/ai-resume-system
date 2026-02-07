import React, { useState, useEffect } from 'react'
import {
    Table, Button, Card, Upload, message, Space, Tag, Modal, Typography,
    Divider, Spin, Row, Col, Statistic, Tooltip
} from 'antd'
import {
    UploadOutlined, FileTextOutlined, DeleteOutlined, EyeOutlined,
    SyncOutlined, UserOutlined, BookOutlined,
    InboxOutlined, CheckCircleOutlined, InfoCircleOutlined,
    ThunderboltOutlined
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import axios from 'axios'
import ResumeGenerator from '../../components/ResumeGenerator'
import './ResumeList.css'

const { Title, Text, Paragraph } = Typography
const { Dragger } = Upload

interface Resume {
    id: string
    filename: string
    status: string
    created_at: string
    parsed_data?: any
}

const ResumeList: React.FC<{ showHeader?: boolean }> = ({ showHeader = true }) => {
    const [resumes, setResumes] = useState<Resume[]>([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [currentResume, setCurrentResume] = useState<Resume | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [showGenerator, setShowGenerator] = useState(false)

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

    const fetchResumes = async () => {
        setLoading(true)
        try {
            const response = await axios.get(`${baseUrl}/resumes/`)
            setResumes(response.data)
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

    const handlePreview = async (id: string) => {
        setDetailLoading(true)
        setIsPreviewOpen(true)
        try {
            const response = await axios.get(`${baseUrl}/resumes/${id}`)
            setCurrentResume(response.data)
        } catch (error) {
            message.error('获取简历详情失败')
            setIsPreviewOpen(false)
        } finally {
            setDetailLoading(false)
        }
    }

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: '确认删除简历？',
            icon: <InfoCircleOutlined style={{ color: '#ff4d4f' }} />,
            content: '删除后将丢失该简历的所有解析数据，无法恢复。',
            okText: '确认删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    console.log('正在删除简历:', id);
                    await axios.delete(`${baseUrl}/resumes/${id}`)
                    message.success('简历已成功移出库')
                    fetchResumes() // 刷新列表确保数据一致
                } catch (error) {
                    console.error('删除简历失败:', error)
                    message.error('删除操作失败，请检查网络或后端日志')
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
                setUploading(true)
                return
            }
            if (info.file.status === 'done') {
                setUploading(false)
                message.success(`${info.file.name} 已成功入库并启动智能解析`)
                fetchResumes()
            } else if (info.file.status === 'error') {
                setUploading(false)
                message.error(`${info.file.name} 上传解析失败`)
            }
        },
    }

    const columns = [
        {
            title: '文件信息',
            dataIndex: 'filename',
            key: 'filename',
            render: (text: string) => (
                <Space>
                    <div className="file-icon-box">
                        <FileTextOutlined />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: '15px' }}>{text}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>Resume File</Text>
                    </div>
                </Space>
            )
        },
        {
            title: '解析状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const config: any = {
                    parsed: { color: 'success', text: '解析完成', icon: <CheckCircleOutlined /> },
                    parsing: { color: 'processing', text: '智能解析中...', icon: <SyncOutlined spin /> },
                    failed: { color: 'error', text: '解析失败', icon: <InfoCircleOutlined /> }
                }
                const { color, text, icon } = config[status] || { color: 'default', text: '待处理' }
                return <Tag icon={icon} color={color} className="status-tag">{text}</Tag>
            }
        },
        {
            title: '上传日期',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => (
                <Text type="secondary">{new Date(date).toLocaleString().split(' ')[0]}</Text>
            )
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: Resume) => (
                <Space size="middle">
                    <Tooltip title="点击预览解析数据">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() => handlePreview(record.id)}
                            className="action-btn"
                        >
                            预览
                        </Button>
                    </Tooltip>
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record.id)}
                        className="action-btn"
                    >
                        删除
                    </Button>
                </Space>
            )
        }
    ]

    return (
        <div className="resume-list-page">
            {showHeader && (
                <div className="header-banner">
                    <div className="banner-left">
                        <Title level={2} style={{ color: '#fff', margin: 0 }}>简历中心</Title>
                        <Text style={{ color: 'rgba(255,255,255,0.85)' }}>所有的简历都将通过 AI 模型进行深度学习，提取结构化数据。</Text>
                    </div>
                    <div className="banner-stats">
                        <Statistic title="已入库简历" value={resumes.length} valueStyle={{ color: '#fff' }} prefix={<FileTextOutlined />} />
                    </div>
                </div>
            )}

            <div style={{ marginTop: showHeader ? 24 : 0 }}>
                <Row gutter={[24, 24]}>
                    <Col span={showHeader ? 16 : 24}>
                        <Card className="main-list-card" title={<Space><FileTextOutlined /> 库中简历</Space>} extra={<Button icon={<SyncOutlined />} onClick={fetchResumes}>刷新列表</Button>}>
                            <Table
                                columns={columns}
                                dataSource={resumes}
                                rowKey="id"
                                loading={loading}
                                pagination={{ pageSize: 8 }}
                                className="custom-table"
                            />
                        </Card>
                    </Col>

                    <Col span={showHeader ? 8 : 24}>
                        <Card className="upload-guide-card" title={<Space><UploadOutlined /> 快速入库集</Space>}>
                            <Dragger {...uploadProps} className="resume-dragger">
                                <p className="ant-upload-drag-icon">
                                    <InboxOutlined />
                                </p>
                                <p className="ant-upload-text">点击或拖拽上传简历</p>
                                <p className="ant-upload-hint">支持 PDF, Word, TXT (Max 10MB)</p>
                            </Dragger>
                        </Card>
                    </Col>
                </Row>
            </div>

            <Modal
                title={null}
                open={isPreviewOpen}
                onCancel={() => setIsPreviewOpen(false)}
                footer={null}
                width={850}
                className="resume-preview-modal"
            >
                <div className="modal-header-accent" />
                {detailLoading ? (
                    <div className="detail-loading-box"><Spin size="large" tip="AI 正在读取解析结果..." /></div>
                ) : (
                    <div className="preview-container">
                        <div className="preview-top">
                            <Title level={3}>{currentResume?.parsed_data?.basic_info?.name || '未命名简历'}</Title>
                            <Space wrap>
                                <Tag icon={<UserOutlined />}>{currentResume?.parsed_data?.basic_info?.phone || '无电话'}</Tag>
                                <Tag icon={<InboxOutlined />}>{currentResume?.parsed_data?.basic_info?.email || '无邮箱'}</Tag>
                                <Tag icon={<BookOutlined />}>{currentResume?.parsed_data?.basic_info?.location || '无位置'}</Tag>
                            </Space>
                        </div>

                        <Divider>核心技能集</Divider>
                        <div className="skill-section-preview">
                            {currentResume?.parsed_data?.skills?.map((s: string, i: number) => (
                                <Tag key={i} color="processing" className="preview-skill-tag">{s}</Tag>
                            ))}
                        </div>

                        <Divider>工作履历</Divider>
                        <div className="experience-timeline">
                            {currentResume?.parsed_data?.work_experience?.map((work: any, i: number) => (
                                <div className="timeline-item" key={i}>
                                    <div className="timeline-dot" />
                                    <div className="list-item-header">
                                        <Text strong>{work.company}</Text>
                                        <Text type="secondary">{work.start_date} - {work.end_date}</Text>
                                    </div>
                                    <Paragraph className="job-role">{work.position}</Paragraph>
                                    <Paragraph className="job-desc">{work.description}</Paragraph>
                                </div>
                            ))}
                        </div>

                        <div className="modal-footer">
                            <Space size="middle">
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<ThunderboltOutlined />}
                                    onClick={() => setShowGenerator(true)}
                                >
                                    生成优化简历
                                </Button>
                                <Button
                                    size="large"
                                    onClick={() => setIsPreviewOpen(false)}
                                >
                                    关闭预览
                                </Button>
                            </Space>
                        </div>

                        {showGenerator && currentResume && (
                            <>
                                <Divider>智能简历生成器</Divider>
                                <ResumeGenerator
                                    resumeId={currentResume.id}
                                    onClose={() => setShowGenerator(false)}
                                />
                            </>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    )
}

export default ResumeList
