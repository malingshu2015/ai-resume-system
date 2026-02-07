import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Statistic, List, Typography, Skeleton } from 'antd'
import {
    FileTextOutlined,
    ProjectOutlined,
    BarChartOutlined,
    RocketOutlined,
    UploadOutlined,
    PlusOutlined,
    ThunderboltOutlined,
    RiseOutlined,
    BulbOutlined
} from '@ant-design/icons'
import axios from 'axios'
import './Dashboard.css'

const { Title, Text } = Typography

const Dashboard: React.FC = () => {
    const navigate = useNavigate()
    const [stats, setStats] = useState<any>(null)
    const [activities, setActivities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

    const fetchDashboardData = async () => {
        try {
            const [statsRes, activitiesRes] = await Promise.all([
                axios.get(`${baseUrl}/dashboard/stats`),
                axios.get(`${baseUrl}/dashboard/recent`)
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
        { title: '简历库总量', value: stats?.resumes || 0, icon: <FileTextOutlined />, color: '#1890ff' },
        { title: '管理职位数', value: stats?.jobs || 0, icon: <ProjectOutlined />, color: '#52c41a' },
        { title: '匹配分析数', value: stats?.matches || 0, icon: <BarChartOutlined />, color: '#faad14' },
        { title: '平均匹配度', value: stats?.avg_score || 0, suffix: '%', icon: <RiseOutlined />, color: '#f5222d' },
    ]

    return (
        <div className="dashboard-container">
            <div className="dashboard-header-modern">
                <div className="welcome-text">
                    <Title level={2}>下午好，<span className="user-name">张伟</span></Title>
                    <Text type="secondary" className="dashboard-subtitle">您当前拥有 {stats?.resumes || 0} 份已解析简历，继续您的职业优化之旅吧。</Text>
                </div>
            </div>

            {/* 统计卡片 */}
            <Row gutter={[20, 20]} className="stats-row">
                {statCards.map((stat, index) => (
                    <Col xs={24} sm={12} lg={6} key={index}>
                        <Skeleton loading={loading} active avatar>
                            <Card className="modern-stat-card">
                                <div className="stat-content-wrapper">
                                    <div className="stat-icon-box" style={{ background: `${stat.color}15`, color: stat.color }}>
                                        {stat.icon}
                                    </div>
                                    <div className="stat-details">
                                        <Statistic
                                            title={stat.title}
                                            value={stat.value}
                                            suffix={stat.suffix}
                                            valueStyle={{ color: '#1a1a1a', fontWeight: 700, fontSize: '24px' }}
                                        />
                                    </div>
                                </div>
                            </Card>
                        </Skeleton>
                    </Col>
                ))}
            </Row>

            <Row gutter={[20, 20]} className="content-row">
                {/* 最近动态 */}
                <Col xs={24} lg={16}>
                    <Card title="人才库最新动态" className="modern-activity-card">
                        <Skeleton loading={loading} active>
                            <List
                                dataSource={activities}
                                renderItem={(item) => (
                                    <List.Item className="activity-item-refined">
                                        <List.Item.Meta
                                            avatar={
                                                <div className={`activity-avatar-icon type-${item.type}`}>
                                                    {item.type === 'upload' ? <FileTextOutlined /> :
                                                        item.type === 'match' ? <ThunderboltOutlined /> :
                                                            <PlusOutlined />}
                                                </div>
                                            }
                                            title={<Text strong>{item.title}</Text>}
                                            description={<Text type="secondary" style={{ fontSize: '12px' }}>{new Date(item.time).toLocaleString()}</Text>}
                                        />
                                        <div className={`modern-status-tag status-${item.type}`}>
                                            {item.status}
                                        </div>
                                    </List.Item>
                                )}
                                locale={{ emptyText: '最近暂无动态，开始上传第一份简历吧' }}
                            />
                        </Skeleton>
                    </Card>
                </Col>

                {/* 快速操作 */}
                <Col xs={24} lg={8}>
                    <Card title="功能直达" className="modern-quick-actions-card">
                        <div className="quick-action-grid">
                            <div className="action-item-box primary" onClick={() => navigate('/library')}>
                                <div className="action-icon"><UploadOutlined /></div>
                                <div className="action-label">上传简历</div>
                            </div>
                            <div className="action-item-box" onClick={() => navigate('/jobs/create')}>
                                <div className="action-icon"><PlusOutlined /></div>
                                <div className="action-label">录入职位</div>
                            </div>
                            <div className="action-item-box accent" onClick={() => navigate('/match')}>
                                <div className="action-icon"><ThunderboltOutlined /></div>
                                <div className="action-label">开始匹配</div>
                            </div>
                            <div className="action-item-box disabled">
                                <div className="action-icon"><RocketOutlined /></div>
                                <div className="action-label">生成报告</div>
                            </div>
                        </div>

                        <div className="pro-tips">
                            <div className="tips-header"><BulbOutlined /> 专家建议</div>
                            <p>匹配度达到 80% 以上的简历，建议针对缺失技能进行小幅改写。</p>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    )
}

export default Dashboard
