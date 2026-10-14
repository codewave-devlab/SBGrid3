/**
 * ============================================================================
 * @fileNmae  mdi-util.js
 * @description MDI 프로젝트 공통 유틸리티 모음
 * @author 홍길동
 * 의존성: jQuery, Day.js (dayjs.min.js, dayjs-ko.js)
 * ============================================================================
 */

// Day.js 한국어 전역 설정 (dayjs-ko.js가 로드되어 있어야 함)
if (typeof dayjs !== 'undefined') {
    dayjs.locale('ko');
}

/**
 * 페이징 유틸리티
 */
const PagingUtil = {
    /**
     * 페이징 바인딩
     * @param {string} tabId 탭아이디
     * @param {object} pageInfo 페이징정보
     * @param {function} onChange 이벤트 함수
     * @param {string} targetSelector 페이징 랜더링 대상 요소
     */
    bind: function (tabId, pageInfo, onChange, targetSelector = '.grid-pagination') {
        this.render(
            tabId,
            targetSelector,
            pageInfo,
            (page) => {
                onChange(page, null);
            },
            (size) => {
                onChange(1, size);
            }
        );
    },

    render: function (tabId, targetSelector, pageInfo, onPageClick, onSizeChange) {
        // 1. 철저한 스코프 격리: 현재 탭(root) 안에서만 대상을 찾음
        const root = document.getElementById('content-' + tabId) || document.getElementById(tabId);
        if (!root) return;

		const candidates = root.querySelectorAll(targetSelector);
		if(candidates.length === 0) return;

        let container = candidates[0];
		if(candidates.length > 1){
			if(root.classList.contains('wframe')){
				const target = Array.from(candidates).find(el => el.closest('.wframe'));
				if(target) container = target;
			}else{
				const target = Array.from(candidates).find(el => !el.closest('.wframe'));
				if(target) container = target;
			}
		}

        const { currentPage, totalCount, recordCountPerPage, pageSize = 7 } = pageInfo;

        // 데이터가 없으면 페이징 영역 초기화 후 종료
        if (totalCount === 0) {
            container.innerHTML = '';
            return;
        }

        // 1. 계산 로직 (전자정부 프레임워크 표준 방식)
        const totalPageCount = Math.ceil(totalCount / recordCountPerPage);
        //const firstPageNoOnPageList = Math.floor((currentPage - 1) / pageSize) * pageSize + 1;
        //const lastPageNoOnPageList = Math.min(firstPageNoOnPageList + pageSize - 1, totalPageCount);

        const half = Math.floor(pageSize / 2);
        let firstPageNoOnPageList = currentPage - half;
        let lastPageNoOnPageList = currentPage + half;

        if (firstPageNoOnPageList < 1) {
            lastPageNoOnPageList += 1 - firstPageNoOnPageList;
            firstPageNoOnPageList = 1;
        }

        //if(lastPageNoOnPageList > totalPageCount){
        //	lastPageNoOnPageList += (1 - firstPageNoOnPageList);
        //	firstPageNoOnPageList = 1;
        //}

        if (lastPageNoOnPageList > totalPageCount) {
            firstPageNoOnPageList -= lastPageNoOnPageList - totalPageCount;
            lastPageNoOnPageList = totalPageCount;
        }
        firstPageNoOnPageList = Math.max(firstPageNoOnPageList, 1);

        const selectId = 'slct-paging-' + tabId + '-' + targetSelector.replace(/[^a-zA-Z0-9]/g, '');

        let html = `
            <div class="pagination">
                <div class="paging">
        `;

        const prevDisavled = currentPage <= 1;
        let pagePrev = currentPage;
        // [처음/이전 블록]
        if (firstPageNoOnPageList > 1) {
            if (currentPage < 11) {
                pagePrev = 1;
            } else {
                pagePrev = currentPage - 10;
            }
            html += `<a class="page-navi prev${prevDisavled ? ' disabled' : ''}" data-page="${pagePrev}" href="#">이전</a>`;
            //html += `<a class="page-navi prev" data-page="${firstPageNoOnPageList - 1}"><span>&lt;</span></a>`;
        } else {
            html += '<span class="page-link link-dot prev"></span>';
        }

        html += `<div class="page-links">`;

        if (firstPageNoOnPageList > 1) {
            html += `<a class="page-link" href="#" data-page="1">1</a>`;
            if (firstPageNoOnPageList > 2) {
                html += `<span class="page-link link-dot prev"></span>`;
            }
        }

        // [숫자 페이지]
        for (let i = firstPageNoOnPageList; i <= lastPageNoOnPageList; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            html += `<a class="page-link ${activeClass}" href="#" data-page="${i}"><span>${i}</span></a>`;
        }

        // [다음/마지막 블록]
        if (lastPageNoOnPageList < totalPageCount) {
            if (lastPageNoOnPageList < totalPageCount - 1) {
                html += '<span class="page-link link-dot next"></span>';
            }
            html += `<a class="page-link"  href="#"  data-page="${totalPageCount}">${totalPageCount}</a>`;
            //html += `<a class="page-navi next" data-page="${lastPageNoOnPageList + 1}"><span>&gt;</span></a>`;
            //html += `<a class="page-navi next" data-page="${totalPageCount}"><span>&raquo;</span></a>`;
        }
        html += '</div>';

        const nextDisabled = currentPage >= totalPageCount;
        let pageNext = currentPage;
        if (currentPage < totalPageCount) {
            if (totalPageCount - currentPage > 11) {
                pageNext = currentPage + 10;
                html += `<a class="page-navi next${nextDisabled ? ' disabled' : ''}" href="#" data-page="${pageNext}">다음</a>`;
            } else {
                html += `<a class="page-navi next${nextDisabled ? ' disabled' : ''}" href="#" data-page="${totalPageCount}">다음</a>`;
            }
        }
        //html += `<a class="page-navi next${nextDisabled ? ' disabled' : ''}" href="#" data-page="${currentPage + 1}">다음</a>`;
        html += '</div>';

        html += `
		<div class="btn-wrap w70">
			<label class="sr-only" for="${selectId}">목록개수</label>
			<select class="form-select sm" id="${selectId}">
				<option value="10" ${Number(recordCountPerPage) === 10 ? 'selected' : ''}>10</option>
				<option value="20" ${Number(recordCountPerPage) === 20 ? 'selected' : ''}>20</option>
				<option value="50" ${Number(recordCountPerPage) === 50 ? 'selected' : ''}>50</option>
				<option value="100" ${Number(recordCountPerPage) === 100 ? 'selected' : ''}>100</option>
			</select>
		</div>
		`;
        html += '</div>';
        // 2. DOM 렌더링 (기존 HTML 덮어쓰기)
        container.innerHTML = html;

        // 3. ★ 렌더링 직후 이벤트 바인딩 (Vanilla JS)
        container.onclick = function (e) {
            const target = e.target.closest('.page-link, .page-navi');
            if (!target || target.classList.contains('disabled')) return;
            e.preventDefault;

            const pageNo = parseInt(target.getAttribute('data-page'), 10);
            if (pageNo && pageNo !== currentPage) {
                onPageClick(pageNo);
            }
        };

        const selectEl = container.querySelector('#' + selectId);
        if (selectEl) {
            selectEl.onchange = function () {
                if (typeof onSizeChange === 'function') {
                    onSizeChange(parseInt(selectEl.value, 10));
                }
            };
        }
    }
};

/**
 * UI 컴포넌트 유틸리티 (jQuery UI 등 렌더링 제어)
 */
