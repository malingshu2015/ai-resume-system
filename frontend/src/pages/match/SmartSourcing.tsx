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
import { CalendarOutlined, SearchOutlined, EnvironmentOutlined, DollarOutlined, ExperimentOutlined, ReadOutlined, GlobalOutlined, RocketOutlined, ArrowRightOutlined, TeamOutlined, ExportOutlined, ImportOutlined, FileSearchOutlined, BookOutlined } from '@ant-design/icons';
import { API_ENDPOINTS } from '../../api';
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
            const response = await axios.post(`${API_ENDPOINTS.JOB_SEARCH}/smart-sourcing`, {
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
                message.info('未在指定城市找到相关职位，请尝试更宽泊的关键词');
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
     */
    const handleGoToMatch = async (item: SourcingResult, index: number) => {
        setImportingIndex(index);
        try {
            // 1. 将选中的职位导入本地职位库
            const importRes = await axios.post(`${API_ENDPOINTS.JOB_SEARCH}/import-external`, {
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

            // 2. 跳转到匹配分析页面
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

    const addLocation = () => {
        if (locInput.trim() && !locations.includes(locInput.trim())) {
            setLocations([...locations, locInput.trim()]);
            setLocInput('');
        }
    };

    const removeLocation = (loc: string) => {
        setLocations(locations.filter(l => l !== loc));
    };

    return (
        <div className="smart-sourcing-container">
            <div className="header-section">
                <Title level={2}><GlobalOutlined /> 智能全网职位寻访</Title>
                <Paragraph type="secondary">
                    输入您的目标职位，AI 将在全网范围内深度实时匹配最适合您的招聘机会，并提供精准推荐。
                </Paragraph>
            </div>

            <Card className="search-card">
                <Row gutter={24} align="bottom">
                    <Col xs={24} md={12}>
                        <div className="input-label">目标职位关键词</div>
                        <Input
                            size="large"
                            placeholder="如：数据安全专家、Python 开发"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onPressEnter={handleSearch}
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                        />
                    </Col>
                    <Col xs={24} md={12}>
                        <div className="input-label">目标城市 (可多选)</div>
                        <div className="city-input-group">
                            <Input
                                size="large"
                                placeholder="输入后回车添加"
                                value={locInput}
                                onChange={(e) => setLocInput(e.target.value)}
                                onPressEnter={addLocation}
                                prefix={<EnvironmentOutlined style={{ color: '#bfbfbf' }} />}
                            />
                            <Button size="large" type="primary" onClick={handleSearch} loading={loading} icon={<SearchOutlined />}>
                                开始全网深度寻访
                            </Button>
                        </div>
                    </Col>
                </Row>
                <div className="location-tags">
                    {locations.map(loc => (
                        <Tag key={loc} closable onClose={() => removeLocation(loc)} className="city-tag">
                            {loc}
                        </Tag>
                    ))}
                </div>
            </Card>

            <div className="results-section">
                {loading ? (
                    <div className="loading-state">
                        <Spin size="large" tip="AI 正在穿透全网招聘信息，精准匹配中..." />
                        <div className="loading-tip">正在实时分析各大招聘平台、行业官网及隐藏招聘动态</div>
                    </div>
                ) : results.length > 0 ? (
                    <Row gutter={[24, 24]}>
                        {results.map((item, index) => (
                            <Col xs={24} lg={12} key={index}>
                                <Card
                                    className="job-result-card"
                                    hoverable
                                    actions={[
                                        <Button type="link" icon={<ExportOutlined />} onClick={() => handleViewSource(item.job.source_url)}>查看源页面</Button>,
                                        <Button
                                            type="primary"
                                            icon={<RocketOutlined />}
                                            loading={importingIndex === index}
                                            onClick={() => handleGoToMatch(item, index)}
                                        >
                                            立即开启智能匹配
                                        </Button>
                                    ]}
                                >
                                    <div className="job-card-header">
                                        <div className="job-title-row">
                                            <Title level={4} className="job-title" ellipsis={{ tooltip: item.job.title }}>{item.job.title}</Title>
                                            <Tag color="blue">{item.job.source_platform}</Tag>
                                        </div>
                                        <div className="company-info">
                                            <Text strong className="company-name">{item.job.company}</Text>
                                        </div>
                                    </div>

                                    <Row className="job-meta-row">
                                        <Col span={8}><EnvironmentOutlined /> {item.job.location}</Col>
                                        <Col span={8}><DollarOutlined /> <Text type="danger" strong>{item.job.salary_range}</Text></Col>
                                        <Col span={8}><CalendarOutlined /> {item.job.publish_date || '近期发布'}</Col>
                                    </Row>

                                    <div className="match-score-section">
                                        <Badge.Ribbon text="推荐度" color={item.best_match && item.best_match.score > 85 ? 'gold' : 'blue'}>
                                            <Card className="match-mini-card">
                                                {item.best_match ? (
                                                    <div className="match-info">
                                                        <Text type="secondary">最佳匹配简历：</Text>
                                                        <Text strong>{item.best_match.name}</Text>
                                                        <div className="score-badge">
                                                            <Statistic
                                                                value={item.best_match.score}
                                                                suffix="%"
                                                                valueStyle={{ color: item.best_match.score > 80 ? '#34C759' : '#007AFF', fontSize: 20 }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="no-match-info">
                                                        <Text type="secondary">暂无可用匹配简历</Text>
                                                    </div>
                                                )}
                                            </Card>
                                        </Badge.Ribbon>
                                    </div>

                                    <Paragraph ellipsis={{ rows: 3 }} className="job-desc-snippet">
                                        {item.job.description}
                                    </Paragraph>

                                    <Button type="text" block onClick={() => setDetailModal({ visible: true, job: item })}>
                                        查看完整内容与分析描述 <ArrowRightOutlined />
                                    </Button>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                ) : hasSearched ? (
                    <Empty description="未寻访到相关职位，建议尝试更换地域或调整关键词" className="empty-state" />
                ) : (
                    <div className="initial-state">
                        <FileSearchOutlined style={{ fontSize: 64, color: '#f0f0f0', marginBottom: 24 }} />
                        <Title level={4} style={{ color: '#bfbfbf' }}>在这里开启全网精准寻访</Title>
                        <Paragraph type="secondary">
                            基于 AI 的深度意图识别技术，为您从全行业精准筛选职位
                        </Paragraph>
                    </div>
                )}
            </div>

            <Modal
                title="职位深度分析视图"
                open={detailModal.visible}
                onCancel={() => setDetailModal({ visible: false, job: null })}
                footer={[
                    <Button key="close" onClick={() => setDetailModal({ visible: false, job: null })}>返回列表</Button>,
                    <Button key="source" icon={<ExportOutlined />} onClick={() => handleViewSource(detailModal.job?.job.source_url || '')}>查看源页面</Button>,
                    <Button key="match" type="primary" icon={<RocketOutlined />} onClick={() => detailModal.job && handleGoToMatch(detailModal.job, -1)}>同步并开启匹配</Button>
                ]}
                width={800}
                className="job-detail-modal"
            >
                {detailModal.job && (
                    <div className="modal-content">
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label="职位名称"><Text strong>{detailModal.job.job.title}</Text></Descriptions.Item>
                            <Descriptions.Item label="公司">{detailModal.job.job.company}</Descriptions.Item>
                            <Descriptions.Item label="薪资">{detailModal.job.job.salary_range}</Descriptions.Item>
                            <Descriptions.Item label="城市">{detailModal.job.job.location}</Descriptions.Item>
                            <Descriptions.Item label="来源平台"><Tag color="blue">{detailModal.job.job.source_platform}</Tag></Descriptions.Item>
                        </Descriptions>
                        <Divider orientation="left">职位详情 (JD)</Divider>
                        <div className="description-text">
                            <Paragraph style={{ whiteSpace: 'pre-line' }}>{detailModal.job.job.description}</Paragraph>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default SmartSourcing;
