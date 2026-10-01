// 스트리밍 중인(아직 미완성인) 응답 텍스트를 코드 탭에 보여줄 형태로 다듬는다.
// 완성본 정규화는 서버(stripCodeFences, ensureRenderCall)가 하고, 여기서는 보기 좋게만 만든다.
export function toStreamingDisplay(partial: string): string {
  // 첫 줄이 아직 펜스 조각(`, ```, ```js 등)뿐이면 줄바꿈이 올 때까지 숨긴다.
  if (/^`{1,3}\w*$/.test(partial)) return '';
  return partial.replace(/^```\w*\n/, '').replace(/\n`{1,3}$/, '\n');
}
