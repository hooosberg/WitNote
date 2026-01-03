/**
 * WebLLM 模型配置
 * 支持多种尺寸的本地 AI 模型
 * 注意：更大的模型需要更多 GPU 内存
 */

export interface WebLLMModelInfo {
    model_id: string;
    displayName: string;
    size: string;
    expectedBytes: number;
    description: string;
    /** 详细特点描述 */
    features?: string;
    /** 推荐场景 */
    recommended?: string;
    isBuiltIn?: boolean;
}

/**
 * WebLLM 模型列表
 * 按尺寸从小到大排列
 */
export const ALL_WEBLLM_MODELS_INFO: WebLLMModelInfo[] = [
    // ===== 轻量级模型（适合快速响应、自动补齐）=====
    {
        model_id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
        displayName: 'Qwen 2.5 0.5B',
        size: '290MB',
        expectedBytes: 290,
        description: '极轻量，响应快速',
        features: '体积最小，下载快，适合文字补齐',
        recommended: '快速预览、简单问答',
        isBuiltIn: true
    },
    {
        model_id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
        displayName: 'Qwen 2.5 1.5B',
        size: '880MB',
        expectedBytes: 880,
        description: '轻量级，质量平衡',
        features: '3倍参数，明显更聪明，仍然轻量',
        recommended: '日常写作、智能补齐',
        isBuiltIn: false
    },
    // ===== 中等模型（适合对话、写作）=====
    {
        model_id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
        displayName: 'Qwen 2.5 3B',
        size: '1.8GB',
        expectedBytes: 1800,
        description: '推荐！质量与速度平衡',
        features: '质量显著提升，创意写作更佳',
        recommended: '文章创作、深度对话',
        isBuiltIn: false
    },
    // ===== 大型模型（适合复杂任务）=====
    {
        model_id: 'Qwen2.5-7B-Instruct-q4f16_1-MLC',
        displayName: 'Qwen 2.5 7B',
        size: '4.1GB',
        expectedBytes: 4100,
        description: '最强大，需要较好硬件',
        features: '最佳质量，复杂推理能力强',
        recommended: '专业写作、代码辅助',
        isBuiltIn: false
    },
    // ===== Llama 系列（备选）=====
    {
        model_id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
        displayName: 'Llama 3.2 3B',
        size: '1.8GB',
        expectedBytes: 1800,
        description: 'Meta Llama 系列',
        features: '多语言支持，擅长英文',
        recommended: '英文写作、翻译辅助',
        isBuiltIn: false
    },
    {
        model_id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
        displayName: 'Phi 3.5 Mini',
        size: '2.0GB',
        expectedBytes: 2000,
        description: '微软 Phi 系列',
        features: '推理能力强，代码友好',
        recommended: '逻辑分析、编程辅助',
        isBuiltIn: false
    }
];

// 默认推荐 1.5B 模型（性价比最高）
export const DEFAULT_WEBLLM_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

/**
 * 验证模型下载完整性
 * @param modelId 模型 ID
 * @param actualBytes 实际下载的字节数（MB）
 * @returns 是否完整（允许 10% 误差）
 */
export function verifyModelIntegrity(modelId: string, actualBytes: number): boolean {
    const model = ALL_WEBLLM_MODELS_INFO.find(m => m.model_id === modelId);
    if (!model) return true; // 未知模型不验证

    const tolerance = 0.1; // 允许 10% 误差
    const minBytes = model.expectedBytes * (1 - tolerance);
    const maxBytes = model.expectedBytes * (1 + tolerance);

    return actualBytes >= minBytes && actualBytes <= maxBytes;
}

/**
 * 获取模型预期大小（MB）
 */
export function getExpectedModelSize(modelId: string): number | null {
    const model = ALL_WEBLLM_MODELS_INFO.find(m => m.model_id === modelId);
    return model?.expectedBytes || null;
}