const UIUtil = {
    BASE_Z_INDEX: 1000,

    /**
     * MDI 공통 모달 팝업 오픈
     * @param {Object} options - { url, params, callback, width, height, title }
     */
    openModal: function (options) {
        const popupId = 'modal-' + Date.now();
        const state = MdiManager.getState();

        // 1. Z-Index 계산 (기존 모달 개수에 따라 10씩 증가)
        const currentZ = this.BASE_Z_INDEX + state.modals.length * 10;

        // 2. 모달 오버레이 및 컨테이너 생성
        const overlay = document.createElement('section');
        overlay.id = popupId;
        overlay.className = 'modal fade shown in';
        overlay.ariaHidden = 'false';
        overlay.role = 'dialog';
        overlay.ariaLabelledby = 'tit_modal_01';
        overlay.style.zIndex = currentZ;

        // 간단한 모달 틀 구조 (프로젝트 퍼블리싱 가이드에 맞춰 수정 가능)
        overlay.innerHTML = `
            <div class="modal-dialog" style="width:${options.width || '600px'};">
                <div class="modal-content" style="min-width:${options.width || '600px'}; height:${options.height || 'auto'};">
                    <!-- modal title -->
                    <div class="modal-header"><h2 id="modal_01" class="modal-title">${options.title || '팝업창'}</h2></div>
                    <!-- //modal title -->
					<div class="modal-wrap" id="${popupId}-body">

                    </div>
                    <!-- close button -->
                    <button type="button" class="btn-close close-modal modal-cancel"><span class="sr-only">닫기</span></button>
                    <!-- //close button -->
                </div>
            </div>
            <div class="modal-back is-active"></div>
        `;

        const targetElement = document.getElementById('container');
        targetElement.append(overlay);
        document.body.classList.add('scroll-no');

        overlay.addEventListener('click', function (e) {
            if (e.target.closest('.close-modal')) {
                UIUtil.closeModal(popupId);
				/*
				콜백 제거
				if(e.target.closest('.modal-cancel') && typeof options.callback === 'function'){
					options.callback(false);
				}
				*/

            }
        });

		if(state.modals.length > 0){
			const prevId = state.modals[state.modals.length -1];
			const prevModal = document.getElementById(prevId);
			if(prevModal){
				prevModal.querySelector('.modal-back').classList.remove('is-active');
			}
		}

        // 3. 모달 스택에 추가
        state.modals.push(popupId);

        const renderContent = (htmlContent) => {
            const bodyContainer = document.getElementById(popupId + '-body');
            bodyContainer.innerHTML = htmlContent;

            const idElements = bodyContainer.querySelectorAll('[id]');
            idElements.forEach(function (el) {
                el.id = el.id + '_' + popupId;
                //console.log(`el.id : `, el.id);
            });

			console.log("(options.url : " + options.url);
			console.log("(options.url : " + options.url);

            const forElements = bodyContainer.querySelectorAll('[for]');
            forElements.forEach(function (el) {
                el.setAttribute('for', el.getAttribute('for') + '_' + popupId);
                //console.log(`el.getAttribute(for) : `, el.getAttribute('for'));
            });

			bodyContainer.querySelectorAll('button[data-auth]').forEach(function (el) {
				const auth = el.dataset.auth;
				if(!envUtil.hasAuthPrgrm(options.url, auth)){
					el.style.display = "none";
				}
	        });

            // 5. 엔진을 통한 스크립트 실행 (tabId, params, callback 주입)
            MdiManager.execute(bodyContainer, popupId, {
                params: options.params || {},
                callback: options.callback || function () {}
            });

            // 첫 번째 입력 요소에 포커스 자동 부여
            const firstInput = bodyContainer.querySelector('input, button, select');
            if (firstInput) setTimeout(() => firstInput.focus(), 100);
        };

        if (options.html) {
            renderContent(options.html);
        } else if (options.url) {
            // 4. AJAX 화면 로드
            fetch(options.url)
                .then((res) => {
                    if (!res.ok) throw new Error(res.status);
                    return res.text();
                })
                .then((html) => {
                    renderContent(html);
                })
                .catch((err) => {
                    console.error('Modal load error:', err);
                    //alert("팝업 화면을 불러오는 중 오류가 발생했습니다.");
                    UIUtil.alert({ msg: '팝업 화면을 불러오는 중 오류가 발생했습니다.' });
                    this.closeModal(popupId);
                });
        }
    },

    /**
     * 열려 있는 모달 닫기
     * @param {string} popupId - 닫을 모달의 ID
     */
    closeModal: function (popupId) {
        // 1. 엔진의 공통 파기 함수 호출 (이벤트 해제, onDestroy 실행 등)
        if (MdiManager.destroyLifecycle) {
            MdiManager.destroyLifecycle(popupId);
        }

        // 2. DOM 제거
        const el = document.getElementById(popupId);
        if (el) el.remove();

        // 3. 모달 스택에서 제거
        const state = MdiManager.getState();
        const index = state.modals.indexOf(popupId);
        if (index > -1) state.modals.splice(index, 1);

        // 4. 이전 요소로 포커스 복원 (스택의 마지막 모달 혹은 부모 탭)
        if (state.modals.length > 0) {
            const prevId = state.modals[state.modals.length - 1];
            const prevModal = document.getElementById(prevId);
            if (prevModal){
				prevModal.focus();
				prevModal.querySelector('.modal-back').classList.add('is-active');
			}
        }

        document.body.classList.remove('scroll-no');
    },

    alert: function (options) {
        const popupId = 'sys-msg-' + Date.now();
        const state = MdiManager.getState();
        const currentZ = this.BASE_Z_INDEX + state.modals.length * 10 + 5;
        const overlay = document.createElement('section');

        overlay.id = popupId;
        overlay.className = 'modal alert fade shown in';
        overlay.ariaHidden = 'false';
        overlay.role = 'dialog';
        overlay.ariaLabelledby = 'tit_modal' + popupId;
        overlay.style.zIndex = currentZ;

        overlay.innerHTML = `
					<div class="modal-dialog small">
						<div class="modal-content">
							<div class="modal-header"><h2 id="tit_modal_sample_04" class="modal-title">알림</h2></div>
							<div class="modal-conts">
								<div class="conts-area">
									${options.msg}
								</div>
							</div>

							<div class="modal-btn btn-wrap">
								<button type="button" class="btn primary sm close-modal btn-yes">확인</button>
							</div>
							<button type="button" class="btn-close close-modal"><span class="sr-only">닫기</span></button>
						</div>
					</div>
					<div class="modal-back is-active"></div>
				`;

        const targetElement = document.getElementById('container');
        targetElement.append(overlay);

		if(state.modals.length > 0){
			const prevId = state.modals[state.modals.length -1];
			const prevModal = document.getElementById(prevId);
			if(prevModal){
				prevModal.querySelector('.modal-back').classList.remove('is-active');
			}
		}

        state.modals.push(popupId);
        document.body.classList.add('scroll-no');

        const closePopup = function (result) {
            overlay.remove();
            const index = state.modals.indexOf(popupId);
            if (index > -1) state.modals.splice(index, 1);

            if (typeof options.callback === 'function') {
                options.callback(result);
            }
            document.body.classList.remove('scroll-no');
        };

		// 첫 번째 입력 요소에 포커스 자동 부여
		const firstInput = overlay.querySelector('input, button, select');
		if (firstInput) setTimeout(() => firstInput.focus(), 100);

		overlay.addEventListener('click', function (e) {
		    if (e.target.closest('.btn-close')) {
		        UIUtil.closeModal(popupId);
				if (typeof options.callback === 'function') options.callback(true);
		    }
		});

        overlay.querySelector('.btn-yes').addEventListener('click', function () {
			closePopup(true);

			const prevId = state.modals[state.modals.length -1];
			const prevModal = document.getElementById(prevId);
			if(prevModal){
				prevModal.querySelector('.modal-back').classList.add('is-active');
			}
        });
    },

    /**
     * 공통 confirm 팝업
     */
    confirm: function (options) {
        const popupId = 'sys-msg-' + Date.now();
        const state = MdiManager.getState();
        const currentZ = this.BASE_Z_INDEX + state.modals.length * 10 + 5;
        const overlay = document.createElement('section');

        overlay.id = popupId;
        overlay.className = 'modal alert fade shown in';
        overlay.ariaHidden = 'false';
        overlay.role = 'dialog';
        overlay.ariaLabelledby = 'tit_modal' + popupId;
        overlay.style.zIndex = currentZ;

        overlay.innerHTML = `
				<div class="modal-dialog small">
					<div class="modal-content">
						<div class="modal-header"><h2 id="tit_modal_sample_04" class="modal-title">${options.title || '알림'}</h2></div>
						<div class="modal-conts">
							<div class="conts-area">
								${options.msg}
							</div>
						</div>

						<div class="modal-btn btn-wrap">
						${
                            options.btnUse === 'Y'
                                ? `
							<button type="button" class="btn secondary sm close-modal btn-no" )>아니요</button>`
                                : ''
                        }
							<button type="button" class="btn primary sm close-modal btn-yes" )>예</button>
						</div>
						<button type="button" class="btn-close close-modal"><span class="sr-only">닫기</span></button>
					</div>
				</div>
				<div class="modal-back is-active"></div>
			`;

        const targetElement = document.getElementById('container');
        targetElement.append(overlay);

		if(state.modals.length > 0){
			const prevId = state.modals[state.modals.length -1];
			const prevModal = document.getElementById(prevId);
			if(prevModal){
				prevModal.querySelector('.modal-back').classList.remove('is-active');
			}
		}
        state.modals.push(popupId);
        document.body.classList.add('scroll-no');

        const closePopup = function (result) {
            overlay.remove();
            const index = state.modals.indexOf(popupId);
            if (index > -1) state.modals.splice(index, 1);

            if (typeof options.callback === 'function') {
                options.callback(result);
            }
            document.body.classList.remove('scroll-no');
        };

		// 첫 번째 입력 요소에 포커스 자동 부여
		const firstInput = overlay.querySelector('input, button, select');
		if (firstInput) setTimeout(() => firstInput.focus(), 100);

		overlay.addEventListener('click', function (e) {
		    if (e.target.closest('.btn-close')) {
		        UIUtil.closeModal(popupId);
				/*
				콜백제거
				if (typeof options.callback === 'function') options.callback(false);
				*/
		    }
		});

        overlay.querySelector('.btn-yes').addEventListener('click', function () {
            closePopup(true);
			const prevId = state.modals[state.modals.length -1];
			const prevModal = document.getElementById(prevId);
			if(prevModal != null){
				prevModal.querySelector('.modal-back').classList.add('is-active');
			}
        });
		if(options.btnUse == 'Y'){
			overlay.querySelector('.btn-no').addEventListener('click', function () {
			    closePopup(false);
				const prevId = state.modals[state.modals.length -1];
				const prevModal = document.getElementById(prevId);
				if(prevModal != null){
					prevModal.querySelector('.modal-back').classList.add('is-active');
				}
			});
		}
    },

    closeConfirm: function (popupId, status) {
        UIUtil.closeModal(popupId);
        return status;
    }
    /**
     * 공통 데이트피커 (jQuery UI Datepicker) 초기화
     * @param {string} tabId - 현재 탭 ID (MDI 격리용)
     * @param {string|Element|jQuery} target - 대상 선택자(Class/ID) 또는 DOM 객체
     * @param {Object} customOptions - 화면별로 특별히 덮어쓸 추가 옵션
     */
    /*    datepicker: function(tabId, target, customOptions = {}) {
        let $el;

        // 1. 대상 엘리먼트 탐색 (해당 탭 내부로만 격리하여 탐색)
        if (typeof target === 'string') {
            const root = document.getElementById('content-' + tabId);
            if (!root) return null;
            $el = $(root).find(target);
        } else if (target instanceof jQuery) {
            $el = target;
        } else {
            $el = $(target);
        }

        if ($el.length === 0) return null;

        // 2. 퍼블리셔가 제공한 프로젝트 표준 설정
        const defaultOptions = {
            dateFormat: 'yy-mm-dd',
            showOtherMonths: true,
            showMonthAfterYear: true,
            changeYear: true,
            changeMonth: true,
            showOn: 'both',
            buttonImageOnly: true,
            // [주의] buttonImageOnly가 true일 경우 달력 아이콘 이미지가 반드시 필요합니다.
            // 프로젝트의 실제 달력 아이콘 경로로 맞춰주세요. (예: '/images/icon_calendar.png')
            buttonImage: '',
            buttonText: '선택',
            monthNamesShort: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
            monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
        };

        // 3. 커스텀 옵션 병합 후 달력 생성
        const finalOptions = $.extend(true, {}, defaultOptions, customOptions);
        $el.datepicker(finalOptions);

        // 4. [핵심] MDI 엔진에 자원 등록 (탭 닫을 때 메모리 누수 방지)
        // 클래스 선택자('.date-test')로 여러 개가 잡혔을 수 있으므로 각각 등록
        $el.each(function() {
            const targetDom = this;
            const instance = {
                destroy: function() {
                    try {
                        $(targetDom).datepicker('destroy');
                    } catch (e) {
                        console.warn("[MDI] Datepicker 자원 해제 실패", e);
                    }
                }
            };

            // 엔진의 addResource API를 통해 생명주기 관리 위임
            if (typeof MdiManager !== 'undefined' && typeof MdiManager.addResource === 'function') {
                MdiManager.addResource(tabId, instance);
            }
        });

        return $el;
    },*/

    /**
     * 공통 기간 달력 (Date Range Picker) 초기화
     * @param {string} tabId - 현재 탭 ID (MDI 격리용)
     * @param {string|Element|jQuery} target - 대상 선택자(Class/ID) 또는 DOM 객체
     * @param {Object} customOptions - 화면별로 특별히 덮어쓸 추가 옵션
     */
    /*daterangepicker: function(tabId, target, customOptions = {}) {
        let $el;

        // 1. 대상 엘리먼트 탐색 (해당 탭 내부로만 격리하여 탐색)
        if (typeof target === 'string') {
            const root = document.getElementById('content-' + tabId);
            if (!root) return null;
            $el = $(root).find(target);
        } else if (target instanceof jQuery) {
            $el = target;
        } else {
            $el = $(target);
        }

        if ($el.length === 0) return null;

        // 2. 프로젝트 표준 설정 (기간 선택기용)
        const defaultOptions = {
            locale: {
                format: 'YYYY-MM-DD',
                cancelLabel: '취소',
                applyLabel: '확인',
                separator: ' ~ ',
                monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
            },
            singleDatePicker: false,
            showDropdowns: true,
            autoApply: false,
            autoUpdateInput: false
        };

        // 3. 커스텀 옵션 깊은 병합 후 달력 생성
        const finalOptions = $.extend(true, {}, defaultOptions, customOptions);
        $el.daterangepicker(finalOptions);

        // 4. 적용(Apply) 이벤트 공통 바인딩 (마우스로 달력 선택 후 확인 버튼 클릭 시)
        $el.on('apply.daterangepicker', function (ev, picker) {
            $(this).val(picker.startDate.format('YYYY-MM-DD') + ' ~ ' + picker.endDate.format('YYYY-MM-DD'));
            $(this).data('manual', false);
        });

        // 5. [핵심] MDI 엔진에 자원 등록 (탭 닫을 때 메모리 및 DOM 누수 방지)
        $el.each(function() {
            const targetDom = this;
            const instance = {
                destroy: function() {
                    try {
                        // daterangepicker는 메모리 해제를 위해 내장된 remove() 메서드를 호출해야 함
                        const picker = $(targetDom).data('daterangepicker');
                        if (picker && typeof picker.remove === 'function') {
                            picker.remove();
                        } else {
                            $(targetDom).off('.daterangepicker');
                        }
                    } catch (e) {
                        console.warn("[MDI] DateRangePicker 자원 해제 실패", e);
                    }
                }
            };

            if (typeof MdiManager !== 'undefined' && typeof MdiManager.addResource === 'function') {
                MdiManager.addResource(tabId, instance);
            }
        });

        return $el;
    },

	*
     * 3. 단일 기간 달력 (Single Date Range Picker) 초기화

    daterangepickerSingle: function(tabId, target, customOptions = {}) {
        let $el;
        if (typeof target === 'string') {
            const root = document.getElementById('content-' + tabId);
            if (!root) return null;
            $el = $(root).find(target);
        } else {
            $el = target instanceof jQuery ? target : $(target);
        }

        if ($el.length === 0) return null;

        const defaultOptions = {
            locale: {
                format: 'YYYY-MM-DD',
                cancelLabel: '취소',
                applyLabel: '확인',
                monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
            },
            singleDatePicker: true,
            showDropdowns: true,
            autoApply: false,
            autoUpdateInput: false
        };

        const finalOptions = $.extend(true, {}, defaultOptions, customOptions);
        $el.daterangepicker(finalOptions);

        $el.on('apply.daterangepicker', function (ev, picker) {
            $(this).val(picker.startDate.format('YYYY-MM-DD'));
            $(this).data('manual', false);
        });

        // MDI 자원 등록 (탭 종료 시 메모리 해제)
        $el.each(function() {
            const targetDom = this;
            if (typeof MdiManager !== 'undefined' && typeof MdiManager.addResource === 'function') {
                MdiManager.addResource(tabId, {
                    destroy: function() {
                        try {
                            const picker = $(targetDom).data('daterangepicker');
                            if (picker && typeof picker.remove === 'function') picker.remove();
                        } catch (e) {
                            console.warn("[MDI] Single DateRangePicker 자원 해제 실패", e);
                        }
                    }
                });
            }
        });

        return $el;
    },

    *
     * 4~7. 달력 수동 입력(타이핑) 공통 이벤트 바인딩
     * - 화면(탭) 초기화 함수(init)에서 한 번만 호출: UIUtil.bindManualDateInput(currentTabId);

    bindManualDateInput: function(tabId) {
        const root = document.getElementById('content-' + tabId);
        if (!root) return;

        const $root = $(root);
        // 중복 바인딩 방지를 위해 기존 이벤트 제거 후 다시 걸기
        $root.off('.manualDate');

        // [4. 공통] 포커스 및 입력 감지
        $root.on('focus.manualDate', '.date input, .dateRange input', function () {
            $(this).data('prev', $(this).val());
            $(this).data('manual', false);
        });
        $root.on('input.manualDate', '.date input, .dateRange input', function () {
            $(this).data('manual', true);
        });

        // [5. date] 수동 입력 처리
        $root.on('blur.manualDate', '.date input', function () {
            const $input = $(this);
            if (!$input.data('manual')) return;

            const prevVal = $input.data('prev') || '';
            const num = $input.val().replace(/[^0-9]/g, '');

            if (num.length === 8) {
                const formatted = num.substring(0, 4) + '-' + num.substring(4, 6) + '-' + num.substring(6, 8);
                $input.val(formatted);
                // 대상이 실제로 datepicker로 초기화되어 있는지 확인 후 setDate 호출
                if ($input.hasClass('hasDatepicker')) {
                    $input.datepicker('setDate', formatted);
                }
            } else {
                $input.val(prevVal);
            }
            $input.data('manual', false);
        });

        // [6. dateRange.single] 수동 입력 처리
        $root.on('blur.manualDate', '.dateRange.single input', function () {
            const $input = $(this);
            if (!$input.data('manual')) return;

            const prevVal = $input.data('prev') || '';
            const num = $input.val().replace(/[^0-9]/g, '');
            const picker = $input.data('daterangepicker');

            if (num.length === 8) {
                const formatted = num.substring(0, 4) + '-' + num.substring(4, 6) + '-' + num.substring(6, 8);
                $input.val(formatted);
                if (picker) {
                    picker.setStartDate(formatted);
                    picker.setEndDate(formatted);
                }
            } else {
                $input.val(prevVal);
            }
            $input.data('manual', false);
        });

        // [7. dateRange 다중] 수동 입력 처리
        $root.on('blur.manualDate', '.dateRange:not(.single) input', function () {
            const $input = $(this);
            if (!$input.data('manual')) return;

            const prevVal = $input.data('prev') || '';
            const picker = $input.data('daterangepicker');
            const nums = $input.val().replace(/[^0-9]/g, '');

            if (nums.length === 16) {
                const start = nums.substring(0, 4) + '-' + nums.substring(4, 6) + '-' + nums.substring(6, 8);
                const end = nums.substring(8, 12) + '-' + nums.substring(12, 14) + '-' + nums.substring(14, 16);
                $input.val(start + ' ~ ' + end);
                if (picker) {
                    picker.setStartDate(start);
                    picker.setEndDate(end);
                }
            } else {
                $input.val(prevVal);
            }
            $input.data('manual', false);
        });
    }*/
};

