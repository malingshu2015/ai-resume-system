import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Statistic, List, Typography, Skeleton, Button, Space } from 'antd'
import {
    FileTextOutlined,
    ProjectOutlined,
    BarChartOutlined,
    PlusOutlined,
    ThunderboltOutlined,
    RiseOutlined,
    BulbOutlined,
    ArrowRightOutlined
} from '@ant-design/icons'
import axios from 'axios'
import { API_ENDPOINTS } from '../api'
import './Dashboard.css'

const { Title, Text, Paragraph } = Typography

const Dashboard: React.FC = () => {
    const navigate = useNavigate()
    const [stats, setStats] = useState<any>(null)
    const [activities, setActivities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchDashboardData = async () => {
        try {
            const [statsRes, activitiesRes] = await Promise.all([
                axios.get(`${API_ENDPOINTS.DASHBOARD}/stats`),
                axios.get(`${API_ENDPOINTS.DASHBOARD}/recent`)
            ])
            setStats(statsRes.data)
            setActivities(activitiesRes.data)
        } catch (error) {
            console.error('加载仪表盘数据失败', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const statCards = [
        { title: '简历库总量', value: stats?.resumes || 0, icon: <FileTextOutlined />, color: '#007AFF' },
        { title: '管理职位数', value: stats?.jobs || 0, icon: <ProjectOutlined />, color: '#34C759' },
        { title: '匹配分析数', value: stats?.matches || 0, icon: <BarChartOutlined />, color: '#5856D6' },
        { title: '平均匹配度', value: stats?.avg_score || 0, suffix: '%', icon: <RiseOutlined />, color: '#FF9500' },
    ]

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <Title level={1} style={{ marginBottom: 8 }}>下午好，张伟</Title>
                    <Text type="secondary" style={{ fontSize: 17 }}>
                        您当前管理着 {stats?.resumes || 0} 份简历，所有的解析与匹配均已就绪。
                    </Text>
                </div>
                <Space>
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/resume')}
                        style={{ height: 48, padding: '0 24px', fontSize: 16 }}
                    >
                        上传新简历
                    </Button>
                </Space>
            </div>

            {/* 统计卡片 */}
            <Row gutter={[24, 24]} className="stats-row">
                {statCards.map((stat, index) => (
                    <Col xs={24} sm={12} lg={6} key={index}>
                        <Skeleton loading={loading} active avatar>
                            <Card className="apple-stat-card">
                                <Statistic
                                    title={<span className="stat-title">{stat.title}</span>}
                                    value={stat.value}
                                    suffix={stat.suffix}
                                    valueStyle={{ color: 'var(--apple-text-primary)', fontWeight: 700, fontSize: '32px', letterSpacing: '-1px' }}
                                />
                                <div className="stat-icon-mini" style={{ color: stat.color }}>
                                    {stat.icon}
                                </div>
                            </Card>
                        </Skeleton>
                    </Col>
                ))}
            </Row>

            <Row gutter={[32, 32]} className="content-row">
                {/* 最近动态 */}
                <Col xs={24} lg={16}>
                    <Card
                        title="最近动态"
                        extra={<Button type="link">查看全部</Button>}
                        className="apple-list-card"
                    >
                        <Skeleton loading={loading} active>
                            <List
                                dataSource={activities}
                                renderItem={(item) => (
                                    <List.Item className="activity-item">
                                        <List.Item.Meta
                                            avatar={
                                                <div className={`activity-icon-bg`}>
                                                    {item.type === 'upload' ? <FileTextOutlined /> :
                                                        item.type === 'match' ? <ThunderboltOutlined /> :
                                                            <PlusOutlined />}
                                                </div>
                                            }
                                            title={<Text strong style={{ fontSize: 16 }}>{item.title}</Text>}
                                            description={<Text type="secondary">{new Date(item.time).toLocaleDateString()} · {item.status}</Text>}
                                        />
                                        <Button type="text" icon={<ArrowRightOutlined />} />
                                    </List.Item>
                                )}
                                locale={{ emptyText: '最近暂无动态' }}
                            />
                        </Skeleton>
                    </Card>
                </Col>

                {/* 快速操作与建议 */}
                <Col xs={24} lg={8}>
                    <Space direction="vertical" size={32} style={{ width: '100%' }}>
                        <Card title="功能直达" className="apple-list-card">
                            <div className="quick-nav-list">
                                <div className="nav-item" onClick={() => navigate('/resume')}>
                                    <div className="nav-icon blue"><FileTextOutlined /></div>
                                    <div className="nav-text">简历工作台</div>
                                    <ArrowRightOutlined className="nav-arrow" />
                                </div>
                                <div className="nav-item" onClick={() => navigate('/jobs')}>
                                    <div className="nav-icon green"><ProjectOutlined /></div>
                                    <div className="nav-text">职位库管理</div>
                                    <ArrowRightOutlined className="nav-arrow" />
                                </div>
                                <div className="nav-item" onClick={() => navigate('/match')}>
                                    <div className="nav-icon purple"><ThunderboltOutlined /></div>
                                    <div className="nav-text">匹配深度分析</div>
                                    <ArrowRightOutlined className="nav-arrow" />
                                </div>
                            </div>
                        </Card>

                        <div className="apple-promo-card">
                            <div className="promo-content">
                                <Title level={4} style={{ color: 'white' }}>专家建议</Title>
                                <Paragraph style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                                    匹配度达到 80% 以上的简历，建议针对缺失技能进行小幅改写。使用 STAR 原则能显著提升通过率。
                                </Paragraph>
                                <Button ghost style={{ borderRadius: 20 }}>了解更多</Button>
                            </div>
                            <BulbOutlined className="promo-icon" />
                        </div>
                    </Space>
                </Col>
            </Row>
        </div>
    )
}

export default Dashboard
