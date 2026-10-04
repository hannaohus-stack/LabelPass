/**
 * 시나리오 2 DOM 체크 스니펫
 * 브라우저 개발자 도구 Console에 그대로 붙여넣어 실행
 *
 * 전제: Step2 화면에서 "땅콩버터", "간장", "설탕" 입력 완료 후 실행
 */

(function checkScenario2() {
  const results = {}

  // ── 알레르겐 박스 존재 여부
  const allergenBox = Array.from(document.querySelectorAll('div')).find(
    el => el.textContent?.includes('알레르기 유발 물질 감지됨')
  )
  results.allergenBoxVisible = !!allergenBox
  results.allergenNames = allergenBox
    ? allergenBox.querySelector('p.font-kr.text-\\[14px\\]')?.textContent?.trim() ?? '(텍스트 추출 실패)'
    : null

  // ── 복합원재료 박스 존재 여부
  const compositeBox = Array.from(document.querySelectorAll('div')).find(
    el => el.textContent?.includes('복합원재료 표시 필요')
  )
  results.compositeBoxVisible = !!compositeBox
  results.compositeItems = compositeBox
    ? Array.from(compositeBox.querySelectorAll('p')).map(p => p.textContent?.trim()).filter(Boolean)
    : []

  // ── 결과 출력
  console.group('%c[시나리오 2] DOM 체크 결과', 'color:#0CA4F9;font-weight:bold;font-size:14px')

  console.log(
    `%c알레르겐 박스: ${results.allergenBoxVisible ? '✅ 존재' : '❌ 없음'}`,
    `color:${results.allergenBoxVisible ? '#15803d' : '#B30000'};font-weight:bold`
  )
  if (results.allergenNames) console.log('  감지된 물질:', results.allergenNames)

  console.log(
    `%c복합원재료 박스: ${results.compositeBoxVisible ? '✅ 존재' : '❌ 없음'}`,
    `color:${results.compositeBoxVisible ? '#15803d' : '#B30000'};font-weight:bold`
  )
  if (results.compositeItems.length > 0) {
    console.log('  감지된 항목:')
    results.compositeItems.forEach(t => console.log('   ', t))
  }

  const pass = results.allergenBoxVisible && results.compositeBoxVisible
  console.log(
    `%c\n동시 표시: ${pass ? '✅ PASS' : '❌ FAIL'}`,
    `color:${pass ? '#15803d' : '#B30000'};font-weight:bold;font-size:13px`
  )

  console.groupEnd()
  return results
})()