/**
 * 데이터 조작 및 유틸리티 (Lodash 기반)
 */
const DataUtil = {
    /**
     * 1. 깊은 복사 (Deep Clone)
     * - 객체나 배열의 참조(Reference)를 끊고 완벽하게 새로운 복사본을 생성합니다.
     * @param {*} value - 복사할 대상
     * @returns {*} 완벽히 복사된 새로운 객체/배열
     */
    clone: function (value) {
        return _.cloneDeep(value);
    },

    /**
     * 2. 안전한 값 추출 (Safe Get)
     * - 깊은 계층의 객체에서 값을 꺼낼 때 중간에 null/undefined가 있어도 에러(화면 뻗음)를 내지 않습니다.
     * @param {Object} object - 대상 객체
     * @param {string} path - 값을 찾을 경로 (예: 'user.address.zipcode')
     * @param {*} defaultValue - 값이 없을 때 반환할 기본값 (선택)
     */
    get: function (object, path, defaultValue = '') {
        return _.get(object, path, defaultValue);
    },

    /**
     * 3. 빈 값 체크 (Is Empty)
     * - 객체, 배열, 문자열 등이 실제로 비어있는지 검사합니다. ([], {}, "", null, undefined 모두 true)
     */
    isEmpty: function (value) {
        // 숫자형 0이나 boolean false는 비어있는 것이 아니므로 예외 처리
        if (typeof value === 'number' || typeof value === 'boolean') {
            return false;
        }
        return _.isEmpty(value);
    },

    /**
     * 4. 연타 방지 (Debounce)
     * - 짧은 시간 안에 여러 번 이벤트가 발생해도, 지정된 시간 동안 아무 입력이 없을 때 '마지막 한 번'만 실행합니다.
     * - 활용: 조회 버튼 따닥 방지, 검색어 입력 자동완성 통신 등
     * @param {Function} func - 실행할 함수
     * @param {number} wait - 대기 시간 (밀리초, 기본 300ms)
     */
    debounce: function (func, wait = 300) {
        return _.debounce(func, wait);
    },

    /**
     * 5. 실행 제한 (Throttle)
     * - 일정 시간 동안 함수가 한 번만 실행되도록 제한합니다.
     * - 활용: 스크롤 이벤트, 브라우저 리사이즈 등 과도한 이벤트 발생 방지
     */
    throttle: function (func, wait = 300) {
        return _.throttle(func, wait);
    },

	clickDelBtn: function(root, areaSelector = '.search-top-box', exclude=[]){
		if(!root) return;

		root.querySelectorAll(areaSelector).forEach((area) => {
			area.querySelectorAll('.btn-ico-wrap .ico-del-fill').forEach((btn) => {
				const input = btn.closest('.btn-ico-wrap').querySelector('input');
				const isExclude = exclude.some((sel) => btn.closest(sel) || (input && input.matches(sel)));
				if(isExclude) return;
				btn.click();
			});

			if(area.contains(document.activeElement)) document.activeElement.blur();
		})
	}
};

