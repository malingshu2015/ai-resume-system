import React, { useState, useEffect } from 'react';
import {
    Card, Button, Select, message, Spin, Modal, Tabs,
    Typography, Row, Col, Space, Tag, Divider, Alert
} from 'antd';
import {
    FileTextOutlined, DownloadOutlined, EyeOutlined,
    CheckCircleOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import axios from 'axios';
import './ResumeGenerator.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface Template {
    id: string;
    name: string;
    description: string;
    color_scheme: string;
}

interface ExportFormat {
    id: string;
    name: string;
    description: string;
    icon: string;
}

interface Props {
    resumeId: string;
    jobId?: string;
    initialSuggestions?: any;
    onClose?: () => void;
}

const ResumeGenerator: React.FC<Props> = ({ resumeId, jobId, initialSuggestions, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [formats, setFormats] = useState<ExportFormat[]>([]);
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState('modern');
    const [selectedFormat, setSelectedFormat] = useState('pdf');
    const [selectedJob, setSelectedJob] = useState<string | undefined>(jobId);
    const [generatedResume, setGeneratedResume] = useState<any>(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

    useEffect(() => {
        fetchTemplates();
        fetchFormats();
        fetchJobs();
        // 如果有预设职位，更新到状态
        if (jobId) setSelectedJob(jobId);
    }, [jobId]);

    const fetchTemplates = async () => {
        try {
            const response = await axios.get(`${baseUrl}/resume-generator/templates`);
            setTemplates(response.data.templates);
        } catch (error) {
            message.error('获取模板列表失败');
        }
    };

    const fetchFormats = async () => {
        try {
            const response = await axios.get(`${baseUrl}/resume-generator/formats`);
            setFormats(response.data.formats);
        } catch (error) {
            message.error('获取导出格式失败');
        }
    };

    const fetchJobs = async () => {
        try {
            const response = await axios.get(`${baseUrl}/jobs/`);
            setJobs(response.data);
        } catch (error) {
            console.error('获取职位列表失败');
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const response = await axios.post(`${baseUrl}/resume-generator/generate`, {
                resume_id: resumeId,
                job_id: selectedJob,
                template: selectedTemplate,
                optimization_suggestions: initialSuggestions // 传递来自匹配分析的建议
            });

            setGeneratedResume(response.data.data);
            message.success('深度优化版简历生成成功！已应用 STAR 原则和量化模型。');
        } catch (error: any) {
            message.error(error.response?.data?.detail || '生成失败');
        } finally {
            setGenerating(false);
        }
    };

    const handlePreview = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${baseUrl}/resume-generator/preview`, {
                resume_id: resumeId,
                job_id: selectedJob,
                template: selectedTemplate,
                optimization_suggestions: initialSuggestions // 预览时也应用建议
            });

            setPreviewHtml(response.data.html_preview);
            setPreviewVisible(true);
        } catch (error: any) {
            message.error(error.response?.data?.detail || '预览失败');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!generatedResume) {
            message.warning('请先生成简历');
            return;
        }

        setExporting(true);
        try {
            const response = await axios.post(`${baseUrl}/resume-generator/export`, {
                resume_data: generatedResume,
                format: selectedFormat
            });

            message.success('导出成功！');

            // 自动下载文件
            const downloadUrl = `${baseUrl}${response.data.download_url}`;
            window.open(downloadUrl, '_blank');
        } catch (error: any) {
            message.error(error.response?.data?.detail || '导出失败');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="resume-generator-container">
            <Card className="generator-card">
                <Title level={3}>
                    <ThunderboltOutlined /> 智能简历生成器
                </Title>
                <Paragraph type="secondary">
                    基于AI深度优化模型，自动应用 STAR 原则对您的经历进行量化重写。
                </Paragraph>

                <Alert
                    message="Pro 提示"
                    description="选择一个【目标职位】可以让 AI 针对性地调整您的简历关键词，大幅提升匹配度。"
                    type="warning"
                    showIcon
                    style={{ marginBottom: 20 }}
                />

                <Row gutter={24}>
                    <Col span={24} style={{ marginBottom: 20 }}>
                        <Card title="🎯 目标职位 (可选)" size="small" className="selection-card">
                            <Select
                                placeholder="选择一个目标职位进行针对性优化..."
                                value={selectedJob}
                                onChange={setSelectedJob}
                                style={{ width: '100%' }}
                                size="large"
                                allowClear
                            >
                                {jobs.map(job => (
                                    <Option key={job.id} value={job.id}>
                                        <Space>
                                            <Tag color="blue">{job.company}</Tag>
                                            <Text strong>{job.title}</Text>
                                        </Space>
                                    </Option>
                                ))}
                            </Select>
                        </Card>
                    </Col>

                    <Col span={12}>
                        <Card title="📋 选择模板" size="small" className="selection-card">
                            <Select
                                value={selectedTemplate}
                                onChange={setSelectedTemplate}
                                style={{ width: '100%' }}
                                size="large"
                            >
                                {templates.map(template => (
                                    <Option key={template.id} value={template.id}>
                                        <div>
                                            <Text strong>{template.name}</Text>
                                            <br />
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {template.description}
                                            </Text>
                                        </div>
                                    </Option>
                                ))}
                            </Select>

                            <div style={{ marginTop: 16 }}>
                                {templates.find(t => t.id === selectedTemplate) && (
                                    <Alert
                                        message={templates.find(t => t.id === selectedTemplate)?.description}
                                        type="info"
                                        showIcon
                                    />
                                )}
                            </div>
                        </Card>
                    </Col>

                    <Col span={12}>
                        <Card title="💾 导出格式" size="small" className="selection-card">
                            <Select
                                value={selectedFormat}
                                onChange={setSelectedFormat}
                                style={{ width: '100%' }}
                                size="large"
                            >
                                {formats.map(format => (
                                    <Option key={format.id} value={format.id}>
                                        <div>
                                            <Text>{format.icon} {format.name}</Text>
                                            <br />
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {format.description}
                                            </Text>
                                        </div>
                                    </Option>
                                ))}
                            </Select>

                            <div style={{ marginTop: 16 }}>
                                {formats.find(f => f.id === selectedFormat) && (
                                    <Alert
                                        message={formats.find(f => f.id === selectedFormat)?.description}
                                        type="info"
                                        showIcon
                                    />
                                )}
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Divider />

                <Space size="large" style={{ width: '100%', justifyContent: 'center' }}>
                    <Button
                        type="primary"
                        size="large"
                        icon={<ThunderboltOutlined />}
                        loading={generating}
                        onClick={handleGenerate}
                    >
                        生成简历
                    </Button>

                    <Button
                        size="large"
                        icon={<EyeOutlined />}
                        loading={loading}
                        onClick={handlePreview}
                    >
                        预览效果
                    </Button>

                    <Button
                        type="default"
                        size="large"
                        icon={<DownloadOutlined />}
                        loading={exporting}
                        onClick={handleExport}
                        disabled={!generatedResume}
                    >
                        导出简历
                    </Button>
                </Space>

                {generatedResume && (
                    <>
                        <Divider />
                        <Alert
                            message="简历生成成功"
                            description={
                                <div>
                                    <Text>已应用 {generatedResume.metadata?.suggestions_count || 0} 条优化建议</Text>
                                    <br />
                                    <Text type="secondary">
                                        生成时间：{new Date(generatedResume.metadata?.generated_at).toLocaleString('zh-CN')}
                                    </Text>
                                </div>
                            }
                            type="success"
                            showIcon
                            icon={<CheckCircleOutlined />}
                        />
                    </>
                )}
            </Card>

            <Modal
                title="简历预览"
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={null}
                width="90%"
                style={{ top: 20 }}
            >
                <div
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                    style={{
                        maxHeight: '80vh',
                        overflow: 'auto',
                        padding: '20px'
                    }}
                />
            </Modal>
        </div>
    );
};

export default ResumeGenerator;
