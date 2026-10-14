/**
 * ============================================================================
 * @fileNmae  mdi-code.js
 * @description MDI 프로젝트 공통 유틸리티 모음
 * @author ge81
 * 의존성: mdi-tuil.js
 * ============================================================================
 */
const envUtil = (function () {
    'use strict';

	const _state = {
		env: {},
		userVO: {},
		menuList: [],
		deptList: [],
		userDeptList: [],
		reportUrl: [],
		authPrgrmList: []
	};

	let _isInit = false;

    return {
        init: function () {
            return new Promise((resolve, reject) => {
				if(_isInit){
                    resolve();
                    return;
				}

                HttpUtil.post('/cm/co/selectGlobalEnv.do', {}, function (res) {
                    try {
                        const envData = res.envMap || {};
                        const userVO = res.body?.userVO || {};
                        const menuList = res.body?.data || [];
                        const deptList = res.body?.deptData || [];
                        const userDeptList = res.body?.userDeptData || [];
						const reportUrl = res.body?.reportUrl;
						const authPrgrmList = res.body?.authPrgrmList || [];

						_state.env = Object.freeze({...envData});
						_state.userVO = Object.freeze({...userVO});
						_state.menuList = Object.freeze([...menuList]);
						_state.deptList = Object.freeze([...deptList]);
						_state.userDeptList = Object.freeze([...userDeptList]);
						_state.reportUrl = reportUrl;
						_state.authPrgrmList = Object.freeze([...authPrgrmList]);

                        window.GLOBAL_ENV = _state.env;
						_isInit = true;

						if(typeof mdiMenu !== 'undefined' && typeof mdiMenu.init === "function"){
							mdiMenu.init(_state.menuList);
						}

                        resolve(_state);
                    } catch (e) {
                        console.error('환경변수 셋팅 실패', e);
                        reject(e);
                    }
                });
            });
        },

        get: function (key) {
            if (!window.GLOBAL_ENV) return '';
            return window.GLOBAL_ENV[key] || '';
        },

		getReportUrl: function () {
		    if (!window.GLOBAL_ENV) return '';
		    return _state.reportUrl;
		},

		getUser: function(key){
			if(!key) return _state.userVO;
			return _state.userVO[key] !== 'undefined' ? _state.userVO[key] : '';
		},

		getMenuPath: function(prgrmId){
			if(!prgrmId || !_state.menuList) return;

			const targetMenu = _state.menuList.find(menu => menu.prgrmId === String(prgrmId));
			return targetMenu ? targetMenu.menuPath : '';

		},

		getTopMenuId: function(prgrmId){
			if(!prgrmId || !_state.menuList) return;
			const targetMenu = _state.menuList.find(menu => menu.prgrmId === String(prgrmId));
			return targetMenu ? targetMenu.topMenuId : '';

		},

		getPrgrmFileNm: function(prgrmId){
			if(!prgrmId || !_state.menuList) return;
			const targetMenu = _state.menuList.find(menu => menu.prgrmId === String(prgrmId));
			return targetMenu ? targetMenu.prgrmFileNm : '';

		},

		getKornPrgrmNm: function(prgrmId){
			if(!prgrmId || !_state.menuList) return;
			const targetMenu = _state.menuList.find(menu => menu.prgrmId === String(prgrmId));
			return targetMenu ? targetMenu.kornPrgrmNm : '';

		},

		hasAuthPrgrm: function(prgrmId, prgrmFwkId){

			const admin = _state.userVO['userAuth'].includes('ROLE_0000000000000000000000030');
			if(admin) return true;

			let prgrm = _state.authPrgrmList.find(item => item.prgrmId === prgrmId)
					|| _state.authPrgrmList.find(item => item.prgrmUrladr === prgrmId);


			if(!prgrm) return false;
			return prgrm.prgrmFwkList.includes(prgrmFwkId);
		},

		/**
        *
        * @param {HTML Element} root - root
        * @param {string} selector - 대상 선택자
        * @param {string} firstText - 첫번째 행 텍스트 (예시 : 선택|전체|"")
        * @param {string} firstValue - 첫번째 행 value (예시 : ""|all|"")
        * @param {string} defaultValue - 기본값 value (예시 : ""|all|"")
        * @param {array} {deleteAt : 'all', caseRelateDept : 'Y|N|all', deptCdExclude : [], startDeptCd : '', indent : '', htmlRender : 'selectbox'}
        * 					deleteAt 기본 N, caseRelateDept(Comment가 없어서 뭔지 모르겠음) 기본 Y, deptCdExclude [], startDeptCd 기본 is null, indent 기본 'Y', htmlRender 기본 searchbox
        */
		bindDeptSelectWithFilter: function(root, selector, firstText, firstValue="", defaultValue="", options={}){
			if(!root) return;

			const selectEls = root.querySelectorAll(selector);
			if(selectEls.length === 0) return;

			if (!_state.deptList) return;

			let filteredData;

			// deleteAt
			if (options.deleteAt === 'all') {
				filteredData = _state.deptList;
			} else {
				filteredData = _state.deptList.filter(item => item.deleteAt === 'N');
			}

			// caseRelateDept
			if (options.caseRelateDept !== 'all') {
				filteredData = filteredData.filter(item => item.caseRelateDept === options.caseRelateDept);
			}

			// startDeptCd
			if (options.startDeptCd && options.startDeptCd !== '') {
				const startDeptCd = options.startDeptCd;
				const startDept = filteredData.find(item => String(item.deptCd) === String(startDeptCd));

				if (startDept) {
					const deptIdSet = new Set([startDept.deptId]);

					let added = true;

					while (added) {
						added = false;
						filteredData.forEach(item => {
							if (deptIdSet.has(item.upperDeptId) && !deptIdSet.has(item.deptId)) {
								deptIdSet.add(item.deptId);
								added = true;
							}
						});
					}

					filteredData = filteredData.filter(item => deptIdSet.has(item.deptId));
				}

			}

			// deptCdExclude
			if (options.deptCdExclude && options.deptCdExclude.length > 0) {
				filteredData = filteredData.filter(item => !options.deptCdExclude.some(word => (item['deptCd'] ?? '').includes(word)));
			}

			// 들여쓰기
			if (filteredData.length > 0) {
				if (!options.indent || options.indent === 'Y') {
					const baseLevel = Math.min(...filteredData.map(item => item.level));
					if (firstText) {
						filteredData.unshift({level : baseLevel, deptCd : firstValue, deptNm : firstText});
					}
					filteredData = filteredData.map(item => {
						const indentLevel = item.level - baseLevel;
						const indent = '\u00A0\u00A0\u00A0'.repeat(indentLevel);

						return {
							...item
							, deptNm : indent + item.deptNm
							, code : item.deptCd
							, codeNm : indent + item.deptNm
							, defaultValue : (item.deptCd !== '' && item.deptCd === defaultValue) ? true : false
						}
					});
				}
			}

			// htmlRender 가 selectbox 인 경우
			if (options.htmlRender === 'selectbox') {
				selectEls.forEach(function(selectEl){
					//selectEl.options.length=0;
					selectEl.innerHTML = "";

					if(firstText){
						const firstOpt = document.createElement('option');
						firstOpt.value= firstValue;
						firstOpt.text = firstText;
						firstOpt.selected = true;
						selectEl.appendChild(firstOpt);
						//selectEl.options.length=0;
					}

					filteredData.forEach(function(item){
						//selectEl.options.add(new Option(item.codeNm, item.code));
						const opt = document.createElement('option');
						opt.value = item.deptCd
						opt.text = item.deptNm;
						selectEl.appendChild(opt);
					});
				});
			} else {
				// 공통코드와 동일하게 사용하기 위한 작업, deptId = code, deptNm = codeNm
				selectEls.forEach(function (wrapEl) {
					codeUtil._enhanceSearchSelect(root, wrapEl, filteredData, {});
	            });
			}

		},

		/**
        *
        * @param {HTML Element} root - root
        * @param {string} selector - 대상 선택자
        * @param {string} firstText - 첫번째 행 텍스트 (예시 : 선택|전체|"")
        * @param {string} firstValue - 첫번째 행 value (예시 : ""|all|"")
        * @param {array} {deleteAt : 'all', deptCdExclude : [], startDeptCd : ''}
        * 					deleteAt 기본 N, startDeptCd 기본 is null
        */
		bindUserDeptSelectWithFilter: function(root, selector, firstText, firstValue="", options={}){
			if(!root) return;

			const selectEls = root.querySelectorAll(selector);
			if(selectEls.length === 0) return;

			if (!_state.userDeptList) return;

			const userList = [];
			const startDeptIds = new Set();
			let filteredData;

			// deleteAt
			if (options.deleteAt === 'all') {
				filteredData = _state.userDeptList;
			} else {
				filteredData = _state.userDeptList.filter(item => item.deleteAt === 'N');
			}

			// startDeptCd
			if (options.startDeptCd && options.startDeptCd !== '') {
				// 기준 부서 찾기
				const startDeptCd = options.startDeptCd;
				const startDept = filteredData.find(item => String(item.deptCd) === String(startDeptCd));

				// 기준부서가 있으면 하위부서까지 찾기
				if (startDept) {
					startDeptIds.add(startDept.deptId);

					function findChildDept(parentDeptId) {
						filteredData.forEach(item => {
							if (String(item.upperDeptId) === String(parentDeptId) && !startDeptIds.has(item.deptId)) {
								startDeptIds.add(item.deptId);
								findChildDept(item.deptId);
							}
						});
					}

					findChildDept(startDept.deptId);

					// 기준부서 + 하위부서 사용자 추출
					filteredData.forEach(item => {
						if (startDeptIds.has(item.deptId) && item.userManno != null) {
							userList.push({
								userManno : item.userManno
								, userId : item.userId
								, userNm : item.userNm
								, deptId : item.deptId
								, deptNm : item.deptNm
								, deptCd : item.deptCd
							});
						}
					});

				}

			}

			// selectbox
			selectEls.forEach(function(selectEl){
				//selectEl.options.length=0;
				selectEl.innerHTML = "";

				if(firstText){
					const firstOpt = document.createElement('option');
					firstOpt.value= firstValue;
					firstOpt.text = firstText;
					firstOpt.selected = true;
					selectEl.appendChild(firstOpt);
					//selectEl.options.length=0;
				}

				userList.forEach(function(item){
					//selectEl.options.add(new Option(item.codeNm, item.code));
					const opt = document.createElement('option');
					opt.value = item.userManno
					opt.text = item.userNm;
					selectEl.appendChild(opt);
				});
			});

		}
    };
})();

