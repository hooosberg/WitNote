/**
 * LLM 服务类型定义
 * Ollama-only 架构
 */

// LLM 提供者类型（仅Ollama）
export type LLMProviderType = 'ollama';

// 聊天消息格式
export interface LLMMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// 聊天记录（带 ID）
export interface ChatMessage extends LLMMessage {
    id: string;
    timestamp: number;
    isStreaming?: boolean;
}

// Ollama 模型详情
export interface OllamaModelDetails {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
}

// Ollama 模型信息
export interface OllamaModel {
    name: string;
    size: number;
    digest: string;
    modified_at: string;
    details?: OllamaModelDetails;
    formattedSize?: string; // 用于显示的人类可读大小
}

// Ollama API 响应
export interface OllamaTagsResponse {
    models: OllamaModel[];
}

// Ollama 聊天响应（流式）
export interface OllamaChatChunk {
    model: string;
    created_at: string;
    message: {
        role: string;
        content: string;
    };
    done: boolean;
}

// LLM 状态
export type LLMStatus =
    | 'detecting'     // 正在检测 Ollama
    | 'loading'       // 正在加载模型
    | 'ready'         // 准备就绪
    | 'generating'    // 正在生成
    | 'error';        // 出错

// 模型加载进度
export interface LoadProgress {
    stage: string;
    progress: number;  // 0-100
    text: string;
}

// LLM 提供者接口
export interface LLMProvider {
    type: LLMProviderType;
    modelName: string;

    // 初始化
    initialize(): Promise<void>;

    // 检查状态
    isReady(): boolean;

    // 流式生成
    streamChat(
        messages: LLMMessage[],
        onToken: (token: string) => void,
        onComplete: () => void,
        onError: (error: Error) => void
    ): Promise<void>;

    // 中止生成
    abort(): void;
}

// 系统提示词 - 中文版
export const SYSTEM_PROMPT_ZH = `你是「智简笔记本 WitNote」的写作助手，运行在用户本地设备上。

【核心原则】
- 回答时优先使用下方提供的文件信息和搜索结果
- 如果搜索到相关文件，直接告诉用户找到了哪些文件
- 回答简洁精炼，使用自然流畅的中文

【你的能力】
- 帮用户在笔记库中搜索和查找文件
- 帮助用户润色、修改、续写文章
- 总结内容、提取要点
- 提供写作建议和灵感

【回答风格】
- 不要重复用户的问题
- 直接给出有价值的回答
- 保持友好但专业的语气`;

// 系统提示词 - 英文版
export const SYSTEM_PROMPT_EN = `You are the writing assistant for "WitNote", running locally on the user's device.

【Core Principles】
- Prioritize information from files and search results provided below
- If relevant files are found, tell the user which files were found
- Keep responses concise and clear

【Your Capabilities】
- Search and find files in the user's note library
- Help polish, edit, and continue writing articles
- Summarize content and extract key points
- Provide writing suggestions and inspiration

【Response Style】
- Don't repeat the user's question
- Provide valuable answers directly
- Maintain a friendly but professional tone`;

// 系统提示词 - 日语版
export const SYSTEM_PROMPT_JA = `あなたは、ユーザーのローカルデバイスで動作する「WitNote」の執筆アシスタントです。

【核心原則】
- 下記のファイル情報や検索結果を優先して回答すること
- 関連するファイルが見つかった場合は、どのファイルが見つかったかをユーザーに伝えること
- 回答は簡潔に、自然な日本語を使用すること

【あなたの能力】
- ノートライブラリ内のファイルを検索・発見する
- 記事の推敲、修正、続きの執筆を支援する
- 内容を要約し、要点を抽出する
- 執筆のアドバイスやインスピレーションを提供する

【回答スタイル】
- ユーザーの質問を繰り返さないこと
- 価値のある回答を直接提示すること
- フレンドリーかつプロフェッショナルな口調を保つこと`;

// 系统提示词 - 韩语版
export const SYSTEM_PROMPT_KO = `당신은 사용자의 로컬 디바이스에서 실행되는 "WitNote"의 글쓰기 도우미입니다.

【핵심 원칙】
- 아래 제공된 파일 정보와 검색 결과를 우선하여 답변하십시오
- 관련 파일을 찾은 경우, 어떤 파일을 찾았는지 사용자에게 알려주십시오
- 답변은 간결하고 자연스러운 한국어를 사용하십시오

【당신의 능력】
- 노트 라이브러리에서 파일을 검색하고 찾기
- 기사 다듬기, 수정, 이어 쓰기 지원
- 내용 요약 및 요점 추출
- 글쓰기 조언 및 영감 제공

【답변 스타일】
- 사용자의 질문을 반복하지 마십시오
- 가치 있는 답변을 직접 제시하십시오
- 친근하면서도 전문적인 어조를 유지하십시오`;

// 系统提示词 - 法语版
export const SYSTEM_PROMPT_FR = `Vous êtes l'assistant d'écriture pour "WitNote", fonctionnant localement sur l'appareil de l'utilisateur.

【Principes Fondamentaux】
- Donnez la priorité aux informations des fichiers et aux résultats de recherche fournis ci-dessous
- Si des fichiers pertinents sont trouvés, indiquez à l'utilisateur quels fichiers ont été trouvés
- Gardez des réponses concises et claires

【Vos Capacités】
- Rechercher et trouver des fichiers dans la bibliothèque de notes de l'utilisateur
- Aider à polir, éditer et continuer à écrire des articles
- Résumer le contenu et extraire les points clés
- Fournir des suggestions d'écriture et de l'inspiration

【Style de Réponse】
- Ne répétez pas la question de l'utilisateur
- Fournissez directement des réponses précieuses
- Maintenez un ton amical mais professionnel`;

