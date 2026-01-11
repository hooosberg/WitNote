<p align="center">
  <img src="../src/icon/智简icon 拷贝.png" alt="WitNote" width="128" height="128">
</p>

<h1 align="center">WitNote</h1>

<p align="center">
  <strong>Smart Core, Simple Form</strong>
  <br>
  <a href="https://hooosberg.github.io/WitNote/">🌐 Official Website</a>
</p>

<p align="center">
  <a href="../README.md">English</a> |
  <a href="README_zh.md">简体中文</a> |
  <a href="README_zh-TW.md">繁體中文</a> |
  <a href="README_ja.md">日本語</a> |
  <a href="README_ko.md">한국어</a> |
  <a href="README_es.md">Español</a> |
  <a href="README_fr.md">Français</a> |
  <a href="README_de.md">Deutsch</a> |
  <a href="README_it.md">Italiano</a> |
  <a href="README_pt.md">Português</a> |
  <a href="README_ru.md">Русский</a> |
  <a href="README_ar.md">العربية</a> |
  <a href="README_hi.md">हिन्दी</a> |
  <a href="README_bn.md">বাংলা</a> |
  <a href="README_tr.md">Türkçe</a> |
  <a href="README_pl.md">Polski</a> |
  <a href="README_nl.md">Nederlands</a> |
  <a href="README_id.md">Bahasa Indonesia</a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20|%20Windows%20|%20Linux-lightgrey.svg" alt="Platform">
  <img src="https://img.shields.io/badge/Apple%20Silicon-M1%20|%20M2%20|%20M3%20|%20M4%20|%20M5-green.svg" alt="Apple Silicon">
  <br>
  <img src="https://img.shields.io/badge/Editable-md%20%7C%20txt-007AFF.svg" alt="Editable">
  <img src="https://img.shields.io/badge/Preview-pdf%20%7C%20docx%20%7C%20images-FF9500.svg" alt="Preview">
</p>

<p align="center">
  <a href="https://apps.apple.com/us/app/witnote-local-ai-writer/id6756833873?mt=12">
    <img src="../src/icon/Download_on_the_App_Store_Badge.svg" alt="Download on the Mac App Store" height="50">
  </a>
</p>

> **🎉 Mac App Store 출시 완료!**
> 
> WitNote가 Mac App Store에 정식 출시되었습니다. 여러분의 성원에 감사드립니다! 여러분의 Star ⭐️는 계속 나아가는 가장 큰 원동력입니다!

**WitNote**는 macOS, Windows 및 Linux용 로컬 우선 AI 글쓰기 동반자입니다.
**Ollama / WebLLM / Cloud API** 엔진 간 자유로운 전환을 지원하며, 매우 미니멀한 **네이티브 카드 인터페이스**와 결합되어 즉시 사용할 수 있습니다. 모델 다운로드 외에는 클라우드 의존성이 없으며 개인 정보 보호 문제도 없습니다. 지능을 가볍게 만들었습니다.

![Local Offline AI Note](../src/pic/witnote%20宣传截图/English/本地离线AI记事本.jpg)



---

## 🌟 핵심 철학

- **Smart (스마트)**: 세 가지 엔진을 하나로, 자유로운 선택.
  - **WebLLM**: 가벼운 모델, 처음 실행 시 다운로드 필요, 이후에는 오프라인에서 완전 작동.
  - **Ollama**: 강력한 로컬 모델, 뛰어난 성능, 완전 오프라인.
  - **Cloud API**: 클라우드 지능 연결, 무한한 가능성.
- **Simple (심플)**: 복잡함 없음.
  - iOS 스타일 카드 관리, 드래그로 정리.
  - 스마트 포커스 모드 — 창이 좁아지면 에디터가 단순해짐.
- **Secure (보안)**: 데이터 주권.
  - [**개인정보 처리방침**](PRIVACY.md): 100% 로컬 저장. 당신의 생각은 오직 당신만의 것입니다.

---

## ✨ 기능 (v1.3.3)

### 🆕 v1.3.3의 새로운 기능

