import React, { useState, useEffect } from 'react';
import { Card, Button, message, Input, Space, Tag, Tooltip, Modal } from 'antd';
import { EditOutlined, SaveOutlined, BulbOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import './EditableResumePreview.css';

const { TextArea } = Input;

interface EditableResumePreviewProps {
    resumeData: any;
    suggestions?: any;
    onSave?: (updatedData: any) => void;
}

interface EditableSection {
    id: string;
    title: string;
    content: string;
    isEditing: boolean;
    aiSuggestion?: string;
    hasAiSuggestion: boolean;
}

/**
 * 可编辑的简历预览组件
 * 功能：
 * 1. 显示完整简历内容
 * 2. AI 高亮提示可优化的部分
 * 3. 支持人工编辑每个部分
 * 4. 保存修改后的内容
 */
const EditableResumePreview: React.FC<EditableResumePreviewProps> = ({
    resumeData,
    suggestions,
    onSave
}) => {
    const [sections, setSections] = useState<EditableSection[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (resumeData) {
            parseSections();
        }
    }, [resumeData, suggestions]);

    // 解析简历数据为可编辑的章节
    const parseSections = () => {
        const parsed: EditableSection[] = [];

        // 工作经历
        const workExp = resumeData.work_experience || [];
        workExp.forEach((exp: any, index: number) => {
            parsed.push({
                id: `work-${index}`,
                title: `${exp.position} @ ${exp.company}`,
                content: formatWorkExperience(exp),
                isEditing: false,
                aiSuggestion: findAiSuggestion('work', index),
                hasAiSuggestion: !!findAiSuggestion('work', index)
            });
        });

        // 项目经验
        const projects = resumeData.project_experience || [];
        projects.forEach((proj: any, index: number) => {
            parsed.push({
                id: `project-${index}`,
                title: `项目：${proj.name}`,
                content: formatProjectExperience(proj),
                isEditing: false,
                aiSuggestion: findAiSuggestion('project', index),
                hasAiSuggestion: !!findAiSuggestion('project', index)
            });
        });

        // 技能
        const skills = resumeData.skills_sections || [];
        if (skills.length > 0) {
            parsed.push({
                id: 'skills',
                title: '技能',
                content: formatSkills(skills),
                isEditing: false,
                aiSuggestion: findAiSuggestion('skills', 0),
                hasAiSuggestion: !!findAiSuggestion('skills', 0)
            });
        }

        setSections(parsed);
    };

    // 格式化工作经历
    const formatWorkExperience = (exp: any) => {
        let text = `职位：${exp.position}\n`;
        text += `公司：${exp.company}\n`;
        text += `时间：${exp.duration}\n\n`;
        text += `描述：${exp.description}\n\n`;
        text += `成就：\n`;
        (exp.achievements || []).forEach((ach: string, i: number) => {
            text += `${i + 1}. ${ach}\n`;
        });
        return text;
    };

    // 格式化项目经验
    const formatProjectExperience = (proj: any) => {
        let text = `项目名称：${proj.name}\n`;
        text += `角色：${proj.role}\n`;
        text += `时间：${proj.duration}\n\n`;
        text += `描述：${proj.description}\n\n`;
        text += `行动：\n`;
        (proj.actions || []).forEach((action: string, i: number) => {
            text += `${i + 1}. ${action}\n`;
        });
        text += `\n成果：${proj.results}\n`;
        return text;
    };

    // 格式化技能
    const formatSkills = (skills: any[]) => {
        let text = '';
        skills.forEach((section: any) => {
            text += `${section.category}：\n`;
            text += section.skills.join('、') + '\n\n';
        });
        return text;
    };

    // 查找 AI 建议
    const findAiSuggestion = (type: string, index: number): string | undefined => {
        if (!suggestions) return undefined;
        // 这里可以根据实际的 suggestions 数据结构来匹配
        // 示例：返回相关的优化建议
        return undefined;
    };

    // 开始编辑
    const startEdit = (id: string) => {
        setSections(sections.map(s =>
            s.id === id ? { ...s, isEditing: true } : s
        ));
    };

    // 取消编辑
    const cancelEdit = (id: string) => {
        setSections(sections.map(s =>
            s.id === id ? { ...s, isEditing: false } : s
        ));
    };

    // 保存编辑
    const saveEdit = (id: string, newContent: string) => {
        setSections(sections.map(s =>
            s.id === id ? { ...s, content: newContent, isEditing: false } : s
        ));
        setHasChanges(true);
        message.success('修改已保存');
    };

    // 应用 AI 建议
    const applyAiSuggestion = (id: string) => {
        const section = sections.find(s => s.id === id);
        if (section?.aiSuggestion) {
            Modal.confirm({
                title: 'AI 优化建议',
                content: (
                    <div>
                        <p><strong>当前内容：</strong></p>
                        <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, maxHeight: 200, overflow: 'auto' }}>
                            {section.content}
                        </pre>
                        <p style={{ marginTop: 16 }}><strong>AI 建议：</strong></p>
                        <pre style={{ background: '#e6f7ff', padding: 12, borderRadius: 4, maxHeight: 200, overflow: 'auto' }}>
                            {section.aiSuggestion}
                        </pre>
                    </div>
                ),
                okText: '应用建议',
                cancelText: '取消',
                width: 700,
                onOk: () => {
                    setSections(sections.map(s =>
                        s.id === id ? { ...s, content: s.aiSuggestion || s.content, hasAiSuggestion: false } : s
                    ));
                    setHasChanges(true);
                    message.success('已应用 AI 建议');
                }
            });
        }
    };

    // 保存所有修改
    const saveAll = () => {
        // 将修改后的 sections 转换回原始数据格式
        const updatedData = { ...resumeData };

        // 这里需要根据实际数据结构进行转换
        // 示例代码，需要根据实际情况调整

        if (onSave) {
            onSave(updatedData);
        }

        setHasChanges(false);
        message.success('所有修改已保存');
    };

    return (
        <div className="editable-resume-preview">
            <div className="preview-header">
                <Space>
                    <BulbOutlined style={{ color: '#faad14' }} />
                    <span>可编辑简历预览</span>
                    <Tag color="blue">AI 辅助</Tag>
                    <Tag color="green">人工编辑</Tag>
                </Space>
                {hasChanges && (
                    <Button type="primary" icon={<SaveOutlined />} onClick={saveAll}>
                        保存所有修改
                    </Button>
                )}
            </div>

            <div className="sections-container">
                {sections.map(section => (
                    <SectionCard
                        key={section.id}
                        section={section}
                        onStartEdit={startEdit}
                        onCancelEdit={cancelEdit}
                        onSaveEdit={saveEdit}
                        onApplyAi={applyAiSuggestion}
                    />
                ))}
            </div>
        </div>
    );
};

