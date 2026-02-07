import React, { useState, useEffect } from 'react';
import {
    Card, Table, Button, Modal, Form, Input, Switch, message,
    Tag, Space, Typography, Tooltip, Alert, Row, Col
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    CheckCircleOutlined, SettingOutlined, BulbOutlined,
    KeyOutlined, LinkOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import axios from 'axios';
import './ModelSettings.css';

const { Title, Text, Paragraph } = Typography;

interface AIConfig {
    id: string;
    provider: string;
    model_name: string;
    api_key: string;
    api_base: string | null;
    is_active: boolean;
    created_at: string;
}

const ModelSettings: React.FC = () => {
    const [configs, setConfigs] = useState<AIConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingConfig, setEditingConfig] = useState<AIConfig | null>(null);
    const [form] = Form.useForm();

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${baseUrl}/config/`);
            setConfigs(response.data);
        } catch (error) {
            message.error('获取配置失败');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingConfig(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record: AIConfig) => {
        setEditingConfig(record);
        form.setFieldsValue({
            ...record,
            api_key: '' // 编辑时不回填 API Key，安全性考虑
        });
        setModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: '确认删除该配置？',
            content: '删除后无法恢复，且如果该配置正在使用中，系统将回退到默认设置。',
            okText: '确认删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await axios.delete(`${baseUrl}/config/${id}`);
                    message.success('删除成功');
                    fetchConfigs();
                } catch (error) {
                    message.error('删除失败');
                }
            }
        });
    };

    const handleActivate = async (id: string) => {
        try {
            await axios.post(`${baseUrl}/config/${id}/activate`);
            message.success('已成功切换模型');
            fetchConfigs();
        } catch (error) {
            message.error('切换失败');
        }
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            if (editingConfig) {
                // 如果 API Key 没填，则不更新 Key
                const updateData = { ...values };
                if (!updateData.api_key) delete updateData.api_key;

                await axios.put(`${baseUrl}/config/${editingConfig.id}`, updateData);
                message.success('更新成功');
            } else {
                await axios.post(`${baseUrl}/config/`, values);
                message.success('创建成功');
            }
            setModalVisible(false);
            fetchConfigs();
        } catch (error) {
            console.error(error);
        }
    };

    const columns = [
        {
            title: '状态',
            dataIndex: 'is_active',
            key: 'is_active',
            width: 120,
            align: 'center' as const,
            render: (isActive: boolean, record: AIConfig) => (
                isActive ?
                    <Tag color="success" icon={<CheckCircleOutlined />}>正在使用</Tag> :
                    <Button size="small" type="primary" ghost onClick={() => handleActivate(record.id)}>启用</Button>
            )
        },
        {
            title: '供应商',
            dataIndex: 'provider',
            key: 'provider',
            width: 140,
            render: (text: string) => <Text strong style={{ fontSize: 14 }}>{text}</Text>
        },
        {
            title: '模型名称',
            dataIndex: 'model_name',
            key: 'model_name',
            width: 280,
            render: (text: string) => <Tag color="blue" style={{ fontSize: 13 }}>{text}</Tag>
        },
        {
            title: 'API Key',
            dataIndex: 'api_key',
            key: 'api_key',
            width: 180,
            render: (text: string) => <code style={{ fontSize: 12 }}>{text}</code>
        },
        {
            title: 'API 代理地址',
            dataIndex: 'api_base',
            key: 'api_base',
            ellipsis: true,
            render: (text: string) => text ? <code style={{ fontSize: 12 }}>{text}</code> : <Text type="secondary">默认</Text>
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            align: 'center' as const,
            render: (_: any, record: AIConfig) => (
                <Space size="small">
                    <Tooltip title="编辑">
                        <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    </Tooltip>
                    <Tooltip title="删除">
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
                    </Tooltip>
                </Space>
            )
        }
    ];

    return (
        <div className="model-settings-container">
            <div className="settings-header">
                <Row align="middle" justify="space-between">
                    <Col>
                        <Title level={2}><SettingOutlined /> AI 模型设置</Title>
                        <Text type="secondary">自主选择不同的 AI 大模型供应商，平衡成本与性能</Text>
                    </Col>
                    <Col>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            size="large"
                            onClick={handleAdd}
                            className="add-config-btn"
                        >
                            添加新模型配置
                        </Button>
                    </Col>
                </Row>
            </div>

            <Row gutter={24} style={{ marginTop: 24 }}>
                <Col xs={24} lg={17}>
                    <Card className="settings-card">
                        <Table
                            columns={columns}
                            dataSource={configs}
                            rowKey="id"
                            loading={loading}
                            pagination={false}
                            scroll={{ x: 1000 }}
                        />
                        {configs.every(c => !c.is_active) && (
                            <Alert
                                message="当前正在使用环境变量中定义的默认配置"
                                type="info"
                                showIcon
                                style={{ marginTop: 16 }}
                            />
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={7}>
                    <Card title={<><BulbOutlined /> 配置指南</>} className="guide-card">
                        <Space direction="vertical" size="middle">
                            <div className="guide-item">
                                <Text strong><LinkOutlined /> DeepSeek</Text>
                                <Paragraph type="secondary">
                                    极致性价比。Base URL: <code>https://api.deepseek.com</code>
                                </Paragraph>
                            </div>
                            <div className="guide-item">
                                <Text strong><SafetyCertificateOutlined /> Claude 3.5 Sonnet</Text>
                                <Paragraph type="secondary">
                                    代码与逻辑王者，推荐用于深度简历分析与建议。
                                </Paragraph>
                            </div>
                            <div className="guide-item">
                                <Text strong><KeyOutlined /> OpenAI gpt-4o</Text>
                                <Paragraph type="secondary">
                                    全能型选手，具备最强识图能力，支持截图分析 JD。
                                </Paragraph>
                            </div>
                            <Alert
                                type="warning"
                                message="数据安全"
                                description="您的 API Key 将加密存储在本地数据库中，仅用于调用 AI 接口。"
                                showIcon
                            />
                        </Space>
                    </Card>
                </Col>
            </Row>

            <Modal
                title={editingConfig ? "编辑模型配置" : "添加模型配置"}
                open={modalVisible}
                onOk={handleModalOk}
                onCancel={() => setModalVisible(false)}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ is_active: false }}
                    style={{ marginTop: 16 }}
                >
                    <Form.Item
                        name="provider"
                        label="供应商名称 (如: DeepSeek, OpenAI)"
                        rules={[{ required: true, message: '请输入供应商名称' }]}
                    >
                        <Input placeholder="例如: OpenAI" />
                    </Form.Item>
                    <Form.Item
                        name="model_name"
                        label="具体模型名称"
                        rules={[{ required: true, message: '请输入模型名称' }]}
                    >
                        <Input placeholder="例如: gpt-4o 或 deepseek-chat" />
                    </Form.Item>
                    <Form.Item
                        name="api_key"
                        label={editingConfig ? "API Key (留空表示不修改)" : "API Key"}
                        rules={[{ required: !editingConfig, message: '请输入 API Key' }]}
                    >
                        <Input.Password placeholder="sk-..." />
                    </Form.Item>
                    <Form.Item
                        name="api_base"
                        label="API 代理地址 (选填)"
                    >
                        <Input placeholder="默认为 https://api.openai.com/v1" />
                    </Form.Item>
                    <Form.Item
                        name="is_active"
                        label="立即启用"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ModelSettings;
