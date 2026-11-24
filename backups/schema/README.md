# 운영 DB 구조 스냅샷

추출: 2026-11-24 10:57:41 KST. DBeaver의 기존 운영 연결에서 `scripts/export-public-schema.sql`을 실행하여 JSON으로 내보내고, 외부 래퍼만 제거했습니다. 운영 DB에는 쓰기 작업을 하지 않았습니다.

## 포함 범위
- public 테이블 23개: 컬럼, 타입, 기본값, NOT NULL, identity/generated 표시, 제약조건, 인덱스, 트리거, RLS 활성 상태
- public 함수 12개: 실제 함수 정의 및 함수 ACL
- public/storage 접근 정책 46개
- public 시퀀스 4개(현재 값 제외), 테이블 권한 632건
- 확장 목록 5개. public 뷰와 enum은 조회 결과 0개

## 사용 및 한계
`2026-11-24-public-schema.json`은 실제 DB 구조를 보관한 **조회용 스냅샷**입니다. 직접 실행하는 복원 SQL이나 pg_dump 파일이 아닙니다. 자동 복원 및 빈 DB 설치 테스트는 수행하지 않았습니다.

업무·직원·프로젝트 설정의 데이터 행, Auth 계정/비밀번호, Storage 버킷 데이터 및 파일은 포함하지 않습니다. 전체 스키마 소유권, 기본 권한, 컬럼별 ACL, 시퀀스 소유 관계, 파티션 상세 등 모든 PostgreSQL 속성을 포괄하는 덤프도 아닙니다. 새 Supabase에 동일한 환경을 복원하려면 표준 schema-only 덤프와 필요한 설정 데이터, Auth/Storage 구성 및 복원 검증이 별도로 필요합니다.

## 확인 결과
- 내보낸 외부 JSON과 schema_snapshot 내부 JSON 모두 파싱 성공
- 테이블명 중복 없음, 컬럼 정의 존재 확인
- 함수 정의와 컬럼 기본값 검토 및 토큰/비밀키/접속 문자열 패턴 검사 수행
- 원본 파일은 Git 제외 경로 `backups/private/`에 유지
- SHA256SUMS는 정규화한 스냅샷의 파일 무결성 확인용
