# 프로젝트 SBGrid3 JSP 작성 컨벤션 (edel-web)

이 문서는 실제 프로젝트 화면(`edel-web/src/main/webapp/WEB-INF/jsp/ls/pJcfcprInfoList.jsp`)에서 정리한 규칙이다.
이 프로젝트 안에서 SBGrid3 코드를 작성할 때는 MCP 표준 골격 대신 **아래 프로젝트 패턴**을 따른다.
(흐름 `데이터 → dataSource → gridConfig → createGrid`, 컬럼 리터럴 나열, 요청 기능만 최소 적용 원칙은 동일)

## 1. 환경 전제

- eGovFrame 기반 JSP, Eclipse + Tomcat. URL은 `/ls/xxx.do` 형태.
- **MDI(탭) 구성**: 한 화면이 여러 탭에 동시에 열릴 수 있다.
  - `id` 셀렉터, `document.querySelector`, 전역 jQuery 셀렉터를 쓰지 않는다.
  - 요소는 **클래스만** 사용해서 탭 범위 셀렉터 `$r`로 찾는다.
- import(sbgrid3.css/js, license.js)는 공통 레이아웃에서 이미 처리되므로 JSP에 넣지 않는다.

## 2. 스크립트 골격

```html
<script type="text/javascript">
(function() {
    "use strict"; // 전역 변수 오염을 막기 위한 엄격 모드

    /**
     * [1] 변수 선언 영역 (const, let만 사용 / var 금지)
     */
    const $r = $R(tabId);   // 탭 내부 요소 선택자 $r('.sel-status'), 단 클래스만 선택 가능

    // SBGrid3 객체를 담을 변수
    let datagrid = null;
    let currentPage = 1;
    let recordCountPerPage = 10;

    /**
     * [2] 사용자 함수 및 이벤트 핸들러 정의
     */
    const initGrid = () => { ... datagrid = SBGrid3.createGrid(gridConfig); };
    const handleSearch = () => { ... };

    /**
     * [3] 초기화 및 리소스 정리 (Lifecycle)
     */
    const init = () => { initGrid(); MdiManager.bind(...); handleSearch(); };

    // ★ 그리드가 구현된 화면은 반드시 아래 로직 추가
    MdiManager.register(tabId, {
        onDestroy: () => {
            if (typeof SBGrid3 !== 'undefined' && datagrid) {
                SBGrid3.clearGrid(datagrid);
            }
            datagrid = null;
        }
    });

    // 모든 정의가 끝난 후 초기화 함수 실행
    init();
})();
</script>
```

- 함수는 `const xxx = () => {}` 화살표 함수로 선언한다. (`validateForm`만 `function()` 사용 사례 있음)
- 핸들러 이름: `handleSearch`, `handleOpenPopup`, `handleClean`, `validateForm` 형태.

## 3. 공통 유틸 (프로젝트 제공)

| 유틸 | 사용법 |
|------|--------|
| `$R(tabId)` → `$r` | `$r('.cls')` 탭 내부 요소 1개, `$r.root` 탭 루트 요소 (`$r.root.querySelectorAll('.cls')`) |
| `HttpUtil.post(url, request, (result) => {})` | 공통 통신. 응답은 `result.body.data`, `result.body.total` |
| `PagingUtil.bind(tabId, {currentPage, totalCount, recordCountPerPage, pageSize: 7}, (page, size) => {}, '.grid-pagination')` | 페이징 UI 렌더링 |
| `GridUtil.mergeConfig({...})` | 프로젝트 공통 그리드 설정과 병합한 gridConfig 반환 |
| `MdiManager.bind(tabId, $r.root, '.btn-xxx', 'click', handler, true)` | 이벤트 연결 (마지막 `true` = 연타 방지 debounce) |
| `MdiManager.register(tabId, { onDestroy })` | 탭 종료 시 그리드 정리 |
| `UIUtil.openModal({ url, title, params, callback, width: '1200px' })` | 팝업 |
| `UIUtil.alert({ msg: '...' })` | 알림 |
| `DataUtil.isEmpty(value)` | 빈값 체크 |
| `dateFormat(value)` | 날짜 표시 포맷 (컬럼 `format`에서 사용) |

## 4. 그리드 생성 패턴 (initGrid 내부)

