import React, { useState, useEffect } from 'react';
import {
    Card, Form, Input, Button, Table, Tag, Space, message,
    Modal, Typography, Row, Col, Statistic, Alert, Tooltip, Divider
} from 'antd';
import {
    SearchOutlined, ReloadOutlined, ImportOutlined,
    DeleteOutlined, CheckCircleOutlined, ClockCircleOutlined,
    EnvironmentOutlined, DollarOutlined, LinkOutlined
} from '@ant-design/icons';
import axios from 'axios';
import './JobSearch.css';

const { Title, Text, Paragraph } = Typography;

interface SearchTask {
    id: string;
    keyword: string;
    location: string;
    status: string;
    total_found: number;
    total_saved: number;
    created_at: string;
    completed_at: string | null;
}

interface CrawledJob {
    id: string;
    task_id: string;
    title: string;
    company: string;
    location: string;
    salary_range: string | null;
    description: string;
    source_url: string | null;
    source_platform: string | null;
    parse_status: string;
    is_imported: boolean;
    created_at: string;
}

const JobSearch: React.FC = () => {
    const [form] = Form.useForm();
    const [searching, setSearching] = useState(false);
    const [tasks, setTasks] = useState<SearchTask[]>([]);
    const [jobs, setJobs] = useState<CrawledJob[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedJob, setSelectedJob] = useState<CrawledJob | null>(null);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

    useEffect(() => {
        fetchTasks();
        fetchJobs();
    }, []);

    const fetchTasks = async () => {
        try {
            const response = await axios.get(`${baseUrl}/job-search/tasks`);
            setTasks(response.data);
        } catch (error) {
            console.error('获取任务列表失败', error);
        }
    };

    const fetchJobs = async (taskId?: string) => {
        setLoading(true);
        try {
            const params = taskId ? { task_id: taskId } : {};
            const response = await axios.get(`${baseUrl}/job-search/crawled-jobs`, { params });
            setJobs(response.data);
        } catch (error) {
            message.error('获取职位列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (values: any) => {
        setSearching(true);
        try {
            const response = await axios.post(`${baseUrl}/job-search/search`, {
                keyword: values.keyword,
                location: values.location,
                max_results: 20
            });

            message.success(response.data.message);

            // 刷新任务列表
            setTimeout(() => {
                fetchTasks();
                fetchJobs();
            }, 2000);

        } catch (error: any) {
            message.error(error.response?.data?.detail || '搜索失败');
        } finally {
            setSearching(false);
        }
    };

    const handleImportJob = async (jobId: string) => {
        try {
            await axios.post(`${baseUrl}/job-search/crawled-jobs/${jobId}/import`);
            message.success('职位已导入到正式库');
            fetchJobs(selectedTask || undefined);
        } catch (error: any) {
            message.error(error.response?.data?.detail || '导入失败');
        }
    };

    const handleDeleteJob = (jobId: string) => {
        Modal.confirm({
            title: '确认删除该职位？',
            content: '删除后无法恢复',
            okText: '确认',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await axios.delete(`${baseUrl}/job-search/crawled-jobs/${jobId}`);
                    message.success('删除成功');
                    fetchJobs(selectedTask || undefined);
                } catch (error) {
                    message.error('删除失败');
                }
            }
        });
    };

    const showJobDetail = (job: CrawledJob) => {
        setSelectedJob(job);
        setDetailModalVisible(true);
    };

    const taskColumns = [
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => {
                const statusMap: any = {
                    'completed': { color: 'success', icon: <CheckCircleOutlined />, text: '已完成' },
                    'running': { color: 'processing', icon: <ClockCircleOutlined />, text: '进行中' },
                    'pending': { color: 'default', icon: <ClockCircleOutlined />, text: '等待中' },
                    'failed': { color: 'error', icon: <ClockCircleOutlined />, text: '失败' }
                };
                const s = statusMap[status] || statusMap['pending'];
                return <Tag color={s.color} icon={s.icon}>{s.text}</Tag>;
            }
        },
        {
            title: '关键词',
            dataIndex: 'keyword',
            key: 'keyword',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: '地点',
            dataIndex: 'location',
            key: 'location',
            render: (text: string) => <><EnvironmentOutlined /> {text}</>
        },
        {
            title: '找到/保存',
            key: 'stats',
            render: (_: any, record: SearchTask) => (
                <Text>{record.total_found} / <Text type="success">{record.total_saved}</Text></Text>
            )
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (text: string) => new Date(text).toLocaleString('zh-CN')
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            render: (_: any, record: SearchTask) => (
                <Button
                    size="small"
                    type="link"
                    onClick={() => {
                        setSelectedTask(record.id);
                        fetchJobs(record.id);
                    }}
                >
                    查看职位
                </Button>
            )
        }
    ];

    const jobColumns = [
        {
            title: '职位信息',
            key: 'info',
            render: (_: any, record: CrawledJob) => (
                <div>
                    <div>
                        <Text strong style={{ fontSize: 15 }}>{record.title}</Text>
                        {record.is_imported && <Tag color="green" style={{ marginLeft: 8 }}>已导入</Tag>}
                    </div>
                    <div style={{ marginTop: 4 }}>
                        <Text type="secondary">{record.company}</Text>
                        <Divider type="vertical" />
                        <Text type="secondary"><EnvironmentOutlined /> {record.location}</Text>
                        {record.salary_range && (
                            <>
                                <Divider type="vertical" />
                                <Text type="secondary"><DollarOutlined /> {record.salary_range}</Text>
                            </>
                        )}
                    </div>
                </div>
            )
        },
        {
            title: '来源',
            dataIndex: 'source_platform',
            key: 'source_platform',
            width: 120,
            render: (text: string) => <Tag>{text || '未知'}</Tag>
        },
        {
            title: '解析状态',
            dataIndex: 'parse_status',
            key: 'parse_status',
            width: 100,
            render: (status: string) => {
                const statusMap: any = {
                    'parsed': { color: 'success', text: '已解析' },
                    'pending': { color: 'processing', text: '待解析' },
                    'failed': { color: 'error', text: '失败' }
                };
                const s = statusMap[status] || statusMap['pending'];
                return <Tag color={s.color}>{s.text}</Tag>;
            }
        },
        {
            title: '操作',
            key: 'action',
            width: 150,
            render: (_: any, record: CrawledJob) => (
                <Space size="small">
                    <Tooltip title="查看详情">
                        <Button
                            type="text"
                            icon={<LinkOutlined />}
                            onClick={() => showJobDetail(record)}
                        />
                    </Tooltip>
                    {!record.is_imported && (
                        <Tooltip title="导入到职位库">
                            <Button
                                type="text"
                                icon={<ImportOutlined />}
                                onClick={() => handleImportJob(record.id)}
                            />
                        </Tooltip>
                    )}
                    <Tooltip title="删除">
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDeleteJob(record.id)}
                        />
                    </Tooltip>
                </Space>
            )
        }
    ];

    const completedTasks = tasks.filter(t => t.status === 'completed');
    const totalJobs = completedTasks.reduce((sum, t) => sum + t.total_saved, 0);

    return (
        <div className="job-search-container">
            <div className="search-header">
                <Title level={2}><SearchOutlined /> 职位智能搜索</Title>
                <Text type="secondary">从互联网搜索最新职位，自动采集并智能解析</Text>
            </div>

            <Row gutter={24} style={{ marginTop: 24 }}>
                <Col span={24}>
                    <Card className="search-card">
                        <Form
                            form={form}
                            layout="inline"
                            onFinish={handleSearch}
                            style={{ marginBottom: 0 }}
                        >
                            <Form.Item
                                name="keyword"
                                rules={[{ required: true, message: '请输入关键词' }]}
                                style={{ flex: 1 }}
                            >
                                <Input
                                    placeholder="输入职位关键词，如：安全、大模型、前端"
                                    size="large"
                                />
                            </Form.Item>
                            <Form.Item
                                name="location"
                                rules={[{ required: true, message: '请输入地点' }]}
                                style={{ width: 200 }}
                            >
                                <Input
                                    placeholder="如：深圳、上海"
                                    size="large"
                                    prefix={<EnvironmentOutlined />}
                                />
                            </Form.Item>
                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    loading={searching}
                                    icon={<SearchOutlined />}
                                >
                                    开始搜索
                                </Button>
                            </Form.Item>
                            <Form.Item>
                                <Button
                                    size="large"
                                    icon={<ReloadOutlined />}
                                    onClick={() => {
                                        fetchTasks();
                                        fetchJobs();
                                    }}
                                >
                                    刷新
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>
            </Row>

            <Row gutter={16} style={{ marginTop: 24 }}>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="搜索任务"
                            value={tasks.length}
                            suffix="个"
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="已完成任务"
                            value={completedTasks.length}
                            suffix="个"
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="采集职位"
                            value={totalJobs}
                            suffix="个"
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card
                title="搜索任务历史"
                style={{ marginTop: 24 }}
                extra={selectedTask && (
                    <Button size="small" onClick={() => {
                        setSelectedTask(null);
                        fetchJobs();
                    }}>
                        显示全部职位
                    </Button>
                )}
            >
                <Table
                    columns={taskColumns}
                    dataSource={tasks}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    size="small"
                />
            </Card>

            <Card
                title={selectedTask ? "任务职位列表" : "采集职位库"}
                style={{ marginTop: 24 }}
            >
                {selectedTask && (
                    <Alert
                        message={`正在查看任务 ${tasks.find(t => t.id === selectedTask)?.keyword} 的职位`}
                        type="info"
                        closable
                        onClose={() => {
                            setSelectedTask(null);
                            fetchJobs();
                        }}
                        style={{ marginBottom: 16 }}
                    />
                )}
                <Table
                    columns={jobColumns}
                    dataSource={jobs}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                />
            </Card>

            <Modal
                title="职位详情"
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                footer={null}
                width={800}
            >
                {selectedJob && (
                    <div>
                        <Title level={4}>{selectedJob.title}</Title>
                        <Paragraph>
                            <Text strong>公司：</Text>{selectedJob.company}<br />
                            <Text strong>地点：</Text>{selectedJob.location}<br />
                            {selectedJob.salary_range && (
                                <><Text strong>薪资：</Text>{selectedJob.salary_range}<br /></>
                            )}
                            <Text strong>来源：</Text>{selectedJob.source_platform}<br />
                        </Paragraph>
                        <Divider />
                        <Title level={5}>职位描述</Title>
                        <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                            {selectedJob.description}
                        </Paragraph>
                        {selectedJob.source_url && (
                            <>
                                <Divider />
                                <a href={selectedJob.source_url} target="_blank" rel="noopener noreferrer">
                                    查看原始链接 <LinkOutlined />
                                </a>
                            </>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default JobSearch;
