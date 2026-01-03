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

// AI 续写 prompt
const AUTOCOMPLETE_SYSTEM_PROMPT = `你是一个写作助手。根据用户提供的上下文，直接续写接下来的内容。
规则：
1. 只输出续写内容，不要解释
2. 不要重复已有内容
3. 如果识别到用户正在引用名人名言、著名诗句、经典语录或成语典故，请按照原文准确补全，保持引用的完整性
4. 如果是固定搭配或常用表达（如"不仅...而且..."、"因为...所以..."等），按照惯用法补全
5. 其他情况下，续写应该自然流畅，根据前后语意和上下文风格进行自然补全
6. 保持简洁，通常续写一句话即可`

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
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `续写以下内容：\n\n${context}` }
            ]

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

                    console.log('🔮 Autocomplete: 使用 Ollama 模型', ollamaModel)

                    const response = await fetch('http://localhost:11434/api/chat', {
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
                    // Cloud API
                    const baseUrl = engineStore.cloudConfig?.baseUrl || 'https://api.openai.com/v1'
                    const apiKey = engineStore.cloudConfig?.apiKey
                    const modelName = engineStore.cloudConfig?.modelName || 'gpt-3.5-turbo'

                    if (!apiKey) {
                        console.log('⚠️ Autocomplete: Cloud API 未配置 Key')
                        return
                    }

                    console.log('🔮 Autocomplete: 使用 Cloud API')

                    const response = await fetch(`${baseUrl}/chat/completions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: modelName,
                            messages,
                            max_tokens: maxTokens,
                            stream: false
                        }),
                        signal: abortControllerRef.current.signal
                    })

                    if (!response.ok) {
                        throw new Error(`Cloud API 请求失败: ${response.status}`)
                    }

                    const data = await response.json()
                    responseText = data.choices?.[0]?.message?.content || ''
                    break
                }

                default:
                    console.log('⚠️ Autocomplete: 不支持的引擎', engineStore.currentEngine)
                    return
            }

            // 清理续写结果
            responseText = responseText.trim()

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
