# Privacy Policy / 隐私政策

**Last Updated / 最后更新**: December 25, 2024

---

## 🇺🇸 English Version

### Overview

WitNote ("the Application") is committed to protecting your privacy. This Privacy Policy explains how the Application handles your data based on the AI engine you choose to use.

### Data Collection & Usage

**WitNote itself collects NO user data, analytics, or usage statistics.**

#### 1. Note Data (Local)
- **Local Storage**: All notes and files are stored strictly on your local device in the folders you select.
- **No Sync**: The Application does not upload your notes to any developer-owned servers.

#### 2. AI Processing Modes

The Application offers three AI modes with different privacy characteristics:

*   **Mode A: WebLLM (Built-in)**
    *   **Processing**: 100% Local. The model runs within the application's local webview environment.
    *   **Network Usage**: Internet connection is required ONLY for the initial download of model weights from HuggingFace/MLC. Once downloaded, it works offline.
    *   **Privacy**: Your inputs and outputs never leave your device.

*   **Mode B: Ollama (Local)**
    *   **Processing**: 100% Local. Connects to your locally installed Ollama instance (typically `localhost:11434`).
    *   **Privacy**: Completely offline. Your data stays on your machine.

*   **Mode C: Cloud API (Optional)**
    *   **Processing**: Cloud-based.
    *   **Transmission**: If you explicitly configure a Cloud API (e.g., OpenAI, DeepSeek), your text inputs are sent securely to that specific third-party provider to generate responses.
    *   **Privacy**: Data handling is subject to the privacy policy of the API provider you chose. WitNote acts only as a designated client and does not store or intercept this data.

### Third-Party Services
The Application creates no network connections unless you:
1.  Download a WebLLM model (connects to model repository).
2.  Configure and use a Cloud API (connects to your chosen provider).
3.  Check for App updates.

### Your Rights
Since WitNote does not collect your data:
- You retain full ownership and control of your files.
- You can delete the Application at any time to remove all associated local data (excluding your notes folder, which remains safe).

---

## 🇨🇳 中文版

### 概述

WitNote ("本应用") 致力于保护您的隐私。本隐私政策说明了应用如何根据您选择的 AI 引擎处理您的数据。

### 数据收集与使用

**WitNote 本身不收集任何用户数据、统计信息或行为分析。**

#### 1. 笔记数据 (纯本地)
- **本地存储**: 所有的笔记和文件严格存储在您选择的本地文件夹中。
- **无云端同步**: 本应用不会将您的笔记上传到任何开发者服务器。

#### 2. AI 处理模式

本应用提供三种 AI 模式，其隐私特性如下：

*   **模式 A: WebLLM (内置)**
    *   **处理方式**: 100% 本地运行。模型在应用的本地视图环境中运行。
    *   **网络使用**: 仅在首次从 HuggingFace/MLC下载模型权重时需要网络。下载完成后可完全离线使用。
    *   **隐私性**: 您的输入和输出永远不会离开您的设备。

*   **模式 B: Ollama (本地)**
    *   **处理方式**: 100% 本地运行。连接到您本机安装的 Ollama 服务 (通常为 `localhost:11434`)。
    *   **隐私性**: 完全离线。您的数据完全保留在您的机器上。

*   **模式 C: 云端 API (可选)**
    *   **处理方式**: 云端处理。
    *   **数据传输**: 如果您主动配置了云端 API (如 OpenAI, DeepSeek 等)，您的文本输入将被安全地发送至该第三方服务商以获取回复。
    *   **隐私性**: 数据处理遵循您选择的 API 服务商的隐私政策。WitNote 仅作为客户端工具，不会存储或拦截这些数据。

### 第三方服务
除非您执行以下操作，否则应用不会建立网络连接：
1.  下载 WebLLM 模型 (连接至模型仓库)。
2.  配置并使用云端 API (连接至您选择的服务商)。
3.  检查应用更新。

### 您的权利
由于 WitNote 不收集您的数据：
- 您对您的文件拥有完全的所有权和控制权。
- 您可以随时删除本应用以清除所有相关的应用数据 (您的笔记文件夹是安全的，不会被删除)。

---

### Contact / 联系方式

Repository / 代码仓库: [https://github.com/hooosberg/WitNote](https://github.com/hooosberg/WitNote)
