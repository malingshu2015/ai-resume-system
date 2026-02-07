import React, { useState } from 'react';
import { Card, Tabs, Space, Typography } from 'antd';
import {
    DatabaseOutlined,
    FileTextOutlined,
    AimOutlined
} from '@ant-design/icons';
import ResumeList from './resumes/ResumeList';
import JobList from './jobs/JobList';
import './Library.css';

const { Title, Text } = Typography;

const Library: React.FC = () => {
    const [activeTab, setActiveTab] = useState('resumes');

    return (
        <div className="library-page">
            <div className="library-header">
                <Title level={2}><DatabaseOutlined /> 资料库</Title>
                <Text type="secondary">管理您的简历资产和目标职位，这些数据将用于 AI 匹配分析。</Text>
            </div>

            <Card className="library-content-card">
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: 'resumes',
                            label: (
                                <Space>
                                    <FileTextOutlined />
                                    我的简历
                                </Space>
                            ),
                            children: <ResumeList showHeader={false} />
                        },
                        {
                            key: 'jobs',
                            label: (
                                <Space>
                                    <AimOutlined />
                                    目标职位 (JD)
                                </Space>
                            ),
                            children: <JobList showHeader={false} />
                        }
                    ]}
                />
            </Card>
        </div>
    );
};

export default Library;
