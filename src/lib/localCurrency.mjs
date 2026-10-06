/**
 * 영어판 본문의 "(about $9)" 를 방문자 지역 통화로 바꿔 보여 주는 로직.
 * 유입 상위 국가(싱가포르·홍콩·말레이시아) 독자를 위한 것이다.
 *
 * 환율은 고정값이다. 글의 기준(1,000원 ≈ $0.75)에서 미국 달러로 바꾼 값에
 * 아래 배율을 곱한다. 2026년 10월 기준 대략치이며, 본문은 원래 "about" 으로 쓰여 있다.
 */
export const CURRENCIES = {
  SGD: { perUsd: 1.3, prefix: 'S$' },
  HKD: { perUsd: 7.8, prefix: 'HK$' },
  MYR: { perUsd: 4.3, prefix: 'RM' },
};

/** 브라우저 시간대로 통화를 고른다. 해당이 없으면 null(미국 달러 그대로). */
export function currencyForTimeZone(tz) {
  if (tz === 'Asia/Singapore') return 'SGD';
  if (tz === 'Asia/Hong_Kong') return 'HKD';
  if (tz === 'Asia/Kuala_Lumpur' || tz === 'Asia/Kuching') return 'MYR';
  return null;
}

/** 금액을 읽기 좋게 반올림한다: 10 미만은 소수 첫째 자리, 그 이상은 정수. */
export function formatAmount(value) {
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

const PATTERN = /\(about \$([\d,]+(?:\.\d+)?)( million)?\)/g;

/** 문자열 안의 "(about $N)" / "(about $N million)" 을 지정 통화로 바꾼다. */
export function convertText(text, code) {
  const cur = CURRENCIES[code];
  if (!cur) return text;
  return text.replace(PATTERN, (_, usd, million) => {
    const value = parseFloat(usd.replace(/,/g, '')) * cur.perUsd;
    // 백만 단위는 정수로 깎으면 차이가 커서 소수 첫째 자리까지 둔다
    const shown = million ? (Math.round(value * 10) / 10).toLocaleString('en-US') : formatAmount(value);
    return `(about ${cur.prefix}${shown}${million ?? ''})`;
  });
}
