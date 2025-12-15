import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// 暂时移除 StrictMode 以测试 token 重复问题
ReactDOM.createRoot(document.getElementById('root')!).render(
    <App />
)