// 章节卡片组件
interface SectionCardProps {
    section: EditableSection;
    onStartEdit: (id: string) => void;
    onCancelEdit: (id: string) => void;
    onSaveEdit: (id: string, content: string) => void;
    onApplyAi: (id: string) => void;
}

const SectionCard: React.FC<SectionCardProps> = ({
    section,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onApplyAi
}) => {
    const [editContent, setEditContent] = useState(section.content);

    useEffect(() => {
        setEditContent(section.content);
    }, [section.content]);

    return (
        <Card
            className={`section-card ${section.hasAiSuggestion ? 'has-ai-suggestion' : ''}`}
            title={
                <Space>
                    <span>{section.title}</span>
                    {section.hasAiSuggestion && (
                        <Tooltip title="AI 有优化建议">
                            <Tag color="orange" icon={<BulbOutlined />}>
                                AI 建议
                            </Tag>
                        </Tooltip>
                    )}
                </Space>
            }
            extra={
                <Space>
                    {section.hasAiSuggestion && !section.isEditing && (
                        <Button
                            type="link"
                            size="small"
                            icon={<BulbOutlined />}
                            onClick={() => onApplyAi(section.id)}
                        >
                            查看 AI 建议
                        </Button>
                    )}
                    {!section.isEditing ? (
                        <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => onStartEdit(section.id)}
                        >
                            编辑
                        </Button>
                    ) : (
                        <>
                            <Button
                                type="link"
                                size="small"
                                icon={<CheckCircleOutlined />}
                                onClick={() => onSaveEdit(section.id, editContent)}
                            >
                                保存
                            </Button>
                            <Button
                                type="link"
                                size="small"
                                danger
                                icon={<CloseCircleOutlined />}
                                onClick={() => {
                                    setEditContent(section.content);
                                    onCancelEdit(section.id);
                                }}
                            >
                                取消
                            </Button>
                        </>
                    )}
                </Space>
            }
        >
            {section.isEditing ? (
                <TextArea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    autoSize={{ minRows: 6, maxRows: 20 }}
                    className="edit-textarea"
                />
            ) : (
                <pre className="section-content">{section.content}</pre>
            )}
        </Card>
    );
};

export default EditableResumePreview;
