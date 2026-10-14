/**
 * ============================================================================
 * [MDI (Multiple Document Interface) Core Engine - Enterprise Edition]
 * 기능: 탭 관리, AJAX 조각 로드, 화면 분할, 메모리 회수, 상태 유지(Session), 로딩 바
 * ============================================================================
 */

window.$R = (tabIdOrRoot) => {
    let root = tabIdOrRoot;
    if (typeof tabIdOrRoot === 'string') {
        root = document.getElementById('content-' + tabIdOrRoot) || document.getElementById(tabIdOrRoot);
    }

    if (!root) {
        console.warn('[$R] root element 탐색 실패', tabIdOrRoot);
        const dummy = () => {
            dummy.all = () => [];
            dummy.wframe = () => null;
            dummy.parent = () => null;
            dummy.setScope = () => {};
            dummy.scope = () => {};
        };
        return dummy;
    }

    const isDirectScope = (el) => {
        if (el === root) return true;

        let curr = el.parentElement;
        while (curr) {
            if (curr === root) return true;

            if (curr.classList.contains('wframe') || curr.classList.contains('tab-panel')) {
                return false;
            }
            curr = curr.parentElement;
        }
        return false;
    };

    // 단건 탐색
    const $r = (selector) => {
        if (!root) return null;
        const elements = root.querySelectorAll(selector);
        for (const el of elements) {
            if (isDirectScope(el)) return el;
        }
        return null;
    };

    // 다건 탐색 (Array 반환 + 하위 탭 요소 무시)
    $r.all = (selector) => {
        if (!root) return [];
        return Array.from(root.querySelectorAll(selector)).filter(isDirectScope);
    };

    //탭 내부 호출
    $r.wframe = (frameId) => {
        const selector = frameId.startsWith('#') || frameId.startsWith('.') ? frameId : '#' + frameId;
        const subRoot = $r(selector);
        return subRoot ? window.$R(subRoot) : null;
    };

    //탭 내부에서 상위 호출
    $r.parent = () => {
        const parentFrame = root.parentElement?.closest('.tab-panel, .wframe, [id^="content-"]');
        return parentFrame ? window.$R(parentFrame) : null;
    };

    // 숨김처리
    $r.hide = (selector) => {
        $r.all(selector).forEach((el) => (el.style.display = 'none'));
    };

    //보이기
    $r.show = (selector, displayType = '') => {
        $r.all(selector).forEach((el) => (el.style.display = displayType));
    };

    root.__scope__ = root.__scope__ || {};
    $r.scope = root.__scope__;

    Object.assign($r, root.__scope__);

    $r.setScope = (obj) => {
        Object.assign(root.__scope__, obj);
        Object.assign($r, obj);
    };

    $r.root = root;
    return $r;
};

/*window.$RScoped = (localRootOrTabId, options) => {
    let root = localRootOrTabId;
    if (typeof localRootOrTabId === 'string') {
        root = document.getElementById('content-' + localRootOrTabId) || document.getElementById(localRootOrTabId);
    }

	const includeNested = !!(options && options.includeNested);

	const _isOwn = (el) => {
		if(includeNested) return true;
		let cur = el.parentElement;
		while(cur && cur !== root){
			if(cur.classList.contains('tab-conts'))return false;
			cur = cur.parentElement;
		}
		return true;
	}
	const $r = (selector) => {
		if(!root) return null;
		return Array.from(root.querySelectorAll(selector)).find(_isOwn) || null;
	};

	$r.all = (selector) => (root ? Array.from(root.querySelectorAll(selector)).filter(_isOwn) : []);

    $r.root = root;
    return $r;
};*/