/**
 * 입력 폼 마스킹 유틸리티 (IMask 기반)
 */
const MaskUtil = {
    apply: function (tabId, target, type, customOptions = {}) {
        let el = typeof target === 'string' ? document.getElementById('content-' + tabId).querySelector(target) : target;

        if (!el) return null;

        let maskOptions = {};
        let instance = null;

        switch (type) {
            case 'currency':
                maskOptions = { mask: Number, scale: 0, thousandsSeparator: ',', normalizeZeros: true };
                break;
            case 'phone':
                maskOptions = { mask: [{ mask: '00-000-0000' }, { mask: '000-000-0000' }, { mask: '000-0000-0000' }] };
                break;
            case 'bizNo':
                maskOptions = { mask: '000-00-00000' };
                break;
            case 'ssn':
                // 1. 기본 형태는 숫자로만 받게 설정
                maskOptions = { mask: '000000-0000000' };
                break;
            default:
                maskOptions = customOptions;
        }

        Object.assign(maskOptions, customOptions);
        instance = IMask(el, maskOptions);

        // ==========================================
        // [핵심] 주민등록번호 커스텀 보안 마스킹 로직
        // ==========================================
        if (type === 'ssn') {
            // 입력창을 빠져나갈 때 (Blur) -> 별표(*) 마스킹 처리
            el.addEventListener('blur', function () {
                const val = instance.unmaskedValue; // 예: '9001011234567'

                if (val.length === 13) {
                    // 실제 데이터는 data 속성에 안전하게 보관
                    el.dataset.realValue = val;

                    // 화면에는 '900101-1******' 형태로 표시
                    const maskedStr = val.substring(0, 6) + '-' + val.substring(6, 7) + '******';
                    el.value = maskedStr;
                }
            });

            // 다시 입력창을 클릭했을 때 (Focus) -> 원본 숫자로 복구하여 수정 가능하게 함
            el.addEventListener('focus', function () {
                if (el.dataset.realValue) {
                    // 숨겨둔 실제 값을 IMask에 다시 주입하면 화면에 '900101-1234567'로 복원됨
                    instance.unmaskedValue = el.dataset.realValue;
                }
            });
        }

        this._registerResource(tabId, instance);
        return instance;
    },

    /**
     * [서버 전송용] 실제(순수) 데이터 추출기
     * @param {string} tabId - 탭아이디
     * @param {Element|jQuery|string} target - 선택자(Class/ID), DOM 요소, 또는 jQuery 객체
     * @returns {string|Array} 단일 요소면 문자열, 다중 요소면 배열 반환
     */
    getRealValue: function (tabId, target) {
        let elements = [];

        // 1. 타겟 분류 및 탐색 (MDI 탭 내부로 격리)
        if (typeof target === 'string') {
            const root = document.getElementById('content-' + tabId);
            if (!root) return '';

            // 해당 탭 안의 모든 일치하는 요소를 배열로 가져옴 (querySelectorAll)
            elements = Array.from(root.querySelectorAll(target));
        } else if (target instanceof jQuery) {
            elements = target.toArray(); // jQuery 객체일 경우 DOM 배열로 변환
        } else if (target) {
            elements = [target]; // 단일 DOM 요소일 경우
        }

        if (elements.length === 0) return '';

        // 2. 값 추출 로직 (data-real-value 우선, 없으면 숫자만 추출)
        const values = elements.map((el) => {
            if (el.dataset.realValue) {
                return el.dataset.realValue;
            }
            return el.value ? el.value.replace(/[^0-9]/g, '') : '';
        });

        // 3. 요소가 1개면 문자열 단건 반환, 여러 개면 배열 반환 (Class 기반 지원)
        return elements.length === 1 ? values[0] : values;
    },

    /**
     * [그리드/조회 화면용] 단순 문자열을 받아 별표(*) 처리된 포맷으로 반환
     */
    formatSsn: function (ssn) {
        if (!ssn) return '';
        const cleanVal = ssn.replace(/[^0-9]/g, ''); // 13자리 숫자만 추출
        if (cleanVal.length !== 13) return ssn; // 13자리가 아니면 원본 반환

        return cleanVal.substring(0, 6) + '-' + cleanVal.substring(6, 7) + '******';
    },

    _registerResource: function (tabId, instance) {
        if (typeof MdiManager !== 'undefined' && typeof MdiManager.addResource === 'function') {
            MdiManager.addResource(tabId, instance);
        }
    }
};

