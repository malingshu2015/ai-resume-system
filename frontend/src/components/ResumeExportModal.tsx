import React, { useState } from 'react'
import { Modal, Tabs, Row, Col, Space, Typography, Alert, Divider, message, Button, Input } from 'antd'
import axios from 'axios'
import './ResumeExportModal.css'

const { Title, Text } = Typography
const { TabPane } = Tabs

interface ResumeExportModalProps {
    visible: boolean
    onCancel: () => void
    resumeContent: any  // 简历数据对象
    resumeId: string
    jobId: string
}

const ResumeExportModal: React.FC<ResumeExportModalProps> = ({
    visible,
    onCancel,
    resumeContent,
    resumeId,
    jobId
}) => {
    const [selectedTemplate, setSelectedTemplate] = useState('modern')
    const [previewHtml, setPreviewHtml] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(false)
    

    // 获取预览 HTML
    const fetchPreviewHtml = async (templateId: string) => {
        setLoading(true)
        try {
            const response = await axios.post(`${baseUrl}/resume-generator/preview`, {
                resume_id: resumeId,
                job_id: jobId,
                template: templateId
            })
            if (response.data.success) {
                setPreviewHtml(response.data.html_preview)
            }
        } catch (error) {
            console.error('获取预览失败:', error)
            message.error('生成预览失败')
        } finally {
            setLoading(false)
        }
    }

    // 当弹窗打开或模板变更时刷新预览
    React.useEffect(() => {
        if (visible && resumeId) {
            fetchPreviewHtml(selectedTemplate)
        }
    }, [visible, resumeId, selectedTemplate])

    const handleTemplateChange = (template: string) => {
        setSelectedTemplate(template)
    }

    const handleExport = async (format: string, formatName: string) => {
        try {
            message.loading({ content: `正在生成 ${formatName} 文件...`, key: 'export' })

            // 第一步：调用后端生成文件
            const response = await axios.post(`${baseUrl}/resume-generator/export`, {
                resume_data: {
                    content: resumeContent,
                    template: selectedTemplate
                },
                format: format
            })

            if (!response.data.success) {
                throw new Error(response.data.message || '导出失败')
            }

            const downloadUrl = `${baseUrl}${response.data.download_url}`
            const fileName = response.data.file_path?.split('/').pop() || `resume.${format}`

            message.loading({ content: `正在下载 ${formatName} 文件...`, key: 'export' })

            // 第二步：使用 fetch + blob 的方式下载文件，确保触发浏览器下载
            try {
                const downloadResponse = await fetch(downloadUrl)
                if (!downloadResponse.ok) {
                    throw new Error(`下载失败: HTTP ${downloadResponse.status}`)
                }

                const blob = await downloadResponse.blob()
                const blobUrl = window.URL.createObjectURL(blob)

                // 创建隐藏的 a 标签触发下载
                const link = document.createElement('a')
                link.href = blobUrl
                link.download = fileName
                link.style.display = 'none'
                document.body.appendChild(link)
                link.click()

                // 清理
                document.body.removeChild(link)
                window.URL.revokeObjectURL(blobUrl)

                message.success({ content: `${formatName} 已下载到本地！`, key: 'export' })
            } catch (downloadError) {
                // 如果 fetch 方式失败，回退到 window.open 方式
                console.warn('Blob 下载失败，尝试使用 window.open 方式:', downloadError)
                window.open(downloadUrl, '_blank')
                message.success({ content: `${formatName} 文件已在新标签页打开`, key: 'export' })
            }
        } catch (error: any) {
            console.error('导出失败:', error)
            message.error({
                content: `导出失败: ${error.response?.data?.detail || error.message}`,
                key: 'export'
            })
        }
    }

    // 处理邮件发送
    const handleSendEmail = async (email: string) => {
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            message.warning('请输入有效的邮箱地址')
            return
        }

        try {
            message.loading({ content: '正在发送邮件...', key: 'email' })
            const response = await axios.post(`${baseUrl}/resume-generator/send-email`, {
                resume_id: resumeId,
                to_email: email,
                format: 'pdf' // 默认发送 PDF
            })

            if (response.data.success) {
                message.success({ content: '邮件已成功发送至您的邮箱！', key: 'email' })
            }
        } catch (error: any) {
            message.error({ content: `邮件发送失败: ${error.response?.data?.detail || error.message}`, key: 'email' })
        }
    }

    // 处理分享链接生成
    const handleGenerateShareLink = async () => {
        try {
            message.loading({ content: '正在生成分享链接...', key: 'share' })
            const response = await axios.post(`${baseUrl}/resume-generator/share`, {
                resume_id: resumeId,
                expire_days: 7
            })

            if (response.data.success) {
                const url = response.data.share_url
                // 自动复制到剪贴板
                await navigator.clipboard.writeText(url)
                message.success({
                    content: '分享链接已生成并复制到剪贴板！',
                    key: 'share',
                    duration: 5
                })
            }
        } catch (error: any) {
            message.error({ content: `生成分享链接失败: ${error.response?.data?.detail || error.message}`, key: 'share' })
        }
    }



    return (
        <Modal
            title={<Space><div className="modal-title-pulse" /> <span>导出优化完成的简历</span></Space>}
            open={visible}
            onCancel={onCancel}
            width={1200}
            footer={null}
            centered
            className="resume-export-modal premium-modal"
        >
            <Tabs defaultActiveKey="preview" className="premium-tabs">
                <TabPane
                    tab={<Space><Title level={5} style={{ margin: 0 }}>🎨 预览样式</Title></Space>}
                    key="preview"
                >
                    <div className="resume-preview-section">
                        {/* 模板与控制栏 */}
                        <div className="preview-control-bar">
                            <Row gutter={24} align="middle">
                                <Col span={12}>
                                    <Space size={16}>
                                        <Text strong>选择设计师模板：</Text>
                                        <div className="template-selector-group">
                                            {['modern', 'professional', 'creative', 'minimal'].map(t => (
                                                <div
                                                    key={t}
                                                    className={`template-chip ${selectedTemplate === t ? 'active' : ''}`}
                                                    onClick={() => handleTemplateChange(t)}
                                                >
                                                    {t === 'modern' && '🌐 科技蓝'}
                                                    {t === 'professional' && '💼 商务金'}
                                                    {t === 'creative' && '✨ 创意紫'}
                                                    {t === 'minimal' && '⚫ 极简黑'}
                                                </div>
                                            ))}
                                        </div>
                                    </Space>
                                </Col>
                                <Col span={12} style={{ textAlign: 'right' }}>
                                    <Text type="secondary" style={{ fontSize: 13 }}>
                                        <span style={{ color: '#52c41a' }}>已深度补全核心项目经验</span> • AI 驱动的高保真渲染
                                    </Text>
                                </Col>
                            </Row>
                        </div>

                        {/* 高保真 HTML 预览容器 */}
                        <div className="html-preview-frame-wrapper">
                            {loading ? (
                                <div className="preview-skeleton-loader">
                                    <div className="skeleton-pulse" />
                                    <Text>AI 正在为您渲染精美简历...</Text>
                                </div>
                            ) : (
                                <iframe
                                    className="resume-html-iframe"
                                    title="resume-preview"
                                    srcDoc={previewHtml}
                                    style={{
                                        width: '100%',
                                        height: '750px',
                                        border: 'none',
                                        borderRadius: '12px',
                                        backgroundColor: '#fff',
                                        boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </TabPane>

                {/* 导出标签页 */}
                <TabPane
                    tab={<Space><Title level={5} style={{ margin: 0 }}>📦 导出与分发</Title></Space>}
                    key="export"
                >
                    <div className="export-distribution-section">
                        <Row gutter={[24, 24]}>
                            {/* 文件下载区 */}
                            <Col span={14}>
                                <div className="export-group-card">
                                    <Title level={5} className="group-title">本地稳健存档</Title>
                                    <Text type="secondary" className="group-desc">生成专业格式文件，支持高保真打印。建议优先导出 PDF 格式进行投递。</Text>

                                    <div className="export-button-grid">
                                        <Button
                                            type="primary"
                                            size="large"
                                            icon={<div className="btn-icon">📄</div>}
                                            className="export-btn pdf"
                                            onClick={() => handleExport('pdf', 'PDF')}
                                        >
                                            导出精美 PDF
                                        </Button>
                                        <Button
                                            size="large"
                                            icon={<div className="btn-icon">📝</div>}
                                            className="export-btn docx"
                                            onClick={() => handleExport('docx', 'Word')}
                                        >
                                            导出 Word 文档
                                        </Button>
                                    </div>

                                    <Divider dashed />

                                    <div className="export-button-grid secondary">
                                        <Button
                                            icon={<div className="btn-icon">🖼️</div>}
                                            className="export-btn"
                                            onClick={() => handleExport('png', '长图')}
                                        >
                                            生成简历长图
                                        </Button>
                                        <Button
                                            icon={<div className="btn-icon">📋</div>}
                                            className="export-btn"
                                            onClick={() => handleExport('markdown', 'Markdown')}
                                        >
                                            Markdown
                                        </Button>
                                    </div>
                                </div>
                            </Col>

                            {/* 社交/投递区分发区 */}
                            <Col span={10}>
                                <div className="export-group-card highlight">
                                    <Title level={5} className="group-title">极速社交分发</Title>

                                    <Space direction="vertical" style={{ width: '100%' }} size={20}>
                                        <div className="action-item">
                                            <div className="action-label">
                                                <Space><Text strong>📧 邮件直投</Text></Space>
                                            </div>
                                            <Space.Compact style={{ width: '100%' }}>
                                                <Input
                                                    placeholder="输入收件邮箱"
                                                    id="emailInput"
                                                    style={{ borderRadius: '8px 0 0 8px' }}
                                                />
                                                <Button
                                                    type="primary"
                                                    onClick={() => handleSendEmail((document.getElementById('emailInput') as HTMLInputElement).value)}
                                                >
                                                    发送
                                                </Button>
                                            </Space.Compact>
                                        </div>

                                        <div className="action-item">
                                            <div className="action-label">
                                                <Space><Text strong>🔗 私密分享链接</Text></Space>
                                            </div>
                                            <Button
                                                block
                                                icon={<div className="btn-icon">✨</div>}
                                                style={{ height: '44px', borderRadius: '8px', background: '#f0f7ff', color: '#007AFF', border: '1px solid #bae0ff' }}
                                                onClick={handleGenerateShareLink}
                                            >
                                                生成分享短链接 (有效期7天)
                                            </Button>
                                        </div>
                                    </Space>
                                </div>

                                <div className="export-tip-box">
                                    <Alert
                                        message="安全建议"
                                        description="PDF 格式最适合正式投递；长图更适合手机微信查阅；分享链接支持随时取消访问权限。"
                                        type="info"
                                        showIcon
                                    />
                                </div>
                            </Col>
                        </Row>
                    </div>
                </TabPane>
            </Tabs>
        </Modal>
    )
}

export default ResumeExportModal
