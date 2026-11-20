import React, { useState } from 'react';
import {
  RouteResult,
  RoadRestriction,
  VehiclePosition,
} from '../types';
import { PUTTUR_SEGMENTS, PUTTUR_NODES } from '../data/putturNetwork';

interface MapAtlasProps {
  restrictions: Map<string, RoadRestriction>;
  activeRoute: RouteResult | null;
  originalRoute: RouteResult | null;
  vehiclePosition: VehiclePosition | null;
  selectedSegmentId: string | null;
  highlightedSegmentId: string | null;
  onSelectSegment: (segmentId: string) => void;
  onQuickReportSegment?: (segmentId: string) => void;
  originId: string;
  destinationId: string;
}

export const MapAtlas: React.FC<MapAtlasProps> = ({
  restrictions,
  activeRoute,
  originalRoute,
  vehiclePosition,
  selectedSegmentId,
  highlightedSegmentId,
  onSelectSegment,
  onQuickReportSegment,
  originId,
  destinationId,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [viewOffset, setViewOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleFitRoute = () => {
    setZoomLevel(1);
    setViewOffset({ x: 0, y: 0 });
  };

  const originNode = PUTTUR_NODES[originId] || PUTTUR_NODES['kallare'];
  const destNode = PUTTUR_NODES[destinationId] || PUTTUR_NODES['kombettu'];

  // Check if any route segments are under detour
  const isDetouring =
    originalRoute &&
    activeRoute &&
    originalRoute.isFound &&
    activeRoute.isFound &&
    originalRoute.pathD !== activeRoute.pathD;

  const selectedRestriction = selectedSegmentId ? restrictions.get(selectedSegmentId) : undefined;
  const selectedSegment = PUTTUR_SEGMENTS.find((s) => s.id === selectedSegmentId);

  return (
    <div className="atlas-map-container" role="region" aria-label="Puttur Smart Road Navigation Atlas">
      {/* Floating Quiet Badge: Map Pilot Pilot Indicator */}
      <div className="map-pilot-pill" aria-hidden="true">
        <span className="dot-pilot-live" />
        <span>Puttur Pilot · Dynamic Navigation Atlas</span>
      </div>

      {/* SVG Cartographic Canvas */}
      <svg
        viewBox="0 0 900 600"
        className="atlas-svg"
        preserveAspectRatio="xMidYMid meet"
        style={{
          transform: `scale(${zoomLevel}) translate(${viewOffset.x}px, ${viewOffset.y}px)`,
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <defs>
          {/* Paper stipple pattern for tactile warmth */}
          <pattern id="paperStipple" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="0.5" fill="#DDD6C7" opacity="0.5" />
            <circle cx="45" cy="45" r="0.5" fill="#DDD6C7" opacity="0.5" />
          </pattern>

          {/* Barrier hazard stripe pattern for coral closure */}
          <pattern
            id="barrierStripe"
            width="8"
            height="8"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="#FFFFFF" strokeWidth="4" />
            <line x1="4" y1="0" x2="4" y2="8" stroke="#DC3826" strokeWidth="4" />
          </pattern>

          {/* Amber stripe pattern for provisional hazards */}
          <pattern
            id="amberStripe"
            width="8"
            height="8"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="#FFFFFF" strokeWidth="4" />
            <line x1="4" y1="0" x2="4" y2="8" stroke="#D98818" strokeWidth="4" />
          </pattern>
        </defs>

        {/* 1. Base Map Ground (Warm Ivory #F2EFE6) */}
        <rect width="900" height="600" fill="#F2EFE6" />
        <rect width="900" height="600" fill="url(#paperStipple)" />

        {/* 2. Building Footprints (Fine Town Parcels) */}
        <g className="building-footprints" fill="#EAE4D8" stroke="#DDD6C8" strokeWidth="0.8">
          {/* Kallare town sector clusters */}
          <polygon points="80,410 115,410 115,445 80,445" />
          <polygon points="125,415 155,415 155,435 140,435 140,455 125,455" />
          <polygon points="90,460 120,460 120,490 90,490" />
          <polygon points="170,455 210,455 210,485 170,485" />
          <polygon points="180,410 215,410 215,440 180,440" />
          <polygon points="110,340 145,340 145,370 110,370" />
          <polygon points="155,335 190,335 190,360 155,360" />

          {/* Bolwar / Court Hill clusters */}
          <polygon points="230,310 265,310 265,340 230,340" />
          <polygon points="280,315 315,315 315,345 280,345" />
          <polygon points="295,240 330,240 330,270 295,270" />
          <polygon points="340,230 375,230 375,260 340,260" />
          <polygon points="280,185 315,185 315,215 280,215" />
          <polygon points="330,175 365,175 365,205 330,205" />

          {/* Town Bypass clusters */}
          <polygon points="430,140 470,140 470,165 430,165" />
          <polygon points="480,135 520,135 520,160 480,160" />
          <polygon points="540,135 580,135 580,160 540,160" />
          <polygon points="450,185 490,185 490,215 450,215" />
          <polygon points="505,185 545,185 545,215 505,215" />

          {/* Darbe commercial center clusters */}
          <polygon points="350,390 385,390 385,420 350,420" />
          <polygon points="395,390 430,390 430,425 395,425" />
          <polygon points="440,395 475,395 475,435 440,435" />
          <polygon points="495,395 530,395 530,435 495,435" />
          <polygon points="360,335 395,335 395,360 360,360" />
          <polygon points="405,325 440,325 440,355 405,355" />
          <polygon points="450,320 485,320 485,350 450,350" />
          <polygon points="495,320 530,320 530,350 495,350" />
          <polygon points="440,445 475,445 475,475 440,475" />
          <polygon points="485,445 520,445 520,475 485,475" />

          {/* Bannur & Kombettu institutional blocks */}
          <polygon points="600,230 635,230 635,260 600,260" />
          <polygon points="650,225 685,225 685,255 650,255" />
          <polygon points="610,290 645,290 645,320 610,320" />
          <polygon points="660,290 695,290 695,320 660,320" />
          <polygon points="705,160 745,160 745,195 705,195" />
          <polygon points="755,165 795,165 795,200 755,200" />
          <polygon points="730,95 770,95 770,125 730,125" />
          <polygon points="780,95 820,95 820,125 780,125" />

          {/* Parladka homestead blocks */}
          <polygon points="500,490 535,490 535,520 500,520" />
          <polygon points="550,490 585,490 585,520 550,520" />
          <polygon points="520,530 560,530 560,560 520,560" />
        </g>

        {/* Soft Kumaradhara stream line */}
        <path
          d="M 40 210 C 120 240 200 270 290 310 S 440 430 540 460 S 740 530 870 550"
          fill="none"
          stroke="#D2DFDC"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <text
          x="760"
          y="520"
          fill="#869C9A"
          fontSize="9.5"
          fontStyle="italic"
          fontFamily="inherit"
          letterSpacing="0.04em"
        >
          Kumaradhara tributary
        </text>

        {/* 3. Secondary Street Network (Context Urban Fabric) */}
        <g className="context-streets">
          <g fill="none" stroke="#DCD6C9" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 90 470 L 190 400 M 110 370 L 170 470 M 130 520 L 250 480" />
            <path d="M 230 290 L 330 320 M 280 220 L 360 260 M 310 160 L 340 240" />
            <path d="M 420 310 L 420 430 M 460 290 L 460 440 M 370 440 L 490 440 M 430 370 L 430 460" />
            <path d="M 480 370 L 480 470 M 520 330 L 520 420" />
            <path d="M 590 220 L 680 280 M 640 200 L 640 310 M 700 130 L 760 220" />
            <path d="M 370 480 L 420 540 M 470 480 L 520 540" />
          </g>
          <g fill="none" stroke="#FAF8F3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 90 470 L 190 400 M 110 370 L 170 470 M 130 520 L 250 480" />
            <path d="M 230 290 L 330 320 M 280 220 L 360 260 M 310 160 L 340 240" />
            <path d="M 420 310 L 420 430 M 460 290 L 460 440 M 370 440 L 490 440 M 430 370 L 430 460" />
            <path d="M 480 370 L 480 470 M 520 330 L 520 420" />
            <path d="M 590 220 L 680 280 M 640 200 L 640 310 M 700 130 L 760 220" />
            <path d="M 370 480 L 420 540 M 470 480 L 520 540" />
          </g>
        </g>

        {/* 4. Main Routable Road Network with Restriction Styling */}
        <g className="main-network-roads">
          {PUTTUR_SEGMENTS.map((seg) => {
            const restr = restrictions.get(seg.id);
            const isBlocked = restr?.status === 'confirmed_blocked';
            const isProvisional = restr?.status === 'provisional_hazard';
            const isSelected = selectedSegmentId === seg.id;
            const isHighlighted = highlightedSegmentId === seg.id;

            // Outer Casing
            let strokeColor = seg.isSecondary ? '#D4CEC2' : '#C4BDAE';
            let strokeWidth = seg.isSecondary ? 5.5 : 8;

            if (isBlocked) {
              strokeColor = '#DC3826';
              strokeWidth = 9;
            } else if (isProvisional) {
              strokeColor = '#D98818';
              strokeWidth = 8.5;
            } else if (isSelected || isHighlighted) {
              strokeColor = '#007C76';
              strokeWidth = 9.5;
            }

            return (
              <path
                key={`casing-${seg.id}`}
                d={seg.pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="road-casing"
              />
            );
          })}

          {/* Road Fill */}
          {PUTTUR_SEGMENTS.map((seg) => {
            const restr = restrictions.get(seg.id);
            const isBlocked = restr?.status === 'confirmed_blocked';
            const isProvisional = restr?.status === 'provisional_hazard';

            let fillColor = seg.isSecondary ? '#FAF8F3' : '#FFFFFF';
            if (isBlocked) fillColor = '#FFEBE8';
            else if (isProvisional) fillColor = '#FFF8EE';

            return (
              <path
                key={`fill-${seg.id}`}
                d={seg.pathD}
                fill="none"
                stroke={fillColor}
                strokeWidth={seg.isSecondary ? 3 : 4.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                onClick={() => onSelectSegment(seg.id)}
                className="road-fill interactive-road"
                role="button"
                tabIndex={0}
                aria-label={`${seg.name}: ${restr?.status || 'passable'}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectSegment(seg.id);
                }}
              />
            );
          })}
        </g>

        {/* 5. Historical Route Before Detour (Subtle Muted Dashed Line) */}
        {isDetouring && originalRoute && (
          <g className="historical-dashed-route" aria-hidden="true">
            {originalRoute.segmentIds.map((segId) => {
              const seg = PUTTUR_SEGMENTS.find((s) => s.id === segId);
              if (!seg) return null;
              return (
                <path
                  key={`hist-${segId}`}
                  d={seg.pathD}
                  fill="none"
                  stroke="#7E8C8A"
                  strokeWidth={2.8}
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                  opacity={0.8}
                />
              );
            })}
          </g>
        )}

        {/* 6. Active Navigation Route (Petrol Teal #007C76 with Pale Halo) */}
        {activeRoute && activeRoute.isFound && (
          <g className="active-route-layer">
            {/* White halo */}
            {activeRoute.segmentIds.map((segId) => {
              const seg = PUTTUR_SEGMENTS.find((s) => s.id === segId);
              if (!seg) return null;
              return (
                <path
                  key={`halo-${segId}`}
                  d={seg.pathD}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={8.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {/* Petrol Teal Core */}
            {activeRoute.segmentIds.map((segId, idx) => {
              const seg = PUTTUR_SEGMENTS.find((s) => s.id === segId);
              if (!seg) return null;
              return (
                <path
                  key={`route-${segId}`}
                  d={seg.pathD}
                  fill="none"
                  stroke="#007C76"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="active-route-path"
                  style={{ animationDelay: `${idx * 120}ms` }}
                />
              );
            })}
          </g>
        )}

        {/* 7. Hazard and Closure Overlays on Roads */}
        {PUTTUR_SEGMENTS.map((seg) => {
          const restr = restrictions.get(seg.id);
          if (!restr || restr.status === 'passable') return null;

          const isBlocked = restr.status === 'confirmed_blocked';
          const isProvisional = restr.status === 'provisional_hazard';

          // Representative anchor midpoints for known segments
          let mx = 480;
          let my = 370;
          if (seg.id === 'seg_bolwar_darbe') { mx = 370; my = 370; }
          else if (seg.id === 'seg_darbe_bannur') { mx = 560; my = 325; }
          else if (seg.id === 'seg_courthill_town') { mx = 420; my = 195; }
          else if (seg.id === 'seg_town_kombettu') { mx = 650; my = 155; }
          else if (seg.id === 'seg_kallare_bolwar') { mx = 200; my = 405; }
          else if (seg.id === 'seg_bolwar_courthill') { mx = 285; my = 295; }
          else if (seg.id === 'seg_bannur_kombettu') { mx = 705; my = 210; }
          else if (seg.id === 'seg_mukwe_parladka') { mx = 430; my = 490; }

          if (isBlocked) {
            return (
              <g key={`barrier-${seg.id}`} transform={`translate(${mx}, ${my})`} className="closure-indicator">
                {/* Coral barrier bar */}
                <rect x="-18" y="-10" width="36" height="20" rx="3" fill="#DC3826" stroke="#A82315" strokeWidth="1.5" />
                <rect x="-14" y="-7" width="28" height="14" fill="url(#barrierStripe)" />
                {/* Direct callout pill */}
                <g transform="translate(0, 26)">
                  <line x1="0" y1="-16" x2="0" y2="-4" stroke="#DC3826" strokeWidth="1.5" />
                  <rect x="-70" y="-10" width="140" height="20" rx="4" fill="#FFFFFF" stroke="#DC3826" strokeWidth="1.5" />
                  <text x="0" y="4" fill="#DC3826" fontSize="10.5" fontWeight="800" textAnchor="middle">
                    Road Blocked · Impassable
                  </text>
                </g>
              </g>
            );
          }

          if (isProvisional) {
            return (
              <g key={`hazard-${seg.id}`} transform={`translate(${mx}, ${my})`} className="hazard-indicator">
                <circle cx="0" cy="0" r="10" fill="#D98818" stroke="#FFFFFF" strokeWidth="1.8" />
                <text x="0" y="3.5" fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle">
                  !
                </text>
                <g transform="translate(0, -22)">
                  <rect x="-65" y="-9" width="130" height="18" rx="3" fill="#FFFFFF" stroke="#D98818" strokeWidth="1.3" />
                  <text x="0" y="3.5" fill="#8C540B" fontSize="9.5" fontWeight="700" textAnchor="middle">
                    Caution · Waterlogging
                  </text>
                </g>
              </g>
            );
          }

          return null;
        })}

        {/* 8. Moving Commuter Vehicle Marker (When Navigating) */}
        {vehiclePosition && (
          <g
            className="vehicle-marker-group"
            transform={`translate(${vehiclePosition.x}, ${vehiclePosition.y})`}
            aria-label="Commuter Vehicle Location"
          >
            {/* Outer expanding pulse ring */}
            <circle cx="0" cy="0" r="18" fill="rgba(0, 124, 118, 0.25)" className="vehicle-pulse-ring" />
            <circle cx="0" cy="0" r="12" fill="rgba(0, 124, 118, 0.4)" />
            {/* Core vehicle body */}
            <circle cx="0" cy="0" r="7.5" fill="#007C76" stroke="#FFFFFF" strokeWidth="2.5" />
            {/* Directional heading wedge */}
            <g transform={`rotate(${vehiclePosition.headingDeg})`}>
              <polygon points="12,0 6,-3.5 6,3.5" fill="#007C76" stroke="#FFFFFF" strokeWidth="1" />
            </g>
            {/* Live Vehicle Callout */}
            <g transform="translate(0, -20)">
              <rect x="-35" y="-8" width="70" height="16" rx="3.5" fill="#202C2C" stroke="#FFFFFF" strokeWidth="1" />
              <text x="0" y="3.5" fill="#FFFFFF" fontSize="8.5" fontWeight="800" textAnchor="middle" fontFamily="inherit">
                YOU · MOVING
              </text>
            </g>
          </g>
        )}

        {/* 9. Geographic Junction Labels */}
        <g className="map-labels">
          {/* Darbe Junction */}
          <g transform="translate(480, 370)">
            <circle cx="0" cy="0" r="3.5" fill="#202C2C" stroke="#FFFFFF" strokeWidth="1.5" />
            <text x="16" y="24" fill="#202C2C" fontSize="14" fontWeight="800" className="map-place-label">
              Darbe Junction
            </text>
          </g>

          {/* Bolwar Cross */}
          <g transform="translate(260, 370)">
            <circle cx="0" cy="0" r="3" fill="#3D4B4B" />
            <text x="-16" y="-18" textAnchor="end" fill="#202C2C" fontSize="13" fontWeight="700" className="map-place-label">
              Bolwar Cross
            </text>
          </g>

          {/* Court Hill */}
          <g transform="translate(310, 220)">
            <circle cx="0" cy="0" r="3" fill="#3D4B4B" />
            <text x="-12" y="-10" textAnchor="end" fill="#3D4B4B" fontSize="12.5" fontWeight="600" className="map-place-label">
              Court Hill
            </text>
          </g>

          {/* Puttur Town Bypass */}
          <g transform="translate(530, 170)">
            <circle cx="0" cy="0" r="3" fill="#3D4B4B" />
            <text x="0" y="-14" textAnchor="middle" fill="#3D4B4B" fontSize="12.5" fontWeight="600" className="map-place-label">
              Puttur Town Bypass
            </text>
          </g>

          {/* Bannur */}
          <g transform="translate(640, 280)">
            <circle cx="0" cy="0" r="3" fill="#3D4B4B" />
            <text x="14" y="4" fill="#3D4B4B" fontSize="12.5" fontWeight="600" className="map-place-label">
              Bannur Cross
            </text>
          </g>

          {/* Parladka */}
          <g transform="translate(540, 480)">
            <circle cx="0" cy="0" r="3" fill="#586767" />
            <text x="12" y="16" fill="#586767" fontSize="12" fontWeight="500" className="map-place-label">
              Parladka
            </text>
          </g>

          {/* Mukwe */}
          <g transform="translate(320, 500)">
            <circle cx="0" cy="0" r="3" fill="#586767" />
            <text x="0" y="20" textAnchor="middle" fill="#586767" fontSize="12" fontWeight="500" className="map-place-label">
              Mukwe Link
            </text>
          </g>
        </g>

        {/* 10. Origin & Destination Markers */}
        {/* Origin */}
        <g transform={`translate(${originNode.x}, ${originNode.y})`} className="marker-origin">
          <circle cx="0" cy="0" r="8" fill="#007C76" stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="0" cy="0" r="3" fill="#FFFFFF" />
          <text x="0" y="24" textAnchor="middle" fill="#007C76" fontSize="13" fontWeight="800">
            {originNode.shortLabel}
          </text>
        </g>

        {/* Destination */}
        <g transform={`translate(${destNode.x}, ${destNode.y})`} className="marker-dest">
          <circle cx="0" cy="0" r="9" fill="#202C2C" stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="0" cy="0" r="4" fill="#007C76" />
          <text x="0" y="-18" textAnchor="middle" fill="#202C2C" fontSize="13" fontWeight="800">
            {destNode.shortLabel}
          </text>
        </g>
      </svg>

      {/* Selected Road Floating Inspector Pill (if clicked) */}
      {selectedSegment && (
        <div className="selected-segment-banner">
          <div className="segment-banner-info">
            <span className="segment-banner-title">{selectedSegment.name}</span>
            <span className="segment-banner-stat font-mono">
              {selectedSegment.distanceKm} km · Status: {selectedRestriction?.status || 'passable'}
            </span>
          </div>
          {onQuickReportSegment && (
            <button
              type="button"
              className="btn-quick-report"
              onClick={() => onQuickReportSegment(selectedSegment.id)}
            >
              Report Road
            </button>
          )}
        </div>
      )}

      {/* Map Control Tools: Fit Route and Legend */}
      <div className="map-tools-anchor">
        <div className="map-legend">
          <span className="legend-item">
            <span className="legend-color color-route" />
            <span>Clear Route</span>
          </span>
          <span className="legend-item">
            <span className="legend-color color-blocked" />
            <span>Blocked</span>
          </span>
          <span className="legend-item">
            <span className="legend-color color-hazard" />
            <span>Hazard Caution</span>
          </span>
        </div>

        <button
          type="button"
          className="map-fit-btn"
          onClick={handleFitRoute}
          title="Restore full map view"
          aria-label="Restore full map view"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          <span>Fit route</span>
        </button>
      </div>
    </div>
  );
};
