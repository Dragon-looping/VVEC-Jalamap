import React from 'react';

interface DemoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRunScenario1: () => void;
  onRunScenario2: () => void;
  onRunScenario3: () => void;
  onRunScenario4: () => void;
  onRunScenario5: () => void;
  onRunStressTest: (contributorCount: number) => void;
  onResetDemo: () => void;
  activeScenario: string | null;
}

export const DemoPanel: React.FC<DemoPanelProps> = ({
  isOpen,
  onClose,
  onRunScenario1,
  onRunScenario2,
  onRunScenario3,
  onRunScenario4,
  onRunScenario5,
  onRunStressTest,
  onResetDemo,
  activeScenario,
}) => {
  if (!isOpen) return null;

  return (
    <aside
      className="demo-drawer-panel"
      role="complementary"
      aria-label="Simulation and Judge Demo Studio"
    >
      <div className="demo-drawer-header">
        <div className="drawer-title-wrap">
          <span className="drawer-icon" aria-hidden="true">🧪</span>
          <div>
            <h2 className="drawer-title">Simulation Studio</h2>
            <div className="drawer-tagline">
              Deterministic Test Controls for RESURRECT 2026 Evaluation
            </div>
          </div>
        </div>
        <button
          type="button"
          className="drawer-close-btn"
          onClick={onClose}
          aria-label="Close demo panel"
        >
          ✕
        </button>
      </div>

      <div className="demo-drawer-notice">
        <span className="notice-badge">HACKATHON DEMO CONTROLS</span>
        <p>
          Ordinary commuters only use Start Navigation and Report Road. Use these buttons below to trigger automated background events and observe real-time rerouting.
        </p>
      </div>

      <div className="demo-scenarios-list">
        {/* Scenario 1 */}
        <div className={`scenario-card ${activeScenario === 'scenario_1' ? 'scenario-active' : ''}`}>
          <div className="scenario-card-header">
            <span className="scenario-num font-mono">SCENARIO 1</span>
            <span className="scenario-name">Normal Journey Initiation</span>
          </div>
          <p className="scenario-desc">
            Sets route Kallare → Kombettu (4.8 km via Darbe). Starts journey and begins moving the vehicle.
          </p>
          <button
            type="button"
            className="btn-run-scenario"
            onClick={onRunScenario1}
          >
            Run Scenario 1
          </button>
        </div>

        {/* Scenario 2 */}
        <div className={`scenario-card ${activeScenario === 'scenario_2' ? 'scenario-active' : ''}`}>
          <div className="scenario-card-header">
            <span className="scenario-num font-mono">SCENARIO 2</span>
            <span className="scenario-name">Mid-Journey Background CCTV Hazard</span>
          </div>
          <p className="scenario-desc">
            Advances vehicle towards Bolwar, then fires background CCTV waterlogging detection on Darbe approach. Reroutes automatically from CURRENT position via Town Bypass without showing CCTV footage!
          </p>
          <button
            type="button"
            className="btn-run-scenario"
            onClick={onRunScenario2}
          >
            Run Scenario 2 (CCTV Hazard)
          </button>
        </div>

        {/* Scenario 3 */}
        <div className={`scenario-card ${activeScenario === 'scenario_3' ? 'scenario-active' : ''}`}>
          <div className="scenario-card-header">
            <span className="scenario-num font-mono">SCENARIO 3</span>
            <span className="scenario-name">Community Consensus (No CCTV)</span>
          </div>
          <p className="scenario-desc">
            Simulates 3 distinct independent commuters reporting blockage on Darbe–Bannur. Evidence engine evaluates consensus automatically and activates road restriction.
          </p>
          <button
            type="button"
            className="btn-run-scenario"
            onClick={onRunScenario3}
          >
            Run Scenario 3 (3 Reports)
          </button>
        </div>

        {/* Scenario 4 */}
        <div className={`scenario-card ${activeScenario === 'scenario_4' ? 'scenario-active' : ''}`}>
          <div className="scenario-card-header">
            <span className="scenario-num font-mono">SCENARIO 4</span>
            <span className="scenario-name">Automatic Road Reopening</span>
          </div>
          <p className="scenario-desc">
            Simulates 3 distinct commuters reporting road passable (water receded). Reopens road in routing graph and recalculates optimal route.
          </p>
          <button
            type="button"
            className="btn-run-scenario"
            onClick={onRunScenario4}
          >
            Run Scenario 4 (Reopening)
          </button>
        </div>

        {/* Scenario 5 */}
        <div className={`scenario-card ${activeScenario === 'scenario_5' ? 'scenario-active' : ''}`}>
          <div className="scenario-card-header">
            <span className="scenario-num font-mono">SCENARIO 5</span>
            <span className="scenario-name">Multiple Sequential Blockages</span>
          </div>
          <p className="scenario-desc">
            While navigating the detour, a second road ahead becomes blocked. JALAMAP recalculates a secondary detour from current position.
          </p>
          <button
            type="button"
            className="btn-run-scenario"
            onClick={onRunScenario5}
          >
            Run Scenario 5 (Second Blockage)
          </button>
        </div>

        {/* Stress Test */}
        <div className="scenario-card stress-test-card">
          <div className="scenario-card-header">
            <span className="scenario-num font-mono">STRESS TEST</span>
            <span className="scenario-name">Unlimited Contributor Scale Test</span>
          </div>
          <p className="scenario-desc">
            Simulates arbitrary independent contributor scale (proves no 2-rider ceiling).
          </p>
          <div className="stress-actions-row">
            <button
              type="button"
              className="btn-stress-option"
              onClick={() => onRunStressTest(3)}
            >
              3 Users
            </button>
            <button
              type="button"
              className="btn-stress-option"
              onClick={() => onRunStressTest(20)}
            >
              20 Users
            </button>
            <button
              type="button"
              className="btn-stress-option"
              onClick={() => onRunStressTest(100)}
            >
              100 Users
            </button>
          </div>
        </div>
      </div>

      <div className="drawer-footer">
        <button
          type="button"
          className="btn-reset-demo"
          onClick={onResetDemo}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Reset All Demo State</span>
        </button>
      </div>
    </aside>
  );
};
