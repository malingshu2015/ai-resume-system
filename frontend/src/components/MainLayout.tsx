import { Layout, Menu, Avatar, Dropdown, Typography } from 'antd'
import {
    HomeOutlined,
    FileTextOutlined,
    AimOutlined,
    ThunderboltOutlined,
    SettingOutlined,
    UserOutlined,
    LogoutOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'

const { Sider, Content } = Layout
const { Title, Text } = Typography

const MainLayout: React.FC = () => {
    const location = useLocation()
    const navigate = useNavigate()

    const menuItems = [
        { key: '/', icon: <HomeOutlined />, label: '概览' },
        { key: '/resume', icon: <FileTextOutlined />, label: '简历库' },
        { key: '/jobs', icon: <AimOutlined />, label: '职位库' },
        { key: '/match', icon: <ThunderboltOutlined />, label: '智能匹配' },
        { key: '/settings', icon: <SettingOutlined />, label: '设置' },
    ]

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                width={260}
                style={{
                    background: '#F5F5F7',
                    borderRight: '1px solid #E5E5EA',
                    position: 'fixed',
                    height: '100vh',
                    left: 0,
                    zIndex: 100
                }}
            >
                <div style={{ padding: '32px 24px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '40px',
                        padding: '0 12px'
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            background: '#007AFF',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <ThunderboltOutlined style={{ color: 'white', fontSize: '18px' }} />
                        </div>
                        <span style={{
                            fontSize: '20px',
                            fontWeight: 700,
                            color: '#1D1D1F',
                            letterSpacing: '-0.5px'
                        }}>AI Resume</span>
                    </div>

                    <Menu
                        mode="inline"
                        selectedKeys={[location.pathname]}
                        onClick={({ key }) => navigate(key)}
                        items={menuItems}
                        style={{ border: 'none', background: 'transparent' }}
                    />

                    <div style={{ position: 'absolute', bottom: 32, left: 24, right: 24 }}>
                        <Dropdown menu={{
                            items: [
                                { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
                                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true }
                            ]
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                cursor: 'pointer',
                                borderRadius: '12px',
                                transition: 'background 0.3s'
                            }} className="user-profile-nav">
                                <Avatar icon={<UserOutlined />} />
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }}>Robin Xie</div>
                                    <div style={{ fontSize: '12px', color: '#86868B' }}>高级用户</div>
                                </div>
                            </div>
                        </Dropdown>
                    </div>
                </div>
            </Sider>

            <Layout style={{ marginLeft: 260, background: 'var(--apple-bg)' }}>
                <Content style={{
                    padding: '40px 60px',
                    maxWidth: '1300px',
                    margin: '0',
                    width: '100%',
                    minHeight: '100vh'
                }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    )
}

export default MainLayout
