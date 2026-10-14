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

> 원본 소스: `reference/mdi-js/` (common.js, mdi-engine.js, mdi-util.js, mdi-code.js, mdi-menu.js, edel-editor.js)
> 아래 내용은 원본 소스를 읽고 정리한 것이다. 시그니처가 헷갈리면 원본을 확인한다.

### 3-1. 스크립트 실행 방식 (mdi-engine)
- 탭/팝업 HTML 안의 `<script>`는 엔진이 아래처럼 감싸서 실행한다. 그래서 화면 스크립트에서 `tabId`, `params`, `callback`을 바로 쓸 수 있다.
  ```js
  (function(tabId, params, callback) { 'use strict'; const popupId = tabId; /* 화면 스크립트 */ })
  ```
  - 탭: `tabId` = prgmId(또는 자동 생성 id), `params` = `MdiManager.add(...)`로 넘긴 값
  - 팝업: `tabId`(=`popupId`) = `'modal-' + Date.now()`, `params` = `openModal`의 `params`, `callback` = `openModal`의 `callback`
  - `params.tabInfo`에 `{ prgmId, openerId, title, url, menuPath, root }`가 들어온다.
- 화면 로드 시 모든 `id`/`for`에 `_tabId` 접미사가 붙는다 → **id 셀렉터를 쓰면 안 되는 이유**. 클래스만 쓴다.
- `button[data-auth="..."]`는 권한(`envUtil.hasAuthPrgrm`)이 없으면 자동으로 숨겨진다.
- 그리드 영역에 `data-mdi-role="grid"`를 달면 탭 종료 시 엔진이 `SBGrid3.clearGrid`를 자동 호출한다. (`onDestroy`의 clearGrid도 그대로 유지)

### 3-2. `$R(tabId)` → `$r`
| 사용 | 설명 |
|------|------|
| `$r('.cls')` | 현재 탭/팝업 범위의 첫 요소 (하위 `.wframe`, `.tab-panel` 안 요소는 제외) |
| `$r.all('.cls')` | 다건 (Array) |
| `$r.root` | 루트 요소 |
| `$r.hide('.cls')` / `$r.show('.cls')` | 숨김/표시 |
| `$r.wframe('.sub')` / `$r.parent()` | 하위 프레임 / 상위 프레임의 `$r` |
| `$r.setScope({...})` / `$r.scope` | 프레임 간 공유 객체 |

### 3-3. MdiManager
| API | 설명 |
|------|------|
| `MdiManager.bind(tabId, $r.root, selector, type, handler, useDebounce)` | 이벤트 연결. selector는 `'.a'`, `'.a, .b'`, `['.a','.b']`. `true`면 300ms debounce. 탭 종료 시 자동 해제 |
| `MdiManager.register(tabId, { onDestroy, onUpdate, onActivate })` | 생명주기 훅. `onUpdate(params)`: 이미 열린 탭을 `add`로 다시 열 때 새 파라미터 수신. `onActivate()`: 탭 선택 시 |
| `MdiManager.add(title, url, params, prgmId, menuId)` | 새 탭 열기 (예: `MdiManager.add('사건소송정보 등록', '/ls/xxxRegPop.do', '', 'pXxxRegPop', 'Y')`) |
| `MdiManager.getParams(tabId)` | 탭에 전달된 params |
| `MdiManager.close(tabId)` | 탭 닫기 (부모 탭 `openerId`로 포커스 복귀) |
| `MdiManager.refresh(menuCd)` | prgmId에 menuCd가 포함된 탭의 `.btn-search`를 클릭 → 다른 탭 목록 재조회 |
| `MdiManager.addResource(tabId, { destroy })` | 외부 라이브러리 인스턴스 정리 등록 |
| `MdiManager.loadSubTab(tabpanelEl, params, callback)` | `data-url` 하위 탭 로드 (독립 스코프) |

### 3-4. HttpUtil (jQuery ajax, **JSON 전송**)
- `HttpUtil.post(url, payload, onSuccess, onError)` → `JSON.stringify(payload)`, `Content-Type: application/json`
  → **Controller는 `@RequestBody Map<String, Object>`로 받는다.** 배열/중첩 객체도 그대로 전달된다.
- 응답 규격: `{ errorCode, message, body }`
  - `errorCode == 0`일 때만 `onSuccess(res)` 호출. 그래서 콜백에서 `result.body.xxx`로 꺼낸다.
  - `res.message`가 비어 있지 않으면 **HttpUtil이 자동으로 `UIUtil.alert`를 띄운다.** 서버에서 메시지를 내려주면 화면에서 같은 알림을 또 띄우지 않는다.
  - `errorCode != 0`이면 에러 알림 후 `onError(res)` 호출.
  - HTTP 401/403/500/0 은 `common.js`의 전역 `ajaxError`가 처리한다.
- `HttpUtil.get(url, params, onSuccess, onError)`, `HttpUtil.upload(url, formData, onSuccess)` (upload는 `onSuccess(res.body)`)
- 통신 중 `LoadingSpinner`가 자동 표시된다.