- 🪟 **반투명 유리 UI** — 완전히 새로운 시각적 디자인, 모던한 반투명 유리 효과 적용
- 📐 **유연한 3단 레이아웃** — 사이드바, 에디터 및 AI 패널의 크기를 독립적으로 조정하고 닫을 수 있음
- ✋ **듀얼 패인 드래그 & 편집** — 분할 보기에서 구분선을 자유롭게 드래그하여 에디터/미리보기 비율 조정
- 📂 **Finder 스타일 파일 트리** — 색상 태그, 드래그 이동, 호버 확장, 완전히 업그레이드된 컨텍스트 메뉴
- 📄 **다중 형식 지원** — PDF/Word 미리보기 추가, 일반적인 이미지 형식 지원
  - 편집 가능: `.md` `.txt`
  - 읽기 전용 미리보기: `.pdf` `.docx`
  - 이미지 뷰어: `.jpg` `.png` `.gif` `.webp`
- 🚀 **더 빠른 시작** — 시작 화면 최적화, 흰색 화면 대기 시간 대폭 감소
- 🔒 **App Store 출시** — Apple Sandbox 보안 표준 완벽 준수, 이제 Mac App Store에서 이용 가능

### 🔧 핵심 기능

- 📝 **순수 로컬 노트** — 모든 폴더를 노트 보관소로 선택, `.txt` 및 `.md` 지원
- 🤖 **3-in-1 엔진** — **WebLLM** (라이트), **Ollama** (로컬 파워) 또는 **Cloud API** (사용자 지정 연결) 간 자유로운 전환
- ✨ **스마트 자동 완성** — 3가지 프리셋 (라이트/표준/전체), Tab을 눌러 문장별로 제안 수락
- 🎭 **풍부한 역할 라이브러리** — 10개 이상의 엄선된 역할 프롬프트(작가, 번역가, 교정자 등) 내장, 원클릭 전환 및 사용자 지정 지원
- 🌍 **글로벌 커뮤니케이션** — **8개 언어 지원**: 
  - English, 简体中文, 繁體中文, 日本語, 한국어, Français, Deutsch, Español
  - 인터페이스와 AI 응답이 언어 설정에 자동으로 적응
- 🔒 **프라이버시 우선** — 모든 AI 추론은 로컬에서 수행됨 (로컬 엔진 사용 시), 데이터 업로드 없음, Apple 공증 완료
- 💬 **고도로 사용자 정의 가능** — 시스템 프롬프트를 자유롭게 편집하여 나만의 AI 비서 제작
- 🎨 **다양한 테마** — 라이트 / 다크 / 젠 티, 완전히 최적화된 다크 모드
- 🗂️ **카드 그리드 보기** — 드래그 앤 드롭 정렬이 가능한 iOS 스타일, 세련된 컨텍스트 메뉴
- 🔍 **컨텍스트 인식** — AI가 현재 기사나 폴더 내용을 직접 읽을 수 있음
- 🎯 **포커스 모드** — 창이 좁아지면 방해 없는 편집 모드로 자동 전환

---

## 🚀 빠른 시작

### 다운로드

#### 🍎 Mac App Store (권장)

<a href="https://apps.apple.com/us/app/witnote-local-ai-writer/id6756833873?mt=12">
  <img src="../src/icon/Download_on_the_App_Store_Badge.svg" alt="Download on the Mac App Store" height="50">
</a>

#### 📦 GitHub Releases

