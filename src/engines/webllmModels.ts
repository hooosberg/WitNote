/**
 * WebLLM 模型配置
 * 简化版：只保留内置 Qwen 0.5B 模型
 * 注意：WebLLM 有已知的 BindingError 问题，建议使用 Ollama
 */

export interface WebLLMModelInfo {
    model_id: string;
    displayName: string;
    size: string;
    expectedBytes: number;
    description: string;
    isBuiltIn?: boolean;
}

/**
 * WebLLM 模型列表（仅内置模型）
 */
export const ALL_WEBLLM_MODELS_INFO: WebLLMModelInfo[] = [
    {
        model_id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
        displayName: 'Qwen 2.5 0.5B',
        size: '290MB',
        expectedBytes: 290,
        description: '轻量模型，适合快速体验',
        isBuiltIn: true
    }
];

export const DEFAULT_WEBLLM_MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

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