```js
const initGrid = () => {

    //서버에서 데이터 조회 함수
    const getData = (request) => {
        // 서버로 보낼 파라미터 세팅 (현재 페이지 포함)
        request.jdafCorpNm = $r('.jdafCorpNm').value;          // 법무법인명
        request.fromFndnYmd = $r('.fromFndnYmd').value.replaceAll("-","");

        request.pageIndex = currentPage;
        request.recordCountPerPage = recordCountPerPage;

        return new Promise((resolve) => {
            // 공통 통신 모듈 사용
            HttpUtil.post('/ls/pJcfcprInfoListPageData.do', request, (result) => {
                const list = result.body.data || [];
                const totalCount = result.body.total || 0;

                const totalCnt = $r('.tbx_total_cnt');
                if(totalCnt) totalCnt.innerText = Number(totalCount).toLocaleString();

                //통신 성공 후 데이터가 그리드에 바인딩 직전에 페이징 UI 렌더링
                PagingUtil.bind(tabId, {currentPage, totalCount, recordCountPerPage: request.recordCountPerPage, pageSize: 7},
                    (page, size) => {
                        if(page) currentPage = page;
                        if(size) recordCountPerPage = size;
                        SBGrid3.reload(datagrid);
                    }, '.grid-pagination'
                );

                // 그리드에게는 순수 데이터만 리턴하여 렌더링 지시
                resolve({ data: list, total: totalCount });
            });
        });
    };

    const sourceConfig = {
        ajax: {
            select: getData,
            selected: 'data',
            total: 'total'
        }
    };

    const gridContainer = $r('.grid-container');   // container에 DOM 객체 직접 매핑

    const gridConfig = GridUtil.mergeConfig({
        dataSource: sourceConfig
        ,container: gridContainer
        ,doCommand: (grid, name, command) => {
            switch(name) {
                case 'event' : {
                    if (command.event.type === 'click') {
                        const caption = command.column?.caption;
                        const target = command.event?.target;
                        // 컬럼 내 버튼 클릭 처리 (target.classList, target.dataset 활용)
                    }
                    break;
                }
                case 'loadedView' : {
                    $r('.jdafCorpNm').focus();
                    break;
                }
            }
        }
        ,columns: [
            { caption: '순번', field: 'rn', width: '60px', type: 'text', align: 'center' },
            { caption: '사업자등록번호', field: 'brno', width: 1, unit:'%', minWidth:'250px', type: 'text', align: 'center' },
            { caption: '설립일자', field: 'fndnYmd', width: 1, unit:'%', minWidth:'200px', type: 'text', align: 'center', format: (value) => {return dateFormat(value)} },
        ]
        ,showCheck:false //체크박스 사용 유무
    });

    // 그리드 인스턴스 생성 및 전역 변수에 할당
    datagrid = SBGrid3.createGrid(gridConfig);
};
```

- 옵션 나열은 **앞 콤마 스타일**(`,container: ...`)을 쓴다.
- 컬럼 폭은 고정은 `'60px'`, 가변은 `width: 1, unit:'%', minWidth:'250px'`.
- 버튼 컬럼: `type: 'button'` + `command: [ (container, x) => { a 태그 생성, className = 'btn-sm btn-mod', dataset에 키 저장, container.append } ]`
  → 클릭 처리는 `doCommand`의 `'event'` 케이스에서 `caption` + `target.classList.contains('btn-mod')`로 분기.

## 5. 조회 / 초기화 / 이벤트 연결

```js
//목록 검색 이벤트
const handleSearch = () => {
    if(datagrid){
        if(!validateForm()) return; // 검색조건 체크
        currentPage = 1;
        SBGrid3.reload(datagrid);
    }else {
        initGrid();
    }
};

const init = () => {
    //그리드 생성
    initGrid();
    //조회버튼 이벤트 연결(연타 방지, debounce 사용)
    MdiManager.bind(tabId, $r.root, '.btn-search', 'click', handleSearch, true);
    // 엔터키 검색 지원(연타 방지, debounce 사용)
    MdiManager.bind(tabId, $r.root, '.ipt-keyword', 'keyup', function(e) {
        if (e.key === 'Enter') handleSearch();
    }, true);
    handleSearch(); // 화면 로딩시 조회 수행
};
```

- 팝업 저장 후 `callback`에서 `handleSearch()`로 재조회한다.

## 6. 서버(Java) 컨벤션

- eGovFrame 구조: Controller → Service(인터페이스 + `EgovAbstractServiceImpl` 구현) → Mapper 인터페이스 → MyBatis XML.
- **Controller 파라미터는 `Map<String, Object>`** 로 받는다. (VO 미사용)
- 그리드 수정 목록 저장 예: 화면에서 `HttpUtil.post('/ls/xxxUpdate.do', { updateList: updated }, ...)` →
  Controller는 `Map<String, Object> param`을 **그대로 Service에 넘기고**,
  Service에서 `param.get("updateList")`(Object)를 꺼내 `List<Map<String, Object>>`로 변환한 뒤 반복 update (`@Transactional`).