/**
 * 날짜 공통 유틸리티 (Day.js 기반)
 */
const DateUtil = {
    /**
     * 현재 날짜 또는 특정 날짜를 포맷팅하여 반환
     * @param {string|Date} date - 날짜값 (없으면 현재시간)
     * @param {string} format - 기본값 'YYYY-MM-DD'
     */
    format: function (date, format = 'YYYY-MM-DD') {
		const d = dayjs(date)
        return d.isValid() ? d.format(format) : '';
    },

    /**
     * 날짜 계산 (더하기/빼기)
     * @param {string|Date} date - 기준 날짜
     * @param {number} value - 더할 값 (음수면 빼기)
     * @param {string} unit - 'day', 'month', 'year' 등
     */
    add: function (date, value, unit = 'day') {
		const d = dayjs(date)
        return d.isValid() ? d.add(value, unit).format('YYYY-MM-DD') : '';
    },

    /**
     * 두 날짜 사이의 차이 계산
     * @param {string|Date} start - 시작일
     * @param {string|Date} end - 종료일
     * @param {string} unit - 'day', 'month', 'year' 등
     */
    diff: function (start, end, unit = 'day') {
        return dayjs(end).diff(dayjs(start), unit);
    },

    /**
     * 시작일이 종료일보다 이전인지 유효성 체크 (엄격한 비교: < )
     */
    isBefore: function (start, end) {
        return dayjs(start).isBefore(dayjs(end));
    },

	/**
	 * 시작일이 종료일보다 이전인지 유효성 체크 ( 포함 비교: <= )
	 */
	isSameOrBefore: function (start, end) {
		const s = dayjs(start);
		const e = dayjs(end);
	    return s.isBefore(e,'day') || s.isSame(e, 'day');
	},

	/**
	 * 두 날짜가 동일한지 체크
	 */
	isSame: function (start, end) {
	    return dayjs(start).isSame(dayjs(end),'day');
	},
};

