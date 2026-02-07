import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, message } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import './Auth.css'

interface RegisterForm {
    username: string
    email: string
    password: string
    confirmPassword: string
}

const Register: React.FC = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    const onFinish = async (values: RegisterForm) => {
        setLoading(true)
        try {
            // TODO: 调用注册 API
            console.log('注册信息:', values)

            // 模拟 API 调用
            await new Promise(resolve => setTimeout(resolve, 1000))

            message.success('注册成功！请登录')
            navigate('/login')
        } catch (error) {
            message.error('注册失败，请稍后重试')
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
                        <h1 className="auth-title">创建账号</h1>
                        <p className="auth-subtitle">开始你的智能简历优化之旅</p>
                    </div>

                    <Form
                        name="register"
                        onFinish={onFinish}
                        autoComplete="off"
                        size="large"
                    >
                        <Form.Item
                            name="username"
                            rules={[
                                { required: true, message: '请输入用户名' },
                                { min: 3, message: '用户名至少 3 位' },
                                { max: 20, message: '用户名最多 20 位' }
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="用户名"
                            />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            rules={[
                                { required: true, message: '请输入邮箱地址' },
                                { type: 'email', message: '请输入有效的邮箱地址' }
                            ]}
                        >
                            <Input
                                prefix={<MailOutlined />}
                                placeholder="邮箱地址"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[
                                { required: true, message: '请输入密码' },
                                { min: 8, message: '密码至少 8 位' }
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="密码"
                            />
                        </Form.Item>

                        <Form.Item
                            name="confirmPassword"
                            dependencies={['password']}
                            rules={[
                                { required: true, message: '请确认密码' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) {
                                            return Promise.resolve()
                                        }
                                        return Promise.reject(new Error('两次输入的密码不一致'))
                                    },
                                }),
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="确认密码"
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
                                注册
                            </Button>
                        </Form.Item>

                        <div className="auth-footer">
                            <span>已有账号？</span>
                            <Link to="/login" className="auth-link">立即登录</Link>
                        </div>
                    </Form>
                </div>

                <div className="auth-features">
                    <div className="feature-item">
                        <div className="feature-icon">🎯</div>
                        <h3>快速上手</h3>
                        <p>简单几步即可开始使用</p>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">🔒</div>
                        <h3>安全可靠</h3>
                        <p>数据加密存储，隐私有保障</p>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">💡</div>
                        <h3>智能推荐</h3>
                        <p>AI 驱动的个性化建议</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Register
