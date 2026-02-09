import React, { useState } from 'react';
import {
    Card, Tabs, Form, Input, Button, Upload, message, Typography,
    Row, Col, Space, Divider, Spin, Result
} from 'antd';
import {
    EditOutlined,
    GlobalOutlined,
    ScissorOutlined,
    RocketOutlined,
    LinkOutlined,
    ArrowLeftOutlined,
    CopyOutlined,
    FileTextOutlined,
    UploadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './JobInput.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const JobInput: React.FC = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [analyzingImage, setAnalyzingImage] = useState(false);
    const [analyzingDocument, setAnalyzingDocument] = useState(false);
    const [activeTab, setActiveTab] = useState('manual');
    const [successData, setSuccessData] = useState<any>(null);

    const navigate = useNavigate();
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

    // 处理文档上传核心逻辑
    const processDocument = async (file: File) => {
        setAnalyzingDocument(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post(`${baseUrl}/jobs/analyze-document`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const { title, company, description } = response.data;
            form.setFieldsValue({
                title,
                company,
                description
            });
            message.success('文档内容已提取，请检查并完善信息');
            setActiveTab('manual'); // 分析完跳转到手动修改确认
        } catch (error: any) {
            message.error(error.response?.data?.detail || '文档解析失败，请确保文件格式正确且包含职位信息');
        } finally {
            setAnalyzingDocument(false);
        }
    };

    // 处理文档上传
    const handleDocumentUpload = (file: File) => {
        // 验证文件类型
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const allowedExtensions = ['.pdf', '.doc', '.docx'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            message.error('仅支持 PDF 和 Word 文档格式');
            return false;
        }

        // 验证文件大小（10MB）
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            message.error('文件大小不能超过 10MB');
            return false;
        }

        processDocument(file);
        return false; // 阻止自动上传
    };


    // 处理图片分析核心逻辑
    const processImage = async (file: File) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = reader.result as string;
            setAnalyzingImage(true);
            try {
                const response = await axios.post(`${baseUrl}/jobs/analyze-screenshot`, { image: base64 });
                const { title, company, description } = response.data;
                form.setFieldsValue({
                    title,
                    company,
                    description
                });
                message.success('截图内容已提取，请检查并完善信息');
                setActiveTab('manual'); // 分析完跳转到手动修改确认
            } catch (error: any) {
                message.error(error.response?.data?.detail || '图片解析失败，可能因为图片不够清晰');
            } finally {
                setAnalyzingImage(false);
            }
        };
    };

    // 处理上传
    const handleImageUpload = (file: File) => {
        processImage(file);
        return false; // 阻止自动上传
    };

    // 处理粘贴
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        let foundImage = false;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    processImage(blob as File);
                    foundImage = true;
                    break;
                }
            }
        }
        if (foundImage) {
            e.preventDefault();
        }
    };

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const response = await axios.post(`${baseUrl}/jobs/`, values);
            setSuccessData(response.data);
            message.success('职位录入成功');
        } catch (error: any) {
            message.error(error.response?.data?.detail || '录入失败');
        } finally {
            setLoading(false);
        }
    };

    if (successData) {
        return (
            <div className="job-input-page success">
                <Result
                    status="success"
                    title="职位信息录入成功"
                    subTitle={`职位 [${successData.title}] 已加入您的资料库，AI 正在后台进行深度全维度解析。`}
                    extra={[
                        <Button type="primary" key="library" onClick={() => navigate('/library')}>
                            返回职位库
                        </Button>,
                        <Button key="match" onClick={() => navigate('/match')}>
                            去进行智能匹配
                        </Button>,
                        <Button key="again" onClick={() => { setSuccessData(null); form.resetFields(); }}>
                            继续录入新职位
                        </Button>
                    ]}
                />
            </div>
        );
    }

    return (
        <div className="job-input-page">
            <div className="page-header">
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} type="text">返回</Button>
                <Title level={2}>录入目标职位 (JD)</Title>
                <Text type="secondary">选择最适合您的方式，快速将招聘信息导入系统</Text>
            </div>

            <Row gutter={24} justify="center">
                <Col xs={24} lg={16}>
                    <Card className="input-card">
                        <Tabs
                            activeKey={activeTab}
                            onChange={setActiveTab}
                            items={[
                                {
                                    key: 'manual',
                                    label: <Space><EditOutlined /> 手动输入 / 确认</Space>,
                                    children: (
                                        <Form form={form} layout="vertical" onFinish={handleSubmit} className="job-form">
                                            <Row gutter={16}>
                                                <Col span={12}>
                                                    <Form.Item name="title" label="职位名称" rules={[{ required: true, message: '请输入职位名称' }]}>
                                                        <Input placeholder="例如：高级 Python 后端工程师" size="large" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item name="company" label="公司名称" rules={[{ required: true, message: '请输入公司名称' }]}>
                                                        <Input placeholder="例如：某科技大厂" size="large" />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                            <Form.Item name="description" label="职位描述详情 (JD)" rules={[{ required: true, message: '请输入职位描述' }]}>
                                                <TextArea rows={12} placeholder="粘贴完整的职位描述、职责、要求..." />
                                            </Form.Item>
                                            <div className="form-actions">
                                                <Button type="primary" htmlType="submit" size="large" loading={loading} icon={<RocketOutlined />}>
                                                    提交录入进入解析
                                                </Button>
                                            </div>
                                        </Form>
                                    )
                                },
                                {
                                    key: 'url',
                                    label: <Space><GlobalOutlined /> 网页链接同步</Space>,
                                    children: (
                                        <Form layout="vertical" onFinish={handleSubmit}>
                                            <div className="input-method-tip">
                                                <LinkOutlined /> 直接粘贴招聘网站（如 Boss直聘、拉勾、猎聘等）的链接，AI 将自动同步其内容。
                                            </div>
                                            <Form.Item name="url" label="职位详情页 URL" rules={[{ required: true, message: '请输入详情页地址' }, { type: 'url', message: '请输入有效的网址' }]}>
                                                <Input size="large" placeholder="https://www.zhipin.com/job_detail/..." />
                                            </Form.Item>
                                            <div className="form-actions">
                                                <Button type="primary" htmlType="submit" size="large" loading={loading}>
                                                    抓取链接并解析
                                                </Button>
                                            </div>
                                        </Form>
                                    )
                                },
                                {
                                    key: 'screenshot',
                                    label: <Space><ScissorOutlined /> 截图识图分析</Space>,
                                    children: (
                                        <div
                                            className="screenshot-upload-area"
                                            onPaste={handlePaste}
                                            tabIndex={0} // 必须有 tabIndex 才能触发键盘/粘贴事件
                                            style={{ outline: 'none' }}
                                        >
                                            {analyzingImage ? (
                                                <div className="analyzing-state">
                                                    <Spin size="large" tip="AI 视觉模型正在深度扫描截图..." />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="input-method-tip">
                                                        <CopyOutlined /> 捕捉到截图后，直接在下方区域【Ctrl+V】或【点击右键粘贴】即可。
                                                    </div>
                                                    <Dragger
                                                        beforeUpload={handleImageUpload}
                                                        showUploadList={false}
                                                        accept="image/*"
                                                    >
                                                        <p className="ant-upload-drag-icon">
                                                            <ScissorOutlined />
                                                        </p>
                                                        <p className="ant-upload-text">点击、拖拽 或 直接在此处粘贴截图</p>
                                                        <p className="ant-upload-hint">支持常用的图片格式 (JPG, PNG)</p>
                                                    </Dragger>
                                                </>
                                            )}
                                        </div>
                                    )
                                },
                                {
                                    key: 'document',
                                    label: <Space><FileTextOutlined /> 文档上传解析</Space>,
                                    children: (
                                        <div className="document-upload-area">
                                            {analyzingDocument ? (
                                                <div className="analyzing-state">
                                                    <Spin size="large" tip="AI 正在解析文档内容..." />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="input-method-tip">
                                                        <UploadOutlined /> 上传职位描述文档（PDF 或 Word），AI 将自动提取职位信息。
                                                    </div>
                                                    <Dragger
                                                        beforeUpload={handleDocumentUpload}
                                                        showUploadList={false}
                                                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                        multiple={false}
                                                    >
                                                        <p className="ant-upload-drag-icon">
                                                            <FileTextOutlined />
                                                        </p>
                                                        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                                                        <p className="ant-upload-hint">
                                                            支持 PDF、Word 文档格式 (.pdf, .doc, .docx)
                                                            <br />
                                                            文件大小限制：10MB
                                                        </p>
                                                    </Dragger>
                                                </>
                                            )}
                                        </div>
                                    )
                                }
                            ]}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card bordered={false} className="input-guide-side">
                        <Title level={4}>💡 录入技巧</Title>
                        <Divider />
                        <div className="guide-item">
                            <Text strong>1. 尽可能包含完整 JD</Text>
                            <Paragraph type="secondary">
                                AI 分析的准确度取决于文本的完整程度。包括任职要求和岗位职责可以获得更精准的匹配结果。
                            </Paragraph>
                        </div>
                        <div className="guide-item">
                            <Text strong>2. 文档上传说明</Text>
                            <Paragraph type="secondary">
                                支持上传 PDF 或 Word 格式的职位描述文档，AI 会自动提取文本并识别职位信息。文件大小限制为 10MB。
                            </Paragraph>
                        </div>
                        <div className="guide-item">
                            <Text strong>3. 截图粘贴说明</Text>
                            <Paragraph type="secondary">
                                使用微信、钉钉或系统自带的截屏工具（Command+Shift+4 或 Win+Shift+S）截取后，直接在识图区域按粘贴键即可。
                            </Paragraph>
                        </div>
                        <div className="guide-item">
                            <Text strong>4. 后台正在解析</Text>
                            <Paragraph type="secondary">
                                提交后系统会进行二次深度解析（提取技能标签、薪资范围等），您可以在资料库中查看进度。
                            </Paragraph>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default JobInput;
