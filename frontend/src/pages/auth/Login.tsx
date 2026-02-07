import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import './Auth.css'

interface LoginForm {
    email: string
    password: string
}

const Login: React.FC = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    const onFinish = async (values: LoginForm) => {
        setLoading(true)
        try {
            // TODO: 调用登录 API
            console.log('登录信息:', values)

            // 模拟 API 调用
            await new Promise(resolve => setTimeout(resolve, 1000))

            message.success('登录成功！')
            navigate('/dashboard')
        } catch (error) {
            message.error('登录失败，请检查用户名和密码')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-background">
                <div className="auth-background-overlay"></div>
            </div>

            <div className="auth-content">
                <div className="auth-card">
                    <div className="auth-header">
                        <h1 className="auth-title">AI 智能简历优化</h1>
                        <p className="auth-subtitle">让你的简历脱颖而出</p>
                    </div>

                    <Form
                        name="login"
                        onFinish={onFinish}
                        autoComplete="off"
                        size="large"
                    >
                        <Form.Item
                            name="email"
                            rules={[
                                { required: true, message: '请输入邮箱地址' },
                                { type: 'email', message: '请输入有效的邮箱地址' }
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="邮箱地址"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[
                                { required: true, message: '请输入密码' },
                                { min: 6, message: '密码至少 6 位' }
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="密码"
                            />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                block
                                className="auth-button"
                            >
                                登录
                            </Button>
                        </Form.Item>

                        <div className="auth-footer">
                            <span>还没有账号？</span>
                            <Link to="/register" className="auth-link">立即注册</Link>
                        </div>
                    </Form>
                </div>

                <div className="auth-features">
                    <div className="feature-item">
                        <div className="feature-icon">🔍</div>
                        <h3>智能解析</h3>
                        <p>AI 自动提取简历信息</p>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">📊</div>
                        <h3>精准匹配</h3>
                        <p>计算简历与职位匹配度</p>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">✨</div>
                        <h3>智能优化</h3>
                        <p>生成针对性优化建议</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login
