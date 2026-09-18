import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";
import {
  Users,
  ClipboardList,
  Percent,
  BadgeCheck,
  Radar as RadarIcon,
  Activity,
  Layers,
  Radio,
  MapPin,
  Clock3,
  RefreshCw
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import StatCard from "../components/StatCard.jsx";
import { Loading, ErrorState, SampleDataBanner } from "../components/DataState.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { isLiveMode } from "../api/client.js";
import * as api from "../api/client.js";

const GO = "#6da356";
const STOP = "#c4573a";
const ICON_PEACH = "#db9f75";
const ICON_EMBER = "#a75a1d";
const ICON_OLIVE = "#6e7261";
const ICON_COCOA = "#3e2411";

// One colour per training module, reused by the pass-rate area chart's
// lines/gradients. Keys match shortLabel() output below, and the list is
// what the chart iterates over — if Person 2's /api/modules ever returns a
// fourth module, add one entry here and it renders with no other changes.
const MODULE_SERIES = [
  { key: "Fire", color: "#a75a1d" },
  { key: "Gas", color: "#db9f75" },
  { key: "Bonus", color: "#6e7261" }
];

function splitTrend(items, dateKey = "completedAt") {
  // Deterministic "recent vs earlier" comparison over the loaded sample —
  // illustrative of what a real trend chip would show once there's enough
  // live data for a proper week-over-week comparison.
  if (items.length < 4) return null;
  const sorted = [...items].sort((a, b) => new Date(a[dateKey]) - new Date(b[dateKey]));
  const mid = Math.floor(sorted.length / 2);
  return { older: sorted.slice(0, mid), recent: sorted.slice(mid) };
}

function countTrend(items) {
  const split = splitTrend(items);
  if (!split) return null;
  const delta = split.recent.length - split.older.length;
  if (delta === 0) return null;
  const pct = Math.round((Math.abs(delta) / Math.max(split.older.length, 1)) * 100);
  return { direction: delta > 0 ? "up" : "down", label: `${pct}% vs earlier` };
}

function passRateTrend(items) {
  const split = splitTrend(items);
  if (!split) return null;
  const rate = (arr) => (arr.length ? Math.round((arr.filter((a) => a.status === "pass").length / arr.length) * 100) : 0);
  const delta = rate(split.recent) - rate(split.older);
  if (delta === 0) return null;
  return { direction: delta > 0 ? "up" : "down", label: `${Math.abs(delta)} pts vs earlier` };
}

export default function Overview() {
  const { t } = useLanguage();
  const [state, setState] = useState({
    status: "loading",
    summary: null,
    attempts: [],
    workers: [],
    modules: [],
    certificates: [],
    source: "mock"
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [summaryRes, attemptsRes, workersRes, modulesRes, certsRes] = await Promise.all([
          api.getSummary(),
          api.getAttempts(),
          api.getWorkers(),
          api.getModules(),
          api.getCertificates()
        ]);
        if (cancelled) return;
        setState({
          status: "ready",
          summary: summaryRes.data,
          attempts: attemptsRes.data,
          workers: workersRes.data,
          modules: modulesRes.data,
          certificates: certsRes.data,
          source: summaryRes.source
        });
      } catch (e) {
        if (!cancelled) setState((s) => ({ ...s, status: "error" }));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Short axis label so three full module names don't collide.
  const shortLabel = (name = "") =>
    /gas/i.test(name) ? "Gas" : /bonus|jharkhand/i.test(name) ? "Bonus" : "Fire";

  // AREA CHART — cumulative pass rate (%) per training module, by day.
  //
  // Each point is that module's pass rate across every attempt logged up to
  // and including that day, so the line is a running quality trend rather
  // than a noisy per-day ratio (with a handful of attempts a day, a raw
  // daily rate swings between 0 and 100 and tells you nothing).
  // Days before a module has any attempt are left null, so the area simply
  // starts when that module goes live instead of drawing a false 0%.
  const modulePassRateSeries = React.useMemo(() => {
    if (state.attempts.length === 0 || state.modules.length === 0) return [];
    const dayKey = (iso) => new Date(iso).toISOString().slice(0, 10);

    const attemptDays = [...new Set(state.attempts.map((a) => dayKey(a.completedAt)))].sort();
    const start = new Date(attemptDays[0]);
    const end = new Date(attemptDays[attemptDays.length - 1]);

    const allDays = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      allDays.push(d.toISOString().slice(0, 10));
    }

    // Running totals per module, carried forward across days.
    const running = {};
    state.modules.forEach((m) => {
      running[m.id] = { passed: 0, total: 0 };
    });

    return allDays.map((key) => {
      state.attempts
        .filter((a) => dayKey(a.completedAt) === key)
        .forEach((a) => {
          if (!running[a.moduleId]) running[a.moduleId] = { passed: 0, total: 0 };
          running[a.moduleId].total += 1;
          if (a.status === "pass") running[a.moduleId].passed += 1;
        });

      const row = {
        day: new Date(key).toLocaleDateString(undefined, { day: "numeric", month: "short" })
      };
      state.modules.forEach((m) => {
        const r = running[m.id];
        row[shortLabel(m.name)] = r.total ? Math.round((r.passed / r.total) * 100) : null;
      });
      return row;
    });
  }, [state.attempts, state.modules]);

  // RADAR CHART — pass vs fail share per module. Pass + Fail always totals
  // 100% on each axis, so the shape reads directly as "how much of this
  // module's activity is passing".
  const radarData = React.useMemo(() => {
    return state.modules.map((m) => {
      const moduleAttempts = state.attempts.filter((a) => a.moduleId === m.id);
      const passed = moduleAttempts.filter((a) => a.status === "pass").length;
      const pass = moduleAttempts.length ? Math.round((passed / moduleAttempts.length) * 100) : 0;
      return {
        module: shortLabel(m.name),
        fullName: m.name,
        Pass: pass,
        Fail: moduleAttempts.length ? 100 - pass : 0,
        attempts: moduleAttempts.length
      };
    });
  }, [state.modules, state.attempts]);

  // Which module currently has the highest overall pass rate — used in the
  // area chart's subtitle ("Fire and Explosion Response leading at 71%").
  // This was accidentally dropped in a previous edit while removing the
  // old gauge chart's data, which is what caused the ReferenceError.
  const strongestModule = React.useMemo(
    () => radarData.reduce((best, m) => (m.attempts > 0 && m.Pass > (best?.Pass ?? -1) ? m : best), null),
    [radarData]
  );

  const passCount = state.attempts.filter((a) => a.status === "pass").length;
  const failCount = state.attempts.filter((a) => a.status === "fail").length;
  const totalAttempts = state.attempts.length;
  const passPct = totalAttempts ? Math.round((passCount / totalAttempts) * 100) : 0;
  const failPct = totalAttempts ? 100 - passPct : 0;
  const syncedCount = state.attempts.filter((a) => a.syncState === "synced").length;
  const syncedPct = totalAttempts ? Math.round((syncedCount / totalAttempts) * 100) : 0;
  const engagedWorkerIds = new Set(state.attempts.map((a) => a.workerId));
  const engagedPct = state.workers.length ? Math.round((engagedWorkerIds.size / state.workers.length) * 100) : 0;
  const validCertCount = state.certificates.filter((c) => c.status === "valid").length;
  const certifiedPct = passCount ? Math.round((validCertCount / passCount) * 100) : 0;

  const moduleCompletion = React.useMemo(() => {
    const colors = [ICON_EMBER, ICON_PEACH, ICON_OLIVE];
    return state.modules.map((m, i) => {
      const passesForModule = state.attempts.filter((a) => a.moduleId === m.id && a.status === "pass");
      const uniqueWorkersPassed = new Set(passesForModule.map((a) => a.workerId)).size;
      const pct = state.workers.length ? Math.round((uniqueWorkersPassed / state.workers.length) * 100) : 0;
      return { name: m.name, pct, color: colors[i % colors.length] };
    });
  }, [state.modules, state.attempts, state.workers]);

  const siteBreakdown = React.useMemo(() => {
    const bySite = {};
    state.workers.forEach((w) => {
      if (w.site) bySite[w.site] = (bySite[w.site] || 0) + 1;
    });
    const max = Math.max(1, ...Object.values(bySite));
    const palette = [ICON_PEACH, ICON_EMBER, ICON_OLIVE, "#efc9a8", ICON_COCOA];
    return Object.entries(bySite)
      .sort((a, b) => b[1] - a[1])
      .map(([site, count], i) => ({ site, count, pct: Math.round((count / max) * 100), color: palette[i % palette.length] }));
  }, [state.workers]);

  const attemptsTrend = countTrend(state.attempts);
  const rateTrend = passRateTrend(state.attempts);

  if (state.status === "error") {
    return (
      <Layout title={t("overview_title")} subtitle={t("overview_sub")}>
        <ErrorState />
      </Layout>
    );
  }

  return (
    <Layout title={t("overview_title")} subtitle={t("overview_sub")}>
      {state.source === "mock" && state.status === "ready" && <SampleDataBanner />}

      <div className="overview-layout">
        <div className="kpi-rail">
          <StatCard
            label={t("stat_workers")}
            color="blue"
            icon={<Users />}
            value={state.status === "loading" ? "—" : state.summary.workerCount}
            foot={state.status === "ready" ? `${engagedPct}% have started training` : undefined}
          />
          <StatCard
            label={t("stat_attempts")}
            color="violet"
            icon={<ClipboardList />}
            value={state.status === "loading" ? "—" : state.summary.attemptCount}
            trend={attemptsTrend}
            foot={state.status === "ready" ? `${syncedPct}% synced` : undefined}
          />
          <StatCard
            label={t("stat_pass_rate")}
            color="teal"
            icon={<Percent />}
            value={state.status === "loading" ? "—" : `${state.summary.passRate}%`}
            trend={rateTrend}
            foot={state.status === "ready" ? `${passCount} pass · ${failCount} fail` : undefined}
          />
          <StatCard
            label={t("stat_certificates")}
            color="orange"
            icon={<BadgeCheck />}
            value={state.status === "loading" ? "—" : state.summary.certificateCount}
            foot={state.status === "ready" ? `${certifiedPct}% of passes certified` : undefined}
          />
        </div>

        <div>
          <div className="two-col">
            <div className="panel">
              <div className="panel-head">
                <div className="panel-head-title">
                  <div className="panel-head-icon" style={{ background: ICON_EMBER }}>
                    <Activity />
                  </div>
                  <div>
                    <h2>{t("chart_passrate_title")}</h2>
                    <p>
                      {strongestModule
                        ? `${strongestModule.fullName} leading at ${strongestModule.Pass}%`
                        : t("chart_passrate_sub")}
                    </p>
                  </div>
                </div>
                <span className="live-pill">
                  <span className="live-dot" />
                  {isLiveMode() ? "Live" : "Sample"}
                </span>
              </div>
              <div className="panel-body chart-wrap">
                {state.status === "loading" ? (
                  <Loading rows={3} />
                ) : modulePassRateSeries.length === 0 ? (
                  <div className="data-state">
                    <div className="glyph">NO ACTIVITY</div>
                    <p>No attempts recorded yet.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={modulePassRateSeries} margin={{ top: 14, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        {MODULE_SERIES.map((m) => (
                          <linearGradient key={m.key} id={`fill${m.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={m.color} stopOpacity={0.45} />
                            <stop offset="100%" stopColor={m.color} stopOpacity={0.03} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="day" stroke="var(--ink-faint)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis
                        stroke="var(--ink-faint)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        width={36}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface-raised)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "var(--text-primary)"
                        }}
                        formatter={(value, name) => [value == null ? "No attempts yet" : `${value}%`, name]}
                      />
                      <Legend
                        verticalAlign="top"
                        height={28}
                        iconType="plainline"
                        wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
                      />
                      {MODULE_SERIES.map((m) => (
                        <Area
                          key={m.key}
                          type="monotone"
                          dataKey={m.key}
                          name={m.key}
                          stroke={m.color}
                          strokeWidth={2}
                          fill={`url(#fill${m.key})`}
                          connectNulls={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                          isAnimationActive
                          animationDuration={900}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div className="panel-head-title">
                  <div className="panel-head-icon" style={{ background: ICON_OLIVE }}>
                    <RadarIcon />
                  </div>
                  <div>
                    <h2>{t("chart_pass_title")}</h2>
                    <p>{t("chart_radar_sub")}</p>
                  </div>
                </div>
              </div>
              <div className="panel-body">
                {state.status === "loading" ? (
                  <Loading rows={3} />
                ) : radarData.length === 0 ? (
                  <div className="data-state">
                    <div className="glyph">NO ACTIVITY</div>
                    <p>No attempts recorded yet.</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={232}>
                      <RadarChart data={radarData} outerRadius="72%">
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis
                          dataKey="module"
                          tick={{ fill: "var(--ink-soft)", fontSize: 12, fontWeight: 700 }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tickCount={5}
                          tick={{ fill: "var(--ink-faint)", fontSize: 10 }}
                          tickFormatter={(v) => `${v}%`}
                          axisLine={false}
                        />
                        <Radar
                          name={t("status_pass")}
                          dataKey="Pass"
                          stroke={GO}
                          strokeWidth={2}
                          fill={GO}
                          fillOpacity={0.32}
                          isAnimationActive
                          animationDuration={900}
                        />
                        <Radar
                          name={t("status_fail")}
                          dataKey="Fail"
                          stroke={STOP}
                          strokeWidth={2}
                          fill={STOP}
                          fillOpacity={0.22}
                          isAnimationActive
                          animationDuration={900}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={24}
                          iconType="circle"
                          wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--surface-raised)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--text-primary)"
                          }}
                          formatter={(value, name) => [`${value}%`, name]}
                        />
                      </RadarChart>
                    </ResponsiveContainer>

                    {/* Overall totals across every module, so the panel still
                        answers "what's the headline pass rate?" at a glance. */}
                    <div className="legend-list">
                      <div className="legend-item">
                        <span className="legend-key">
                          <span className="legend-swatch" style={{ background: GO }} />
                          {t("status_pass")}
                        </span>
                        <span className="legend-value">
                          <span className="pct" style={{ color: GO }}>
                            {passPct}%
                          </span>
                          <span className="count">{passCount} attempts</span>
                        </span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-key">
                          <span className="legend-swatch" style={{ background: STOP }} />
                          {t("status_fail")}
                        </span>
                        <span className="legend-value">
                          <span className="pct" style={{ color: STOP }}>
                            {failPct}%
                          </span>
                          <span className="count">{failCount} attempts</span>
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="three-col">
            <div className="panel">
              <div className="panel-head">
                <div className="panel-head-title">
                  <div className="panel-head-icon" style={{ background: ICON_PEACH, color: "#1a1208" }}>
                    <Layers />
                  </div>
                  <div>
                    <h2>Module completion</h2>
                    <p>Share of workers with a passing attempt</p>
                  </div>
                </div>
              </div>
              <div className="panel-body">
                {state.status === "loading" ? (
                  <Loading rows={2} />
                ) : (
                  moduleCompletion.map((m) => (
                    <div className="progress-row" key={m.name}>
                      <div className="progress-row-head">
                        <strong>{m.name}</strong>
                        <span className="pct" style={{ color: m.color }}>
                          {m.pct}%
                        </span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${m.pct}%`, background: m.color }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div className="panel-head-title">
                  <div className="panel-head-icon" style={{ background: ICON_EMBER }}>
                    <MapPin />
                  </div>
                  <div>
                    <h2>Workers by site</h2>
                  </div>
                </div>
              </div>
              <div className="panel-body">
                {state.status === "loading" ? (
                  <Loading rows={2} />
                ) : siteBreakdown.length === 0 ? (
                  <p className="text-muted">Site data is not stored in the backend yet.</p>
                ) : (
                  siteBreakdown.map((s) => (
                    <div className="progress-row" key={s.site}>
                      <div className="progress-row-head">
                        <strong>{s.site}</strong>
                        <span className="pct">{s.count}</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${s.pct}%`, background: s.color }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div className="panel-head-title">
                  <div className="panel-head-icon" style={{ background: ICON_COCOA }}>
                    <Radio />
                  </div>
                  <div>
                    <h2>System status</h2>
                  </div>
                </div>
              </div>
              <div className="panel-body">
                <div className="status-list">
                  <div className="status-row">
                    <span className="status-row-label">
                      <Radio />
                      Backend connection
                    </span>
                    <span className="status-row-value">
                      <span className={`pulse-dot ${isLiveMode() ? "live" : "mock"}`} />
                      {isLiveMode() ? "Live API" : "Sample data"}
                    </span>
                  </div>
                  <div className="status-row">
                    <span className="status-row-label">
                      <RefreshCw />
                      Pending sync
                    </span>
                    <span className="status-row-value">
                      {state.status === "loading" ? "—" : state.summary.pendingSyncCount}
                    </span>
                  </div>
                  <div className="status-row">
                    <span className="status-row-label">
                      <BadgeCheck />
                      Certificates valid
                    </span>
                    <span className="status-row-value">{state.status === "loading" ? "—" : validCertCount}</span>
                  </div>
                  <div className="status-row">
                    <span className="status-row-label">
                      <Clock3 />
                      Last refreshed
                    </span>
                    <span className="status-row-value">Just now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
