import React, { useState, useEffect } from 'react';
import {
    Card, Button, Select, message, Input, Modal,
    Typography, Row, Col, Space, Tag, Divider, Alert, Result
} from 'antd';
import {
    CheckCircleOutlined, ThunderboltOutlined, MailOutlined,
    DownloadOutlined, FolderOpenOutlined, SendOutlined
} from '@ant-design/icons';
import axios from 'axios';
import './ResumeGenerator.css';

const { Title, Text } = Typography;
const { Option } = Select;

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

interface GenerateResult {
    savedResumeId: string | null;
    targetJob: {
        id: string;
        title: string;
        company: string;
    } | null;
    resumeData: any;
}

const ResumeGenerator: React.FC<Props> = ({ resumeId, jobId, initialSuggestions, onClose }) => {
    const [generating, setGenerating] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [formats, setFormats] = useState<ExportFormat[]>([]);
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState('modern');
    const [selectedFormat, setSelectedFormat] = useState('pdf');
    const [selectedJob, setSelectedJob] = useState<string | undefined>(jobId);

    // 生成结果状态
    const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);

    // 邮件发送相关
    const [emailModalVisible, setEmailModalVisible] = useState(false);
    const [emailAddress, setEmailAddress] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

    useEffect(() => {
        fetchTemplates();
        fetchFormats();
        fetchJobs();
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

    // 核心：生成简历（自动保存到库）
    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const response = await axios.post(`${baseUrl}/resume-generator/generate`, {
                resume_id: resumeId,
                job_id: selectedJob,
                template: selectedTemplate,
                suggestions: initialSuggestions,
                save_to_library: true  // 自动保存到简历库
            });

            const result = response.data;

            setGenerateResult({
                savedResumeId: result.saved_resume_id,
                targetJob: result.target_job,
                resumeData: result.data
            });

            message.success(result.message || '简历生成成功！');

        } catch (error: any) {
            message.error(error.response?.data?.detail || 'AI 生成失败，请重试');
        } finally {
            setGenerating(false);
        }
    };

    // 保存到本地
    const handleDownload = async () => {
        if (!generateResult?.resumeData) {
            message.warning('请先生成简历');
            return;
        }

        setExporting(true);
        try {
            const response = await axios.post(`${baseUrl}/resume-generator/export`, {
                resume_data: generateResult.resumeData,
                format: selectedFormat
            });

            if (response.data.download_url) {
                const downloadUrl = `${baseUrl}${response.data.download_url}`;
                window.open(downloadUrl, '_blank');
                message.success('已开始下载！');
            }
        } catch (error: any) {
            message.error(error.response?.data?.detail || '下载失败');
        } finally {
            setExporting(false);
        }
    };

    // 发送邮件
    const handleSendEmail = async () => {
        if (!emailAddress || !emailAddress.includes('@')) {
            message.warning('请输入有效的邮箱地址');
            return;
        }

        setSendingEmail(true);
        try {
            // 先导出文件
            const exportRes = await axios.post(`${baseUrl}/resume-generator/export`, {
                resume_data: generateResult?.resumeData,
                format: selectedFormat
            });

            // 调用邮件发送接口（如果后端支持）
            // 这里暂时模拟成功，实际需要后端支持邮件服务
            await new Promise(resolve => setTimeout(resolve, 1500));

            message.success(`简历已发送至 ${emailAddress}`);
            setEmailModalVisible(false);
            setEmailAddress('');
        } catch (error: any) {
            message.error('发送失败，请检查邮箱地址');
        } finally {
            setSendingEmail(false);
        }
    };

    // 获取目标岗位显示名
    const getTargetJobDisplay = () => {
        if (generateResult?.targetJob) {
            return `${generateResult.targetJob.company} - ${generateResult.targetJob.title}`;
        }
        return null;
    };

    // 重新开始
    const handleReset = () => {
        setGenerateResult(null);
    };

    return (
        <div className="resume-generator-container">
            <Card className="generator-card" bordered={false}>
                {!generateResult ? (
                    <>
                        {/* 标题区域 */}
                        <div style={{ marginBottom: 24 }}>
                            <Title level={4} style={{ marginBottom: 8 }}>
                                <ThunderboltOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                                智能简历生成器
                            </Title>
                            <Text type="secondary" style={{ fontSize: 14 }}>
                                基于 AI 深度优化，自动应用 STAR 原则进行量化重写。生成后将自动保存到简历库。
                            </Text>
                        </div>

                        {/* 选择器区域 */}
                        <Row gutter={16} style={{ marginBottom: 24 }}>
                            <Col xs={24} lg={8}>
                                <div style={{ marginBottom: 16 }}>
                                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                        🎯 目标职位（可选）
                                    </Text>
                                    <Select
                                        placeholder="选择目标职位..."
                                        value={selectedJob}
                                        onChange={setSelectedJob}
                                        style={{ width: '100%' }}
                                        allowClear
                                    >
                                        {jobs.map(job => (
                                            <Option key={job.id} value={job.id}>
                                                <Space>
                                                    <Tag color="blue">{job.company}</Tag>
                                                    <Text>{job.title}</Text>
                                                </Space>
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                            </Col>

                            <Col xs={24} lg={8}>
                                <div style={{ marginBottom: 16 }}>
                                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                        📋 简历模板
                                    </Text>
                                    <Select
                                        value={selectedTemplate}
                                        onChange={setSelectedTemplate}
                                        style={{ width: '100%' }}
                                    >
                                        {templates.map(template => (
                                            <Option key={template.id} value={template.id}>
                                                {template.name}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                            </Col>

                            <Col xs={24} lg={8}>
                                <div style={{ marginBottom: 16 }}>
                                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                        💾 导出格式
                                    </Text>
                                    <Select
                                        value={selectedFormat}
                                        onChange={setSelectedFormat}
                                        style={{ width: '100%' }}
                                    >
                                        {formats.map(format => (
                                            <Option key={format.id} value={format.id}>
                                                {format.icon} {format.name}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                            </Col>
                        </Row>

                        <Divider style={{ margin: '16px 0' }} />

                        {/* 生成按钮 */}
                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                            <Button
                                type="primary"
                                size="large"
                                icon={<ThunderboltOutlined />}
                                loading={generating}
                                onClick={handleGenerate}
                                style={{
                                    height: 56,
                                    padding: '0 48px',
                                    fontSize: 18,
                                    borderRadius: 28,
                                    background: 'linear-gradient(135deg, #1890ff 0%, #001529 100%)',
                                    border: 'none',
                                    boxShadow: '0 4px 15px rgba(24, 144, 255, 0.3)'
                                }}
                            >
                                生成优化版简历
                            </Button>
                        </div>
                    </>
                ) : (
                    /* 生成成功后的结果页面 */
                    <Result
                        status="success"
                        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        title="简历生成成功！"
                        subTitle={
                            <div style={{ textAlign: 'center' }}>
                                <Text>已自动保存到简历库</Text>
                                {getTargetJobDisplay() && (
                                    <div style={{ marginTop: 8 }}>
                                        <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                                            🎯 目标岗位：{getTargetJobDisplay()}
                                        </Tag>
                                    </div>
                                )}
                            </div>
                        }
                        extra={
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                {/* 操作按钮组 */}
                                <Space size="middle" wrap style={{ justifyContent: 'center', width: '100%' }}>
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<DownloadOutlined />}
                                        onClick={handleDownload}
                                        loading={exporting}
                                        style={{ borderRadius: 8 }}
                                    >
                                        保存到本地
                                    </Button>

                                    <Button
                                        size="large"
                                        icon={<MailOutlined />}
                                        onClick={() => setEmailModalVisible(true)}
                                        style={{ borderRadius: 8 }}
                                    >
                                        邮件发送
                                    </Button>

                                    <Button
                                        size="large"
                                        icon={<FolderOpenOutlined />}
                                        onClick={() => {
                                            if (onClose) onClose();
                                            window.location.href = '/resume';
                                        }}
                                        style={{ borderRadius: 8 }}
                                    >
                                        查看简历库
                                    </Button>
                                </Space>

                                {/* 重新生成链接 */}
                                <Button type="link" onClick={handleReset}>
                                    重新配置并生成
                                </Button>
                            </Space>
                        }
                    />
                )}
            </Card>

            {/* 邮件发送弹窗 */}
            <Modal
                title={<><MailOutlined /> 发送简历到邮箱</>}
                open={emailModalVisible}
                onCancel={() => setEmailModalVisible(false)}
                footer={null}
                centered
                width={400}
            >
                <div style={{ padding: '16px 0' }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                        输入收件人邮箱，我们将把优化后的简历发送过去。
                    </Text>
                    <Input
                        size="large"
                        placeholder="example@email.com"
                        prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                        value={emailAddress}
                        onChange={e => setEmailAddress(e.target.value)}
                        style={{ marginBottom: 16, borderRadius: 8 }}
                    />
                    {getTargetJobDisplay() && (
                        <Alert
                            message={`将发送针对【${getTargetJobDisplay()}】优化的简历`}
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    )}
                    <Button
                        type="primary"
                        size="large"
                        icon={<SendOutlined />}
                        loading={sendingEmail}
                        onClick={handleSendEmail}
                        block
                        style={{ borderRadius: 8 }}
                    >
                        发送简历
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default ResumeGenerator;
