# 🍼 밀크매스 (milk-math)

쌍둥이 맘을 위한 모유 수급 관리 PWA 앱

## 주요 기능

### 유축일지
- 유축 세션 타이머 (시작/종료)
- 좌/우 유축량(ml) 기록
- 오늘의 총 유축량, 이번 주 통계

### 재고관리
- 냉장/냉동 모유 팩 관리
- FIFO 방식 — 오래된 것부터 사용
- 유통기한 경고 (냉장 4일, 냉동 6개월)
- 재고 잔여일 추정

### 수급현황
- 공급(유축) vs 수요(소비) 실시간 비교
- 아둥이/바둥이 별 수유 기록 (모유 + 분유)
- 7일 추이 차트 (Chart.js)
- 수급 균형 상태 표시 (🟢 충분 / 🟡 균형 / 🔴 부족)
- 유축 빈도 권장

## 기술 스택

- React + TypeScript + Vite
- Tailwind CSS v4
- Chart.js + react-chartjs-2
- LocalStorage (서버 불필요)
- PWA (오프라인 지원)
- Screen Wake Lock API

## 데이터 관리

- 모든 데이터는 브라우저 LocalStorage에 저장
- JSON 백업 내보내기/불러오기 지원
- 서버 없음, 인증 없음, 100% 로컬

## 개발

```bash
npm install
npm run dev
```

## 빌드 & 배포

```bash
npm run build
```

GitHub Pages 자동 배포: `main` 브랜치에 push 시 자동 빌드 & 배포

## twin-hub 연동

이 앱은 [twin-hub](https://github.com/yulcat/twin-hub) 프로젝트의 일부입니다.
twin-log와의 연동은 추후 업데이트 예정입니다.
