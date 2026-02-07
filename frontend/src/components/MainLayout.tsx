import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Space } from 'antd';
import {
    DashboardOutlined,
    ThunderboltOutlined,
    DatabaseOutlined,
    UserOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    SettingOutlined,
    SearchOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: '概览仪表盘',
        },
        {
            key: '/match',
            icon: <ThunderboltOutlined />,
            label: '智能匹配分析',
        },
        {
            key: '/library',
            icon: <DatabaseOutlined />,
            label: '我的资料库',
        },
        {
            key: '/jobs/create',
            icon: <ThunderboltOutlined />,
            label: '职位极速录入',
        },
        {
            key: '/jobs/search',
            icon: <SearchOutlined />,
            label: '职位智能搜索',
        },
        {
            key: '/settings/model',
            icon: <SettingOutlined />,
            label: 'AI 模型设置',
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} theme="light" style={{ boxShadow: '2px 0 8px 0 rgba(29,33,41,.05)' }}>
                <div style={{ height: 64, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <div style={{ width: 32, height: 32, background: '#1890ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}>
                        <ThunderboltOutlined style={{ color: '#fff', fontSize: 18 }} />
                    </div>
                    {!collapsed && <span style={{ marginLeft: 12, fontWeight: 700, fontSize: 18, color: '#1a1a1a', whiteSpace: 'nowrap' }}>AI 智能简历</span>}
                </div>
                <Menu
                    theme="light"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                    style={{ borderRight: 0 }}
                />
            </Sider>
            <Layout>
                <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', zIndex: 1 }}>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: '16px', width: 64, height: 64 }}
                    />
                    <Space size={24}>
                        <Dropdown menu={{
                            items: [
                                { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
                                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true, onClick: () => navigate('/login') }
                            ]
                        }}>
                            <Space style={{ cursor: 'pointer' }}>
                                <Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} />
                                <span style={{ fontWeight: 500 }}>张伟</span>
                            </Space>
                        </Dropdown>
                    </Space>
                </Header>
                <Content style={{ minHeight: 280, background: '#f5f7fa', overflow: 'initial' }}>
                    {children}
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
