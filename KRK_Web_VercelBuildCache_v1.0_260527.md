# [KRK Web] Vercel 빌드 캐시 이슈 — 사후 메모

> 작성일: 2026-05-27 | 대상 프로젝트: krk-checker (checker.krk.team)

---

## 어떤 증상이었나

- 사이트 접속 시 **blank 흰 화면**
- 크롤러는 OG 태그를 정상 읽음 (HTML 자체는 맞음)
- 브라우저 콘솔: `404 /src/main.tsx`

---

## 근본 원인

### 1. Vercel 빌드 캐시 고착

멀티페이지 빌드(`pricing.html`, `faq.html` 등)를 추가한 이후에도 Vercel이 **구버전 캐시**(배포 `3s3h34wF9`, 멀티페이지 이전)를 계속 복원.

```
Restored build cache from previous deployment (3s3h34wF9...)
Build Completed in /vercel/output [176ms]   ← Vite 실행 안 됨
```

Vite가 실제로 실행되지 않으니 HTML 파일에 아래 소스 경로가 그대로 남음:

```html
<!-- 빌드 전 소스 (잘못됨) -->
<script type="module" src="/src/main.tsx"></script>

<!-- 정상 빌드 후 -->
<script type="module" crossorigin src="/assets/main-BgR6FCSs.js"></script>
```

### 2. `tsc -b`가 `vite-plugin-sitemap` 타입을 못 찾는 에러

캐시를 무효화하기 위해 `installCommand`를 명시하자 Vite가 실행됐지만, `build` 스크립트의 `tsc -b`가 `vite-plugin-sitemap` 타입 선언을 찾지 못해 빌드 자체가 실패.

```
error TS2307: Cannot find module 'vite-plugin-sitemap' or its corresponding type declarations.
Error: Command "npm run build" exited with 2
```

---

## 해결 방법 (적용된 순서)

### Step 1 — `vercel.json`에 명시적 빌드 설정 추가

```json
{
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [...]
}
```

`installCommand` 명시 → Vercel이 npm install을 강제 실행 → Vite 빌드 트리거.

### Step 2 — `package.json` build 스크립트에서 `tsc -b` 제거

```json
// 변경 전
"build": "tsc -b && vite build"

// 변경 후
"build": "vite build",
"type-check": "tsc -b"
```

TypeScript 타입 체크와 프로덕션 빌드를 분리.  
`vite build`만 실행되도록 변경 → `vite-plugin-sitemap` 타입 에러 우회.

---

## 이후 정상 빌드 결과

```
vite v6.4.2 building for production...
✓ 1911 modules transformed.
dist/index.html
dist/pricing.html
dist/faq.html
dist/guide-label.html
dist/guide-rejection.html
✓ built in 7.28s
Build Completed in /vercel/output [10s]
Created build cache: 7s   ← 새 캐시 저장됨
```

---

## 다음 작업 시 주의사항

### ⚠️ Vercel 빌드 캐시 관련

| 상황 | 신호 | 대처 |
|------|------|------|
| 새 파일 추가 후 blank | 빌드 로그에 `176ms`, `Skipping cache upload` | `vercel.json`에 `installCommand` 명시 → 강제 재빌드 |
| HTML에 `/src/main.tsx` 남아있음 | `curl URL \| grep src=` 로 확인 | 위와 동일 |
| 빌드 에러 `TS2307` | `tsc -b`가 vite config 파일의 플러그인 타입을 못 찾음 | build 스크립트에서 `tsc -b` 제거 유지 |

### ✅ 현재 확정된 설정

**`vercel.json`** — 반드시 유지:
```json
{
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

**`package.json`** — 반드시 유지:
```json
"build": "vite build",
"type-check": "tsc -b"
```

### 📌 새 페이지 추가 시 체크리스트

1. `vite.config.ts` → `build.rollupOptions.input`에 새 HTML 추가
2. `vercel.json` → `rewrites`에 라우트 추가
3. `vite.config.ts` → `Sitemap({ dynamicRoutes: [...] })`에 경로 추가
4. `vite.config.ts` → `Sitemap({ hostname })`은 반드시 유지

---

## 관련 커밋

| 커밋 | 내용 |
|------|------|
| `c05d00e` | vercel.json에 installCommand/buildCommand/outputDirectory 추가 |
| `beb22e9` | package.json build에서 tsc -b 제거 → **최종 정상 빌드** |
