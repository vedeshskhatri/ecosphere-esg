export interface ForecastPoint {
  month: string;
  co2Kg: number;
  isForecast: boolean;
}

export class ForecastEngine {
  /**
   * Performs simple linear regression forecasting on historical carbon emissions.
   * Calculates y = m * x + c, then projects future months.
   */
  static generateForecast(historicalData: { month: string; total: number }[]): ForecastPoint[] {
    if (historicalData.length === 0) {
      return [];
    }

    const n = historicalData.length;
    
    // Convert data to points (x is month index, y is CO2 value)
    const points = historicalData.map((d, index) => ({
      x: index,
      y: d.total,
      label: d.month
    }));

    // Linear Regression Calculations:
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      sumX += points[i].x;
      sumY += points[i].y;
      sumXY += points[i].x * points[i].y;
      sumXX += points[i].x * points[i].x;
    }

    // slope (m) and intercept (c)
    // formula: m = (n*sumXY - sumX*sumY) / (n*sumXX - sumX*sumX)
    // formula: c = (sumY - m*sumX) / n
    const denominator = n * sumXX - sumX * sumX;
    
    let slope = 0;
    let intercept = 0;

    if (denominator !== 0) {
      slope = (n * sumXY - sumX * sumY) / denominator;
      intercept = (sumY - slope * sumX) / n;
    } else {
      // Fallback if we only have 1 data point or equal X values
      slope = 0;
      intercept = sumY / n;
    }

    // Build complete list (historical + 3 forecasted months)
    const result: ForecastPoint[] = historicalData.map((d) => ({
      month: d.month,
      co2Kg: d.total,
      isForecast: false
    }));

    // Project next 3 months
    const lastDateParts = historicalData[n - 1].month.split(' ');
    const lastMonthStr = lastDateParts[0];
    const lastYear = parseInt(lastDateParts[1]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let lastMonthIndex = monthNames.indexOf(lastMonthStr);

    for (let i = 1; i <= 3; i++) {
      const forecastX = n - 1 + i;
      let projectedY = slope * forecastX + intercept;
      
      // Clamp projected values to not go below zero (emissions can't be negative)
      if (projectedY < 0) projectedY = 0;

      // Calculate next month label
      lastMonthIndex = (lastMonthIndex + 1) % 12;
      const nextYear = lastMonthIndex === 0 ? lastYear + 1 : lastYear;
      const forecastLabel = `${monthNames[lastMonthIndex]} ${nextYear}`;

      result.push({
        month: forecastLabel,
        co2Kg: Math.round(projectedY * 100) / 100, // round to 2 decimal places
        isForecast: true
      });
    }

    return result;
  }

  /**
   * Detects emission anomalies (sudden spikes > 30% above the rolling average of the past 3 months).
   */
  static detectAnomalies(historicalData: { month: string; total: number }[]) {
    const result: { month: string; total: number; rollingAvg: number; deviationPercent: number; isAnomaly: boolean }[] = [];

    for (let i = 0; i < historicalData.length; i++) {
      const current = historicalData[i];
      let rollingAvg = 0;
      let count = 0;

      // Calculate rolling average of the preceding 3 months
      for (let j = Math.max(0, i - 3); j < i; j++) {
        rollingAvg += historicalData[j].total;
        count++;
      }

      rollingAvg = count > 0 ? rollingAvg / count : current.total;

      const deviationPercent = rollingAvg > 0 ? ((current.total - rollingAvg) / rollingAvg) * 100 : 0;
      const isAnomaly = i >= 3 && deviationPercent > 30; // only flag after at least 3 months history

      result.push({
        month: current.month,
        total: Math.round(current.total * 100) / 100,
        rollingAvg: Math.round(rollingAvg * 100) / 100,
        deviationPercent: Math.round(deviationPercent * 10) / 10,
        isAnomaly,
      });
    }

    return result;
  }

  /**
   * Generates tailored actionable recommendations based on department goal performance.
   */
  static generateRecommendations(departmentGoals: { departmentName: string; departmentCode: string; currentCo2: number; targetCo2: number }[]) {
    return departmentGoals.map((dept) => {
      const current = Number(dept.currentCo2);
      const target = Number(dept.targetCo2);
      
      const deviationPercent = target > 0 ? ((current - target) / target) * 100 : 0;
      const deviationText = deviationPercent > 0 ? `${deviationPercent.toFixed(0)}% above` : `${Math.abs(deviationPercent).toFixed(0)}% below`;
      
      let recommendation = '';

      if (deviationPercent > 0) {
        // High emissions recommendations based on dept code
        switch (dept.departmentCode) {
          case 'MFG':
            recommendation = `Manufacturing dept is ${deviationText} target — upgrading to high-efficiency induction furnaces would reduce carbon footprint by ~22 tCO₂.`;
            break;
          case 'LOG':
            recommendation = `Logistics dept is ${deviationText} target — switching 30% of the fleet vehicles to electric models would reduce footprint by ~18 tCO₂.`;
            break;
          case 'COR':
            recommendation = `Corporate dept is ${deviationText} target — implementing automated HVAC controls and smart LED sensors would reduce footprint by ~3.5 tCO₂.`;
            break;
          default:
            recommendation = `${dept.departmentName} dept is ${deviationText} target — conducting a waste stream audit is recommended to identify reduction potential.`;
        }
      } else {
        // Performing well recommendations
        switch (dept.departmentCode) {
          case 'MFG':
            recommendation = `Manufacturing is performing well (${deviationText} target). Recommend auditing raw material suppliers to expand Scope 3 offsets.`;
            break;
          case 'LOG':
            recommendation = `Logistics is performing well (${deviationText} target). Recommend optimizing route planning algorithm to lock in these emission cuts.`;
            break;
          default:
            recommendation = `${dept.departmentName} is performing well (${deviationText} target). Maintain current sustainability guidelines and log positive offsets.`;
        }
      }

      return {
        departmentName: dept.departmentName,
        departmentCode: dept.departmentCode,
        currentCo2: Math.round(current * 100) / 100,
        targetCo2: Math.round(target * 100) / 100,
        deviationPercent: Math.round(deviationPercent * 10) / 10,
        recommendation,
      };
    });
  }
}
export default ForecastEngine;
