# WitNote Development Diary

## v1.2.9: App Store Review Pitfalls & The Intel Chip Dilemma
*2025.12.31*

### 1. 🍎 App Store Review Pitfalls: Where Did the Window Go?

Recently, when submitting WitNote to the Mac App Store review, we received the following feedback:

> **Guideline 4 - Design**
> 
> We noticed an issue in your app that results in a user experience that is not sufficiently consistent with the Mac experience. 
> Specifically, we found that when the user closes the main application window, there is no menu item to re-open it.

#### The Issue
This is a very typical misunderstanding in macOS app development, especially for developers like me who switched from Windows.

On Windows, clicking the `X` in the top-right corner of a window usually means exiting the program. But on macOS, clicking the red cross in the top-left corner only means **Close Window**, while the application process itself is still running in the background (indicated by a small dot under the Dock icon).

The problem the reviewer found was:
1. Click the red cross to close the WitNote main window.
2. The app is still running.
3. When clicking the Dock icon again, or looking for a "Window" menu in the top menu bar, the **main window does not reappear**.
4. This makes the app feel "frozen" or unresponsive.

#### The Solution
To fix this, we need to handle the `activate` event in the Electron main process (`main.ts`) and ensure there is a "Window" option in the menu bar.

**1. Listen for `activate` event**
When the user clicks the Dock icon, macOS triggers the `activate` event. We need to listen for it and check if any windows currently exist. If not, create a new one.

```typescript
// electron/main.ts

app.on('activate', () => {
    // macOS: Re-show or create window when clicking Dock icon
    if (mainWindow) {
        // Window exists but might be hidden or minimized
        mainWindow.show()
        mainWindow.focus()
    } else if (BrowserWindow.getAllWindows().length === 0) {
        // No windows exist, create a new one
        createWindow()
    }
})
```

**2. Improve "Window" Menu**
An app compliant with macOS standards should have a "Window" menu. We added a `Show Main Window` option to the menu template.

After the fix, no matter how the user closes the window, clicking the Dock icon or the menu item will bring WitNote back immediately.

---

### 2. ❌ The Difficult Decision: Dropping Intel Mac Support

In version v1.2.9, we officially updated the device support list to explicitly mark **Mac computers with Intel chips as Not Supported**.

This is a decision based on technical reality, primarily for the following reasons:

#### Architectural & Instruction Set Incompatibility
WitNote's core selling point is "Truly Local Offline AI". To achieve this, we integrated inference engines like **WebLLM** and **Ollama**. The current macOS local AI ecosystem is almost entirely built around the **Apple Silicon (M1/M2/M3)** ARM64 architecture.

Forcing these ARM64-optimized binaries or Python environments to run on Intel chips (x86_64) not only requires reliance on Rosetta 2 translation, but for AI inference programs highly dependent on AVX instruction sets and matrix operations, translation often leads to serious compatibility issues or even direct crashes.

#### Lack of Core Hardware Acceleration (NPU/Metal)
The reason Apple Silicon chips can run local large models smoothly lies in their **Unified Memory Architecture** and dedicated **NPU (Neural Engine)**.

The inference engines used by WitNote are primarily optimized for Apple Silicon's GPU/Metal. Intel Macs use discrete or integrated graphics, with memory bandwidth far lower than M-series chips. Running quantized models on Intel Macs:
- **Extremely Slow**: Generating a single token might take several seconds.
- **Massive Heat**: Fans will spin wildly, completely deviating from WitNote's "Lightweight & Quiet" philosophy.

#### Developer's Trade-off
To ensure the best experience for the vast majority of users (Apple Silicon users) and to control the installation package size, we chose to build and optimize only for the current mainstream M-chip architecture.

We sincerely apologize to Intel Mac users. If your device is not supported, you can use WitNote's **Cloud API** mode, or consider upgrading to an Apple Silicon device to experience the full local AI capabilities.

---

## v1.2.4: Build Pitfalls and Architectural Trade-offs

### Foreword

The journey to release v1.2.4 was filled with challenges and trade-offs. As a cross-platform application (macOS & Windows), while striving for native experience and high performance, we inevitably encountered platform-specific limitations. This diary records two major "pitfalls" encountered during the build process and the corresponding architectural decisions, aiming to inspire fellow developers wrestling with Electron.

### 1. 🍎 macOS Build: The Story of Security-Scoped Bookmarks

When building for the Mac App Store (MAS), the biggest challenge came from Apple's strict Sandbox mechanism.

#### Problem Description
To meet MAS submission requirements, the app must run in a sandboxed environment. However, the sandbox restricts the app's arbitrary access to the file system. Even if the user explicitly selects a folder via `dialog.showOpenDialog`, the app only grants access permission for the current session. Once the app restarts, the permission is lost, preventing the user from reopening the previously added folder.

#### Solution
To solve this, we implemented **Security-Scoped Bookmarks**.

1.  **Save Bookmark on Permission Grant**: When the user selects a folder, use Electron's API to obtain the `bookmark` (an encrypted data string generated by the macOS system) for that path.
2.  **Persistent Storage**: Store this `bookmark` string in a local database (such as LowDB).
3.  **Restore Permission on Restart**: When the app launches, read the stored `bookmark` and call `app.startAccessingSecurityScopedResource` to reactivate access permissions.

This mechanism ensures that users can seamlessly access their note library after restarting the app, satisfying both security requirements and user experience. In v1.2.4, we finally completely fixed the folder permission issue in the MAS version.

### 2. 🪟 Windows Build: Reluctantly Dropping WebLLM

Compared to the permission struggle on macOS, the challenge on Windows lay more in performance and architectural choices.

#### Architectural Decision
In the Windows version of v1.2.4, we made a tough decision: **Remove built-in WebLLM engine support.**

#### Analysis
1.  **Performance Bottleneck**: WebLLM relies on WebGPU technology to run large models in the browser environment. While it performs acceptably on macOS (especially with Apple Silicon chips), on Windows, due to vastly different hardware configurations and complex driver compatibility, WebLLM suffered from slow loading speeds, high inference latency, and even crashes on many mid-to-low-end machines.
2.  **User Experience**: Sacrificing the overall smoothness and stability of the app to maintain an unstable feature is not worth it. Users expect an "out-of-the-box" tool that responds quickly, not an experimental product that requires a long wait to load.
3.  **Alternative**: We strongly recommend Windows users use **Ollama**. As an independent local inference engine, Ollama runs very stably and efficiently on Windows. It not only supports more models (such as Llama 3, Qwen 2.5, etc.) but also controls resource usage better.

#### Conclusion
Although we lost the selling point of a "built-in engine," guiding users to use the more mature Ollama architecture actually improves the final productivity experience. Architectural choices are often like this; there is no absolute perfection, only the most suitable trade-off for a specific scenario.

---
*The above is not just a technical record but also a step towards a more mature and stable WitNote. Thanks to every user for your tolerance and feedback.*
