/**========================================================
 * @fileName : edel-editor.js
 * @description : 웹에디터(SunEditor v2.47.x) 공통 유틸  (전역 객체: EditorUtil)
 * @since : 2026. 10. 8.
 *
 * [전제]
 *  - index.jsp 에 이 파일 1줄만 추가한다. (mdi-util.js 다음 위치)
 *      <script src="/js/common/util/editor/edel-editor.js" charset="UTF-8"></script>
 *  - SunEditor 라이브러리(css/js/lang)는 EditorUtil.ready() 가 처음 필요할 때 1회만 자동 로드한다.
 *    (index.jsp 를 수정하지 않아도 되고, 에디터를 안 쓰는 화면은 라이브러리를 받지 않는다)
 *  - 외부 CDN 을 쓰지 않는다. 모든 파일은 /js/common/3rd/suneditor/ 아래에 둔다.
 *
 * [주요 함수]
 *  EditorUtil.field(tabId, target, options)    ★ 권장. 한 줄로 만들고 set()/get() 만 쓰는 에디터 필드
 *  EditorUtil.create(tabId, target, options)   에디터 생성 (Promise → handle). 세밀한 제어가 필요할 때
 *  (탭/팝업이 닫히면 MDI 엔진이 에디터를 자동으로 정리한다. onDestroy 에 따로 쓸 필요 없음)
 *  EditorUtil.save({...})                      빈값검증 + 확인창 + 저장요청 + 완료알림 (등록/수정 공용)
 *  EditorUtil.remove({...})                    확인창 + 삭제요청 + 완료알림
 *  EditorUtil.render(el, html)                 저장된 HTML 을 읽기 전용으로 출력 (상세/조회 화면)
 *  EditorUtil.clean(html)                      HTML 정제 (script, on* 이벤트, javascript: 제거)
 *  EditorUtil.destroyAll(tabId)                탭 종료 시 호출 (onDestroy)
 *
 *  handle (create 의 결과)
 *    .getHtml() .setHtml(html) .getText() .isEmpty() .clear() .insertHtml(html)
 *    .focus() .readOnly(bool) .isDirty() .markClean() .getBytes() .destroy() .raw (SunEditor 원본 인스턴스)
 ==========================================================*/