/**
 * HTTP 통신 유틸리티
 */
const HttpUtil = {
    // [신규] 모든 통신의 베이스가 되는 내부 함수
    _sendRequest: function (options) {
        LoadingSpinner.show(); // 공통 로딩 시작

        const defaultOptions = {
            method: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            global: true // common.js의 ajaxError 활성화 여부
        };

        const opt = $.extend({}, defaultOptions, options);
		if(typeof SessionTimer !== 'undefined'){
			SessionTimer.reset();
		}

        return $.ajax({
            url: opt.url,
            method: opt.method,
            contentType: opt.contentType,
            data: opt.data,
            global: opt.global,
            success: function (res) {
                // 비즈니스 로직상의 성공 여부 판단 (errorCode: "0")
                if (res?.errorCode == 0) {
                    if (res?.message?.trim()) {
                        UIUtil.alert({ msg: res.message });
                    }

                    if (typeof opt.onSuccess === 'function') {
                        //opt.onSuccess(opt.method === 'GET' ? res.body : res);
                        opt.onSuccess(res);
                    }
                } else {
                    // 비즈니스 에러 발생 시 처리
                    //alert(res.message || "처리 중 오류가 발생했습니다.");
                    UIUtil.alert({ msg: res.message || '처리 중 오류가 발생했습니다.', callback : () => {
						if (typeof opt.onError === 'function') {
						    opt.onError(res);
						}
					} },);

                }
            },

			error: function (xhr) {
			    if (typeof opt.onError === 'function') {
			        const res = xhr.responseJSON || {};
			        opt.onError({
			            errorCode: res.errorCode ?? xhr.status,
			            message: res.message || xhr.statusText,
			            body: res.body,
			            xhr: xhr
			        });
			    }
			},

            // error: 항목을 비워둠으로써 common.js의 글로벌 핸들러가 시스템 에러를 처리하게 함
            complete: function () {
                LoadingSpinner.hide(); // 공통 로딩 종료
            }
        });
    },

    // 기존 인터페이스 유지 (사용자 코드 수정 최소화)
	post: function (url, payload, onSuccess, onError) {
	    return this._sendRequest({
	        url: url,
	        method: 'POST',
	        data: JSON.stringify(payload),
	        onSuccess: onSuccess,
	        onError: onError
	    });
	},

	get: function (url, params, onSuccess, onError) {
	    return this._sendRequest({
	        url: url,
	        method: 'GET',
	        data: params,
	        onSuccess: onSuccess,
	        onError: onError
	    });
	},

    /**
     * 파일/엑셀 업로드 전용 통신 유틸리티
     * MDI _sendRequest의 규격(errorCode, body, Loading, ErrorHandler)을 완벽히 준수함
     * @param {string} url - API 주소
     * @param {FormData} formData - 전송할 폼 데이터
     * @param {function} onSuccess - 성공 콜백
     */
    upload: function (url, formData, onSuccess) {
        LoadingSpinner.show();

        return $.ajax({
            url: url,
            method: 'POST',
            data: formData,
            // 파일 업로드 필수 속성
            processData: false,
            contentType: false,
            global: true, // common.js 에러 핸들러 연동
            success: function (res) {
                if (res && res.errorCode === 0) {
                    if (res.message && res.message.trim() !== '') {
                        UIUtil.alert({ msg: res.message });
                    }
                    if (typeof onSuccess === 'function') {
                        onSuccess(res.body);
                    }
                } else {
                    UIUtil.alert({ msg: res.errors || '파일 처리 중 오류가 발생했습니다.' });
                }
            },
            complete: function () {
                LoadingSpinner.hide();
            }
        });
    }
};

/**
 * 폼 검증 유틸리티
 */
const Validator = {
    // 1. 필수값 체크
    required: function (element, message, value = "") {

    	// radio, checkbox 추가
    	let isElementValue = false;
    	if (element.type === 'radio' || element.type === 'checkbox') {
    		if (value.length === 0) {
    			isElementValue = true;
    		}
    	}

        if (!element || !element.value.trim() || isElementValue) {
            UIUtil.alert({
                msg: message,
                callback: function () {
                    if (!element) return;

                    // radio, checkbox
                    if (element.type === 'radio' || element.type === 'checkbox') {
                    	const target = document.querySelector(`input[name="${element.name}"]:not(:disabled)`);

                    	if (target) {
                    		target.focus();
                    	}
                    }
                    // 일반
                    else {
                    	element.focus();
                    }
                }
            });
            return false; // 검증 실패 시 false 반환
        }
        return true;

    },

    // 2. 최소/최대 글자 수 체크
    length: function (element, min, max, message) {
        const val = element.value.trim();
        if (val.length < min || val.length > max) {
            UIUtil.alert({
                msg: message,
                callback: function () {
                    if (element) element.focus();
                }
            });
            return false;
        }
        return true;
    },

    // 3. 정규식 체크 (예: 이메일, 전화번호 등)
    regex: function (element, regExp, message) {
        const val = element.value.trim();
        if (val && !regExp.test(val)) {
            UIUtil.alert({
                msg: message,
                callback: function () {
                    if (element) element.focus();
                }
            });
            return false;
        }
        return true;
    },

	numeric: function(element, message){
		const val = element.value.trim();
		if (val && !/^[0-9]+$/.test(val)) {
		    UIUtil.alert({
		        msg: message,
		        callback: function () {
		            if (element) element.focus();
		        }
		    });
		    return false;
		}
		return true;
	},

    // 자주 쓰이는 정규식 모음
    pattern: {
        email: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/i,
        phone: /^(01[016789]{1})-?[0-9]{3,4}-?[0-9]{4}$/
    }
};

const LoadingSpinner = {
    activeRequests: 0, // 현재 진행 중인 통신 개수 추적
    $overlay: null,

    // 초기화: DOM에 스피너 요소 삽입
    init: function () {
        if (!document.getElementById('global-spinner-overlay')) {
            const html = `
			<div id="global-spinner-overlay" class="ui-helper-hidden" style="display:none;">
			    <div class="spinner"></div>
			</div>
			`;
            document.body.insertAdjacentHTML('beforeend', html);
        }
        this.$overlay = document.getElementById('global-spinner-overlay');
    },

    show: function () {
        if (!this.$overlay) this.init();

        this.activeRequests++;
        // 첫 번째 통신이 시작될 때만 화면에 표시
        if (this.activeRequests === 1) {
            this.$overlay.classList.remove('ui-helper-hidden');
        }
    },

    hide: function () {
        this.activeRequests--;
        // 카운트가 0 이하로 떨어지면 방어 코드 적용
        if (this.activeRequests <= 0) {
            this.activeRequests = 0;
            this.$overlay.classList.add('ui-helper-hidden');
        }
    }
};

/**
 * ============================================================================
 * [ExcelUtil] 엑셀 다운로드 및 업로드 전용 유틸리티
 * - Blob(바이너리) 스트리밍 처리 및 확장자 검증, 에러 캐치 공통화
 * ============================================================================
 */
