/**
 * useAutocomplete Hook
 * 智能文字联想功能 - 实时生成续写建议
 * 
 * 增强功能：
 * - 输入时触发（原有）
 * - 点击文章末尾时触发
 * - 接受建议后连续触发
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { UseEngineStoreReturn } from '../store/engineStore'

interface UseAutocompleteOptions {
    /** 输入防抖延迟（毫秒） */
    debounceMs?: number
    /** 最大上下文长度 */
    maxContextLength?: number
    /** 最大建议 token 数 */
    maxTokens?: number
    /** 是否启用 */
    enabled?: boolean
    /** 自定义提示词（空则使用默认） */
    customPrompt?: string
}

interface UseAutocompleteResult {
    /** 当前建议文字 */
    suggestion: string | null
    /** 是否正在加载建议 */
    isLoading: boolean
    /** 当前光标位置（用于镜像层定位） */
    cursorPosition: number
    /** 当前内容（用于镜像层渲染） */
    lastContent: string
    /** 接受当前建议，返回插入的文字和是否还有剩余 */
    acceptSuggestion: () => { text: string, hasRemaining: boolean } | null
    /** 手动更新上下文状态（不触发生成） */
    updateContext: (content: string, cursorPos: number) => void
    /** 取消当前建议 */
    dismissSuggestion: () => void
    /** 处理输入变化 */
    handleInput: (content: string, cursorPos: number) => void
    /** 处理光标位置变化（点击、选择等场景） */
    handleCursorChange: (content: string, cursorPos: number) => void
    /** 处理键盘事件，返回 true 表示已处理（阻止默认行为） */
    handleKeyDown: (e: React.KeyboardEvent) => boolean
    /** 触发连续续写（在接受建议后调用） */
    triggerContinuation: (content: string, cursorPos: number) => void
}

// AI 续写 prompt - 三个级别
// 精简版 - 适合小模型（<3B参数）
export const AUTOCOMPLETE_PROMPT_LITE = `续写以下文字，不要重复已有内容，直接输出新内容。`

// 标准版 - 适合中等模型（3B-7B参数）
export const AUTOCOMPLETE_PROMPT_STANDARD = `你是续写助手。从用户文字的最后一个字之后开始续写。
规则：
1. 不要重复已有内容，只输出新内容
2. 名言诗句按原文补全，其他自然续写
3. 通常续写一句话即可`

// 完整版 - 适合大模型（>7B参数）
export const AUTOCOMPLETE_PROMPT_FULL = `你是一个写作续写助手。用户会给你一段文字，你需要从文字的最后一个字之后开始续写。

【最重要规则】
- 绝对不要重复用户提供的任何文字！你的输出应该是全新的内容，紧接在用户文字之后。
- 用户文字的最后几个字是续写的起点标记，你要从这之后开始写新内容。

【其他规则】
1. 只输出续写的新内容，不要任何解释或前缀
2. 如果识别到名人名言、著名诗句、经典语录或成语典故，按原文准确补全
3. 固定搭配如"不仅...而且..."按惯用法补全
4. 其他情况自然流畅地续写，符合上下文风格
5. 保持简洁，通常续写一句话即可`

// 获取指定级别的提示词
export function getAutocompletePromptByLevel(level: 'lite' | 'standard' | 'full'): string {
    switch (level) {
        case 'lite': return AUTOCOMPLETE_PROMPT_LITE
        case 'standard': return AUTOCOMPLETE_PROMPT_STANDARD
        case 'full': return AUTOCOMPLETE_PROMPT_FULL
        default: return AUTOCOMPLETE_PROMPT_STANDARD
    }
}

// 默认使用标准版
const AUTOCOMPLETE_SYSTEM_PROMPT = AUTOCOMPLETE_PROMPT_STANDARD

