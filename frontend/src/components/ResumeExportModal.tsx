import React, { useState } from 'react'
import { Modal, Tabs, Select, Row, Col, Card, Space, Typography, Alert, Divider, message } from 'antd'
import axios from 'axios'
import './ResumeExportModal.css'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TabPane } = Tabs

interface ResumeExportModalProps {
    visible: boolean
    onCancel: () => void
    resumeContent: string
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
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

    const handleTemplateChange = async (template: string) => {
        setSelectedTemplate(template)
        message.info(`已切换到${template}模板`)
        // TODO: 重新生成简历（使用新模板）
    }

    const handleExport = async (format: string, formatName: string) => {
        try {
            message.loading({ content: `正在生成 ${formatName} 文件...`, key: 'export' })

            const response = await axios.post(`${baseUrl}/resume-generator/export`, {
                resume_data: {
                    content: resumeContent,
                    template: selectedTemplate
                },
                format: format
            })

            const downloadUrl = `${baseUrl}${response.data.download_url}`
            window.open(downloadUrl, '_blank')

            message.success({ content: `${formatName} 文件已生成！`, key: 'export' })
        } catch (error: any) {
            message.error({
                content: `导出失败: ${error.response?.data?.detail || error.message}`,
                key: 'export'
            })
        }
    }

    const exportFormats = [
        { format: 'pdf', name: 'PDF', icon: '📄', desc: '便携式文档，适合打印和分享', color: '#FF3B30' },
        { format: 'docx', name: 'Word', icon: '📝', desc: 'Microsoft Word 文档，可编辑', color: '#007AFF' },
        { format: 'html', name: 'HTML', icon: '🌐', desc: '网页格式，可在浏览器查看', color: '#FF9500' },
        { format: 'markdown', name: 'Markdown', icon: '📋', desc: '纯文本格式，适合技术人员', color: '#34C759' }
    ]

    return (
        <Modal
            title="优化后的简历"
            open={visible}
            onCancel={onCancel}
            width={1100}
            footer={null}
            centered
            className="resume-export-modal"
        >
            <Tabs defaultActiveKey="preview">
                {/* 预览标签页 */}
                <TabPane tab="预览简历" key="preview">
                    <div className="resume-preview-container">
                        {/* 模板选择器 */}
                        <div style={{
                            marginBottom: 24,
                            padding: 16,
                            background: 'var(--apple-gray-100)',
                            borderRadius: 12
                        }}>
                            <Row gutter={16} align="middle">
                                <Col span={12}>
                                    <Space>
                                        <Text strong>选择模板风格：</Text>
                                        <Select
                                            value={selectedTemplate}
                                            style={{ width: 200 }}
                                            onChange={handleTemplateChange}
                                        >
                                            <Option value="modern">
                                                <Space>
                                                    <span>🎨</span>
                                                    <span>现代简约</span>
                                                </Space>
                                            </Option>
                                            <Option value="professional">
                                                <Space>
                                                    <span>💼</span>
                                                    <span>专业商务</span>
                                                </Space>
                                            </Option>
                                            <Option value="creative">
                                                <Space>
                                                    <span>✨</span>
                                                    <span>创意设计</span>
                                                </Space>
                                            </Option>
                                            <Option value="minimal">
                                                <Space>
                                                    <span>📄</span>
                                                    <span>极简主义</span>
                                                </Space>
                                            </Option>
                                        </Select>
                                    </Space>
                                </Col>
                                <Col span={12} style={{ textAlign: 'right' }}>
                                    <Text type="secondary" style={{ fontSize: 13 }}>
                                        提示：切换模板会重新渲染简历样式
                                    </Text>
                                </Col>
                            </Row>
                        </div>

                        {/* 简历内容预览 */}
                        <div style={{
                            maxHeight: 500,
                            overflowY: 'auto',
                            padding: 24,
                            background: 'white',
                            border: '1px solid var(--apple-gray-200)',
                            borderRadius: 12
                        }}>
                            <pre style={{
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'inherit',
                                lineHeight: 1.8,
                                margin: 0,
                                fontSize: 15
                            }}>
                                {resumeContent}
                            </pre>
                        </div>
                    </div>
                </TabPane>

                {/* 导出标签页 */}
                <TabPane tab="导出简历" key="export">
                    <div style={{ padding: '24px 0' }}>
                        <Title level={4}>选择导出格式</Title>
                        <Paragraph type="secondary">
                            选择您需要的文件格式，系统将自动生成并下载
                        </Paragraph>

                        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                            {exportFormats.map(item => (
                                <Col xs={24} md={12} key={item.format}>
                                    <Card
                                        hoverable
                                        className="export-format-card"
                                        onClick={() => handleExport(item.format, item.name)}
                                    >
                                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                            <div style={{ fontSize: 32 }}>{item.icon}</div>
                                            <Title level={5} style={{ margin: 0, color: item.color }}>
                                                {item.name}
                                            </Title>
                                            <Text type="secondary" style={{ fontSize: 13 }}>
                                                {item.desc}
                                            </Text>
                                        </Space>
                                    </Card>
                                </Col>
                            ))}
                        </Row>

                        <Divider />

                        <Alert
                            message="导出提示"
                            description="导出的文件将保留您选择的模板样式和所有优化内容。PDF 格式最适合投递简历，Word 格式方便后续编辑。"
                            type="info"
                            showIcon
                            style={{ borderRadius: 12 }}
                        />
                    </div>
                </TabPane>
            </Tabs>
        </Modal>
    )
}

export default ResumeExportModal
