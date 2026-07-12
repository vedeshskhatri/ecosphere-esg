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
}
export default ForecastEngine;