export function useAutocomplete(
    engineStore: UseEngineStoreReturn,
    options: UseAutocompleteOptions = {}
): UseAutocompleteResult {
    const {
        debounceMs = 500,
        maxContextLength = 500,
        maxTokens = 50,
        enabled = true,
        customPrompt = ''
    } = options

    // 使用用户自定义提示词或默认提示词
    const systemPrompt = customPrompt.trim() || AUTOCOMPLETE_SYSTEM_PROMPT

    const [suggestion, setSuggestion] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // 用于防抖和取消请求
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)
    const lastContentRef = useRef<string>('')
    const lastCursorRef = useRef<number>(0)

    // 清理函数
    const cleanup = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = null
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
    }, [])

    // 组件卸载时清理
    useEffect(() => {
        return cleanup
    }, [cleanup])

    // 取消建议
    const dismissSuggestion = useCallback(() => {
        cleanup()
        setSuggestion(null)
        setIsLoading(false)
    }, [cleanup])

    // 接受建议，返回要插入的文字
    const acceptSuggestion = useCallback((): { text: string, hasRemaining: boolean } | null => {
        if (!suggestion) return null

        // 查找第一个标点符号位置
        const punctuationRegex = /([，。！？；：,.!?:;\n])/
        const match = suggestion.match(punctuationRegex)

        let splitIndex = suggestion.length
        if (match && match.index !== undefined) {
            // 包含标点符号
            splitIndex = match.index + 1
        }

        const text = suggestion.slice(0, splitIndex)
        const remainder = suggestion.slice(splitIndex)
        const hasRemaining = remainder.length > 0

        if (hasRemaining) {
            // 如果还有剩余，更新建议为剩余部分
            setSuggestion(remainder)
            // 保持 loading 状态为 false（因为不需要重新加载）
        } else {
            // 如果全部接受，清理状态
            setSuggestion(null)
            setIsLoading(false)
        }

        return { text, hasRemaining }
    }, [suggestion])

    // 手动更新上下文（用于部分接受后的状态同步）
    const updateContext = useCallback((content: string, cursorPos: number) => {
        lastContentRef.current = content
        lastCursorRef.current = cursorPos
    }, [])

    // 调用 AI 生成建议
    const generateSuggestion = useCallback(async (context: string) => {
        if (!enabled || !context.trim()) {
            return
        }

        console.log('🔮 Autocomplete generateSuggestion:', { engine: engineStore.currentEngine })

        // 创建新的 AbortController
        abortControllerRef.current = new AbortController()
        setIsLoading(true)

        try {
            // 提取最后几个字作为续写起点提示，帮助 AI 理解从哪里开始
            const lastChars = context.slice(-15).trim()
            const messages = [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user', content: `请续写以下文字（从最后一个字之后开始，不要重复任何已有内容）：

${context}

【提示】上文结尾是"${lastChars}"，请直接输出续写的新内容：`
                }
            ]

            // 记录生成信息用于调试
            engineStore.setLastGenerationInfo({
                timestamp: Date.now(),
                model: engineStore.selectedModel,
                systemPrompt,
                userContext: context,
                contextLength: context.length
            })

            let responseText = ''

            switch (engineStore.currentEngine) {
                case 'webllm': {
                    // 检查 WebLLM 引擎状态
                    const engine = engineStore.getEngine()
                    if (!engine || !engineStore.webllmReady) {
                        console.log('⚠️ Autocomplete: WebLLM 未就绪')
                        return
                    }
                    console.log('🔮 Autocomplete: 使用 WebLLM')
                    const response = await engine.chat.completions.create({
                        messages,
                        max_tokens: maxTokens,
                        stream: false
                    })
                    responseText = response.choices?.[0]?.message?.content || ''
                    break
                }

                case 'ollama': {
                    // Ollama: 直接使用 HTTP API，不依赖 getEngine()
                    const ollamaModel = localStorage.getItem('zen-selected-ollama-model')
                        || engineStore.ollamaModels?.[0]?.name

                    if (!ollamaModel) {
                        console.log('⚠️ Autocomplete: Ollama 没有可用模型')
                        return
                    }

                    // 检测思考型模型（Qwen3、DeepSeek-R1 等）
                    // 这类模型会先输出大量思考过程，不适合用于自动续写
                    const isThinkingModel = ollamaModel.toLowerCase().includes('qwen3') ||
                        ollamaModel.toLowerCase().includes('deepseek-r1') ||
                        ollamaModel.toLowerCase().includes('qwq')

                    if (isThinkingModel) {
                        console.log('⚠️ Autocomplete: 思考型模型不支持智能续写，跳过', ollamaModel)
                        return
                    }


                    // 从 engineStore 获取 Ollama 配置（兼容用户自定义地址）
                    const ollamaHost = engineStore.ollamaConfig?.host || '127.0.0.1'
                    const ollamaPort = engineStore.ollamaConfig?.port || 11434
                    const ollamaBaseUrl = `http://${ollamaHost}:${ollamaPort}`

                    console.log('🔮 Autocomplete: 使用 Ollama 模型', ollamaModel, '地址:', ollamaBaseUrl)

                    const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: ollamaModel,
                            messages,
                            stream: false,
                            options: {
                                num_predict: maxTokens
                            }
                        }),
                        signal: abortControllerRef.current.signal
                    })

                    if (!response.ok) {
                        throw new Error(`Ollama 请求失败: ${response.status}`)
                    }

                    const data = await response.json()
                    responseText = data.message?.content || ''
                    break
                }

                case 'openai': {
                    // Cloud API - 使用 OpenAIEngine 的 chat 方法（内部使用流式请求避免 CORS 问题）
                    const engine = engineStore.getEngine()
                    if (!engine || typeof engine.chat !== 'function') {
                        console.log('⚠️ Autocomplete: Cloud API 引擎未初始化')
                        return
                    }

                    console.log('🔮 Autocomplete: 使用 Cloud API')

                    try {
                        responseText = await engine.chat(messages, {
                            signal: abortControllerRef.current.signal
                        })
                    } catch (error) {
                        if (error instanceof Error && error.name === 'AbortError') {
                            // 请求被取消，静默处理
                            return
                        }
                        throw error
                    }
                    break
                }

                default:
                    console.log('⚠️ Autocomplete: 不支持的引擎', engineStore.currentEngine)
                    return
            }

            // 清理续写结果
            responseText = responseText.trim()

            // 过滤掉思考模型的思考内容（适用于 Qwen3、DeepSeek-R1 等）
            // 1. 过滤 <think>...</think> 标签
            responseText = responseText.replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '').trim()
            // 2. 过滤 <thinking>...</thinking> 标签
            responseText = responseText.replace(/<thinking[^>]*>[\s\S]*?<\/thinking>/gi, '').trim()
            // 3. 过滤未闭合的思考标签（如果响应被截断）
            responseText = responseText.replace(/<think[^>]*>[\s\S]*/gi, '').trim()
            responseText = responseText.replace(/<thinking[^>]*>[\s\S]*/gi, '').trim()
            // 4. 过滤开头的中文思考内容（以"嗯，"、"好的，"、"让我"等开头的分析性内容）
            // 如果第一段是思考性内容，尝试提取实际续写部分
            if (responseText.match(/^(嗯，|好的，|好，|让我|首先|我需要|用户|这个|看起来)/)) {
                // 尝试找到可能的实际输出部分（通常在换行后或引号后）
                const lines = responseText.split('\n').filter(l => l.trim())
                // 如果有多行，跳过看起来像分析的前几行
                if (lines.length > 1) {
                    // 找到第一个不像分析的行
                    const contentIndex = lines.findIndex(l =>
                        !l.match(/^(嗯，|好的，|好，|让我|首先|我需要|用户|这个|看起来|分析|理解|根据|可能|应该)/)
                    )
                    if (contentIndex > 0 && contentIndex < lines.length) {
                        responseText = lines.slice(contentIndex).join('\n').trim()
                    }
                }
            }

            // 设置建议
            if (responseText) {
                console.log('🔮 Autocomplete: 生成建议:', responseText.slice(0, 50))
                setSuggestion(responseText)
            }

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                // 请求被取消，忽略
                return
            }
            console.error('Autocomplete 生成失败:', error)
        } finally {
            setIsLoading(false)
        }
    }, [enabled, engineStore, maxTokens, systemPrompt])

    // 内部触发函数（共用逻辑）
    const triggerGeneration = useCallback((content: string, cursorPos: number, delay: number = debounceMs) => {
        if (!enabled) {
            return
        }

        // 保存当前状态
        lastContentRef.current = content
        lastCursorRef.current = cursorPos

        // 取消之前的请求和建议
        cleanup()
        setSuggestion(null)

        // 获取光标前的上下文
        const contextStart = Math.max(0, cursorPos - maxContextLength)
        const context = content.substring(contextStart, cursorPos)

        // 如果上下文太短，不触发（至少需要 5 个字符）
        if (context.trim().length < 5) {
            console.log('🔮 Autocomplete: 上下文太短')
            return
        }

        console.log('🔮 Autocomplete: 设置防抖定时器', delay, 'ms')

        // 设置防抖定时器
        debounceTimerRef.current = setTimeout(() => {
            console.log('🔮 Autocomplete: 触发生成建议')
            generateSuggestion(context)
        }, delay)
    }, [enabled, cleanup, maxContextLength, debounceMs, generateSuggestion])

    // 处理输入变化
    const handleInput = useCallback((content: string, cursorPos: number) => {
        console.log('🔮 Autocomplete handleInput:', { enabled, cursorPos, contentLength: content.length })
        triggerGeneration(content, cursorPos)
    }, [enabled, triggerGeneration])

    // 处理光标位置变化（点击、选择等场景）
    // 只在光标在文章末尾时触发
    // 处理光标位置变化（点击、选择等场景）
    // 策略：光标在文末，或光标在段落末尾（后面是换行符）时触发
    const handleCursorChange = useCallback((content: string, cursorPos: number) => {
        if (!enabled) return

        // 1. 文末
        const isAtEOF = cursorPos >= content.length

        // 2. 段落末尾 (光标后是换行符)
        const isAtLineEnd = content[cursorPos] === '\n'

        if ((isAtEOF || isAtLineEnd) && content.trim().length >= 5) {
            console.log('🔮 Autocomplete: 光标在段落/文末，触发续写')
            triggerGeneration(content, cursorPos, debounceMs) // 保持一致的延迟
        }
    }, [enabled, triggerGeneration, debounceMs])

    // 触发连续续写（在接受建议后调用）
    const triggerContinuation = useCallback((content: string, cursorPos: number) => {
        if (!enabled) return

        console.log('🔮 Autocomplete: 触发连续续写')
        // 使用较短的延迟，让续写更快触发
        triggerGeneration(content, cursorPos, debounceMs)
    }, [enabled, triggerGeneration, debounceMs])

    // 处理键盘事件
    const handleKeyDown = useCallback((e: React.KeyboardEvent): boolean => {
        if (!suggestion) return false

        if (e.key === 'Tab') {
            e.preventDefault()
            // Tab 接受建议
            return true // 返回 true 表示需要接受
        }

        if (e.key === 'Escape') {
            e.preventDefault()
            dismissSuggestion()
            return false
        }

        // 其他键（如方向键、字母键等）取消建议
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
                dismissSuggestion()
            }
        }

        return false
    }, [suggestion, dismissSuggestion])

    return {
        suggestion,
        isLoading,
        cursorPosition: lastCursorRef.current,
        lastContent: lastContentRef.current,
        acceptSuggestion,
        updateContext,
        dismissSuggestion,
        handleInput,
        handleCursorChange,
        handleKeyDown,
        triggerContinuation
    }
}

export default useAutocomplete