const ExcelUtil = {
    /**
     * 1. 엑셀 파일 다운로드 (Blob 방식)
     * - 장점: 서버에서 에러(JSON) 발생 시(예: 권한없음, 조회결과 없음 등) 화면 이동 없이 알럿 처리 가능
     * * @param {string} url - 컨트롤러 URL (예: '/excel/dynamicDownload.do')
     * @param {Object} params - 전송할 검색 조건 (JSON 객체)
     * @param {string} defaultFileName - 기본 파일명 (서버 응답 헤더에 파일명이 없을 경우 대비)
     */
    download: function (url, params, defaultFileName = 'download.xlsx') {
        if (typeof LoadingSpinner !== 'undefined') LoadingSpinner.show();

        // Spring @RequestParam Map<String, Object> 에서 받기 위해 FormData로 변환하여 POST 전송
        const formData = new FormData();
        if (params) {
            for (let key in params) {
                formData.append(key, params[key]);
            }
        }

        fetch(url, {
            method: 'POST',
            body: formData
        })
            .then(async (res) => {
                // [방어 로직] 1. 서버에서 엑셀 파일이 아닌 에러(JSON)를 반환한 경우 캐치
                const contentType = res.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const json = await res.json();
                    // ResponseUtil.error()로 내려온 메시지 추출
                    throw new Error(json.errors || json.message || '다운로드 중 서버 오류가 발생했습니다.');
                }

                // 2. 정상적인 응답이 아닌 경우
                if (!res.ok) throw new Error(`서버 네트워크 오류: ${res.status}`);

                // 3. 서버에서 세팅한 파일명 추출 (Content-Disposition: attachment; filename="...")
                let fileName = defaultFileName;
                const disposition = res.headers.get('content-disposition');
                if (disposition && disposition.includes('attachment')) {
                    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    const matches = filenameRegex.exec(disposition);
                    if (matches != null && matches[1]) {
                        // URLEncoder로 인코딩된 파일명 디코딩
                        fileName = decodeURIComponent(matches[1].replace(/['"]/g, ''));
                    }
                }

                // 4. 바이너리 데이터를 Blob 객체로 변환
                const blob = await res.blob();
                return { blob, fileName };
            })
            .then(({ blob, fileName }) => {
                // IE / Edge 브라우저 호환성 방어
                if (window.navigator && window.navigator.msSaveOrOpenBlob) {
                    window.navigator.msSaveOrOpenBlob(blob, fileName);
                    return;
                }

                // 크롬, 사파리 등 모던 브라우저 다운로드 처리
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = downloadUrl;
                a.download = fileName;
                document.body.appendChild(a);

                a.click(); // 강제 클릭 이벤트로 다운로드 트리거

                // 메모리 누수 방지 (URL 객체 해제 및 태그 삭제)
                setTimeout(() => {
                    window.URL.revokeObjectURL(downloadUrl);
                    a.remove();
                }, 100);
            })
            .catch((err) => {
                //alert(err.message);
                UIUtil.alert({ msg: err.message });
                console.error('[ExcelUtil Download Error]:', err);
            })
            .finally(() => {
                if (typeof LoadingSpinner !== 'undefined') LoadingSpinner.hide();
            });
    },

    /**
     * 2. 엑셀 파일 업로드
     * - 기존 구현된 HttpUtil.upload를 래핑하여 엑셀 특화(확장자 검증 등) 로직 추가
     * * @param {string} url - 업로드 컨트롤러 URL (예: '/excel/dynamicUpload.do')
     * @param {File|HTMLInputElement|string} target - File 객체, <input type="file"> 객체, 또는 선택자(ID/Class)
     * @param {Object} additionalParams - 엑셀 파일 외에 추가로 넘길 파라미터 (선택 사항)
     * @param {function} onSuccess - 업로드 성공 시 실행할 콜백 함수
     */
    upload: function (url, target, additionalParams, onSuccess) {
        let file = null;
        let el = target;

        // 1. target이 문자열(선택자)인 경우 DOM 객체로 변환
        if (typeof target === 'string') {
            el = document.querySelector(target);
        } else if (target instanceof jQuery) {
            el = target[0];
        }

        // 2. target에서 File 객체 추출
        if (el instanceof File) {
            file = el;
        } else if (el && el.files && el.files.length > 0) {
            file = el.files[0];
        }

        if (!file) {
            UIUtil.alert({ msg: '업로드할 엑셀 파일을 선택해 주세요.' });
            return;
        }

        // 3. 확장자 검사 방어 로직
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'xlsx' && ext !== 'xls') {
            UIUtil.alert({ msg: '엑셀 파일(.xlsx, .xls) 양식만 업로드 가능합니다.' });
            // input 값 초기화
            if (el && el.value) el.value = '';
            return;
        }

        // 4. 전송할 FormData 구성
        const formData = new FormData();
        formData.append('excelFile', file); // 서버(CommExcelController)의 파라미터명과 일치해야 함

        if (additionalParams) {
            for (let key in additionalParams) {
                formData.append(key, additionalParams[key]);
            }
        }

        // 5. 공통 HttpUtil의 파일 업로드 모듈 호출
        HttpUtil.upload(url, formData, function (resBody) {
            // 업로드 성공 후 파일 input 초기화 (연속 업로드 버그 방지)
            if (el && el.value) el.value = '';

            if (typeof onSuccess === 'function') {
                onSuccess(resBody);
            }
        });
    }
};

/*클립리포트 호출*/
const reportUtil = {
	//map 단건
    open: function (iframeTargetId, reportData) {
        const form = document.createElement('form');
        form.action = reportData.reportUrl + '/reportJson.jsp';
        form.method = 'POST';
        form.target = iframeTargetId;
        form.style.display = 'none';

        const crfinput = document.createElement('input');
        crfinput.type = 'hidden';
        crfinput.name = 'crfName';
        crfinput.value = reportData.crfName;
        form.appendChild(crfinput);

		if(reportData.map){
			const mapInput = document.createElement('input');
			mapInput.type = 'hidden';
			mapInput.name = 'listData';
			mapInput.value = JSON.stringify(reportData.map);
			form.appendChild(mapInput);
		}

        document.body.appendChild(form);
        form.submit();
        form.remove();
    },

	//list 다건
	listOpen: function (iframeTargetId, reportData) {
	    const form = document.createElement('form');
	    form.action = reportData.reportUrl + '/reportJson.jsp';
	    form.method = 'POST';
	    form.target = iframeTargetId;
	    form.style.display = 'none';

		const add = (name, value) => {
			const input = document.createElement('input');
			input.type = 'hidden';
			input.name = name;
			input.value = value;
			form.appendChild(input);
		}

		add('crfName', reportData.crfName);

		if(reportData.params){
			for(const key in reportData.params) add(key, reportData.params[key]);
		}

		if(Array.isArray(reportData.list)){
			add('listData', JSON.stringify(reportData.list));
		}

		document.body.appendChild(form);
	    form.submit();
	    form.remove();
	},
};

const GridUtil = {
    defaultConfig: {
        width: '100%', //컬럼의 너비
        showRowNo: false, // 각 행(row)에 번호를 표시
        emptyTemplate: '조회된 데이터가 없습니다.',
        emptyMessage: '조회된 데이터가 없습니다.',
        showCheck: true, //체크박스 사용 유무
        autoHeight: true, //그리드 컨테이너 높이를 내용에 맞게 자동으로 조절
        maxHeight: '398px', //1줄일경우(기본)
        rowHeight: '36px', //1줄일경우(기본)
        sortable: true, //소팅여부
		copyable: true,	//복사여부
		pasteable : false,	//붙혀넣기여부
		selectable :{ rowSelect: true, cellSelect: 'cell', selectMode: 'multi' } //멀티셀선택 		
    },

    mergeConfig: function (customConfig) {
        return $.extend(true, {}, this.defaultConfig, customConfig);
    },


	//그리드 안에 DatePicker
	gridDatePicker: function(datagrid, container, data, field, key){
		if(!window.__dateRangePickerFocusGuardInstalled){
			window.__dateRangePickerFocusGuardInstalled = true;

			['blur', 'focusout'].forEach(function (evt){
				document.addEventListener(evt, function(e){
					if(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.daterangepicker')){
						e.stopImmediatePropagation();
					}
				}, true);
			});
		}

		const $wrap = $('<div class="dateRange single ffff">'
				+'<input type="text" class="form-control sm datepicker" title="날짜입력" placeholder="YYYY-MM-DD" id="sch3-004_PRGM00134">'
				+'<button type="button" class="form-btn-datepicker"><span class="sr-only">달력 열기</span></button>'
				+'</div>');
		$(container).append($wrap);

		const $input = $wrap.find('input.datepicker');
		if(data[field]) $input.val(data[field]);

		const $tabRoot = $(container).closest('.mdi-content');
		const parentTarget = $tabRoot.length ? $tabRoot : 'body';

		$input.daterangepicker({
			parentEl: parentTarget,
			locale: {
	            direction: 'ltr',
	            format: 'YYYY-MM-DD',
	            separator: ' ~ ',
	            applyLabel: '확인',
	            cancelLabel: '취소',
	            weekLabel: 'W',
	            customRangeLabel: 'SBGrid Custom Range',
	            daysOfWeek: moment.weekdaysMin(),
	            monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
	            daysOfWeek: ['일', '월', '화', '수', '목', '금', '토'],
	            firstDay: moment.localeData().firstDayOfWeek()
			},
		singleDatePicker  : true,
		showDropdowns: true,
	    linkedCalendars: false,
	    autoApply: false,
	    autoUpdateInput: false,
		});

		$input.on('keydown', function(e) {
			const allowKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'];
			if (allowKeys.includes(e.key)) {
				if (e.key === 'Enter') {
					e.preventDefault(); // 엔터 시 기본 동작 방지

					const rawVal = $(this).val();
					const num = rawVal.replace(/[^0-9]/g, '');
					let formattedDate = rawVal;

					// 2. 8자리 숫자인 경우 YYYY-MM-DD 포맷으로 변환
					if (num.length === 8) {
						formattedDate = num.substring(0, 4) + '-' + num.substring(4, 6) + '-' + num.substring(6, 8);
					} else if (num.length !== 10) {
					}

					// 3. 포맷팅된 값을 입력창에 다시 세팅하고 그리드에 반영 (문서 ["0", "62"] 로직)
					$(this).val(formattedDate);
					SBGrid3.setValue(datagrid, key, formattedDate, field);

					// 4. 포커스 이동 처리
					if (typeof afterFocus === 'function') {
						afterFocus();
					}
				}
				return;
			}

			// 숫자, ., - 만 입력 허용 (문서 <span class="bubble cur-pointer source-item">1</span> 로직)
			if (!/^[0-9.-]$/.test(e.key)) e.preventDefault();
		});

		$input.on('apply.daterangepicker', function(ev, picker){
			const dateStr = picker .startDate.format('YYYY-MM-DD');
			$(this).val(dateStr);
			SBGrid3.setValue(datagrid, key, dateStr, field);
			afterFocus();
		});

		const afterFocus = function(){
			const rowKey = SBGrid3.getFocusedKey(datagrid);
			const column = SBGrid3.getColumn(datagrid, 5)[0];
			SBGrid3.moveFocus(datagrid, rowKey, column);
		}
	}
};

const SessionTimer = (function (){
	'use strict'

	let timerId = null;
	let remainingSeconds = 3600;	//기본 60분
	let maxSeconds = 3600;
	let logoutUrl = '/cm/co/actionLogout.do';
	let displayelement = null;

	let isThrottled = false;

	function formatTime(sec){
		const m = Math.floor(sec / 60).toString().padStart(2, '0');
		const s = (sec % 60).toString().padStart(2, '0');
		return `${m}:${s}`;
	}

	function tick(){
		if(remainingSeconds  <= 0){
			clearInterval(timerId);
			timerId = null;
			SessionTimer.logout();
			return;
		}
		remainingSeconds--;
		updateDisplay();

		//1분 남았을때 알림?
	}

	function updateDisplay(){
		if(displayelement){
			displayelement.textContent = formatTime(remainingSeconds);
		}
	}

	return{
		init: function(options = {}){
			const minutes = options.timeoutMinutes || 60;
			maxSeconds = minutes * 60;
			remainingSeconds = maxSeconds;

			if(options.logoutUrl) logoutUrl = options.logoutUrl;
			if(options.displaySelector){
				displayelement = document.querySelector(options.displaySelector);
			}

			this.bindUserActivity();
			this.reset();
		},
		reset: function(){
			remainingSeconds = maxSeconds;
			updateDisplay();

			if(timerId) clearInterval(timerId);
			timerId = setInterval(tick, 1000);
		},
		extend: function(){
			//연장처리
		},
		logout: function(){
			alert('일정 시간 동안 작업이 없어 안전하게 자동 로그아웃됩니다.');
			location.href = logoutUrl;
		},
		bindUserActivity: function(){
			const events = ['click', 'keydown'];
			events.forEach((evtName) => {
				if(isThrottled) return;

				isThrottled = true;
				this.reset();
				setTimeout(() => {
					isThrottled = false;
				}, 1000);
			}, {passive : true});
		}

	}

})();

const RaonkUtil = (function(){
	'use strict'

	return {
		initUploader: async function(root, iframeSelector, srcUrl, configObj, callback){
			if(!root) return;
			const iframeEl = root.querySelector(iframeSelector);
			if(!iframeEl) return;

			iframeEl.addEventListener('load', async function(e){
				const win = e.target.contentWindow;
				if(!win) return;

				try{
					if(win.RAONKUPLOAD && typeof win.RAONKUPLOAD.SetConfigByObject === 'function'){
						//win.RAONKUPLOAD.SetConfigByObject(configObj, win.fileUploadId);
						win.upload = new win.RAONKUpload(configObj);
					}else{
						console.warn('[RaonkUtil] 라온 객체를 찾을 수 없습니다.');
						return;
					}

					//내부 로딩 완료 알림 대기
					if(win.iframeReadyPromise){
						await win.iframeReadyPromise;
					}

					//로딩완료 후 콜백 호출
					if(typeof callback === "function"){
						callback(win);
					}
				}catch(error){
					console.error('[RaonkUtil] 라온 초기화 중 오류 발생 : ', error);
				}
			}, {once: true});

			iframeEl.src = srcUrl;
		}
	};
})();

const HwpUtil = (function (){
	'use strict'

	const HWP_SRC = '/hwp/hwpctrlframe.jsp';
	return{
		init: function(root, iframeSelector, param){
			if(!root) return;
			const iframeEl = root.querySelector(iframeSelector);
			if(!iframeEl) return;

			iframeEl.addEventListener('load', function(e){
				const win = iframeEl.contentWindow;
				if(!win) return;

				if(typeof win.initHwp === 'function'){
					win.initHwp(param);
				}
			}, {once: true});
			iframeEl.src = HWP_SRC;
		},

		buildUrl: function(baseUrl, params) {
		    const url = new URL(baseUrl, window.location.origin);
		    Object.entries(params).forEach(([key, value]) => {
		        if (value === undefined || value === null || value === '') return;
		        url.searchParams.append(key, String(value));
		    });
		    return url.toString();
		}
	}
})();







