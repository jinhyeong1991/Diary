# My-Local-Pulse

연차·일정·메모 대시보드. PC와 모바일에서 같은 데이터를 실시간으로 쓰고, 팀원 일정을 함께 봅니다.

- Supabase 설정이 없으면 예전처럼 **로컬 전용**(브라우저 저장소)으로 동작합니다.
- 설정하면 이메일로 로그인 → 일정·메모·연차가 기기 간 실시간 동기화되고, **팀** 탭에서 초대된 직원들의 하루 일정과 연차/반차를 볼 수 있습니다.
- 다른 직원에게는 **일정(시간표·연차)만** 보이고, 메모는 본인만 볼 수 있습니다.

## 1. Supabase 준비 (한 번만)

1. https://supabase.com 에서 가입 후 **New project** 생성 (Region: Northeast Asia (Seoul) 권장)
2. 왼쪽 **SQL Editor** → `supabase/schema.sql` 내용을 붙여넣고 **Run**
3. 같은 곳에서 본인 이메일을 관리자로 등록:
   ```sql
   insert into public.team_allowlist (email, is_admin) values ('내이메일@회사.com', true);
   ```
4. **Authentication → URL Configuration**
   - Site URL: `https://<깃허브아이디>.github.io/My-Local-Pulse/`
   - Redirect URLs 에 위 주소와 `http://localhost:3000/` 추가
5. (선택) **Authentication → Email Templates → Magic Link** 에 `{{ .Token }}` 을 넣으면 메일에 6자리 코드도 함께 옵니다. 모바일에서 메일 앱 링크가 다른 브라우저로 열릴 때 코드 입력이 편합니다.
6. **Project Settings → API** 에서 `Project URL` 과 `anon public` 키 복사

## 2. GitHub Pages 배포

1. GitHub 저장소 **Settings → Pages → Source: GitHub Actions**
2. **Settings → Secrets and variables → Actions → Variables** 탭에 추가
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public 키
3. `main` 브랜치에 push 하면 자동 배포 → `https://<아이디>.github.io/My-Local-Pulse/`

anon 키는 공개돼도 되는 키입니다. 데이터 접근은 `schema.sql` 의 RLS 정책(초대 명단)이 막습니다.

## 3. 직원 초대

관리자로 로그인 → **팀** 탭 아래 **직원 초대**에 직원 이메일 추가 → 직원은 사이트에서 그 이메일로 로그인.

## 4. 모바일에서 앱처럼 쓰기

- iPhone(Safari): 공유 버튼 → **홈 화면에 추가**
- Android(Chrome): 메뉴 → **홈 화면에 추가**

## 로컬 실행

Node.js(LTS) 설치 후:

```bash
npm install
npm run build
start.bat
```

`.env.example` 을 `.env.local` 로 복사해 값을 넣으면 로컬에서도 동기화가 켜집니다.
