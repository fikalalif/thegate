/**
 * Dynamic Moving Average Latency & Health Penalizer
 * Calculates recent model performance and penalizes unstable or slow models.
 */

const db = require("../db/index");

function getModelHealthStats() {
  try {
    const rows = db.all(`
      SELECT
        m.backend_model_id,
        m.internal_name,
        COUNT(r.id) as recent_count,
        SUM(CASE WHEN r.status = 'failed' THEN 1 ELSE 0 END) as failure_count,
        AVG(r.total_duration_ms) as avg_latency_ms
      FROM requests r
      JOIN models_registry m ON r.selected_model_id = m.id
      WHERE r.timestamp >= datetime('now', '-2 hours')
      GROUP BY m.backend_model_id
    `);

    const healthMap = new Map();
    for (const row of rows) {
      const failureRate = row.recent_count > 0 ? row.failure_count / row.recent_count : 0;
      const avgLatency = row.avg_latency_ms || 200;

      // Penalty score: higher means worse
      let penalty = 0;
      if (failureRate >= 0.5) penalty += 50;
      else if (failureRate > 0) penalty += 20;

      if (avgLatency > 20000) penalty += 30;
      else if (avgLatency > 10000) penalty += 15;

      healthMap.set(row.backend_model_id, {
        failureRate,
        avgLatency,
        penalty,
      });
    }

    return healthMap;
  } catch {
    return new Map();
  }
}

module.exports = {
  getModelHealthStats,
};
