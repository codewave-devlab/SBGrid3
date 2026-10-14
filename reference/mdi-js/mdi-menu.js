/**
 * ============================================================================
 * [mdi-menu.js]
 * MDI 프로젝트 메뉴관리
 * ============================================================================
 */

const mdiMenu = {
    /**
     * 메뉴 초기화
     */
    init: function (rawMenuList) {
        this._processAndRender(rawMenuList || []);
    },
    _processAndRender: function (menuList) {
        const container = document.querySelector('.gnb-menu');

        if (!container) {
            console.error('[MDI] 메뉴 대상 컨테이너를 찾을 수 없습니다.');
            return;
        }
        const rootParentId = '10000000';
        const treeData = this._buildTree(menuList, rootParentId);
        container.innerHTML = this._render1Depth(treeData);
		
		if(typeof krds_pcGnb !== 'undefined' && typeof krds_pcGnb.init === 'function'){
	            krds_pcGnb.init();
		}
    },
    _buildTree: function (menuList, parentId) {
        if (!Array.isArray(menuList)) return [];

        return menuList
            .filter((item) => {
                const pId = item.prntMenuId;
                return String(pId) === String(parentId);
            })
            .map((item) => {
                const currentId = String(item.menuId);
                const prgrmId = item.prgrmId ?? '';
                const url = item.url;

                return {
                    menuId: currentId,
                    menuNm: item.menuNm,
                    prgrmId: prgrmId,
                    lastLevelYn: item.lastLevelYn,
                    url: url,
					menuPath: item.menuPath,
					topMenuId: item.topMenuId,
                    children: this._buildTree(menuList, currentId)
                };
            });
    },
    _render1Depth: function (nodes) {
        return nodes
            .map((node) => {
                const hasSub = node.children && node.children.length > 0;
                return `
			<li>
	            <button type="button" class="gnb-main-trigger" id=${node.topMenuId} data-trigger="gnb" data-menuId="${node.topMenuId}">${node.menuNm}</button>
				${
                    hasSub
                        ? `
					<!-- gnb-toggle-wrap -->
		            <div class="gnb-toggle-wrap">
		                <!-- gnb-main-list -->
		                <div class="gnb-main-list" data-has-submenu="true">
		                    <ul>
		                        ${this._render2Depth(node.children)}                                                                                 
		                    </ul>
		                </div>
		                <!-- //gnb-main-list -->
		            </div>
		            <!-- //gnb-toggle-wrap -->
					`: ''}
	        </li>
			`;
            })
            .join('');
    },
    _render2Depth: function (nodes) {
        return nodes
            .map((node) => {
                const isLeaf = node.lastLevelYn === 'Y' || (!node.children && node.children.length === 0);

                if (!isLeaf) {
                    //3뎁스 자식이 있음
                    return `
					<li>
						<button type="button" class="gnb-sub-trigger arr" data-trigger="gnb">${node.menuNm}</button>
						<!-- gnb-sub-list -->
                        <div class="gnb-sub-list">
                            <ul>
                                ${this._render3Depth(node.children)}
                            </ul>
                        </div>
                        <!-- //gnb-sub-list -->
				`;
                } else {
                    //2뎁스 단독 실행
                    return `
					<li>
                    	<a href="#" class="gnb-sub-trigger" onclick="MdiManager.add('${node.menuNm}', '${node.url}', '', '${node.prgrmId}', '${node.menuId}')">${node.menuNm}</a>
					</li>
				`;
                }
            })
            .join('');
    },
    _render3Depth: function (nodes) {
        return nodes
            .map((node) => {
                return `
				<li>
                	<a href="#" onclick="MdiManager.add('${node.menuNm}', '${node.url}', '', '${node.prgrmId}', '${node.menuId}')">${node.menuNm}</a>
				</li>
			`;
            })
            .join('');
    }
};