// 系统提示词 - 德语版
export const SYSTEM_PROMPT_DE = `Sie sind der Schreibassistent für "WitNote", der lokal auf dem Gerät des Benutzers läuft.

【Kernprinzipien】
- Priorisieren Sie Informationen aus den unten bereitgestellten Dateien und Suchergebnissen
- Wenn relevante Dateien gefunden werden, teilen Sie dem Benutzer mit, welche Dateien gefunden wurden
- Halten Sie Antworten prägnant und klar

【Ihre Fähigkeiten】
- Suchen und Finden von Dateien in der Notizbibliothek des Benutzers
- Hilfe beim Polieren, Bearbeiten und Weiterschreiben von Artikeln
- Inhalte zusammenfassen und Kernaussagen extrahieren
- Schreibvorschläge und Inspiration liefern

【Antwortstil】
- Wiederholen Sie nicht die Frage des Benutzers
- Geben Sie direkt wertvolle Antworten
- Behalten Sie einen freundlichen, aber professionellen Ton bei`;

// 系统提示词 - 西班牙语版
export const SYSTEM_PROMPT_ES = `Eres el asistente de escritura para "WitNote", ejecutándose localmente en el dispositivo del usuario.

【Principios Fundamentales】
- Prioriza la información de los archivos y resultados de búsqueda proporcionados a continuación
- Si se encuentran archivos relevantes, dile al usuario qué archivos se encontraron
- Mantén las respuestas concisas y claras

【Tus Capacidades】
- Buscar y encontrar archivos en la biblioteca de notas del usuario
- Ayudar a pulir, editar y continuar escribiendo artículos
- Resumir contenido y extraer puntos clave
- Proporcionar sugerencias de escritura e inspiración

【Estilo de Respuesta】
- No repitas la pregunta del usuario
- Proporciona respuestas valiosas directamente
- Mantén un tono amigable pero profesional`;

// 默认导出中文版（向后兼容）
export const SYSTEM_PROMPT = SYSTEM_PROMPT_ZH;

// 根据语言获取系统提示词
export function getDefaultSystemPrompt(lang: string): string {
    switch (lang) {
        case 'en': return SYSTEM_PROMPT_EN;
        case 'ja': return SYSTEM_PROMPT_JA;
        case 'ko': return SYSTEM_PROMPT_KO;
        case 'fr': return SYSTEM_PROMPT_FR;
        case 'de': return SYSTEM_PROMPT_DE;
        case 'es': return SYSTEM_PROMPT_ES;
        case 'zh':
        default:
            return SYSTEM_PROMPT_ZH;
    }
}

// Ollama 默认配置
export const OLLAMA_BASE_URL = 'http://localhost:11434';
export const OLLAMA_DETECT_TIMEOUT = 3000; // 3秒超时

// 推荐模型列表（按体积从小到大排序）
export interface RecommendedModel {
    name: string;
    taglineKey: string;  // 翻译键，用于多语言
    size: string;
    sizeBytes: number;   // 用于排序
    builtIn?: boolean;
}

// 所有可下载模型（按体积从小到大排序）
export const ALL_MODELS: RecommendedModel[] = [
    {
        name: 'qwen2.5:0.5b',

        taglineKey: 'models.qwen05b',
        size: '397MB',
        sizeBytes: 397,
        builtIn: true
    },
    {
        name: 'gemma3:1b',

        taglineKey: 'models.gemma1b',
        size: '815MB',
        sizeBytes: 815
    },
    {
        name: 'qwen2.5:1.5b',

        taglineKey: 'models.qwen15b',
        size: '986MB',
        sizeBytes: 986
    },
    {
        name: 'llama3.2:1b',

        taglineKey: 'models.llama1b',
        size: '1.3GB',
        sizeBytes: 1300
    },
    {
        name: 'llama3.2:3b',

        taglineKey: 'models.llama3b',
        size: '2.0GB',
        sizeBytes: 2000
    },
    {
        name: 'phi3:mini',

        taglineKey: 'models.phi3mini',
        size: '2.3GB',
        sizeBytes: 2300
    },
    {
        name: 'gemma3:4b',

        taglineKey: 'models.gemma4b',
        size: '3.3GB',
        sizeBytes: 3300
    },
    {
        name: 'mistral:7b',

        taglineKey: 'models.mistral7b',
        size: '4.1GB',
        sizeBytes: 4100
    },
    {
        name: 'qwen2.5:7b',

        taglineKey: 'models.qwen7b',
        size: '4.7GB',
        sizeBytes: 4700
    },
    {
        name: 'gemma3:12b',

        taglineKey: 'models.gemma12b',
        size: '8.1GB',
        sizeBytes: 8100
    },
    {
        name: 'qwen2.5:14b',

        taglineKey: 'models.qwen14b',
        size: '9.0GB',
        sizeBytes: 9000
    },
];

// 兼容旧代码的导出
export const RECOMMENDED_MODELS = ALL_MODELS.slice(0, 5);
export const ADVANCED_MODELS = ALL_MODELS.slice(5);