const EditorUtil = (function () {
	'use strict';

	/* ========================================================================
	   1. 상수
	   ======================================================================== */
	const VERSION = '2.47.12';
	const BASE = '/js/common/3rd/suneditor/';

	//탭 별 에디터 보관소  { tabId: { key: handle } }
	const store = {};
	let loadPromise = null;
	let cssPromise = null;
	let seq = 0;			//textarea id 중복 방지용 일련번호

	//툴바 프로파일  (필요하면 여기에 추가한다)
	const PROFILES = {
		//댓글, 짧은 메모
		minimal: [
			['bold', 'underline', 'italic'],
			['list']
		],
		//기본 서식
		basic: [
			['undo', 'redo'],
			['bold', 'underline', 'italic', 'strike'],
			['fontColor', 'hiliteColor'],
			['removeFormat'],
			['outdent', 'indent'],
			['align', 'list'],
			['link']
		],
		//일반 문서 작성 (권장 기본값)
		standard: [
			['undo', 'redo'],
			['font', 'fontSize', 'formatBlock'],
			['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
			['fontColor', 'hiliteColor'],
			['removeFormat'],
			'/',
			['outdent', 'indent', 'align', 'horizontalRule', 'list', 'lineHeight'],
			['table', 'link'],
			['fullScreen', 'showBlocks', 'preview', 'print']
		],
		//전체 기능. image 는 options.imageUploader 가 있을 때만 포함, codeView(HTML 직접 편집)는 이 프로파일만 제공
		full: [
			['undo', 'redo'],
			['font', 'fontSize', 'formatBlock'],
			['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
			['fontColor', 'hiliteColor'],
			['removeFormat'],
			'/',
			['outdent', 'indent', 'align', 'horizontalRule', 'list', 'lineHeight'],
			['table', 'link', 'image'],
			['fullScreen', 'showBlocks', 'codeView', 'preview', 'print']
		]
	};

	const DEFAULTS = {
		profile: 'standard',
		height: '320px',
		minHeight: '',
		maxHeight: '',
		placeholder: '내용을 입력하세요.',
		maxBytes: 500000,		//HTML 최대 크기(byte). 0 이면 제한 없음
		value: '',				//초기 HTML
		readOnly: false,
		key: 'default',			//한 화면에 에디터가 여러 개일 때 구분키
		tabDisable: true,		//true: Tab 키로 에디터 밖으로 포커스 이동 (접근성). false 면 Tab 이 들여쓰기로 동작
		stopEscape: true,		//true: 에디터 안에서 누른 Esc 가 모달 팝업(전역 Esc 닫기)까지 전달되지 않게 막음
		imageUploader: null,	//(file) => Promise<{url, name, size}>  없으면 이미지 버튼 숨김
		onChange: null			//(html, handle) => {}  입력할 때마다 호출 (초기값 주입 시에는 호출 안 됨)
	};

	//DOM 정제 대상
	const DANGER_TAGS = 'script,style,iframe,object,embed,applet,link,meta,base,form,input,button,textarea,select,noscript,template,frame,frameset';
	const URL_ATTRS = ['href', 'src', 'action', 'formaction', 'xlink:href', 'background'];

	/* ========================================================================
	   2. 라이브러리 로더
	   ======================================================================== */
	const loadCss = function (href) {
		return new Promise(function (resolve, reject) {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = href;
			link.onload = resolve;
			link.onerror = function () { reject(new Error('CSS 로드 실패: ' + href)); };
			document.head.appendChild(link);
		});
	};

	const loadScript = function (src) {
		return new Promise(function (resolve, reject) {
			const script = document.createElement('script');
			script.src = src;
			script.charset = 'UTF-8';
			script.onload = resolve;
			script.onerror = function () { reject(new Error('스크립트 로드 실패: ' + src)); };
			document.head.appendChild(script);
		});
	};

	/**
	 * SunEditor CSS 만 로드 (최초 1회). 에디터 없이 render() 로 본문만 보여주는 화면에서 쓴다.
	 * @returns {Promise<void>}
	 */
	const readyCss = function () {
		if (!cssPromise) {
			cssPromise = loadCss(BASE + 'css/suneditor.min.css?v=' + VERSION).catch(function (e) {
				cssPromise = null;
				throw e;
			});
		}
		return cssPromise;
	};

	/**
	 * SunEditor 라이브러리(css + js + 한국어) 로드 (최초 1회, 이후 즉시 완료)
	 * @returns {Promise<void>}
	 */
	const ready = function () {
		if (window.SUNEDITOR && window.SUNEDITOR_LANG && window.SUNEDITOR_LANG.ko) {
			return readyCss();
		}
		if (loadPromise) {
			return loadPromise;
		}
		const v = '?v=' + VERSION;
		loadPromise = readyCss()
			.then(function () { return loadScript(BASE + 'suneditor.min.js' + v); })
			.then(function () { return loadScript(BASE + 'lang/ko.js' + v); })
			.catch(function (e) {
				loadPromise = null;	//실패하면 다음 호출에서 재시도
				throw e;
			});
		return loadPromise;
	};

	/* ========================================================================
	   3. HTML 유틸
	   ======================================================================== */

	/**
	 * HTML 정제 (DOMParser 기반, 스크립트가 실행되지 않는 inert 문서에서 처리)
	 * - 위험 태그 제거, on* 이벤트 속성 제거, javascript:/vbscript:/data:text/html 링크 제거
	 * ※ 서버(EditorHtmlUtil.sanitize)에서도 반드시 한 번 더 정제한다. 클라이언트 정제는 보조 수단이다.
	 */
	const clean = function (html) {
		if (!html) {
			return '';
		}
		const doc = new DOMParser().parseFromString(String(html), 'text/html');

		doc.querySelectorAll(DANGER_TAGS).forEach(function (el) {
			el.remove();
		});

		doc.body.querySelectorAll('*').forEach(function (el) {
			Array.prototype.slice.call(el.attributes).forEach(function (attr) {
				const name = attr.name.toLowerCase();
				const val = attr.value.replace(/[\u0000-  ]+/g, '').toLowerCase();

				if (name.indexOf('on') === 0) {
					el.removeAttribute(attr.name);
				} else if (URL_ATTRS.indexOf(name) > -1) {
					const isScript = val.indexOf('javascript:') === 0 || val.indexOf('vbscript:') === 0;
					const isHtmlData = val.indexOf('data:') === 0 && val.indexOf('data:image/') !== 0;
					if (isScript || isHtmlData) {
						el.removeAttribute(attr.name);
					}
				} else if (name === 'style' && /expression\(|javascript:|behavior:|-moz-binding/.test(val)) {
					el.removeAttribute(attr.name);
				}
			});
		});
		return doc.body.innerHTML;
	};

	/**
	 * HTML 이 실질적으로 비어 있는지 (<p><br></p>, &nbsp; 만 있는 경우도 빈값)
	 * 이미지, 표, 구분선, 동영상이 있으면 빈값이 아니다.
	 */
	const isEmptyHtml = function (html) {
		if (!html) {
			return true;
		}
		if (/<\s*(img|table|hr|video|audio|iframe)\b/i.test(html)) {
			return false;
		}
		const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;|​/g, ' ').trim();
		return text.length === 0;
	};

	//에디터가 만든 HTML 은 항상 <p>, <div>, <table>, <ul> 같은 블록 태그로 감싸진다.
	//<b> 같은 인라인 태그만 보이는 글은 사용자가 평문으로 쓴 글자일 수 있으므로 HTML 로 보지 않는다.
	const HTML_LIKE = /<\/?(p|div|br|table|thead|tbody|tr|td|th|ul|ol|li|h[1-6]|blockquote|pre|hr|figure)(\s[^>]*)?\/?>/i;

	/**
	 * DB 에 이미 들어 있는 기존 값(평문 텍스트)을 에디터에 넣을 수 있는 HTML 로 바꾼다.
	 * - 블록 태그(<p> 등)가 보이면 HTML 로 보고 그대로 돌려준다.
	 * - 평문이면 < > & 를 이스케이프하고 줄바꿈마다 <p> 로 감싼다. (setHtml 에 평문을 바로 넣으면 줄바꿈이 사라짐)
	 * 기존 textarea 로 저장된 데이터와 에디터로 저장한 데이터가 섞여 있는 화면에서 사용한다.
	 */
	const textToHtml = function (value) {
		if (value === null || value === undefined || value === '') {
			return '';
		}
		const s = String(value);
		if (HTML_LIKE.test(s)) {
			return s;
		}
		const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		return esc.split(/\r?\n/).map(function (line) {
			return '<p>' + (line === '' ? '<br>' : line) + '</p>';
		}).join('');
	};

	/**
	 * 문자열의 UTF-8 byte 길이 (서버/DB 저장 크기 점검용)
	 */
	const byteLength = function (str) {
		if (!str) {
			return 0;
		}
		return new Blob([str]).size;
	};

	/**
	 * 저장된 HTML 을 요소에 읽기 전용으로 출력 (상세 화면용). 에디터를 생성하지 않아 가볍다.
	 * SunEditor 서식(표, 정렬, 글자크기 등)이 그대로 보이도록 sun-editor-editable 클래스를 사용한다.
	 */
	const render = function (el, html) {
		if (!el) {
			return;
		}
		readyCss().catch(function (e) {
			console.warn('[EditorUtil] CSS 로드 실패', e);
		});
		el.classList.add('sun-editor-editable');
		el.innerHTML = clean(html);
	};

	/* ========================================================================
	   4. 에디터 생성 / 핸들
	   ======================================================================== */
	const buildButtonList = function (opts) {
		const src = PROFILES[opts.profile] || PROFILES.standard;
		//깊은 복사 후 image 제어
		return src.map(function (group) {
			if (!Array.isArray(group)) {
				return group;
			}
			return group.filter(function (btn) {
				return btn !== 'image' || typeof opts.imageUploader === 'function';
			});
		}).filter(function (group) {
			return !Array.isArray(group) || group.length > 0;
		});
	};

	const buildConfig = function (opts) {
		const cfg = {
			lang: window.SUNEDITOR_LANG.ko,
			width: '100%',
			height: opts.height,
			placeholder: opts.placeholder,
			buttonList: buildButtonList(opts),
			//프로젝트 기본 글꼴(Pretendard GOV)을 기본값으로 쓴다
			font: ['Pretendard GOV', '맑은 고딕', '돋움', '굴림', '바탕', '궁서', 'Arial', 'Courier New', 'Times New Roman'],
			fontSize: [10, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36],
			defaultStyle: "font-family:'Pretendard GOV', sans-serif; font-size:14px;",
			resizingBar: true,
			tabDisable: opts.tabDisable,
			showPathLabel: false,
			stickyToolbar: -1		//MDI 스크롤 영역 안에서 툴바 고정 기능이 어긋나므로 사용 안 함
		};
		if (opts.minHeight) {
			cfg.minHeight = opts.minHeight;
		}
		if (opts.maxHeight) {
			cfg.maxHeight = opts.maxHeight;
		}
		if (opts.maxBytes > 0) {
			cfg.charCounter = true;
			cfg.charCounterType = 'byte-html';
			cfg.charCounterLabel = 'HTML 크기(byte): ';
			cfg.maxCharCount = opts.maxBytes;
		}
		return cfg;
	};

	const makeHandle = function (tabId, inst, opts) {
		let snapshot = '';

		const handle = {
			raw: inst,
			key: opts.key,
			/** destroy() 된 뒤 true. 비동기 콜백에서 오래된 handle 을 쓰지 않도록 확인하는 용도 */
			destroyed: false,

			/** 현재 HTML (빈 에디터는 '' 로 정규화) */
			getHtml: function () {
				const html = inst.getContents(false);
				return isEmptyHtml(html) ? '' : html;
			},
			/** HTML 설정 (정제 후 주입) */
			setHtml: function (html) {
				inst.setContents(clean(html));
			},
			/** 순수 텍스트 */
			getText: function () {
				return inst.getText();
			},
			isEmpty: function () {
				return isEmptyHtml(inst.getContents(false));
			},
			clear: function () {
				inst.setContents('');
			},
			/** 커서 위치에 HTML 삽입 */
			insertHtml: function (html) {
				inst.insertHTML(clean(html), true, true);
			},
			focus: function () {
				inst.core.focus();
			},
			/** 읽기 전용 전환 (true: 편집 불가) */
			readOnly: function (flag) {
				if (flag) {
					inst.readOnly(true);
					inst.toolbar.disable();
				} else {
					inst.readOnly(false);
					inst.toolbar.enable();
				}
			},
			/** 마지막 markClean() 이후 내용이 바뀌었는지 */
			isDirty: function () {
				return handle.getHtml() !== snapshot;
			},
			/**
			 * 현재 내용을 '저장된 상태'로 기록 (조회/저장 성공 직후 호출)
			 * @param {string} [base] 기준 HTML 을 직접 지정 (에디터를 다시 만들면서 '변경됨' 상태를 이어갈 때 getBaseline() 값을 전달)
			 */
			markClean: function (base) {
				snapshot = (typeof base === 'string') ? base : handle.getHtml();
			},
			/** markClean 으로 기록해 둔 기준 HTML */
			getBaseline: function () {
				return snapshot;
			},
			/** HTML 의 UTF-8 byte 크기 */
			getBytes: function () {
				return byteLength(handle.getHtml());
			},
			destroy: function () {
				if (handle.destroyed) {
					return;
				}
				handle.destroyed = true;
				if (store[tabId] && store[tabId][opts.key] === handle) {
					delete store[tabId][opts.key];
				}
				try {
					//참고: SunEditor v2 는 내용 변경 후 ~100ms 이내에 destroy 하면 내부 타이머가 콘솔에
					//  "getCharCount is not a function" 오류를 한 번 남길 수 있다. 동작에는 영향이 없다.
					inst.destroy();
				} catch (e) {
					console.warn('[EditorUtil] destroy 실패', e);
				}
			}
		};
		return handle;
	};

	/**
	 * 에디터 생성
	 * @param {string} tabId  현재 탭 ID (MDI 엔진이 주입한 tabId)
	 * @param {Element} target  textarea 요소 ($r('.editor') 로 얻는다)
	 * @param {Object} [options]  DEFAULTS 참고
	 * @returns {Promise<Object|null>} handle (탭이 이미 닫혔으면 null)
	 */
	const create = function (tabId, target, options) {
		if (!target || target.nodeType !== 1) {
			return Promise.reject(new Error('[EditorUtil] target 요소가 없습니다. $r(...) 선택자를 확인하세요.'));
		}
		const opts = Object.assign({}, DEFAULTS, options || {});

		return ready().then(function () {
			//라이브러리 로드 사이에 탭이 닫혔다면 만들지 않는다
			if (!document.body.contains(target)) {
				return null;
			}

			//같은 key 가 이미 있으면 먼저 정리
			if (store[tabId] && store[tabId][opts.key]) {
				store[tabId][opts.key].destroy();
			}

			//SunEditor 는 'suneditor_' + textarea id 가 문서에 이미 있으면 생성을 거부한다.
			//(같은 id 의 textarea 를 가진 화면이 동시에 열려 있는 경우 대비) id 가 없거나 겹치면 고유 id 로 바꾼다.
			if (!target.id) {
				target.id = 'edelEditor' + (++seq);
			} else if (document.getElementById('suneditor_' + target.id)) {
				target.id = target.id + '_' + (++seq);
			}

			const inst = window.SUNEDITOR.create(target, buildConfig(opts));
			const handle = makeHandle(tabId, inst, opts);

			//생성 도중 예외가 나면 만들어진 에디터를 정리하고 다시 던진다 (DOM 이 남으면 같은 textarea 로 재생성이 막힘)
			try {
				//이미지 업로드: 프로젝트 업로드 API 를 호출해 서버 URL 을 받아 삽입 (base64 삽입 방지)
				if (typeof opts.imageUploader === 'function') {
					inst.onImageUploadBefore = function (files, info, core, uploadHandler) {
						Promise.all(Array.prototype.map.call(files, function (file) {
							return opts.imageUploader(file);
						})).then(function (results) {
							uploadHandler({ result: results });
						}).catch(function (e) {
							uploadHandler(String((e && e.message) || e));
						});
						return undefined;	//undefined: uploadHandler 호출을 기다린다
					};
				}

				if (opts.value) {
					handle.setHtml(opts.value);
				}
				if (opts.readOnly) {
					handle.readOnly(true);
				}
				handle.markClean();

				//모달 팝업은 Esc 로 닫히는데, 에디터의 링크/표 대화상자를 Esc 로 닫을 때 팝업까지 닫히면
				//작성 중인 내용을 잃는다. 에디터 영역 안에서 발생한 Esc 는 바깥(window)으로 올리지 않는다.
				if (opts.stopEscape) {
					inst.core.context.element.topArea.addEventListener('keydown', function (e) {
						if (e.key === 'Escape') {
							e.stopPropagation();
						}
					});
				}

				//onChange 는 초기값 주입이 끝난 뒤에 연결한다 (setHtml 이 onChange 를 즉시 호출하기 때문)
				if (typeof opts.onChange === 'function') {
					inst.onChange = function () {
						if (handle.destroyed) {
							return;	//destroy 이후 뒤늦게 들어오는 이벤트는 무시
						}
						try {
							opts.onChange(handle.getHtml(), handle);
						} catch (e) {
							console.error('[EditorUtil] onChange 콜백 오류', e);
						}
					};
				}
			} catch (e) {
				handle.destroy();
				throw e;
			}

			if (!store[tabId]) {
				store[tabId] = {};
			}
			store[tabId][opts.key] = handle;

			//MDI 엔진의 리소스로 등록한다. 탭/모달 팝업이 닫힐 때 엔진이 handle.destroy() 를 호출하므로
			//화면 스크립트의 onDestroy 에 EditorUtil.destroyAll 을 따로 쓰지 않아도 된다.
			if (typeof MdiManager !== 'undefined' && typeof MdiManager.addResource === 'function') {
				MdiManager.addResource(tabId, handle);
			}
			return handle;
		});
	};

	/**
	 * 에디터 필드 - 가장 간단한 사용법 (권장)
	 * 에디터가 비동기로 만들어지는 것, 기존 평문 데이터 변환, 프로파일 변경을 내부에서 처리한다.
	 * 화면에서는 만들고 set / get 만 쓰면 된다. 닫을 때 정리도 자동이다.
	 *
	 *   const cn = EditorUtil.field(tabId, $r('.pstCn'), { profile: 'standard', height: '300px' });
	 *   cn.set(data.pstCn);     // 에디터가 아직 만들어지는 중이어도 된다 (생성 직후 반영)
	 *   cn.get();               // 저장할 HTML ('' 이면 비어 있음)
	 *   EditorUtil.save({ editor: cn, ... })   // save 에도 그대로 넘길 수 있다
	 *
	 * @param {string} tabId
	 * @param {Element} target  textarea 요소
	 * @param {Object} [options]  create 의 옵션 + convertText(기본 true: set() 한 평문을 HTML 로 변환)
	 * @returns {Object} field
	 */
	const field = function (tabId, target, options) {
		const opts = Object.assign({}, options || {});
		//한 탭에 필드를 여러 개 만들어도 서로 정리되지 않도록 key 를 자동으로 나눈다
		opts.key = opts.key || ('field' + (++seq));
		const convert = opts.convertText !== false;
		let handle = null;
		let pending = null;			//에디터 생성 전에 set() 된 값
		let pendingBase;			//pending 을 반영한 뒤 '저장된 상태' 로 기록할 기준 HTML (undefined 면 반영한 값)
		let profile = opts.profile || DEFAULTS.profile;
		let readOnlyFlag = !!opts.readOnly;
		let applying = false;		//set 으로 값을 넣는 중에는 onChange 를 호출하지 않는다

		const f = { destroyed: false };

		const apply = function (h, html, base) {
			applying = true;
			try {
				h.setHtml(html);
				h.markClean(base);
			} finally {
				applying = false;
			}
		};

		const build = function () {
			const o = Object.assign({}, opts, { profile: profile, readOnly: false, onChange: null });
			if (typeof opts.onChange === 'function') {
				o.onChange = function (html) {
					if (!applying && !f.destroyed) {
						opts.onChange(html, f);
					}
				};
			}
			return create(tabId, target, o).then(function (h) {
				if (!h) {
					return null;
				}
				if (f.destroyed) {
					h.destroy();
					return null;
				}
				handle = h;
				if (pending !== null) {
					apply(h, pending, pendingBase);
					pending = null;
					pendingBase = undefined;
				}
				if (readOnlyFlag) {
					h.readOnly(true);
				}
				return f;
			}).catch(function (e) {
				console.error('[EditorUtil] 에디터 생성 실패', e);
				if (typeof UIUtil !== 'undefined') {
					UIUtil.alert({ msg: '에디터를 불러오지 못했습니다. 라이브러리 파일 경로를 확인하세요.' });
				}
				return null;
			});
		};

		/** 에디터 생성이 끝나면 resolve (보통은 기다릴 필요 없음) */
		f.ready = build();

		/** 값 넣기. 기존 평문은 HTML 로 변환된다 (convertText:false 또는 {raw:true} 로 끌 수 있음) */
		f.set = function (value, o) {
			const raw = (o && o.raw) || !convert;
			const html = raw ? (value === null || value === undefined ? '' : String(value)) : textToHtml(value);
			if (handle) {
				apply(handle, html);
			} else {
				pending = html;
				pendingBase = undefined;
			}
		};
		/** 현재 HTML. 비어 있으면 '' */
		f.get = function () {
			if (handle) {
				return handle.getHtml();
			}
			return (pending !== null && !isEmptyHtml(pending)) ? pending : '';
		};
		f.getHtml = f.get;
		f.isEmpty = function () {
			return handle ? handle.isEmpty() : (pending === null || isEmptyHtml(pending));
		};
		f.clear = function () {
			f.set('');
		};
		/** 마지막 set()/markClean() 이후 바뀌었는지 */
		f.isDirty = function () {
			return handle ? handle.isDirty() : false;
		};
		f.markClean = function (base) {
			if (handle) {
				handle.markClean(base);
			}
		};
		f.getBaseline = function () {
			return handle ? handle.getBaseline() : '';
		};
		f.focus = function () {
			if (handle) {
				handle.focus();
			}
		};
		f.readOnly = function (flag) {
			readOnlyFlag = !!flag;
			if (handle) {
				handle.readOnly(readOnlyFlag);
			}
		};
		/** 툴바 프로파일 변경. 작성 중인 내용과 '변경됨' 상태를 유지한 채 에디터를 다시 만든다 */
		f.setProfile = function (name) {
			if (name === profile) {
				return f.ready;
			}
			const keep = f.get();
			const base = handle ? handle.getBaseline() : keep;
			profile = name;
			handle = null;
			pending = keep;
			pendingBase = base;
			f.ready = build();
			return f.ready;
		};
		f.destroy = function () {
			f.destroyed = true;
			if (handle) {
				handle.destroy();
			}
		};
		/** 내부 handle (create 의 결과). 생성 전에는 null */
		Object.defineProperty(f, 'handle', {
			get: function () {
				return handle;
			}
		});

		return f;
	};

	/** 생성된 에디터 조회 */
	const get = function (tabId, key) {
		return (store[tabId] && store[tabId][key || 'default']) || null;
	};

	/** 탭의 에디터 모두 정리 (MdiManager.register 의 onDestroy 에서 호출) */
	const destroyAll = function (tabId) {
		const group = store[tabId];
		if (!group) {
			return;
		}
		Object.keys(group).forEach(function (key) {
			group[key].destroy();
		});
		delete store[tabId];
	};

	/* ========================================================================
	   5. 저장 / 삭제 공통 흐름
	   ======================================================================== */

	/**
	 * 저장 (등록/수정 공용)
	 *  1) 본문 빈값 검증 → 2) 확인창 → 3) 서버 요청 → 4) 완료 알림 → 5) onSuccess
	 *
	 * @param {Object} p
	 * @param {Object} p.editor        create() 가 돌려준 handle
	 * @param {string} p.url           저장 URL  (예: '/cm/sa/insertSampleEditorData.do')
	 * @param {Object} [p.data]        본문 외 함께 보낼 값 (제목, PK 등)
	 * @param {string} [p.contentKey]  본문을 담을 키 이름 (기본 'content')
	 * @param {string} [p.confirmMsg]  확인창 문구 (기본 '저장하시겠습니까?')
	 * @param {string} [p.successMsg]  완료 문구 (기본 '저장되었습니다.')
	 * @param {Function} [p.onSuccess] 성공 후 콜백 (res)
	 */
	const save = function (p) {
		if (!p || !p.editor || !p.url) {
			console.error('[EditorUtil.save] editor, url 은 필수입니다.');
			return;
		}
		const editor = p.editor;

		if (editor.isEmpty()) {
			UIUtil.alert({
				msg: '내용을 입력하세요.',
				callback: function () { editor.focus(); }
			});
			return;
		}

		const payload = Object.assign({}, p.data || {});
		payload[p.contentKey || 'content'] = editor.getHtml();

		UIUtil.confirm({
			msg: p.confirmMsg || '저장하시겠습니까?',
			btnUse: 'Y',
			callback: function (isOk) {
				if (!isOk) {
					return;
				}
				HttpUtil.post(p.url, payload, function (res) {
					editor.markClean();
					UIUtil.alert({
						msg: p.successMsg || '저장되었습니다.',
						callback: function () {
							if (typeof p.onSuccess === 'function') {
								p.onSuccess(res);
							}
						}
					});
				});
			}
		});
	};

	/**
	 * 삭제 : 확인창 → 서버 요청 → 완료 알림 → onSuccess
	 * @param {Object} p
	 * @param {string} p.url
	 * @param {Object} p.data  PK 등 (예: { edtrNo: 1 })
	 * @param {string} [p.confirmMsg]  기본 '정말 삭제하시겠습니까?'
	 * @param {string} [p.successMsg]  기본 '삭제되었습니다.'
	 * @param {Function} [p.onSuccess]
	 */
	const remove = function (p) {
		if (!p || !p.url) {
			console.error('[EditorUtil.remove] url 은 필수입니다.');
			return;
		}
		UIUtil.confirm({
			msg: p.confirmMsg || '정말 삭제하시겠습니까?',
			btnUse: 'Y',
			callback: function (isOk) {
				if (!isOk) {
					return;
				}
				HttpUtil.post(p.url, p.data || {}, function (res) {
					UIUtil.alert({
						msg: p.successMsg || '삭제되었습니다.',
						callback: function () {
							if (typeof p.onSuccess === 'function') {
								p.onSuccess(res);
							}
						}
					});
				});
			}
		});
	};

	/* ========================================================================
	   6. 공개 API
	   ======================================================================== */
	return {
		VERSION: VERSION,
		PROFILES: PROFILES,
		ready: ready,
		readyCss: readyCss,
		create: create,
		field: field,
		get: get,
		destroyAll: destroyAll,
		save: save,
		remove: remove,
		render: render,
		clean: clean,
		isEmptyHtml: isEmptyHtml,
		textToHtml: textToHtml,
		byteLength: byteLength
	};
})();