const codeUtil = (function () {
    'use strict';

    //세션스토리지 관리 키
    const STORAGE_KEY = 'MDI_COMMON_CODES';

    return {
        init: function () {
            return new Promise((resolve, reject) => {
                if (sessionStorage.getItem(STORAGE_KEY)) {
                    console.log('공통코드가 이미 캐싱되어 있습니다.');
                    resolve();
                    return;
                }

                HttpUtil.post('/cm/cc/selectComCodeList.do', {}, function (data) {
                    try {
                        const codeData = data.body.data || {};
                        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(codeData || {}));
                        resolve();
                    } catch (e) {
                        console.error('공통코드 캐싱 오류', e);
                        reject(e);
                    }
                });
            });
        },

        /*        init: function() {

                 if (sessionStorage.getItem(STORAGE_KEY)) {
                     return;
                 }

                 HttpUtil.post("/cm/cc/selectComCodeList.do", {}, function(res) {
                     try {
                         const codeData = res.data || {};
                         sessionStorage.setItem(STORAGE_KEY, JSON.stringify(codeData));
                         //sessionStorage.setItem(STORAGE_KEY, JSON.stringify(codeData || {}));
                         console.log("공통코드 캐싱", codeData);

                     } catch (e) {
                         console.error("공통코드 캐싱 오류", e)
                     }
                 });
         },*/

        //2. 특정 그룹의 공통코드 리스트 변환
        getList: function (codeId) {
            const codeStr = sessionStorage.getItem(STORAGE_KEY);
            if (!codeStr) return [];
            return JSON.parse(codeStr)[codeId] || [];
        },

        //3. 코드값으로 코드명 반환
        getName: function (codeId, code) {
            const list = this.getList(codeId);
            const target = list.find((item) => item.code == code);
            return target ? target.codeNm : code;
        },

        //4. 캐시 초기화
        clearCache: function () {
            sessionStorage.removeItem(STORAGE_KEY);
            this.init();
        },

        /**
         *
         * @param {HTML Element} root - root
         * @param {string} selector - 대상 선택자
         * @param {string} codeId - 공통코드 그룹ID
         * @param {string} defaultText - 첫번째 행 텍스트 (예시 : 선택|전체|"")
         * @param {string} defaultValue - 첫번째 행 value (예시 : ""|all|"")
         */
        //5. 셀렉트박스 바인딩
        bindSelect: function (root, selector, codeId, defaultText, defaultValue = '') {
            if (!root) return;

            const selectEls = root.querySelectorAll(selector);
            if (selectEls.length === 0) return;

            const list = this.getList(codeId);
            list.sort((a, b) => String(a.code ?? '').localeCompare(String(b.code ?? ''), 'ko', {numeric : true}));

            selectEls.forEach(function (selectEl) {
                //selectEl.options.length=0;
                selectEl.innerHTML = '';

                if (defaultText) {
                    const defaultOpt = document.createElement('option');
                    defaultOpt.value = defaultValue;
                    defaultOpt.text = defaultText;
                    defaultOpt.selected = true;
                    selectEl.appendChild(defaultOpt);
                    //selectEl.options.length=0;
                }

                list.forEach(function (item) {
                    //selectEl.options.add(new Option(item.codeNm, item.code));
                    const opt = document.createElement('option');
                    opt.value = item.code;
                    opt.text = item.codeNm;
                    selectEl.appendChild(opt);
                });
            });
        },

        /**
        *
        * @param {HTML Element} root - root
        * @param {string} selector - 대상 선택자
        * @param {string} codeId - 공통코드 그룹ID
        * @param {string} firstText - 첫번째 행 텍스트 (예시 : 선택|전체|"")
        * @param {string} firstValue - 첫번째 행 value (예시 : ""|all|"")
        * @param {array} {include : ['01', '02'], exclude : ['99'], cdCn1 : [], cdCn2 : [], cdCn3 : [], cdCn4 : [], searchType : ''}
        */
       //5. 셀렉트박스 바인딩
       bindSelectWithFilter: function(root, selector, codeId, firstText, firstValue="", options = {}){
           if(!root) return;

           const selectEls = root.querySelectorAll(selector);
           if(selectEls.length === 0) return;

           const list = this.getList(codeId);
           list.sort((a, b) => String(a.code ?? '').localeCompare(String(b.code ?? ''), 'ko', {numeric : true}));

           // 현재 날짜 && 사용여부 filter
           let filteredData;

           const today = new Date(); // 현재날짜
           const todayYmd = today.getFullYear().toString() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');

           if (options.searchType === 'all') {
        	   filteredData = list;
           } else {
        	   filteredData = list.filter(item => item.bgngYmd <= todayYmd && todayYmd <= item.endYmd && item.useYn === 'Y');
           }

           // cdCn1
           if (options.cdCn1 && options.cdCn1.length > 0) {
        	   filteredData = filteredData.filter(item => options.cdCn1.includes(item.cdCn1));
           }

           // cdCn2
           if (options.cdCn2 && options.cdCn2.length > 0) {
        	   filteredData = filteredData.filter(item => options.cdCn2.includes(item.cdCn2));
           }

           // cdCn3
           if (options.cdCn3 && options.cdCn3.length > 0) {
        	   filteredData = filteredData.filter(item => options.cdCn3.includes(item.cdCn3));
           }

           // cdCn4
           if (options.cdCn4 && options.cdCn4.length > 0) {
        	   filteredData = filteredData.filter(item => options.cdCn4.includes(item.cdCn4));
           }

           // include, exclude
           if (options.include && options.include.length > 0) {
        	   filteredData = filteredData.filter(item => options.include.includes(item.code));
           } else if (options.exclude && options.exclude.length > 0) {
        	   filteredData = filteredData.filter(item => !options.exclude.includes(item.code));
           }

           selectEls.forEach(function(selectEl){
               //selectEl.options.length=0;
               selectEl.innerHTML = "";

               if(firstText){
                   const firstOpt = document.createElement('option');
                   firstOpt.value= firstValue;
                   firstOpt.text = firstText;
                   firstOpt.selected = true;
                   selectEl.appendChild(firstOpt);
                   //selectEl.options.length=0;
               }

               filteredData.forEach(function(item){
                   //selectEl.options.add(new Option(item.codeNm, item.code));
                   const opt = document.createElement('option');
                   opt.value = item.code;
                   opt.text = item.codeNm;
                   selectEl.appendChild(opt);
               });
           });
       },

        /**
         *
         * @param {HTML Element} root - root
         * @param {string} containerSelector - 대상 선택자
         * @param {string} templateSelector - template class
         * @param {string} codeId - 공통코드 그룹ID
         * @param {string} inputName - inputName
         */
        //5. 체크박스, 라디오박스 바인딩
        bindInput: function (root, containerSelector, templateSelector, codeId, inputName) {
            if (!root) return;

            const template = root.querySelector(templateSelector);
            if (!template) return;

            const container = template.closest(containerSelector);
            if (!container) return;
            //const container = root.querySelector(containerSelector);
            //const template = root.querySelector(templateSelector);

            const children = container.children;
            for (let i = children.length - 1; i >= 0; i--) {
                if (children[i].togName !== 'TEMPLATE') {
                    container.removeChild(children[i]);
                }
            }
            //if(!container || !template) return;

            //container.innerHTML='';

            const list = this.getList(codeId);
            list.sort((a, b) => String(a.code ?? '').localeCompare(String(b.code ?? ''), 'ko', {numeric : true})); // 순서변경
            const uniqueGroupName = inputName + '_' + Math.random().toString(36).substring(2, 7);

            list.forEach(function (item, index) {
                const clone = template.content.cloneNode(true);
                const inputEl = clone.querySelector('input');
                const labelEl = clone.querySelector('label');

                const uniqueId = inputName + '_' + index + '_' + Math.random().toString(36).substring(2, 7);

                if (inputEl) {
                    inputEl.id = uniqueId;
                    inputEl.name = uniqueGroupName;
                    inputEl.setAttribute('data-name', inputName);
                    inputEl.value = item.code;
                }

                if (labelEl) {
                    labelEl.setAttribute('for', uniqueId);
                    labelEl.appendChild(document.createTextNode(item.codeNm));
                }
                container.appendChild(clone);
            });
        },

        /**
        *
        * @param {HTML Element} root - root
        * @param {string} containerSelector - 대상 선택자
        * @param {string} templateSelector - template class
        * @param {string} codeId - 공통코드 그룹ID
        * @param {string} inputName - inputName
        * @param {string} defaultValue - defaultValue
        * @param {array} {include : ['01', '02'], exclude : ['99'], cdCn1 : [], cdCn2 : [], cdCn3 : [], cdCn4 : [], searchType : ''}
        */
       //5. 체크박스, 라디오박스 바인딩 -
       bindInputWithFilter: function (root, containerSelector, templateSelector, codeId, inputName, defaultValue, options = {}) {
           if (!root) return;

           const template = root.querySelector(templateSelector);
           if (!template) return;

           const container = template.closest(containerSelector);
           if (!container) return;
           //const container = root.querySelector(containerSelector);
           //const template = root.querySelector(templateSelector);

           const children = container.children;
           for (let i = children.length - 1; i >= 0; i--) {
               if (children[i].togName !== 'TEMPLATE') {
                   container.removeChild(children[i]);
               }
           }
           //if(!container || !template) return;

           //container.innerHTML='';

           const list = this.getList(codeId);
           list.sort((a, b) => String(a.code ?? '').localeCompare(String(b.code ?? ''), 'ko', {numeric : true})); // 순서변경

           let filteredData = list;

           const today = new Date(); // 현재날짜
           const todayYmd = today.getFullYear().toString() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');

           if (options.searchType === 'all') {
        	   filteredData = list;
           } else {
        	   filteredData = list.filter(item => item.bgngYmd <= todayYmd && todayYmd <= item.endYmd && item.useYn === 'Y');
           }

           // cdCn1
           if (options.cdCn1 && options.cdCn1.length > 0) {
        	   filteredData = filteredData.filter(item => options.cdCn1.includes(item.cdCn1));
           }

           // cdCn2
           if (options.cdCn2 && options.cdCn2.length > 0) {
        	   filteredData = filteredData.filter(item => options.cdCn2.includes(item.cdCn2));
           }

           // cdCn3
           if (options.cdCn3 && options.cdCn3.length > 0) {
        	   filteredData = filteredData.filter(item => options.cdCn3.includes(item.cdCn3));
           }

           // cdCn4
           if (options.cdCn4 && options.cdCn4.length > 0) {
        	   filteredData = filteredData.filter(item => options.cdCn4.includes(item.cdCn4));
           }

           if (options.include && options.include.length > 0) {
           	filteredData = list.filter(item => options.include.includes(item.code));
           } else if (options.exclude && options.exclude.length > 0) {
           	filteredData = list.filter(item => !options.exclude.includes(item.code));
           }

           const uniqueGroupName = inputName + '_' + Math.random().toString(36).substring(2, 7);

           filteredData.forEach(function (item, index) {
               const clone = template.content.cloneNode(true);
               const inputEl = clone.querySelector('input');
               const labelEl = clone.querySelector('label');

               const uniqueId = inputName + '_' + index + '_' + Math.random().toString(36).substring(2, 7);

               if (inputEl) {
                   inputEl.id = uniqueId;
                   inputEl.name = uniqueGroupName;
                   inputEl.setAttribute('data-name', inputName);
                   inputEl.value = item.code;

                   if (item.code === defaultValue) {
                	   inputEl.checked = true;
                   }
               }

               if (labelEl) {
                   labelEl.setAttribute('for', uniqueId);
                   labelEl.appendChild(document.createTextNode(item.codeNm));
               }
               container.appendChild(clone);
           });
       },

        //6. 체크박스 라디오박스 값 가져오기
        getChkedValue: function (root, inputName) {
            if (!root) return [];

            const checkedEls = root.querySelectorAll('input[data-name="' + inputName + '"]:checked');
            return Array.from(checkedEls).map(function (el) {
                return el.value;
            });
        },

        //6-1. 체크박스 라디오박스 값(label) 가져오기
        getChkedLabel: function (root, inputName) {
            if (!root) return [];

            const checkedEls = root.querySelectorAll('input[data-name="' + inputName + '"]:checked');
            return Array.from(checkedEls).map(function (el) {
                return el.labels?.[0]?.textContent.trim() ?? '';
            });
        },

        //7. 체크박스 라디오박스 값 설정하기
        setChkedValue: function (root, inputName, values, triggerChange) {
        	if (!root) return [];

        	// 단일값으로 들어와도 배열로 처리
        	if (!Array.isArray(values)) {
        		values = values == null ? [] : [values];
        	}

        	const inputs = root.querySelectorAll('input[data-name="' + inputName + '"]');

        	inputs.forEach(function(el) {
        		const checked = values.includes(el.value);

        		// 실제 값이 바뀐 경우만
        		if (el.checked !== checked) {
        			el.checked = checked;

        			if (triggerChange) {
        				el.dispatchEvent(new Event('change', {
        					bubbles: true
        				}));
        			}
        		}
        	});
        },

        /**
         *  검색 가능한 셀렉트박스 바인딩 (CSS는 퍼블이 입힐 것이므로 클래스만 부여, 스타일 없음)
         * - bindSelect/bindDatalist와 동일하게 root를 첫 파라미터로 받는 형식 유지
         * - 문서 전역에 붙는 바깥클릭 감지 이벤트는 root.id에서 tabId를 역추출하여
         *   MdiManager.addResource로 등록, 탭 종료 시 자동 해제됨
         *
         * 필요한 마크업 (root 안에 존재해야 함):
         *   <div class="search-select">
         *       <input type="text" class="search-select-input" placeholder="검색"/>
         *       <input type="hidden" class="search-select-value"/>
         *       <ul class="search-select-list"></ul>
         *   </div>
         *
         * @param {HTMLElement} root - 탭 컨텐츠 루트
         * @param {string} wrapSelector - '.search-select' 감싸는 div의 class 선택자
         * @param {string|Array} codeId - 공통코드 그룹ID(문자열) 또는 [{code, codeNm}] 배열 직접 전달
         * @param {Object} options - { maxVisibleItems, emptyText, idField, textField }
         */
        bindSearchSelect: function (root, wrapSelector, codeId, options = {}) {
            if (!root) return;

            // 문서 전역 리스너 정리를 위해 tabId 역추출 (content-{tabId} 규칙 이용)
            const tabId = root.id ? root.id.replace('content-', '') : null;

            const wraps = root.querySelectorAll(wrapSelector);
            if (wraps.length === 0) return;

            const opt = Object.assign(
                {
                    maxVisibleItems: 300,
                    emptyText: '검색 결과가 없습니다',
                    idField: 'code',
                    textField: 'codeNm'
                },
                options
            );

            // 데이터 소스: codeId(공통코드 그룹) 또는 배열 직접 전달 둘 다 허용
            const items = Array.isArray(codeId)
                ? codeId.map((i) => ({ code: i[opt.idField], codeNm: i[opt.textField] }))
                : this.getList(codeId);

            const self = this;

            wraps.forEach(function (wrapEl) {
                self._enhanceSearchSelect(tabId, wrapEl, items, opt);
            });
        },

        // bindSearchSelect 내부 구현 (직접 호출하지 않음)
        _enhanceSearchSelect: function (tabId, wrapEl, items, opt) {
            const input = wrapEl.querySelector('.search-select-input');
            const hidden = wrapEl.querySelector('.search-select-value');
            const listEl = wrapEl.querySelector('.search-select-list');
            if (!input || !hidden || !listEl) {
                console.warn('[codeUtil.bindSearchSelect] 필요한 마크업이 없습니다.', wrapEl);
                return;
            }

            let currentMatches = [];
            let activeIndex = -1;

            // 기본값 셋팅
            const defaultItem = items.find(item => item.defaultValue === true);
            if (defaultItem) {
            	input.value = defaultItem.codeNm.trim();
            	hidden.value = defaultItem.code;
            	hidden.dispatchEvent(new Event('change', { bubbles: true }));
            }

            function render(keyword) {
                const kw = (keyword || '').toLowerCase().trim();
                const matches = kw ? items.filter((i) => i.codeNm.toLowerCase().includes(kw)) : items.slice();

                currentMatches = matches.slice(0, opt.maxVisibleItems);
                activeIndex = -1;
                listEl.innerHTML = '';

                if (matches.length === 0) {
                    const li = document.createElement('li');
                    li.className = 'is-empty';
                    li.textContent = opt.emptyText;
                    listEl.appendChild(li);
                    wrapEl.classList.add('is-open');
                    return;
                }

                currentMatches.forEach(function (item, idx) {
                    const li = document.createElement('li');
                    li.textContent = item.codeNm;
                    li.dataset.idx = idx;
                    if (item.code === hidden.value) li.classList.add('is-selected');
                    listEl.appendChild(li);
                });

                wrapEl.classList.add('is-open');
            }

            function selectItem(item) {
                input.value = item.codeNm.trim();
                hidden.value = item.code;
                hidden.dispatchEvent(new Event('change', { bubbles: true }));
                closeList();
            }

            function openList() {
                render(input.value);
            }

            function closeList() {
                wrapEl.classList.remove('is-open');
                activeIndex = -1;
            }

            function setActive(idx) {
                const els = listEl.querySelectorAll('li:not(.is-empty)');
                els.forEach((el) => el.classList.remove('is-active'));
                if (idx >= 0 && els[idx]) {
                    els[idx].classList.add('is-active');
                    els[idx].scrollIntoView({ block: 'nearest' });
                }
                activeIndex = idx;
            }

            const handlers = [];
            function on(target, type, handler) {
                target.addEventListener(type, handler);
                handlers.push({ target, type, handler });
            }

            on(input, 'focus', openList);
            on(input, 'input', function () {
                render(input.value);
            });

            on(input, 'keydown', function (e) {
                const els = listEl.querySelectorAll('li:not(.is-empty)');
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (!wrapEl.classList.contains('is-open')) {
                        openList();
                        return;
                    }
                    setActive(Math.min(activeIndex + 1, els.length - 1));
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActive(Math.max(activeIndex - 1, 0));
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (activeIndex >= 0 && currentMatches[activeIndex]) selectItem(currentMatches[activeIndex]);
                } else if (e.key === 'Escape') {
                    closeList();
                    input.blur();
                }
            });

            on(listEl, 'mousedown', function (e) {
                const li = e.target.closest('li:not(.is-empty)');
                if (!li) return;
                e.preventDefault();
                const idx = Number(li.dataset.idx);
                if (currentMatches[idx]) selectItem(currentMatches[idx]);
            });

            const outsideHandler = function (e) {
                if (!wrapEl.contains(e.target)) closeList();
            };
            on(document, 'mousedown', outsideHandler);

            //render('');

            // ★ 기존 datepicker/MaskUtil과 동일한 방식: 탭 종료시 리소스 정리 등록
            if (tabId && typeof MdiManager !== 'undefined' && typeof MdiManager.addResource === 'function') {
                MdiManager.addResource(tabId, {
                    destroy: function () {
                        handlers.forEach((h) => h.target.removeEventListener(h.type, h.handler));
                    }
                });
            }
        }
    };
})();
