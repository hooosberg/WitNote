import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
    plugins: [
        react(),
        electron([
            {
                entry: 'electron/main.ts',
                onstart(args) {
                    // 启动 Electron
                    args.startup()
                },
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        rollupOptions: {
                            external: ['electron']
                        }
                    }
                }
            },
            {
                entry: 'electron/preload.ts',
                onstart(options) {
                    options.reload()
                },
                vite: {
                    build: {
                        outDir: 'dist-electron'
                    }
                }
            }
        ]),
        renderer()
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    // Web Worker 配置
    worker: {
        format: 'es'
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            }
        }
    },
    // 优化 WebLLM 的大文件加载
    optimizeDeps: {
        exclude: ['@mlc-ai/web-llm']
    },
    server: {
        port: 5173,
        strictPort: true,
        // WebLLM 需要 SharedArrayBuffer，这需要 COOP 和 COEP 响应头
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp'
        }
    }
})


