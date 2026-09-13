import type { NationalStats, RegionAnalysis } from "./types";

function fmt(n: number): string {
  return n.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function ratio(a: number, b: number): string {
  if (b <= 0) return "-";
  return fmt(a / b);
}

export function buildNarrative(
  region: RegionAnalysis,
  sidoStats: NationalStats,
  nationalStats: NationalStats
): string {
  const lines: string[] = [];

  lines.push("□ 추진 배경 및 필요성 (필수의료 인프라 분석)");

  // 1. 지역 내 의료접근성 한계 (응급 60분 미도달)
  const emgRatio = ratio(region.emergencyUncovered60, nationalStats.emergencyUncovered60);
  lines.push(
    `  ○ (지역 내 의료접근성 한계) ${region.sigunguName}은 권역응급의료센터 60분 이내 미도달 인구 비율이 ${fmt(
      region.emergencyUncovered60
    )}%에 달하여 전국 평균(${fmt(nationalStats.emergencyUncovered60)}%) 대비 ${emgRatio}배 ${
      region.emergencyUncovered60 >= nationalStats.emergencyUncovered60 ? "높은" : "낮은"
    } 수준을 보임.`
  );

  // 2. 법정 기준 충족 여부 (RI)
  if (region.emergencyRI < 30) {
    lines.push(
      `  ○ (법정 기준 충족 여부) 보건복지부 필수의료 취약지 고시 기준에 의거, 관내 의료이용률(RI)이 ${fmt(
        region.emergencyRI
      )}%로 기준치(30%)를 하회하여 [응급의료 취약지역]으로 분류됨.`
    );
  } else {
    lines.push(
      `  ○ (법정 기준 충족 여부) 관내 의료이용률(RI)은 ${fmt(
        region.emergencyRI
      )}%로 보건복지부 고시 기준치(30%)를 상회하고 있으나, 지속적인 모니터링을 통한 관리가 필요함.`
    );
  }

  // 3. 모자·소아 인프라 결핍
  const maternalPediatricAvgRegion = (region.deliveryInfraIndex + region.pediatricAccessIndex) / 2;
  const maternalPediatricAvgSido = (sidoStats.deliveryInfraIndex + sidoStats.pediatricAccessIndex) / 2;
  const infraPctOfSido =
    maternalPediatricAvgSido > 0
      ? (maternalPediatricAvgRegion / maternalPediatricAvgSido) * 100
      : 100;
  lines.push(
    `  ○ (모자·소아 인프라 결핍) 가임기 여성 및 소아 대상 야간·휴일 응급 대응 인프라 지수가 시·도 평균 대비 ${fmt(
      infraPctOfSido
    )}% 수준에 머물러 의료공백 해소를 위한 공공의료 지원체계 구축이 시급함.`
  );

  lines.push("");
  lines.push("□ 3대 필수의료 취약 부문 진단 결과");
  lines.push(
    `  ○ (응급의료) ${region.isEmergencyVulnerable ? "60분 미도달 인구 비율 또는 의료이용률(RI) 기준을 충족하지 못해 [응급의료 취약지역]에 해당함." : "60분 미도달 인구 비율 및 의료이용률(RI) 기준을 모두 충족하여 양호한 수준임."}`
  );
  lines.push(
    `  ○ (분만·모자의료) ${
      region.isDeliveryVulnerable
        ? `분만실 60분 미도달 인구 비율 ${fmt(region.deliveryUncovered60)}% 또는 분만 인프라 지수 ${fmt(region.deliveryInfraIndex)}%가 기준을 하회하여 [분만취약지역]에 해당함.`
        : `분만실 접근성 및 분만 인프라 지수가 기준을 충족하여 양호한 수준임.`
    }`
  );
  lines.push(
    `  ○ (소아·중증진료) ${
      region.isPediatricVulnerable
        ? `기준 병상 대비 소아 병상 공급 비율이 ${fmt(region.pediatricBedRatio)}%로 기준치(60%)를 하회하여 [소아의료취약지역]에 해당함.`
        : `기준 병상 대비 소아 병상 공급 비율이 ${fmt(region.pediatricBedRatio)}%로 기준을 충족하여 양호한 수준임.`
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

  return lines.join("\n");
}
