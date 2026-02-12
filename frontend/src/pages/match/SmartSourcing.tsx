import React, { useState } from 'react';
import {
    Card,
    Input,
    Button,
    Tag,
    Row,
    Col,
    Typography,
    Space,
    message,
    Spin,
    Empty,
    Statistic,
    Modal,
    Descriptions,
    Badge
} from 'antd';
import {
    SearchOutlined,
    EnvironmentOutlined,
    TeamOutlined,
    ArrowRightOutlined,
    RocketOutlined,
    GlobalOutlined,
    ExportOutlined,
    ImportOutlined,
    FileSearchOutlined,
    DollarOutlined,
    BookOutlined,
    CalendarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SmartSourcing.css';

const { Title, Text, Paragraph } = Typography;

interface SourcingResult {
    job: {
        title: string;
        company: string;
        location: string;
        salary_range: string;
        description: string;
        source_platform: string;
        source_url: string;
        experience_required?: string;
        education?: string;
        publish_date?: string;
    };
    best_match: {
        id: string;
        name: string;
        score: number;
    } | null;
}

const SmartSourcing: React.FC = () => {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState('安全架构师');
    const [locations, setLocations] = useState<string[]>(['深圳', '北京', '上海', '广州']);
    const [locInput, setLocInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SourcingResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [importingIndex, setImportingIndex] = useState<number | null>(null);
    const [detailModal, setDetailModal] = useState<{ visible: boolean; job: SourcingResult | null }>({
        visible: false, job: null
    });

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

    /** 执行搜索 */
    const handleSearch = async () => {
        if (!keyword.trim()) {
            message.warning('请输入职位名称');
            return;
        }
        if (locations.length === 0) {
            message.warning('请至少添加一个目标城市');
            return;
        }

        setLoading(true);
        setResults([]);
        setHasSearched(false);
        try {
            const response = await axios.post(`${baseUrl}/job-search/smart-sourcing`, {
                keyword: keyword.trim(),
                locations,
                max_results_per_loc: 10
            });
            const data = response.data.results || [];
            setResults(data);
            setHasSearched(true);
            if (data.length > 0) {
                message.success(`成功寻访到 ${data.length} 个真实职位机会`);
            } else {
                message.info('未在指定城市找到相关职位，请尝试更宽泛的关键词');
            }
        } catch (error) {
            console.error('寻访失败:', error);
            message.error('智能寻访任务失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    /** 查看原网页 */
    const handleViewSource = (url: string) => {
        if (url) {
            window.open(url, '_blank');
        } else {
            message.info('该职位暂无原始链接');
        }
    };

    /**
     * 核心流程：导入职位到本地库 → 跳转到智能匹配页
     * 
     * 这是解决"匹配页面找不到该职位"问题的关键：
     * 1. 把外部职位数据写入 Job 表（status=parsed）
     * 2. 拿到 jobId 后跳转到 /match 并通过 state 传递
     * 3. MatchAnalysis 页面会自动选中该职位
     */
    const handleGoToMatch = async (item: SourcingResult, index: number) => {
        setImportingIndex(index);
        try {
            // 1. 将选中的职位导入本地职位库
            const importRes = await axios.post(`${baseUrl}/job-search/import-external`, {
                title: item.job.title,
                company: item.job.company,
                location: item.job.location,
                salary_range: item.job.salary_range,
                description: item.job.description,
                source_url: item.job.source_url,
                source_platform: item.job.source_platform
            });

            const jobId = importRes.data.job_id;

            if (!jobId) {
                message.error('职位导入失败，请重试');
                return;
            }

            message.success(`"${item.job.title}" 已导入职位库，正在跳转到智能匹配...`);

            // 2. 跳转到匹配分析页面，携带 jobId 和 resumeId
            navigate('/match', {
                state: {
                    jobId: jobId,
                    resumeId: item.best_match?.id || '',
                    fromSourcing: true
                }
            });

        } catch (error) {
            console.error('导入职位失败:', error);
            message.error('职位导入失败，请检查网络连接');
        } finally {
            setImportingIndex(null);
        }
    };

    /** 查看职位详情弹窗 */
    const showJobDetail = (item: SourcingResult) => {
        setDetailModal({ visible: true, job: item });
    };

    const addLocation = () => {
        const trimmed = locInput.trim();
        if (trimmed && !locations.includes(trimmed)) {
            setLocations([...locations, trimmed]);
            setLocInput('');
        }
    };

    const removeLocation = (loc: string) => {
        setLocations(locations.filter(l => l !== loc));
    };

    return (
        <div className="sourcing-container">
            <div className="sourcing-header">
                <Title level={2}>
                    <RocketOutlined /> 智能人才/职位自动寻访系统
                </Title>
                <Paragraph type="secondary">
                    基于全网实时招聘数据，自动检索职位并与人才库简历进行智能匹配。输入关键词和目标城市，一键寻访。
                </Paragraph>
            </div>

            {/* 搜索区域 */}
            <Card className="search-card">
                <Row gutter={24} align="middle">
                    <Col span={8}>
                        <div className="input-group">
                            <Text strong>职位关键词</Text>
                            <Input
                                prefix={<SearchOutlined />}
                                placeholder="例如：安全架构师、网络安全工程师"
                                value={keyword}
                                onChange={e => setKeyword(e.target.value)}
                                onPressEnter={handleSearch}
                                size="large"
                            />
                        </div>
                    </Col>
                    <Col span={12}>
                        <div className="input-group">
                            <Text strong>目标城市</Text>
                            <div className="location-tags">
                                <Input
                                    placeholder="输入城市名并回车"
                                    value={locInput}
                                    onChange={e => setLocInput(e.target.value)}
                                    onPressEnter={addLocation}
                                    style={{ width: 150, marginRight: 8 }}
                                />
                                <div className="tags-list">
                                    {locations.map(loc => (
                                        <Tag
                                            key={loc}
                                            closable
                                            onClose={() => removeLocation(loc)}
                                            color="blue"
                                            className="loc-tag"
                                        >
                                            {loc}
                                        </Tag>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Col>
                    <Col span={4}>
                        <Button
                            type="primary"
                            icon={<RocketOutlined />}
                            size="large"
                            block
                            loading={loading}
                            onClick={handleSearch}
                            className="sourcing-btn"
                        >
                            开始寻访
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* 搜索结果区域 */}
            <div className="results-section">
                <Spin spinning={loading} tip="正在从招聘平台实时检索职位...">
                    {results.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <Text type="secondary">
                                共找到 <Text strong style={{ color: '#1677ff' }}>{results.length}</Text> 个有效职位（仅展示近 3 个月内发布），
                                数据来源于 BOSS 直聘、智联招聘等主流平台
                            </Text>
                        </div>
                    )}

                    {results.length > 0 ? (
                        <div className="results-grid">
                            <Row gutter={[16, 16]}>
                                {results.map((item, index) => (
                                    <Col span={24} key={index}>
                                        <Card className="job-match-card" hoverable>
                                            <Row gutter={24} align="middle">
                                                {/* 左侧：职位信息 */}
                                                <Col span={10}>
                                                    <div className="job-info">
                                                        <div className="job-title-row">
                                                            <Title level={4} className="job-title">
                                                                {item.job.title}
                                                            </Title>
                                                        </div>
                                                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                                            <Text strong style={{ color: '#1677ff' }}>
                                                                {item.job.company}
                                                            </Text>
                                                            <Space split={<Text type="secondary">·</Text>}>
                                                                <Text>
                                                                    <EnvironmentOutlined /> {item.job.location}
                                                                </Text>
                                                                <Text className="salary-text">
                                                                    <DollarOutlined /> {item.job.salary_range}
                                                                </Text>
                                                            </Space>
                                                            <Space size={4}>
                                                                {item.job.experience_required && (
                                                                    <Tag>{item.job.experience_required}</Tag>
                                                                )}
                                                                {item.job.education && (
                                                                    <Tag icon={<BookOutlined />}>{item.job.education}</Tag>
                                                                )}
                                                                <Tag color="processing" icon={<GlobalOutlined />}>
                                                                    {item.job.source_platform}
                                                                </Tag>
                                                                {item.job.publish_date && (
                                                                    <Tag color="cyan" icon={<CalendarOutlined />}>
                                                                        {item.job.publish_date === '未知' ? '近期' : item.job.publish_date}
                                                                    </Tag>
                                                                )}
                                                            </Space>
                                                        </Space>
                                                        <div className="job-actions-row">
                                                            <Button
                                                                type="link"
                                                                size="small"
                                                                icon={<ExportOutlined />}
                                                                onClick={() => handleViewSource(item.job.source_url)}
                                                            >
                                                                查看原网页
                                                            </Button>
                                                            <Button
                                                                type="link"
                                                                size="small"
                                                                icon={<FileSearchOutlined />}
                                                                onClick={() => showJobDetail(item)}
                                                            >
                                                                查看详情
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Col>

                                                {/* 中间：箭头 */}
                                                <Col span={4} style={{ textAlign: 'center' }}>
                                                    <ArrowRightOutlined className="match-arrow" />
                                                </Col>

                                                {/* 右侧：人才匹配信息 */}
                                                <Col span={10}>
                                                    {item.best_match ? (
                                                        <div className="match-info">
                                                            <div className="match-header">
                                                                <TeamOutlined />{' '}
                                                                <Text strong>人才库最佳匹配</Text>
                                                                <Tag
                                                                    color={
                                                                        item.best_match.score > 70
                                                                            ? 'green'
                                                                            : item.best_match.score > 40
                                                                                ? 'orange'
                                                                                : 'default'
                                                                    }
                                                                    className="score-tag"
                                                                >
                                                                    {item.best_match.score.toFixed(1)}% 契合度
                                                                </Tag>
                                                            </div>
                                                            <Text className="matched-name">
                                                                {item.best_match.name}
                                                            </Text>
                                                            <div className="action-btns">
                                                                <Button
                                                                    type="primary"
                                                                    size="small"
                                                                    icon={<ImportOutlined />}
                                                                    loading={importingIndex === index}
                                                                    onClick={() => handleGoToMatch(item, index)}
                                                                >
                                                                    导入并深度分析
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="match-info">
                                                            <Empty
                                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                                description="人才库暂无匹配简历"
                                                            />
                                                            <Button
                                                                type="dashed"
                                                                size="small"
                                                                icon={<ImportOutlined />}
                                                                loading={importingIndex === index}
                                                                onClick={() => handleGoToMatch(item, index)}
                                                                style={{ marginTop: 8 }}
                                                            >
                                                                仍然导入到职位库
                                                            </Button>
                                                        </div>
                                                    )}
                                                </Col>
                                            </Row>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </div>
                    ) : (
                        hasSearched && !loading && (
                            <Empty description="未在指定城市找到相关职位，请尝试更宽泛的关键词" />
                        )
                    )}
                </Spin>

                {/* 引导区域 */}
                {!hasSearched && !loading && (
                    <div className="onboarding">
                        <Row gutter={32}>
                            <Col span={8}>
                                <Card className="feature-intro">
                                    <Statistic
                                        title="实时数据"
                                        value="BOSS直聘"
                                        prefix={<GlobalOutlined />}
                                    />
                                    <Paragraph>
                                        对接百度百聘聚合平台，实时抓取 BOSS 直聘、智联招聘等主流招聘平台的真实职位。
                                    </Paragraph>
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card className="feature-intro">
                                    <Statistic
                                        title="一键导入"
                                        value="秒级"
                                        prefix={<ImportOutlined />}
                                    />
                                    <Paragraph>
                                        点击"导入并深度分析"，职位自动存入本地库，并携带简历跳转到 AI 匹配分析页面。
                                    </Paragraph>
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card className="feature-intro">
                                    <Statistic
                                        title="跨城寻访"
                                        value="全地域"
                                        prefix={<EnvironmentOutlined />}
                                    />
                                    <Paragraph>
                                        支持同时搜索多个城市，系统会并行检索并自动去重，大幅提升寻访效率。
                                    </Paragraph>
                                </Card>
                            </Col>
                        </Row>
                    </div>
                )}
            </div>

            {/* 职位详情弹窗 */}
            <Modal
                title="职位详情"
                open={detailModal.visible}
                onCancel={() => setDetailModal({ visible: false, job: null })}
                footer={
                    detailModal.job && [
                        <Button
                            key="source"
                            icon={<ExportOutlined />}
                            onClick={() => handleViewSource(detailModal.job!.job.source_url)}
                        >
                            查看原网页
                        </Button>,
                        <Button
                            key="import"
                            type="primary"
                            icon={<ImportOutlined />}
                            onClick={() => {
                                handleGoToMatch(detailModal.job!, -1);
                                setDetailModal({ visible: false, job: null });
                            }}
                        >
                            导入并深度分析
                        </Button>
                    ]
                }
                width={600}
            >
                {detailModal.job && (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="职位名称">
                            <Text strong>{detailModal.job.job.title}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="公司">
                            {detailModal.job.job.company}
                        </Descriptions.Item>
                        <Descriptions.Item label="地点">
                            {detailModal.job.job.location}
                        </Descriptions.Item>
                        <Descriptions.Item label="薪资">
                            <Text type="success">{detailModal.job.job.salary_range}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="经验">
                            {detailModal.job.job.experience_required || '不限'}
                        </Descriptions.Item>
                        <Descriptions.Item label="学历">
                            {detailModal.job.job.education || '不限'}
                        </Descriptions.Item>
                        <Descriptions.Item label="来源平台">
                            <Badge status="processing" text={detailModal.job.job.source_platform} />
                        </Descriptions.Item>
                        {detailModal.job.best_match && (
                            <Descriptions.Item label="最佳匹配人才">
                                <Space>
                                    <Text>{detailModal.job.best_match.name}</Text>
                                    <Tag color="green">{detailModal.job.best_match.score.toFixed(1)}% 契合度</Tag>
                                </Space>
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                )}
            </Modal>
        </div>
    );
};

export default SmartSourcing;