### 3-5. UIUtil
| API | 설명 |
|------|------|
| `UIUtil.openModal({ url, title, params, callback, width, height })` | 팝업. 팝업 스크립트는 `popupId`, `params`, `callback`을 받는다 |
| `UIUtil.closeModal(popupId)` | 팝업 닫기 (팝업의 bind 이벤트/onDestroy 자동 정리). **닫기 X/ESC는 callback을 호출하지 않는다** |
| `UIUtil.alert({ msg, callback })` | 알림. 확인/닫기 시 `callback(true)` |
| `UIUtil.confirm({ msg, title, btnUse: 'Y', callback(isOk) })` | 확인창. `btnUse: 'Y'`여야 [아니요] 버튼이 생긴다 |

팝업 → 부모로 결과 전달 패턴:
```js
// 팝업 스크립트 안
HttpUtil.post('/ls/insertXxx.do', request, (result) => {
    callback(result.body);         // 부모 openModal 의 callback 실행
    UIUtil.closeModal(popupId);    // 팝업 닫기
});
```

### 3-6. 기타 유틸
| 유틸 | 사용법 |
|------|--------|
| `PagingUtil.bind(tabId, {currentPage, totalCount, recordCountPerPage, pageSize: 7}, (page, size) => {}, '.grid-pagination')` | 페이징 UI + 목록개수(10/20/50/100) select. 크기 변경 시 `(1, size)`로 콜백 |
| `GridUtil.mergeConfig({...})` | 기본값과 deep merge. 기본값: `width:'100%'`, `showRowNo:false`, **`showCheck:true`**, `autoHeight:true`, `maxHeight:'398px'`, `rowHeight:'36px'`, `sortable:true`, `copyable:true`, `pasteable:false`, `selectable:{rowSelect:true, cellSelect:'cell', selectMode:'multi'}`, `emptyMessage:'조회된 데이터가 없습니다.'` → 체크박스가 필요 없으면 `showCheck:false`를 명시 |
| `GridUtil.gridDatePicker(datagrid, container, data, field, key)` | 그리드 셀 안 단일 달력 |
| `DataUtil.isEmpty(v)` / `clone(v)` / `get(obj, path, def)` / `debounce(fn, ms)` / `throttle(fn, ms)` | lodash 기반. `isEmpty`는 숫자/boolean은 false |
| `DataUtil.clickDelBtn(root, '.search-top-box', exclude)` | 영역 안 입력칸의 X(`.ico-del-fill`) 버튼을 눌러 일괄 초기화 |
| `Validator.required(el, msg)` / `length(el, min, max, msg)` / `regex(el, re, msg)` / `numeric(el, msg)` | 실패 시 알림 + 포커스, `false` 반환. `Validator.pattern.email/phone` |
| `DateUtil.format(d, fmt)` / `add(d, n, unit)` / `diff(s, e, unit)` / `isBefore` / `isSameOrBefore` / `isSame` | dayjs 기반 |
| `MaskUtil.apply(tabId, target, 'currency' \| 'phone' \| 'bizNo' \| 'ssn')` / `MaskUtil.getRealValue(tabId, target)` | IMask 입력 마스크 / 서버 전송용 숫자 값 |
| `ExcelUtil.download(url, params, fileName)` / `ExcelUtil.upload(url, target, params, onSuccess)` | 엑셀 다운로드(FormData POST → 서버는 `@RequestParam Map`) / 업로드(파일 파라미터명 `excelFile`) |
| `codeUtil.getList(codeId)` / `getName(codeId, code)` | 공통코드 (sessionStorage 캐시, 항목 `{code, codeNm, ...}`) |
| `codeUtil.bindSelect(root, selector, codeId, defaultText, defaultValue)` | 공통코드 select 옵션 생성 |
| `codeUtil.bindSelectWithFilter(root, selector, codeId, firstText, firstValue, {include, exclude, cdCn1..4})` | 필터 적용 select |
| `codeUtil.bindInput(...)` / `bindInputWithFilter(...)` / `getChkedValue(root, name)` / `setChkedValue(root, name, values)` | 공통코드 radio/checkbox |
| `codeUtil.bindSearchSelect(root, '.search-select', codeId, options)` | 검색형 셀렉트 |
| `envUtil.getUser(key)` / `envUtil.get(key)` / `envUtil.hasAuthPrgrm(prgrmId, fwkId)` | 로그인 사용자 정보 / 환경변수 / 권한 |
| `envUtil.bindDeptSelectWithFilter(root, selector, firstText, firstValue, defaultValue, options)` | 부서 select |
| `EditorUtil.field(tabId, textareaEl, { profile, height })` → `.set(html)` / `.get()` | 웹에디터(SunEditor). 탭 종료 시 자동 정리 |
| `EditorUtil.save({ editor, url, data, contentKey, confirmMsg, successMsg, onSuccess })` / `EditorUtil.remove({ url, data, onSuccess })` | 빈값검증 + 확인창 + 저장 + 완료알림 |
| `reportUtil.open(iframeId, { reportUrl, crfName, map })` / `listOpen(...)` | 클립리포트 |
| `dateFormat(value)` | 날짜 표시 포맷 (컬럼 `format`에서 사용, 정의 위치는 받은 소스에 없음) |

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
