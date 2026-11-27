# 프로젝트 운영 관제 시스템

최종 기능 기준 **v143**. 정적 HTML/JavaScript 프런트엔드와 Supabase Auth/PostgreSQL/Storage 기반입니다.

## 다른 프로젝트에서 사용

**새 프로젝트용 설치 패키지:** [설치 가이드](supabase/bootstrap/README.md).

1. 새 Supabase에서 `supabase/bootstrap/001_schema.sql` 전체 실행.
2. `002_defaults.sql` 실행 후 Auth 사용자를 생성하고 `003_first_admin.sql`로 최초 관리자 연결.
3. `supabase-config.example.js`를 `supabase-config.js`로 복사해 새 URL/publishable key 입력.
4. 정적 웹 서버로 실행 후 팀·직원·프로젝트·산출물 단가·월별 W/D·목표 H를 설정.

기존 운영 데이터 없이 시작합니다. 과거 001~027 변경 SQL을 다시 일괄 실행하지 마세요. 로컬 PostgreSQL 설치/권한/주요 동작 검증을 수행했으며 실제 Supabase 로그인·파일 업로드 확인은 신규 연결 후 필요합니다.

## 현재 설정 데이터 백업
`bash scripts/backup-settings.sh`는 PostgreSQL 표준 연결 환경변수(PGHOST/PGPORT/PGDATABASE/PGUSER)와 로컬 비밀번호 저장소(.pgpass 등)를 사용합니다. 인증정보는 Git에 넣지 않습니다.

추출 대상은 public 스키마와 팀·직위·인원·프로젝트·배정·산출물 기준·app_settings·code_master입니다. 업무/평가/이미지/인증 계정은 포함하지 않습니다. 산출물 기준의 참조 관계나 Auth 연결은 새 DB에서 별도 점검해야 합니다. Storage 버킷과 정책은 관련 SQL을 검토해 구성합니다.

**2026-11-24 운영 DB 구조 스냅샷(JSON)을 추출했습니다.** `backups/schema/README.md`에서 범위를 확인하세요. 운영 설정 데이터 행은 복제하지 않습니다. 새 프로젝트용 통합 스키마와 중립적인 기본 설정은 `supabase/bootstrap/`에 별도로 준비했습니다. 추출 결과는 `backups/private/`에 보관하며 직원·계약정보를 검토한 뒤 이식용 설정으로 정리합니다.

## 주요 화면
업무 등록/추천, 일간·월간 현황, 리소스/그룹 순위, 프로젝트/팀/템플릿 설정, 자료 관리, 직원평가·가감점, Excel 업로드, 공개 일간 현황.

공개 일간은 `daily-public.html`. 프로젝트별 공개를 켜면 작업자명과 공수 합계가 비로그인으로 조회됩니다. 기본 비공개입니다.

복원 범위: `backups/README.md`. 변경 이력: `RELEASE_NOTES_v*.md`. 검증은 단위 회귀 중심이며 운영 배포 검증과 구분합니다.
