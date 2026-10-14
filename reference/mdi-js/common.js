/**
 * 글로벌 AJAX 에러 핸들러 (common.js)
 */
$(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
    
    // [퍼블리셔 UI 알럿 가상 함수] - 실제 퍼블리셔가 제공한 함수명으로 변경하세요.
    // 예: ui.alert(메시지, 확인버튼클릭시_콜백함수);
    const customAlert = function(msg, callback) {
        // 임시로 브라우저 기본 alert 사용, 이후 퍼블리셔 함수로 교체
        alert(msg); 
        if (typeof callback === 'function') callback();
    };

    // 1. 세션 만료 (Unauthorized)
    if (jqXHR.status === 401) {
        // 알럿 창의 [확인] 버튼을 누른 후 콜백으로 페이지 이동 실행
        customAlert("세션이 만료되었습니다. 안전하게 다시 로그인해 주세요.", function() {
            top.location.href = '/login.do'; 
        });
    } 
    // 2. 권한 없음 (Forbidden)
    else if (jqXHR.status === 403) {
        customAlert("해당 기능을 실행할 권한이 없습니다.");
    } 
    // 3. 서버 내부 오류 (Internal Server Error)
    else if (jqXHR.status === 500) {
        customAlert("서버 통신 중 오류가 발생했습니다.\n관리자에게 문의하세요.");
    } 
    // 4. 네트워크 단절 또는 타임아웃
    else if (jqXHR.status === 0) {
        customAlert("네트워크 연결이 끊어졌거나 서버가 응답하지 않습니다.");
    } 
    // 5. 기타 에러
    else {
        customAlert("알 수 없는 오류가 발생했습니다. (Code: " + jqXHR.status + ")");
    }
});