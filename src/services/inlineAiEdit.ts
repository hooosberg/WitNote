/**
 * 内联 AI 编辑服务
 * 对选中的文字执行 AI 处理（编辑、问答、格式化等）
 * 支持 WebLLM / Ollama / Cloud API 三种引擎
 */

import { UseEngineStoreReturn } from '../store/engineStore'

export interface AIProcessResult {
    type: 'edit' | 'ask'
    content: string
}

/**
 * 对选中的文字进行 AI 处理
 * @param instruction 用户指令
 * @param selectedText 选中的原文
 * @param engineStore engineStore 实例
 * @returns AI 处理结果（包含类型和内容）
 */
export async function aiProcessText(
    instruction: string,
    selectedText: string,
    engineStore: UseEngineStoreReturn
): Promise<AIProcessResult> {
    const systemPrompt = `你是一个智能文本助手。用户会给你一段选中的文字和一个指令。
请根据指令对文字进行处理，并以 JSON 格式返回（不要用 markdown 代码块包裹，只返回纯 JSON）：
{"type": "edit" 或 "ask", "content": "处理后的内容"}

规则：
- type 为 "edit"：指令是编辑操作（润色、改写、翻译、简化、格式化、用 markdown 整理等），content 只返回修改后的文字
- type 为 "ask"：指令是提问、分析、总结、解释、评价等，content 返回回答内容
- 如果指令不明确，按最合理的理解处理`

    const userPrompt = `原文：${selectedText}\n指令：${instruction}`

    const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt }
    ]

    let responseText = ''

    switch (engineStore.currentEngine) {
        case 'webllm': {
            const engine = engineStore.getEngine()
            if (!engine || !engineStore.webllmReady) {
                throw new Error('WebLLM 引擎未就绪')
            }
            console.log('🤖 AI 处理: 使用 WebLLM')
            const response = await engine.chat.completions.create({
                messages,
                stream: false
            })
            responseText = response.choices?.[0]?.message?.content || ''
            break
        }

        case 'ollama': {
            const ollamaModel = localStorage.getItem('zen-selected-ollama-model')
                || engineStore.ollamaModels?.[0]?.name

            if (!ollamaModel) {
                throw new Error('Ollama 没有可用模型')
            }

            const ollamaHost = engineStore.ollamaConfig?.host || '127.0.0.1'
            const ollamaPort = engineStore.ollamaConfig?.port || 11434
            const ollamaBaseUrl = `http://${ollamaHost}:${ollamaPort}`

            console.log('🤖 AI 处理: 使用 Ollama 模型', ollamaModel)

            const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: ollamaModel,
                    messages,
                    stream: false
                })
            })

            if (!response.ok) {
                throw new Error(`Ollama 请求失败: ${response.status}`)
            }

            const data = await response.json()
            responseText = data.message?.content || ''
            break
        }

        case 'openai': {
            const engine = engineStore.getEngine()
            if (!engine || typeof engine.chat !== 'function') {
                throw new Error('Cloud API 引擎未初始化')
            }

            console.log('🤖 AI 处理: 使用 Cloud API')

            try {
                responseText = await engine.chat(messages)
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    throw new Error('请求被取消')
                }
                throw error
            }
            break
        }

        default:
            throw new Error(`不支持的引擎: ${engineStore.currentEngine}`)
    }

    // 清理结果
    responseText = responseText.trim()

    // 过滤思考模型的思考内容
    responseText = responseText.replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '').trim()
    responseText = responseText.replace(/<thinking[^>]*>[\s\S]*?<\/thinking>/gi, '').trim()

    // 尝试解析 JSON
    try {
        // 如果 AI 用 markdown 代码块包裹了 JSON，提取出来
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? jsonMatch[0] : responseText
        const result = JSON.parse(jsonStr) as AIProcessResult
        if (result.type && result.content) {
            return {
                type: result.type === 'edit' ? 'edit' : 'ask',
                content: result.content.trim()
            }
        }
    } catch {
        // JSON 解析失败，降级处理
    }

    // 降级：如果 AI 没有返回 JSON，根据指令判断类型
    const askKeywords = ['?', '？', '分析', '总结', '解释', '评价', '评论', '看法', '意思', '含义', '为什么', '如何', '什么']
    const isAsk = askKeywords.some(k => instruction.includes(k))
    return {
        type: isAsk ? 'ask' : 'edit',
        content: responseText
    }
}
