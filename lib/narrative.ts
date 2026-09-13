import type { IndicatorKey, NationalStats, RegionAnalysis } from "./types";

const INDICATOR_LABEL: Record<IndicatorKey, string> = {
  emergencyRI: "응급의료서비스 관내의료이용률(RI)",
  emergencyTransferRate: "중증응급환자 전원율",
  deliveryRI: "분만 입원서비스 관내의료이용률(RI)",
  deliveryFacilityRate: "분만가능기관 수",
  pediatricRI: "소아청소년입원 관내의료이용률(RI)",
  pediatricSpecialistRate: "소아청소년과 전문의 수",
};

function fmt(n: number): string {
  return n.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function ratio(a: number, b: number): string {
  if (b <= 0) return "-";
  return fmt(a / b);
}

function missingNote(region: RegionAnalysis, keys: IndicatorKey[]): string {
  const missing = keys.filter((k) => region.missingIndicators.includes(k));
  if (missing.length === 0) return "";
  return `(참고: ${missing.map((k) => INDICATOR_LABEL[k]).join(", ")}은(는) 관련 의료서비스 이용·제공 실적 자체가 없어 통계 산출이 불가능했던 항목으로, 취약 판정에 보수적으로 반영됨) `;
}

export function buildNarrative(
  region: RegionAnalysis,
  sidoStats: NationalStats,
  nationalStats: NationalStats
): string {
  const lines: string[] = [];

  lines.push("□ 추진 배경 및 필요성 (필수의료 인프라 분석)");
  lines.push("  ※ 자료: 국립중앙의료원, 「2024 지역별 공공보건의료 통계」");

  // 1. 응급의료서비스 관내의료이용률(RI)
  const emgNote = missingNote(region, ["emergencyRI"]);
  if (region.emergencyRI < 30) {
    lines.push(
      `  ○ (응급의료 자체충족 부족) ${emgNote}${region.sigunguName}의 중증응급환자 응급의료서비스 관내의료이용률(RI)은 ${fmt(
        region.emergencyRI
      )}%로, 관내 중증응급환자 대부분이 타 지역 의료기관을 이용하고 있어 응급의료 자원 확충이 시급함. (전국 평균 ${fmt(nationalStats.emergencyRI)}%, ${region.sidoName} 평균 ${fmt(sidoStats.emergencyRI)}%)`
    );
  } else {
    lines.push(
      `  ○ (응급의료 자체충족 양호) 중증응급환자 응급의료서비스 관내의료이용률(RI)은 ${fmt(
        region.emergencyRI
      )}%로 전국 평균(${fmt(nationalStats.emergencyRI)}%) 대비 양호한 수준이나, 지속적인 모니터링이 필요함.`
    );
  }

  // 2. 전원율
  if (region.emergencyTransferRate > 5) {
    lines.push(
      `  ○ (응급 후송·전원 부담) 중증응급환자 전원율이 ${fmt(
        region.emergencyTransferRate
      )}%로 전국 평균(${fmt(nationalStats.emergencyTransferRate)}%) 대비 ${ratio(region.emergencyTransferRate, nationalStats.emergencyTransferRate)}배 높아, 관내 응급의료기관의 중증환자 최종 치료 역량 보강이 필요함.`
    );
  }

  // 3. 분만 RI + 인프라
  const matNote = missingNote(region, ["deliveryRI", "deliveryFacilityRate"]);
  if (region.deliveryRI < 30 || region.deliveryFacilityRate < 1.0) {
    lines.push(
      `  ○ (분만·모자의료 인프라 결핍) ${matNote}분만 입원서비스 관내의료이용률(RI)이 ${fmt(
        region.deliveryRI
      )}%, 분만가능기관 수가 출생아 1천 명당 ${fmt(
        region.deliveryFacilityRate
      )}개소로 전국 평균(RI ${fmt(nationalStats.deliveryRI)}%, ${fmt(nationalStats.deliveryFacilityRate)}개소) 대비 열악하여, 관내 분만 인프라 확충 및 산모·신생아 의료공백 해소가 시급함.`
    );
  } else {
    lines.push(
      `  ○ (분만·모자의료 인프라 양호) 분만 입원서비스 관내의료이용률(RI) ${fmt(
        region.deliveryRI
      )}%, 분만가능기관 수 출생아 1천 명당 ${fmt(region.deliveryFacilityRate)}개소로 전국 평균 대비 양호한 수준임.`
    );
  }

  // 4. 소아 RI + 전문의
  const pedNote = missingNote(region, ["pediatricRI", "pediatricSpecialistRate"]);
  if (region.pediatricRI < 30 || region.pediatricSpecialistRate < 40) {
    lines.push(
      `  ○ (소아 필수의료 공급 부족) ${pedNote}소아청소년입원 관내의료이용률(RI)이 ${fmt(
        region.pediatricRI
      )}%, 소아청소년과 전문의 수가 소아인구 10만 명당 ${fmt(
        region.pediatricSpecialistRate
      )}명으로 전국 평균(${fmt(nationalStats.pediatricSpecialistRate)}명) 대비 부족하여, 소아 필수의료 공급체계 보강이 필요함.`
    );
  } else {
    lines.push(
      `  ○ (소아 필수의료 공급 양호) 소아청소년입원 관내의료이용률(RI) ${fmt(
        region.pediatricRI
      )}%, 소아청소년과 전문의 수 소아인구 10만 명당 ${fmt(region.pediatricSpecialistRate)}명으로 전국 평균 대비 양호한 수준임.`
    );
  }

  lines.push("");
  lines.push("□ 3대 필수의료 취약 부문 진단 결과");
  lines.push(
    `  ○ (응급의료) ${
      region.isEmergencyVulnerable
        ? "관내의료이용률(RI) 30% 미만 또는 중증응급환자 전원율 5% 초과 기준에 해당하여 [응급의료 취약지역]으로 분류됨."
        : "관내의료이용률(RI) 및 전원율 기준을 모두 충족하여 양호한 수준임."
    }`
  );
  lines.push(
    `  ○ (분만·모자의료) ${
      region.isDeliveryVulnerable
        ? "관내의료이용률(RI) 30% 미만 또는 분만가능기관 수(출생아 1천명당) 1.0개소 미만 기준에 해당하여 [분만취약지역]으로 분류됨."
        : "관내의료이용률(RI) 및 분만가능기관 수 기준을 모두 충족하여 양호한 수준임."
    }`
  );
  lines.push(
    `  ○ (소아·중증진료) ${
      region.isPediatricVulnerable
        ? "관내의료이용률(RI) 30% 미만 또는 소아청소년과 전문의 수(소아인구 10만명당) 40명 미만 기준에 해당하여 [소아의료취약지역]으로 분류됨."
        : "관내의료이용률(RI) 및 소아청소년과 전문의 수 기준을 모두 충족하여 양호한 수준임."
    }`
  );

  lines.push("");
  lines.push("□ 종합 판정");
  const gradeLabelMap: Record<RegionAnalysis["grade"], string> = {
    safe: "정상",
    caution: "관찰 필요",
    vulnerable: "취약",
    critical: "심각",
  };
  lines.push(
    `  ○ ${region.sigunguName}은 3대 필수의료 부문 중 ${region.vulnerableCount}개 부문에서 취약 기준에 해당하여 종합적으로 [${gradeLabelMap[region.grade]}] 등급으로 진단되며, 공공의료 지원사업 추진 시 우선 검토가 필요함.`
  );
  lines.push(
    "  ※ 본 판정 기준(RI 30%, 전원율 5%, 분만가능기관 1.0개소, 소아전문의 40명)은 2024년 전국 시·군·구 실측 분포를 바탕으로 본 플랫폼이 자체 설정한 분석 기준이며, 보건복지부의 공식 고시 기준이 아님."
  );

  return lines.join("\n");
}