[Releases](https://github.com/hooosberg/WitNote/releases)에서 최신 설치 프로그램을 다운로드하세요:

| 플랫폼 | 파일 | 비고 |
|----------|------|------|
| 🍎 macOS | `WitNote-1.3.3.dmg` | Apple Silicon (M1/M2/M3/M4/M5) 전용 |
| 🪟 Windows (x64) | `WitNote-1.3.3-setup-x64.exe` | 표준 PC (Intel/AMD) |
| 🪟 Windows (ARM64) | `WitNote-1.3.3-setup-arm64.exe` | Snapdragon PC (예: Surface Pro X) |
| 🐧 Linux (AppImage) | `WitNote-1.3.3-x86_64.AppImage` | x64 유니버설 (ARM64 사용 가능) |
| 📦 Linux (Deb) | `WitNote-1.3.3-amd64.deb` | Ubuntu/Debian x64 (ARM64 사용 가능) |

---

## 💻 시스템 요구 사항

### 🍎 macOS

| 항목 | 최소 | 권장 |
|------|---------|-------------|
| OS 버전 | macOS 12.0+ | macOS 13.0+ |
| 칩 | **지원 안 함 (Intel 칩)** | **Apple Silicon (M1/M2/M3/M4/M5)** |
| RAM | - | 16GB+ |
| 저장 공간 | - | SSD, 4GB+ 여유 공간 |

> ❌ **Intel Mac에 대한 중요 참고 사항**: 
> 
> 이 애플리케이션은 Intel 칩이 탑재된 Mac 컴퓨터를 **지원하지 않습니다**. 강제로 실행하더라도 다음과 같은 이유로 경험이 매우 좋지 않을 것입니다:
> 1. **아키텍처 비호환성**: 내장된 로컬 추론 엔진(WebLLM/Ollama)은 Apple Silicon의 ARM64 아키텍처 및 NPU/Metal 하드웨어 가속에 깊이 의존합니다.
> 2. **하드웨어 가속 부재**: Intel Mac에는 통합 메모리 아키텍처가 없습니다. 양자화된 모델 실행 속도가 매우 느리고(단일 토큰 생성에 몇 초가 걸릴 수 있음) 심각한 장치 발열을 유발합니다.
> 3. **아키텍처 트레이드오프**: 최고의 경험과 최소 패키지 크기를 보장하기 위해 x86_64 아키텍처 지원을 제거했습니다.
> 
> Apple Silicon(M 시리즈) 칩이 장착된 Mac 장치를 사용하는 것을 강력히 권장합니다.

### 🪟 Windows

| 항목 | 최소 | 권장 |
|------|---------|-------------|
| OS 버전 | Windows 10 (64-bit) | Windows 11 |
| 프로세서 | Intel Core i5 / AMD Ryzen 5 | Intel Core i7 / AMD Ryzen 7 |
| RAM | 8GB | 16GB+ |
| 저장 공간 | 2GB 여유 공간 | SSD, 4GB+ 여유 공간 |
| GPU | 통합 그래픽 | Vulkan 지원 외장 GPU |

> ⚠️ **참고**: Windows ARM64 장치(예: Surface Pro X)가 이제 기본적으로 지원됩니다!

### 🐧 Linux

| 항목 | 최소 | 권장 |
|------|---------|-------------|
| OS 버전 | Ubuntu 20.04+ / Debian 11+ | 최신 메인스트림 배포판 |
| 아키텍처 | x64 / ARM64 | x64 / ARM64 |
| RAM | 8GB | 16GB+ |

---

## 📦 설치

### 🍎 macOS 설치

**방법 1: Mac App Store (권장)**

App Store에서 "WitNote"를 검색하거나 [여기를 클릭](https://apps.apple.com/us/app/witnote-local-ai-writer/id6756833873?mt=12)하여 다운로드 및 설치하고 자동 업데이트를 즐기세요.

**방법 2: DMG 설치 프로그램**

1. `.dmg` 파일 다운로드
2. DMG 더블 클릭하여 열기
3. 응용 프로그램을 Applications 폴더로 드래그
4. Launchpad에서 실행

> 🎉 **좋은 소식!**
>
> 이 앱은 이제 **Apple 공증(Notarized)**을 받았습니다! 더 이상 "확인되지 않은 개발자" 경고가 나타나지 않습니다!
>
> 😅 *~~개발자가 용감하게 대출을 받아 99달러짜리 Apple 개발자 계정을 샀습니다...~~*
> *(네, 실화입니다. 지원해주신 모든 사용자분들께 감사드립니다!)*

### 🪟 Windows 설치

1. `.exe` 설치 프로그램 다운로드
2. 설치 마법사 실행
3. 설치 경로 선택 (사용자 지정 가능)
4. 설치 완료, 바탕 화면 또는 시작 메뉴에서 실행

### 🐧 Linux 설치

**AppImage (유니버설):**
1. `.AppImage` 파일 다운로드
2. 마우스 오른쪽 버튼 클릭 속성 -> 프로그램을 실행 파일로 허용 (또는 `chmod +x WitNote*.AppImage`)
3. 더블 클릭하여 실행

**Deb (Ubuntu/Debian):**
1. `.deb` 파일 다운로드 (예: `WitNote-1.3.3-amd64.deb`)
2. 터미널을 통해 설치 실행 (의존성 자동 처리):
   ```bash
   sudo apt install ./WitNote-1.3.3-amd64.deb
   ```

> 📝 **Windows 사용자를 위한 중요 참고 사항**:
> 
> 비싼 EV 코드 서명 인증서가 없는 개인 개발자이므로 설치 시 다음과 같은 메시지가 나타날 수 있습니다. 다음 단계를 따르세요:
> 1. **SmartScreen**: "Windows의 PC 보호"(알 수 없는 게시자)가 표시되면 **"추가 정보"** -> **"실행"**을 클릭하세요.
> 2. **바이러스 백신 경고**: Windows Defender 또는 기타 백신 소프트웨어가 설치 프로그램을 차단할 수 있습니다. 이 프로젝트는 오픈 소스이며 안전합니다. 차단된 경우 백신을 일시적으로 비활성화해 보세요.

---

## 🔧 AI 엔진 정보

### 1. WebLLM (라이트)
앱에는 `qwen2.5:0.5b` 모델이 탑재된 WebLLM 엔진이 내장되어 있습니다 (macOS 전용, Windows 사용자는 Ollama 사용 권장).
- **장점**: 추가 소프트웨어 설치 필요 없음. 초기 모델 다운로드 후 완전히 오프라인으로 작동.
- **용도**: 빠른 Q&A, 간단한 텍스트 다듬기, 저사양 기기.

### 2. Ollama (로컬 파워)
로컬에서 실행 중인 Ollama 서비스 연결을 지원합니다.
- **장점**: 7B, 14B 또는 더 큰 모델 실행 가능, 강력한 성능, 완전 오프라인.
- **사용법**: 먼저 [Ollama](https://ollama.com)를 설치한 다음 설정에서 더 많은 모델(예: qwen2.5:7b, llama3 등)을 다운로드하세요.

### 3. Cloud API (무한 클라우드)
OpenAI 호환 Cloud API 연결을 지원합니다.
- **장점**: API 키만 있으면 지구상에서 가장 강력한 모델에 액세스할 수 있습니다.
- **용도**: 최상위 논리적 추론 또는 로컬 하드웨어가 대규모 모델을 지원하지 못하는 경우.
- **설정**: 설정에 API URL 및 키 입력 (OpenAI, Gemini, DeepSeek, Moonshot 등 지원).

---

## 📸 스크린샷


### 📐 듀얼 패인 에디터
![Dual-Pane Editor](../src/pic/witnote%20宣传截图/English/双栏预览编辑.jpg)

### 🤖 3가지 AI 엔진
![Three AI Engines](../src/pic/witnote%20宣传截图/English/三种AI引擎.jpg)

### ✨ 스마트 자동 완성
![Smart Autocomplete](../src/pic/witnote%20宣传截图/English/智能续写.jpg)

### 🎭 개인화된 페르소나
![Personalized Persona](../src/pic/witnote%20宣传截图/English/个性化角色.jpg)

### 📄 다중 형식 지원
![Multi-Format Support](../src/pic/witnote%20宣传截图/English/word%20pdf%20jpg%20多种格式支持.jpg)

### 🎯 포커스 모드
![Focus Mode](../src/pic/witnote%20宣传截图/English/专注模式.jpg)

### 🎨 다양한 테마
![Multiple Themes](../src/pic/witnote%20宣传截图/English/多种主题外观.jpg)

### 🗂️ 카드 파일 관리
![Card File Management](../src/pic/witnote%20宣传截图/English/卡片管理文件.jpg)


---

## 🛠️ 개발

```bash
# 저장소 복제
git clone https://github.com/hooosberg/WitNote.git
cd WitNote

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev

# macOS 버전 빌드
npm run build

# Windows 버전 빌드
npm run build -- --win
```

---

## 📄 라이선스

MIT License

---

## 👨‍💻 개발자

**hooosberg**

📧 [zikedece@proton.me](mailto:zikedece@proton.me)

🔗 [https://github.com/hooosberg/WitNote](https://github.com/hooosberg/WitNote)

📖 [개발 일기](../public/dev-diaries/dev-diary_en.md)

---

<p align="center">
  <i>Smart Core, Simple Form</i>
</p>
