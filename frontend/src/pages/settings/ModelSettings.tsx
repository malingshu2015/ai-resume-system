import React, { useState, useEffect } from 'react';
import {
    Card, Table, Button, Modal, Form, Input, message,
    Tag, Space, Typography, Alert, Row, Col, Divider
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    CloudServerOutlined, SwapOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { API_ENDPOINTS } from '../../api';
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


    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_ENDPOINTS.CONFIG}/`);
            const data = Array.isArray(response.data) ? response.data : response.data?.data || []
            setConfigs(data);
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
            api_key: ''
        });
        setModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: '确认删除？',
            content: '删除后无法恢复，且如果您删除了正在使用的模型，系统将回退到默认设置。',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            centered: true,
            onOk: async () => {
                try {
                    await axios.delete(`${API_ENDPOINTS.CONFIG}/${id}`);
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
            await axios.post(`${API_ENDPOINTS.CONFIG}/${id}/activate`);
            message.success('已应用新模型配置');
            fetchConfigs();
        } catch (error) {
            message.error('应用失败');
        }
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            if (editingConfig) {
                const updateData = { ...values };
                if (!updateData.api_key) delete updateData.api_key;
                await axios.put(`${API_ENDPOINTS.CONFIG}/${editingConfig.id}`, updateData);
                message.success('更新成功');
            } else {
                await axios.post(`${API_ENDPOINTS.CONFIG}/`, values);
                message.success('配置已添加');
            }
            setModalVisible(false);
            fetchConfigs();
        } catch (error) {
            console.error(error);
        }
    };

    const columns = [
        {
            title: '模型服务',
            key: 'model_info',
            render: (_: any, record: AIConfig) => (
                <Space size={12}>
                    <div className="apple-icon-circle purple">
                        <CloudServerOutlined />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 15, display: 'block' }}>{record.provider}</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>{record.model_name}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: '状态',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (isActive: boolean, record: AIConfig) => (
                isActive ?
                    <Tag color="success" style={{ borderRadius: 12 }}>活动中</Tag> :
                    <Button type="text" size="small" onClick={() => handleActivate(record.id)}>启用</Button>
            )
        },
        {
            title: 'API 代理',
            dataIndex: 'api_base',
            key: 'api_base',
            render: (text: string) => <Text type="secondary" style={{ fontSize: 13 }}>{text || '系统默认'}</Text>
        },
        {
            title: '',
            key: 'action',
            align: 'right' as const,
            render: (_: any, record: AIConfig) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
                </Space>
            )
        }
    ];

    return (
        <div className="settings-container">
            <div className="page-header">
                <div className="header-left">
                    <Title level={1}>系统设置</Title>
                    <Text type="secondary" style={{ fontSize: 17 }}>
                        您可以自主配置大语言模型 (LLM) 供应商，以获得最佳的解析质量与处理速度。
                    </Text>
                </div>
                <div className="header-right">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={handleAdd}
                        style={{ height: 48, borderRadius: 24, padding: '0 24px' }}
                    >
                        添加模型
                    </Button>
                </div>
            </div>

            <Row gutter={[32, 32]}>
                <Col xs={24} lg={16}>
                    <Card className="apple-card shadow-soft" title="模型配置列表">
                        <Table
                            columns={columns}
                            dataSource={configs}
                            rowKey="id"
                            loading={loading}
                            pagination={false}
                            className="apple-table"
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="配置建议" className="apple-card shadow-soft bg-faint">
                        <Space direction="vertical" size={24}>
                            <div className="guide-box">
                                <Title level={5}><SwapOutlined /> 推荐模型</Title>
                                <Paragraph type="secondary">
                                    如果你追求解析速度，推荐使用 <strong>DeepSeek-V3</strong>；如果您追求匹配深度与文案质量，<strong>Claude 3.5 Sonnet</strong> 是最佳选择。
                                </Paragraph>
                            </div>
                            <Divider style={{ margin: 0 }} />
                            <Alert
                                message="全数据隐私保护"
                                description="您的 API Key 仅在本地加密缓存，不会被上传或用于训练。系统直接与供应商 API 通信。"
                                type="info"
                                showIcon
                                style={{ borderRadius: 12 }}
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
                okText="保存"
                cancelText="取消"
                centered
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ is_active: false }}
                    style={{ marginTop: 20 }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="provider" label="供应商名称" rules={[{ required: true }]}>
                                <Input placeholder="如: OpenAI" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="model_name" label="模型名称" rules={[{ required: true }]}>
                                <Input placeholder="如: gpt-4o" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="api_key" label="API Key" rules={[{ required: !editingConfig }]}>
                        <Input.Password placeholder="sk-..." />
                    </Form.Item>
                    <Form.Item name="api_base" label="API 代理地址 (可选)">
                        <Input placeholder="https://api.example.com/v1" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ModelSettings;
