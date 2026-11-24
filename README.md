# 프로젝트 운영 관제 시스템

최종 기능 기준 **v143**. 정적 HTML/JavaScript 프런트엔드와 Supabase Auth/PostgreSQL/Storage 기반입니다.

## 다른 프로젝트에서 사용
1. 이 저장소를 복제합니다.
2. `cp supabase-config.example.js supabase-config.js` 후 새 Supabase URL과 **publishable key**를 입력합니다. service-role/secret 키는 브라우저에 넣지 않습니다.
3. DB 스키마를 준비합니다. **현재 저장소의 001~027 SQL은 기존 업무 테이블을 전제로 하는 증분 스크립트입니다. 빈 DB에 이것만 실행하면 초기 설치가 완성되지 않습니다.** 운영 구조 JSON은 `backups/schema/`에 보관했습니다. 실행 가능한 전체 복원 덤프와 빈 DB 설치 검증은 별도로 필요합니다.
4. 기존 DB를 사용할 경우 적용 이력에 맞게 SQL을 검토합니다. 008/010은 테스트 비밀번호를 포함한 수동 계정 보조 스크립트이므로 저장소에서 제외했습니다.
5. 최초 관리자 계정을 새 Supabase Auth에서 만들고 `app_profiles`에 해당 user_id를 연결합니다. 다른 프로젝트의 Auth UUID와 비밀번호를 그대로 복제하지 않습니다.
6. 프로젝트·팀·인원·산출물 단가·W/D·목표 H를 새 프로젝트에 맞게 설정합니다.
7. `python3 -m http.server 8000` 후 브라우저에서 `http://localhost:8000`을 엽니다. 운영 환경은 HTTPS 정적 호스팅을 사용합니다.
8. `node --test tests/*.test.cjs`와 실제 로그인·저장·역할별 접근을 검증합니다.

## 현재 설정 데이터 백업
`bash scripts/backup-settings.sh`는 PostgreSQL 표준 연결 환경변수(PGHOST/PGPORT/PGDATABASE/PGUSER)와 로컬 비밀번호 저장소(.pgpass 등)를 사용합니다. 인증정보는 Git에 넣지 않습니다.

추출 대상은 public 스키마와 팀·직위·인원·프로젝트·배정·산출물 기준·app_settings·code_master입니다. 업무/평가/이미지/인증 계정은 포함하지 않습니다. 산출물 기준의 참조 관계나 Auth 연결은 새 DB에서 별도 점검해야 합니다. Storage 버킷과 정책은 관련 SQL을 검토해 구성합니다.

**2026-11-24 운영 DB 구조 스냅샷(JSON)을 추출했습니다.** `backups/schema/README.md`에서 범위를 확인하세요. 설정 데이터 행은 아직 추출하지 않았으며, 원클릭 재사용 패키지는 아닙니다. 추출 결과는 `backups/private/`에 보관하며 직원·계약정보를 검토한 뒤 이식용 설정으로 정리합니다.

## 주요 화면
업무 등록/추천, 일간·월간 현황, 리소스/그룹 순위, 프로젝트/팀/템플릿 설정, 자료 관리, 직원평가·가감점, Excel 업로드, 공개 일간 현황.

공개 일간은 `daily-public.html`. 프로젝트별 공개를 켜면 작업자명과 공수 합계가 비로그인으로 조회됩니다. 기본 비공개입니다.

복원 범위: `backups/README.md`. 변경 이력: `RELEASE_NOTES_v*.md`. 검증은 단위 회귀 중심이며 운영 배포 검증과 구분합니다.