const MdiManager = (function () {
    // 1. 내부 상태 관리 (State)
    let state = {
        tabs: {}, // 열린 탭 정보 { targetId: { title, url, prgmId = openerId, params, prgrmNm } }
        activeTabId: 'home', // 현재 활성화된 탭
        lifecycles: {}, // 메모리 정리 함수들
        isSplitMode: false, // 분할 모드 상태
        contextTargetId: null, // 우클릭 대상 탭 ID
        modals: [], // 열린 모달 ID들을 순서대로 저장 (Stack)
        isSplitMode: false,
        splitLeftId: null,
        splitRightId: null
    };

    function _initEngineEvents() {
        // 1. 우클릭 메뉴 닫기
        document.addEventListener('click', function () {
            /* ... */
        });

        // 2. 모달 ESC / Tab 포커스 격리
        window.addEventListener('keydown', function (e) {
            /* ... */
        });

        // 3. 화면 분할 리사이저(Drag) 변수 및 이벤트
        let isResizing = false;
        let leftSplitPanel = null;
        let rightSplitPanel = null;

        document.addEventListener('mousedown', function (e) {
            if (e.target.id === 'mdi-resizer') {
                isResizing = true;
                e.target.classList.add('dragging');
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none'; // 드래그 중 텍스트 블록 지정 방지

                // 현재 분할된 두 화면을 order 순서대로 찾음
                const panels = Array.from(document.querySelectorAll('.mdi-content.active')).sort(
                    (a, b) => a.style.order - b.style.order
                );

                if (panels.length === 2) {
                    leftSplitPanel = panels[0];
                    rightSplitPanel = panels[1];
                }
            }
        });
        document.addEventListener('mousemove', function (e) {
            if (!isResizing || !leftSplitPanel) return;

            const container = document.getElementById('mdi-body');
            const containerRect = container.getBoundingClientRect();

            // 마우스의 X 좌표를 컨테이너의 백분율(%)로 계산
            let newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

            // 최소/최대 한계선 설정 (화면이 완전히 사라지는 것 방지, 예: 20% ~ 80%)
            if (newLeftWidth < 20) newLeftWidth = 20;
            if (newLeftWidth > 80) newLeftWidth = 80;

            // 좌측 화면은 지정된 %만큼 고정, 우측 화면은 남은 공간을 다 차지하도록(flex: 1) 설정
            leftSplitPanel.style.flex = `0 0 ${newLeftWidth}%`;
            rightSplitPanel.style.flex = `1 1 0%`;

            // SBGrid3 등 리사이즈 이벤트가 필요한 컴포넌트를 위해 window resize 이벤트 강제 발생
            window.dispatchEvent(new Event('resize'));
        });
        document.addEventListener('mouseup', function () {
            if (isResizing) {
                isResizing = false;
                const resizer = document.getElementById('mdi-resizer');
                if (resizer) resizer.classList.remove('dragging');

                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                leftSplitPanel = null;
                rightSplitPanel = null;
            }
        });
    }

    //Split 마우스 이벤트
    _initEngineEvents();

    // [이벤트] 바탕 클릭 시 우클릭 메뉴 숨김
    document.addEventListener('click', function () {
        const menu = document.getElementById('tab-context-menu');
        if (menu) menu.style.display = 'none';
    });

    // 전역 키다운 이벤트 (ESC 및 Tab 제어)
    window.addEventListener('keydown', function (e) {
        if (state.modals.length === 0) return;

        const topModalId = state.modals[state.modals.length - 1];
        const root = document.getElementById(topModalId);

        // 1. ESC 키 처리: 최상단 모달만 닫기
        if (e.key === 'Escape') {
            UIUtil.closeModal(topModalId);
            return;
        }

        // 2. Tab 키 처리: 포커스 격리 (Focus Trap)
        if (e.key === 'Tab') {
            const focusables = root.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === first) {
                    last.focus();
                    e.preventDefault();
                }
            } else {
                // Tab
                if (document.activeElement === last) {
                    first.focus();
                    e.preventDefault();
                }
            }
        }
    });

    // 스크립트 강제 실행 (범용 스코프 격리: 탭 & 팝업 공통)
    function _executeScripts(container, id, args, reload) {
        const scripts = container.querySelectorAll('script');
        let passedArgs = args || {};
        const params = passedArgs.params || {};
        if (reload === 'Y' && params.tabInfo) {
            passedArgs = args.params.tabInfo || {};
        }

        params.tabInfo = {
            prgmId: passedArgs.prgmId,
            openerId: passedArgs.openerId,
            title: passedArgs.title,
            url: passedArgs.url,
            menuPath: passedArgs.menuPath,
            prgrmFileNm: passedArgs.prgrmFileNm,
            KornPrgrmNm: passedArgs.KornPrgrmNm,
            root: container
        };
        const callback = passedArgs.callback || function () {};

        for (let i = 0; i < scripts.length; i++) {
            const oldScript = scripts[i];

            // ★ 수정됨: 첫 번째 파라미터를 'tabId'로 복구하여 기존 화면 호환성 유지
            // 팝업에서 사용할 경우를 대비해 'popupId'라는 변수도 동일하게 제공합니다.
            const wrappedCode = `
                (function(tabId, params, callback) {
                    'use strict';
                    const popupId = tabId; // 팝업 개발자를 위한 별칭
                    ${oldScript.text}
                })(arguments[0], arguments[1], arguments[2]);
                //# sourceURL=mdi_script_${id}.js
            `;

            // new Function을 통해 JS 객체를 그대로 전달하며 실행
            try {
                const executor = new Function(wrappedCode);
                executor(id, params, callback);
            } catch (e) {
                console.error('[mdi] script executor error', e);
            } finally {
                // DOM에서 스크립트 태그 제거
                oldScript.parentNode.removeChild(oldScript);
            }
        }

        if (typeof TabUI !== 'undefined' && typeof TabUI.init === 'function') {
            TabUI.init(id);
        }
        if (typeof DatepickerUtil !== 'undefined' && typeof DatepickerUtil.init === 'function') {
            DatepickerUtil.init(id);
        }
        if (typeof PatternUtil !== 'undefined' && typeof PatternUtil.init === 'function') {
            PatternUtil.init(id);
        }
    }

    return {
        // ====================================================================
        // [공개 API]
        // ====================================================================

        // UIUtil에서 현재 상태(모달 스택 등)를 참조하기 위해 제공
        getState: function () {
            return state;
        },

        // 외부(UIUtil 등)에서 모달/팝업 스크립트 실행 시 호출
        execute: function (container, id, args) {
            _executeScripts(container, id, args);
        },

        // 탭과 팝업의 생명주기(이벤트, 리소스)를 공통으로 파기하는 함수
        destroyLifecycle: function (id) {
            if (!state.lifecycles || !state.lifecycles[id]) return;

            //자식탭 파괴
            const currentTarget = state.lifecycles[id];
            if (currentTarget && Array.isArray(currentTarget.children)) {
                [...currentTarget.children].forEach((childId) => {
                    this.destroyLifecycle(childId);
                });
            }
            //children 배열에 누락되었을때
            Object.keys(state.lifecycles).forEach((key) => {
                if (key !== id && (state.lifecycles[key]?.parentId === id || key.endsWith('_' + id))) {
                    this.destroyLifecycle(key);
                }
            });

            if (state.lifecycles && state.lifecycles[id]) {
                // 1. 이벤트 해제
                if (state.lifecycles[id].events) {
                    state.lifecycles[id].events.forEach(function (ev) {
                        if (ev.target && ev.handler) {
                            ev.target.removeEventListener(ev.type, ev.handler);
                        }
                    });
                }
                // 2. onDestroy 호출
                if (typeof state.lifecycles[id].onDestroy === 'function') {
                    try {
                        state.lifecycles[id].onDestroy();
                    } catch (e) {
                        console.error(e);
                    }
                }
                // 3. 외부 리소스 해제
                if (state.lifecycles[id].resources) {
                    state.lifecycles[id].resources.forEach(function (inst) {
                        try {
                            if (inst && typeof inst.destroy === 'function') inst.destroy();
                        } catch (e) {}
                    });
                }
                // 4. SBGrid3 하드 클렌징
                const container = document.getElementById('content-' + id) || document.getElementById(id);
                if (container && typeof SBGrid3 !== 'undefined') {
                    const gridElements = container.querySelectorAll('[data-mdi-role="grid"]');
                    gridElements.forEach((el) => {
                        if (!el.className) return;

                        const className = el.className.trim().split(/\s+/)[0];
                        const scopedSelector = `#${container.id} .${className}`;
                        const inst = SBGrid3.getGrid(scopedSelector) || SBGrid3.getGrid(el);
                        if (inst) {
                            if (typeof SBGrid3.clearGrid === 'function') SBGrid3.clearGrid(inst);
                        }
                        el.innerHTML = '';
                    });
                }
				//5.아이프레임 제거
				if(container){
					const iframes = container.querySelectorAll('.iframe');
					iframes.forEach((el) => {
					    try {
					        el.src = 'about:blank';
					    } catch (e) {}
					    el.remove();
					});
				}

                const parentId = state.lifecycles[id]?.parentId;
                if (parentId && state.lifecycles[parentId]?.children) {
                    state.lifecycles[parentId].children = state.lifecycles[parentId].children.filter(
                        (cid) => cid !== id
                    );
                }

                delete state.lifecycles[id];
            }
        },

        /**
         * 1. 탭 추가 및 화면 로드
         * @param {string} title 탭 제목
         * @param {string} url 호출 경로
         * @param {string} params 파라미터
         * @param {string} prgmId 프로그램명
         */
        add: function (title, url, params, prgmId, menuId) {
            'use strict';

            const baseUrl = url.split('?')[0];
            const tabId = prgmId ? prgmId : 'tab_' + btoa(encodeURIComponent(baseUrl)).replace(/=/g, '');

            //이미 열려있는 탭인지 확인
            if (state.tabs[tabId]) {
                //분할모드인경우 레이아웃 리셋 생략
                const container = document.getElementById('content-' + tabId);
                const splitArea = container.classList.contains('active');
                if (!splitArea) {
                    this.select(tabId);
                } else {
                    /* console.log(`분할모드 레이아웃 리셋 생략`);*/
                }

                state.tabs[tabId].params = params;

                // 탭 내부에서 등록해둔 onUpdate 함수가 있다면 새로운 파라미터를 밀어넣음!
                if (
                    state.lifecycles &&
                    state.lifecycles[tabId] &&
                    typeof state.lifecycles[tabId].onUpdate === 'function'
                ) {
                    console.log(`[MDI] 기존 탭(${tabId})에 새로운 파라미터 전달:`, params);
                    state.lifecycles[tabId].onUpdate(params);
                }
                return;
            }

            this._createTabBtn(tabId, title);
            this._createContentArea(tabId);

            LoadingSpinner.show();

            fetch(baseUrl)
                .then((res) => {
                    if (!res.ok) throw new Error(res.status);
                    return res.text();
                })
                .then((html) => {
                    const container = document.getElementById('content-' + tabId);
                    const openerId = state.activeTabId;
                    const debugContent = `<!-- [MDI Screen] ID : ${prgmId} | URL :  ${baseUrl} -->`;
                    const contentHtml = html + debugContent;
                    const prgrmFileNm = envUtil.getPrgrmFileNm(prgmId);
                    const menuPath = envUtil.getMenuPath(prgmId);
                    const kornPrgrmNm = envUtil.getKornPrgrmNm(prgmId);

                    state.tabs[tabId] = {
                        title: title,
                        url: url,
                        prgmId: prgmId,
                        openerId: openerId,
                        params: params,
                        menuId: menuId,
                        prgrmFileNm: prgrmFileNm,
                        menuPath: menuPath,
                        kornPrgrmNm: kornPrgrmNm
                    };

                    if (menuId) {
                        container.innerHTML = _wrapContent(contentHtml, title, url, menuPath);
                    } else {
                        container.innerHTML = _wrapContentNotitle(contentHtml);
                    }
                    //container.innerHTML = html;

                    //화면에 존재하는 id, for에 접미사로 tabid를 추가
                    if (tabId) {
                        _applyTabIdSuffx(container, tabId);
                        _brnInit(container, tabId);
                    }
                    _executeScripts(container, tabId, state.tabs[tabId]);

                    this.select(tabId);
                })
                .catch((err) => {
                    alert('화면을 불러오지 못했습니다. (' + url + ')');
                    console.log(err);
                    this.close(tabId);
                })
                .finally(() => {
                    LoadingSpinner.hide();
                    //메뉴 닫기
                    krds_pcGnb.close();
                });
        },

        // 탭 내부에서 초기 파라미터를 꺼내기 위한 공통 함수 추가
        getParams: function (tabId) {
            return state.tabs[tabId] ? state.tabs[tabId].params : null;
        },

        /**
         * 2. 화면 선택 (활성화)
         */
        select: function (tabId) {
            state.isSplitMode = false;
            state.splitLeftId = null;
            state.splitRightId = null;
            const body = document.getElementById('mdi-body');
            if (body) body.classList.remove('split-mode');

            const allTabs = document.querySelectorAll('.mdi-tabItem, .mdi-content');
            for (let i = 0; i < allTabs.length; i++) allTabs[i].classList.remove('active', 'split-active');

            const targetBtn = document.getElementById('btn-' + tabId);
            const targetContent = document.getElementById('content-' + tabId);
            if (targetBtn) targetBtn.classList.add('active');
            if (targetContent) targetContent.classList.add('active');

            state.activeTabId = tabId;
            this._clearTabPairStyle();

            // 선택된 탭이 화면에 보이도록 스크롤 자동 이동
            if (targetBtn) targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

            // [추가] 활성화된 탭의 onActivate 함수가 있으면 호출
            if (state.lifecycles[tabId] && typeof state.lifecycles[tabId].onActivate === 'function') {
                state.lifecycles[tabId].onActivate();
            }

            document.querySelectorAll('.gnb-main-trigger').forEach((el) => {
                el.classList.remove('is-current');
            });

            //최상위메뉴 활성화 표시
            const topMenuId =
                typeof envUtil !== 'undefined' && typeof envUtil.getTopMenuId === 'function'
                    ? envUtil.getTopMenuId(tabId)
                    : null;
            if (topMenuId) {
                const topMenuEl = document.getElementById(topMenuId);
                if (topMenuEl) topMenuEl.classList.add('is-current');
            }
        },

        /**
         * 3. 탭 닫기 (메모리 정리 포함)
         */
        close: function (tabId, event) {
            if (event) event.stopPropagation();
            if (tabId === 'home') return;

            const content = document.getElementById('content-' + tabId);

            // 리소스 클렌징
            if (state.lifecycles && state.lifecycles[tabId]) {
                // 1-A. 공통 바인딩된 이벤트 자동 해제
                /*if (state.lifecycles[tabId].events) {
                    state.lifecycles[tabId].events.forEach(function(ev) {
                        ev.target.removeEventListener(ev.type, ev.handler);
                    });
                }

                // 1-B. 명시적 onDestroy 실행
                if (typeof state.lifecycles[tabId].onDestroy === 'function') {
                    try { state.lifecycles[tabId].onDestroy(); } catch(e) { console.error(e); }
                }

                // 1-C. mdi-util.js에서 등록한 외부 라이브러리(IMask 등) 인스턴스 자동 파기
                if (state.lifecycles[tabId].resources) {
                    state.lifecycles[tabId].resources.forEach(function(inst) {
                        try {
                            if (inst && typeof inst.destroy === 'function') {
                                inst.destroy();
                            }
                        } catch (e) {
                            console.error("[MDI] 외부 라이브러리 파기 중 오류:", e);
                        }
                    });
                }

                // 1-D. 생명주기 객체 완전 삭제 (기존 1-C를 1-D로 밀어냄)
                delete state.lifecycles[tabId];*/

                this.destroyLifecycle(tabId);
            }

            const container = document.getElementById('content-' + tabId) || document.getElementById(tabId);
            if (container && typeof SBGrid3 !== 'undefined') {
                const gridElements = container.querySelectorAll('[data-mdi-role="grid"]');
                gridElements.forEach((el) => {
                    if (!el.className) return;

                    const className = el.className.trim().split(/\s+/)[0];
                    const scopedSelector = `#${container.id} .${className}`;
                    const inst = SBGrid3.getGrid(scopedSelector) || SBGrid3.getGrid(el);
                    if (inst) {
                        if (typeof SBGrid3.clearGrid === 'function') SBGrid3.clearGrid(inst);
                    }
                    el.innerHTML = '';
                });
            }

            // ==========================================
            // [3] DOM 및 상태 제거
            // ==========================================
            const btn = document.getElementById('btn-' + tabId);
            if (btn) btn.remove();
            if (content) content.remove(); // 모든 정리가 끝난 후 가장 마지막에 DOM 삭제!

            // 부모 탭(openerId)이 이미 먼저 닫혔을 수도 있으므로 존재하는지 방어 로직 추가
            let openerId = state.tabs[tabId] ? state.tabs[tabId].openerId : null;
            if (openerId && !state.tabs[openerId]) openerId = null;

            delete state.tabs[tabId];

            // 포커스 (화면 전환) 처리 개선
            if (openerId) {
                // 부모 탭이 살아있으면 부모 탭으로 이동
                this.select(openerId);
            } else if (state.activeTabId === tabId || state.isSplitMode) {
                const remainingTabs = Object.keys(state.tabs);
                if (remainingTabs.length > 0) {
                    this.select(remainingTabs[remainingTabs.length - 1]); // 가장 마지막 탭 활성화
                } else {
                    this.select('home'); // 다 닫혔으면 홈으로
                }
            }
        },

        /**
         * 특정 URL이 포함된 탭의 조회 버튼을 강제로 클릭함
         * @param {string} urlPart - 찾고자 하는 URL의 일부 (예: 'getViewCommBbs21')
         */
        refresh: function (menuCd) {
            // state.tabs에 저장된 모든 탭을 순회
            for (let id in state.tabs) {
                // URL이 일치하는 탭을 찾음
                console.log(state.tabs[id]);
                if (state.tabs[id].prgmId.indexOf(menuCd) > -1) {
                    const targetContent = document.getElementById('content-' + id);
                    if (targetContent) {
                        // 해당 탭 내의 '조회' 클래스를 가진 버튼을 찾아 클릭
                        const btnSearch = targetContent.querySelector('.btn-search');
                        if (btnSearch) {
                            console.log('[MDI] 목록 탭 새로고침 실행: ' + id);
                            btnSearch.click();
                        }
                    }
                }
            }
        },

        /**
         * 4. 탭 바 좌우 스크롤 제어
         * @param {number} offset 이동할 픽셀 (양수: 오른쪽, 음수: 왼쪽)
         */
        scroll: function (offset) {
            const tabBar = document.getElementById('mdi-tab-bar');
            if (tabBar) tabBar.scrollBy({ left: offset, behavior: 'smooth' });
        },

        /**
         * @param {string} tabId - 현재 탭 ID
         * @param {HTMLElement} root - 탭의 최상위 루트 엘리먼트
         * @param {string | Array} selector - 대상 선택자
         * @param {string} type - 이벤트 타입 (click, keydown 등)
         * @param {function} handler - 실행할 함수
         * @param {boolean} useDebounce - 데바운스(연타를 방지하기) 적용 여부 (기본값 false)
         *
         * 		'.caseNo'
         *    	'.caseNo, .caseNm'
         *    	['.caseNo', '.caseNm']
         */
        bind: function (tabId, root, selector, type, handler, useDebounce = false) {
            if (!root || !selector || typeof handler !== 'function') return;

            const targetSelector = Array.isArray(selector) ? selector.join(', ') : selector;

            const elList = root.querySelectorAll(targetSelector);
            if (!elList || elList.length === 0) return;

            //해당 탭의 lifecycle 객체 준비
            if (!state.lifecycles[tabId]) state.lifecycles[tabId] = {};
            if (!state.lifecycles[tabId].events) state.lifecycles[tabId].events = [];

            //이벤트 리스너 등록
            elList.forEach((item) => {
                //데바운스 적용 여부에 따라 실제 등록할 핸들러 결정
                const finalHandler = useDebounce ? DataUtil.debounce(handler, 300) : handler;
                item.addEventListener(type, finalHandler);

                //나중에 해제하기 위해 'finalHandler'의 참조를 저장 (중요!)
                state.lifecycles[tabId].events.push({
                    target: item,
                    type: type,
                    handler: finalHandler
                });
            });

            //el.addEventListener(type, finalHandler);
        },

        /**
         * [MDI Lifecycle Register]
         * 화면의 생명주기(해제, 갱신, 활성화)를 엔진에 등록합니다.
         * @param {string} tabId - 현재 화면 ID
         * @param {Object} hooks - 라이프사이클 훅 객체
         */
        register: function (tabId, obj) {
            if (!state.lifecycles[tabId]) state.lifecycles[tabId] = {};
            // 기존에 bind로 등록된 events나 resources를 유지하며 onDestroy만 병합
            Object.assign(state.lifecycles[tabId], obj);
        },
        /**
         * mdi창 버튼 생성
         * @param {string} id - 현재 화면 ID
         * @param {string} title - 탭명
         */
        _createTabBtn: function (id, title) {
            const btn = document.createElement('li');
            btn.id = 'btn-' + id;
            btn.className = 'mdi-tabItem';
            btn.innerHTML = `
			<button type="button" class="btn-tab ellipsis" role="tab" aria-selected="false" aria-controls="content-menu01" title="${title}">${title}</button>
			<button type="button" onclick="MdiManager.close('${id}', event)" class="btn-del"><span class="sr-only">삭제</span></button>
			`;

            const self = this;
            btn.onclick = function () {
                self.select(id);
            };
            btn.oncontextmenu = function (e) {
                e.preventDefault();
                state.contextTargetId = id;
                const menu = document.getElementById('tab-context-menu');

                menu.style.display = 'block';
                menu.style.left = e.pageX + 'px';
                menu.style.top = e.pageY + 'px';
            };
            document.getElementById('mdi-tab-bar').appendChild(btn);
        },

        _createContentArea: function (id) {
            const area = document.createElement('div');
            area.id = 'content-' + id;
            area.className = 'mdi-content mdi-conts';
            document.getElementById('mdi-body').appendChild(area);
        },

        menuAction: function (action) {
            const targetId = state.contextTargetId;
            if (!targetId) return;

            if (action === 'split') {
                const leftId = state.activeTabId;
                if (leftId === 'home') {
                    alert('메인 홈 화면은 분할할 수 없습니다.');
                    return;
                }

                //추가
                this.startSplitMode(targetId);
            } else if (action === 'close') {
                this.close(targetId);
            } else if (action === 'closeOthers') {
                for (let id in state.tabs) {
                    if (id !== targetId && id !== 'home') this.close(id);
                }
                this.select(targetId);
            } else if (action === 'closeAll') {
                for (let id in state.tabs) {
                    if (id !== 'home') this.close(id);
                }
                this.select('home');
            } else if (action === 'reloadTab') {
                const tabInfo = state.tabs[targetId];
                if (!tabInfo) return;

                const container = document.getElementById('content-' + targetId);
                if (!container) return;

                const menuPath = envUtil.getMenuPath(tabInfo.prgmId);

                /*const grid = SBGrid3.getGrid('.grid-container');
                if (!grid) console.log("✅ 성공: 그리드가 메모리에서 완전히 삭제되었습니다.");
                else console.warn("⚠️ 경고: 그리드가 아직 살아있습니다. destroy()가 실패했거나 호출되지 않았습니다.");*/

                // [1] 리소스 클렌징 (이벤트 해제 및 객체 파괴)
                this.destroyLifecycle(targetId);

                /*const grid2 = SBGrid3.getGrid('.grid-container');
                if (!grid2) console.log("✅ 성공: 그리드가 메모리에서 완전히 삭제되었습니다.");
                else console.warn("⚠️ 경고: 그리드가 아직 살아있습니다. destroy()가 실패했거나 호출되지 않았습니다.");*/

                // ==========================================
                // [3] 화면 다시 불러오기
                // ==========================================
                if (typeof LoadingSpinner !== 'undefined') LoadingSpinner.show();

                fetch(tabInfo.url)
                    .then(function (res) {
                        if (!res.ok) throw new Error(res.status);
                        return res.text();
                    })
                    .then(function (html) {
                        if (tabInfo.menuId) {
                            container.innerHTML = _wrapContent(html, tabInfo.title, tabInfo.url, menuPath);
                        } else {
                            container.innerHTML = _wrapContentNotitle(html);
                        }
                        //container.innerHTML = _wrapContent(html, tabInfo.title);
                        _applyTabIdSuffx(container, targetId);
						_brnInit(container, targetId);

                        const reload = 'Y';
                        _executeScripts(container, targetId, state.tabs[targetId], reload);
                    })
                    .catch(function (err) {
                        alert('해당 화면을 새로고침하는 중 오류가 발생했습니다.');
                        console.error(err);
                    })
                    .finally(function () {
                        if (typeof LoadingSpinner !== 'undefined') LoadingSpinner.hide();
                    });
            }
        },

        /**
         * 스플릿 모드 시작
         * @param {string} leftId - 스플릿 모드 기준이 되는 왼쪽하면 아이디
         */
        startSplitMode: function (leftId) {
            state.isSplitMode = true;
            state.splitLeftId = leftId;
            state.splitRightId = null;

            document.querySelectorAll('.mdi-tabItem, .mdi-content').forEach((el) => {
                el.classList.remove('active');
            });

            document.getElementById('mdi-body').classList.add('split-mode');

            const leftContent = document.getElementById('content-' + leftId);
            if (leftContent) leftContent.style.order = 1;
            const splitArea = leftContent.classList.contains('active');
            if (!splitArea) leftContent.classList.add('active');

            const leftTab = document.getElementById('btn-' + leftId);
            if (leftTab) leftTab.classList.add('active');

            this._setupResizer();
            this.showSplitSelector();
        },

        showSplitSelector: function () {
            if (state.splitRightId) {
                const currentRight = document.getElementById('content-' + state.splitRightId);
                if (currentRight) currentRight.classList.remove('active');
                state.splitRightId = null;

                const currentRightTab = document.getElementById('btn-' + state.splitRightId);
                if (currentRightTab) currentRightTab.classList.remove('active');

                state.splitRightId = null;
            }

            let availableTabs = [];
            for (var id in state.tabs) {
                if (id !== state.splitLeftId && id !== 'home') {
                    availableTabs.push({ id: id, title: state.tabs[id].title });
                }
            }

            let rightPlaceholder = document.getElementById('menu-select');
            if (!rightPlaceholder) {
                rightPlaceholder = document.createElement('div');
                rightPlaceholder.id = 'menu-select';
                rightPlaceholder.className = 'mdi-conts mdi-content slctpanel active';
                document.getElementById('mdi-body').appendChild(rightPlaceholder);
            }

            rightPlaceholder.classList.add('active');
            rightPlaceholder.style.order = 3;
            rightPlaceholder.style.flex = '1 1 0%';

            if (availableTabs.length === 0) {
                rightPlaceholder.innerHTML = `
					<div id="menu-select" class="mdi-conts slctpanel active">
						<h4>열린 화면이 없습니다.</h4>
						<p>상단 메뉴에서 새로운 화면을 열어주세요</p>
						<button class="btn-close close-slct-tab" onclick="MdiManager.cancelSplit();"><i class="sr-only">닫기</i></button>
					</div>`;
            } else {
                let listHtml = `
					<div class="slct-tab-list">
						<span class="ti">화면분할에 추가할 탭을 선택하세요</span>
						<ul>`;
                availableTabs.forEach((tab) => {
                    //onclick="MdiManager.confirmSplit('${tab.id}')"
                    listHtml += `<li><button class="btn-list" data-tabid="${tab.id}">${tab.title}</button></li>`;
                });

                listHtml += `
						</ul>
						<div class="btn-wrap">
							<button class="btn secondary sm btn-cancel">취소</button>
							<button class="btn primary sm" onclick="MdiManager.confirmSplit()">적용</button>
						</div>
					</div>`;
                rightPlaceholder.innerHTML = listHtml;
            }
        },

        confirmSplit: function (targetId) {
            document.getElementById('menu-select').classList.remove('active');

            document.querySelectorAll('.mdi-tabItem').forEach(function (tab) {
                if (tab.id !== 'btn-' + state.splitLeftId) {
                    tab.classList.remove('active');
                }
            });

            if (!targetId) {
                const activeBtnId = document.querySelector('li.active .btn-list')?.dataset.tabid;
                targetId = activeBtnId;
            }

            const rightContent = document.getElementById('content-' + targetId);
            if (rightContent) {
                rightContent.classList.add('active');
                rightContent.style.order = 3;
            }

            const rightTab = document.getElementById('btn-' + targetId);
            if (rightTab) rightTab.classList.add('active');

            state.splitRightId = targetId;
            this._clearTabPairStyle();

            window.dispatchEvent(new Event('resize'));
        },

        cancelSplit: function () {
            state.isSplitMode = false;
            document.getElementById('mdi-body').classList.remove('split-mode');

            const placeholder = document.getElementById('menu-select');
            if (placeholder) placeholder.classList.remove('active');
            const resizer = document.getElementById('mdi-resizer');
            if (resizer) resizer.style.display = 'none';

            const leftId = state.splitLeftId;
            state.splitLeftId = null;
            state.splitRightId = null;

            if (leftId) this.select(leftId);
        },

        _setupResizer: function () {
            let resizer = document.getElementById('mdi-resizer');

            if (!resizer) {
                resizer = document.createElement('div');
                resizer.id = 'mdi-resizer';
                resizer.className = 'mdi-resizer';
                document.getElementById('mdi-body').appendChild(resizer);
            }

            resizer.style.display = 'block';
        },
        _clearTabPairStyle: function () {
            document.querySelectorAll('.mdi-tabItem').forEach((el) => {
                el.classList.remove('split-paired', 'split-paired-left', 'split-paired-right');
            });
        },

        /**
         * ★ [신규] 외부 유틸리티(mdi-util)에서 생성한 인스턴스를 엔진 생명주기에 등록
         */
        addResource: function (tabId, instance) {
            if (!state.lifecycles[tabId]) state.lifecycles[tabId] = {};
            if (!state.lifecycles[tabId].resources) state.lifecycles[tabId].resources = [];

            state.lifecycles[tabId].resources.push(instance);
        },

        loadSubTab: async function (tabpanelEl, params, callback) {
            // 중복 로드 방지
            if (tabpanelEl.dataset.loaded === 'true') {
                tabpanelEl.classList.add('active');
                tabpanelEl.style.display = '';

                const childR = window.$R(tabpanelEl);
                if (typeof callback === 'function') callback(childR);
                return childR;
            }

            const url = tabpanelEl.dataset.url;
            if (!url) return;
			
			

            try {
                const response = await fetch(url);
                const html = await response.text();
                tabpanelEl.innerHTML = html;
				
				//버튼 권한 처리
				tabpanelEl.querySelectorAll('button[data-auth]').forEach(function (el) {
					const auth = el.dataset.auth;
					if(!envUtil.hasAuthPrgrm(url, auth)){
						el.style.display = "none";
					}
		        });

                const parentContainer = tabpanelEl.closest('[id^="content-"]');
                const parentId = parentContainer ? parentContainer.id.replace('content-', '') : state.activeTabId;
                console.log(`parentContainer : ${parentContainer}`);
                console.log(`parentId : ${parentId}`);

                const subTabId =
                    tabpanelEl.id && tabpanelEl.id.includes(parentId) ? tabpanelEl.id : `${tabpanelEl.id}_${parentId}`;
                console.log(`subTabId : ${subTabId}`);

                if (!state.lifecycles) state.lifecycles = {};
                if (state.lifecycles[subTabId]) {
                    this.destroyLifecycle(subTabId);
                }

                state.lifecycles[subTabId] = {
                    events: [],
                    resources: [],
                    onDestroy: null,
                    parentId: parentId
                };

                if (parentId && state.lifecycles[parentId]) {
                    if (!state.lifecycles[parentId].children) {
                        state.lifecycles[parentId].children = [];
                    }
                    if (!state.lifecycles[parentId].children.includes(subTabId)) {
                        state.lifecycles[parentId].children.push(subTabId);
                    }
                }
                // 하위 탭 내부만 독립된 스코프로 격리하여 스크립트 실행
                _executeScripts(tabpanelEl, subTabId, {
                    params: params || {},
                    prgmId: subTabId,
                    openerId: parentId,
                    root: tabpanelEl // 하위 탭만의 독립 DOM 루트 보장
                });

                tabpanelEl.dataset.loaded = 'true';
                tabpanelEl.classList.add('active');
                tabpanelEl.style.display = '';

                const childR = window.$R(tabpanelEl);
                if (typeof callback === 'function') callback(childR);
                return childR;
            } catch (e) {
                console.error('하위 탭 로드 실패:', e);
            }
        }
    };

    /**
     *
     *
     */
    function _wrapContent(html, title, url, menuPath) {
        const pathArray = menuPath.split(' > ');
        return (
            '' +
            `
		<div class="inner">
			<div class="conts-wrap">
				<div class="page-title-wrap">
					<div class="page-title"><h2 class="h-tit">` +
            title +
            `</h2></div>
					<div class="right">
						<nav class="breadcrumb-wrap" aria-label="브레드크럼">
							<ol class="breadcrumb">
								<li>` +
            '(' +
            url +
            ')' +
            `</li>
								<li class="home"><a href="#" class="txt">홈</a></li>
								` +
            pathArray
                .map((menuName, index) => {
                    if (index === pathArray.length - 1) {
                        return '<li><span class="txt">' + menuName + '</span></li>';
                    }
                    return '<li><span class="txt">' + menuName + '</span></li>';
                })
                .join('') +
            `
							</ol>
						</nav>
						<button type="button" class="btn btn-ico ico-help sm-m btn-help-exec"><span class="sr-only">도움말</span></button>
					</div>
				</div>
				` +
            html +
            `
			</div>
		</div>
		`
        );
    }

    function _wrapContentNotitle(html) {
        return (
            '' +
            `
		<div class="inner">
			<div class="conts-wrap">
				` +
            html +
            `
			</div>
		</div>
		`
        );
    }

    //id 중복 방지
    function _applyTabIdSuffx(container, tabId) {
        let idMap = {};
        container.querySelectorAll('[id]').forEach(function (el) {
            let oldId = el.id;
            var newId = oldId + '_' + tabId;
            idMap[oldId] = newId;
            el.id = newId;
        });
        container.querySelectorAll('[for]').forEach(function (el) {
            el.setAttribute('for', el.getAttribute('for') + '_' + tabId);
        });
        ['aria-controls', 'aria-labelledby', 'aria-describedby'].forEach(function (attr) {
            container.querySelectorAll('[' + attr + ']').forEach(function (el) {
                let refId = el.getAttribute(attr);
                if (idMap[refId]) el.setAttribute(attr, idMap[refId]);
            });
        });
    }
    
	//화면의 버튼 숨김처리, 권한이 있는 버튼만 출력
	function _brnInit(container, tabId) {
        container.querySelectorAll('button[data-auth]').forEach(function (el) {
			const auth = el.dataset.auth;
			if(!envUtil.hasAuthPrgrm(tabId, auth)){
				el.style.display = "none";
			}
        });
    }
})();

// ============================================================================
// ★ 문서 로드 완료 시, 이전 세션(열려있던 탭) 자동 복구 실행
// ============================================================================
/*
window.addEventListener('DOMContentLoaded', function() {
    MdiManager.restore();
});
*/
