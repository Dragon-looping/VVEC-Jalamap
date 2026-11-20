import React, { useState } from 'react';
import { RouteResult, ComparisonRouteSelection, CameraRecord } from '../types';
import { PUTTUR_SEGMENTS } from '../data/putturNetwork';

interface MapAtlasProps {
  selectedSegmentId: string;
  closedSegmentIds: string[];
  activeRoute: RouteResult | null;
  originalRoute: RouteResult | null;
  comparisonSelection: ComparisonRouteSelection;
  highlightedSegmentId: string | null;
  isReviewingCamera?: boolean;
  activeCameraRecord?: CameraRecord | null;
  onSelectSegment: (segmentId: string) => void;
}

export const MapAtlas: React.FC<MapAtlasProps> = ({
  selectedSegmentId,
  closedSegmentIds,
  activeRoute,
  originalRoute,
  comparisonSelection,
  highlightedSegmentId,
  isReviewingCamera,
  activeCameraRecord,
  onSelectSegment,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [viewOffset, setViewOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleFitRoute = () => {
    setZoomLevel(1);
    setViewOffset({ x: 0, y: 0 });
  };

  const isDarbeClosed = closedSegmentIds.includes('seg_bolwar_darbe');
  const isAnyClosed = closedSegmentIds.length > 0;

  // Route comparison: if original is selected during a closure, show original route
  const showOriginalView = isAnyClosed && comparisonSelection === 'original';
  const displayedRoute = showOriginalView ? originalRoute : activeRoute;

  // Distances
  const origDist = originalRoute?.totalDistanceKm ?? 4.8;
  const currentDist = activeRoute?.totalDistanceKm ?? origDist;
  const deltaMeters = Math.max(0, Math.round((currentDist - origDist) * 1000));

  return (
    <div className="atlas-map-container" role="region" aria-label="Puttur Road Atlas Map">
      {/* Quiet Top-Left Anchor: Modest Ivory Route Card */}
      <div className="map-route-card">
        <div className="route-card-title">Kallare → Kombettu</div>
        <div className="route-card-dist font-mono">
          {!isAnyClosed ? (
            <span>4.8 km via Darbe</span>
          ) : showOriginalView ? (
            <span className="dist-hist">4.8 km before closure</span>
          ) : (
            <span className="dist-detour">5.6 km via Town Bypass (+{deltaMeters} m)</span>
          )}
        </div>
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
          {/* Subtle paper stipple */}
          <pattern id="paperStipple" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="0.5" fill="#DDD6C7" opacity="0.5" />
            <circle cx="45" cy="45" r="0.5" fill="#DDD6C7" opacity="0.5" />
          </pattern>

          {/* Barrier hazard stripe pattern for coral closure */}
          <pattern id="barrierStripe" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#FFFFFF" strokeWidth="4" />
            <line x1="4" y1="0" x2="4" y2="8" stroke="#DC3826" strokeWidth="4" />
          </pattern>
        </defs>

        {/* 1. Base Map Ground (Warm Paper #F2EFE6) */}
        <rect width="900" height="600" fill="#F2EFE6" />
        <rect width="900" height="600" fill="url(#paperStipple)" />

        {/* 2. Coherent Groups of Understated Building Footprints (Fine Town Parcels) */}
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

          {/* Darbe commercial center & market clusters */}
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
          {/* Casings */}
          <g fill="none" stroke="#DCD6C9" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 90 470 L 190 400 M 110 370 L 170 470 M 130 520 L 250 480" />
            <path d="M 230 290 L 330 320 M 280 220 L 360 260 M 310 160 L 340 240" />
            <path d="M 420 310 L 420 430 M 460 290 L 460 440 M 370 440 L 490 440 M 430 370 L 430 460" />
            <path d="M 480 370 L 480 470 M 520 330 L 520 420" />
            <path d="M 590 220 L 680 280 M 640 200 L 640 310 M 700 130 L 760 220" />
            <path d="M 370 480 L 420 540 M 470 480 L 520 540" />
          </g>
          {/* Fills */}
          <g fill="none" stroke="#FAF8F3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 90 470 L 190 400 M 110 370 L 170 470 M 130 520 L 250 480" />
            <path d="M 230 290 L 330 320 M 280 220 L 360 260 M 310 160 L 340 240" />
            <path d="M 420 310 L 420 430 M 460 290 L 460 440 M 370 440 L 490 440 M 430 370 L 430 460" />
            <path d="M 480 370 L 480 470 M 520 330 L 520 420" />
            <path d="M 590 220 L 680 280 M 640 200 L 640 310 M 700 130 L 760 220" />
            <path d="M 370 480 L 420 540 M 470 480 L 520 540" />
          </g>
        </g>

        {/* 4. Main Routable Road Network */}
        <g className="main-network-roads">
          {/* Casing Layer */}
          {PUTTUR_SEGMENTS.map((seg) => {
            const isSecondary = seg.isSecondary;
            const isSelected = selectedSegmentId === seg.id;
            const isHighlighted = highlightedSegmentId === seg.id;

            let strokeColor = isSecondary ? '#D4CEC2' : '#C4BDAE';
            let strokeWidth = isSecondary ? 5.5 : 8;

            if (isReviewingCamera && isSelected) {
              strokeColor = '#007C76';
              strokeWidth = 11;
            } else if (isSelected) {
              strokeColor = '#D98818';
              strokeWidth = 10;
            } else if (isHighlighted) {
              strokeColor = '#007C76';
              strokeWidth = 10;
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

          {/* Fill Layer (White center merges seamlessly at junctions) */}
          {PUTTUR_SEGMENTS.map((seg) => {
            const isSecondary = seg.isSecondary;
            return (
              <path
                key={`fill-${seg.id}`}
                d={seg.pathD}
                fill="none"
                stroke={isSecondary ? '#FAF8F3' : '#FFFFFF'}
                strokeWidth={isSecondary ? 3 : 4.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                onClick={() => onSelectSegment(seg.id)}
                className="road-fill interactive-road"
                role="button"
                tabIndex={0}
                aria-label={`${seg.name}, ${seg.distanceKm} km`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectSegment(seg.id);
                }}
              />
            );
          })}
        </g>

        {/* 5. Historical Route Underneath (Muted Dashed Line during detour) */}
        {isDarbeClosed && !showOriginalView && originalRoute && (
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
        {displayedRoute && displayedRoute.isFound && (
          <g className="active-route-layer">
            {/* Narrow pale halo for separation at crossings */}
            {displayedRoute.segmentIds.map((segId) => {
              const seg = PUTTUR_SEGMENTS.find((s) => s.id === segId);
              if (!seg) return null;
              return (
                <path
                  key={`route-halo-${segId}`}
                  d={seg.pathD}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={8.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {/* Saturated Petrol Teal Core */}
            {displayedRoute.segmentIds.map((segId, idx) => {
              const seg = PUTTUR_SEGMENTS.find((s) => s.id === segId);
              if (!seg) return null;
              return (
                <path
                  key={`route-core-${segId}`}
                  d={seg.pathD}
                  fill="none"
                  stroke={showOriginalView ? '#4A726E' : '#007C76'}
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isDarbeClosed && !showOriginalView ? 'detour-draw-path' : ''}
                  style={{
                    animationDelay: `${idx * 140}ms`,
                  }}
                />
              );
            })}
          </g>
        )}

        {/* 7. Incident State Indicators on Closed or Reported Segments */}
        {/* Darbe West Approach: seg_bolwar_darbe midpoint (370, 370) */}
        {isDarbeClosed && (
          <g transform="translate(370, 370)" className="closure-indicator">
            {/* Coral Barrier Bar placed across the segment */}
            <path d="M -85 0 L 85 0" stroke="#DC3826" strokeWidth="8" strokeLinecap="round" opacity="0.9" />

            {/* Coral Hazard Barrier Symbol */}
            <rect x="-18" y="-10" width="36" height="20" rx="3" fill="#DC3826" stroke="#A82315" strokeWidth="1.5" />
            <rect x="-14" y="-7" width="28" height="14" fill="url(#barrierStripe)" />

            {/* Direct Leader Callout beneath the approach */}
            <g transform="translate(0, 30)">
              <line x1="0" y1="-20" x2="0" y2="-4" stroke="#DC3826" strokeWidth="1.5" />
              <rect x="-75" y="-10" width="150" height="22" rx="4" fill="#FFFFFF" stroke="#DC3826" strokeWidth="1.5" />
              <text x="0" y="5" fill="#DC3826" fontSize="11" fontWeight="800" textAnchor="middle" fontFamily="inherit">
                Darbe approach closed
              </text>
            </g>
          </g>
        )}

        {/* Selected Road Anchored Label (if not already closed with a barrier) */}
        {selectedSegmentId && !closedSegmentIds.includes(selectedSegmentId) && (
          (() => {
            const seg = PUTTUR_SEGMENTS.find((s) => s.id === selectedSegmentId);
            if (!seg) return null;
            // Midpoint coordinates for leader anchor
            let mx = 370;
            let my = 370;
            if (selectedSegmentId === 'seg_mukwe_parladka') { mx = 430; my = 502; }
            else if (selectedSegmentId === 'seg_kallare_bolwar') { mx = 200; my = 405; }
            else if (selectedSegmentId === 'seg_bolwar_courthill') { mx = 285; my = 295; }
            else if (selectedSegmentId === 'seg_courthill_town') { mx = 420; my = 185; }
            else if (selectedSegmentId === 'seg_town_kombettu') { mx = 650; my = 158; }
            else if (selectedSegmentId === 'seg_darbe_bannur') { mx = 560; my = 325; }
            else if (selectedSegmentId === 'seg_bannur_kombettu') { mx = 705; my = 210; }

            return (
              <g transform={`translate(${mx}, ${my})`} className="selected-road-anchor">
                <circle cx="0" cy="0" r="4.5" fill="#D98818" stroke="#FFFFFF" strokeWidth="1.8" />
                <g transform="translate(0, -26)">
                  <rect x="-65" y="-10" width="130" height="20" rx="3" fill="#FFFFFF" stroke="#D98818" strokeWidth="1.4" />
                  <text x="0" y="4" fill="#8C540B" fontSize="10" fontWeight="700" textAnchor="middle">
                    {seg.name.split('(')[0].trim()}
                  </text>
                </g>
              </g>
            );
          })()
        )}

        {/* Directional Camera Marker Layer */}
        {activeCameraRecord && (
          <g
            className={`camera-marker-layer ${isReviewingCamera ? 'camera-marker-active' : ''}`}
            transform={`translate(${activeCameraRecord.mapMarker.x}, ${activeCameraRecord.mapMarker.y})`}
          >
            {/* Directional Field-of-View Cone pointing along camera orientation */}
            <g transform={`rotate(${activeCameraRecord.mapMarker.angleDegrees})`}>
              <path
                d="M 0 0 L 110 -36 L 110 36 Z"
                fill="rgba(0, 124, 118, 0.18)"
                stroke="#007C76"
                strokeWidth="1.4"
                strokeDasharray="4 3"
              />
              <line
                x1="14"
                y1="0"
                x2="72"
                y2="0"
                stroke="#007C76"
                strokeWidth="1.8"
                strokeDasharray="3 2"
              />
              <polygon points="72,0 64,-3.5 64,3.5" fill="#007C76" />
            </g>

            {/* Camera Body Icon / Pill */}
            <circle cx="0" cy="0" r="14" fill="#FFFFFF" stroke="#007C76" strokeWidth="2.4" />
            <circle cx="0" cy="0" r="11" fill="#007C76" />
            {/* Camera glyph */}
            <path
              d="M -4.5 -2.5 L -3 -4.5 L 3 -4.5 L 4.5 -2.5 L 6 -2.5 C 6.8 -2.5 7.5 -1.8 7.5 -1 L 7.5 4 C 7.5 4.8 6.8 5.5 6 5.5 L -6 5.5 C -6.8 5.5 -7.5 4.8 -7.5 4 L -7.5 -1 C -7.5 -1.8 -6.8 -2.5 -6 -2.5 Z"
              fill="#FFFFFF"
            />
            <circle cx="0" cy="1.5" r="2.2" fill="#007C76" />

            {/* Camera Label Banner */}
            <g transform="translate(0, -22)">
              <rect
                x="-36"
                y="-9"
                width="72"
                height="18"
                rx="3.5"
                fill="#202C2C"
                stroke="#FFFFFF"
                strokeWidth="1.2"
              />
              <text
                x="0"
                y="3.5"
                fill="#FFFFFF"
                fontSize="9.5"
                fontWeight="700"
                textAnchor="middle"
                fontFamily="'JetBrains Mono', Consolas, monospace"
              >
                {activeCameraRecord.id}
              </text>
            </g>
          </g>
        )}

        {/* 8. Clean Geographic Labels (Positioned Beside Roads, Clear of Route Lines) */}
        <g className="map-labels">
          {/* Darbe Junction: Moved to (496, 395) to be completely clear of route */}
          <g transform="translate(480, 370)">
            <circle cx="0" cy="0" r="3.5" fill="#202C2C" stroke="#FFFFFF" strokeWidth="1.5" />
            <text x="16" y="24" fill="#202C2C" fontSize="15" fontWeight="800" className="map-place-label">
              Darbe Junction
            </text>
          </g>

          {/* Bolwar Cross: Moved above-left at (240, 348) clear of the road */}
          <g transform="translate(260, 370)">
            <circle cx="0" cy="0" r="3" fill="#3D4B4B" />
            <text x="-16" y="-18" textAnchor="end" fill="#202C2C" fontSize="13" fontWeight="700" className="map-place-label">
              Bolwar Cross
            </text>
          </g>

          {/* Court Hill */}
          <g transform="translate(310, 220)">
            <text x="-12" y="-10" textAnchor="end" fill="#3D4B4B" fontSize="12.5" fontWeight="600" className="map-place-label">
              Court Hill
            </text>
          </g>

          {/* Puttur Town Bypass */}
          <g transform="translate(530, 170)">
            <text x="0" y="-14" textAnchor="middle" fill="#3D4B4B" fontSize="12.5" fontWeight="600" className="map-place-label">
              Puttur Town Bypass
            </text>
          </g>

          {/* Bannur */}
          <g transform="translate(640, 280)">
            <text x="14" y="4" fill="#3D4B4B" fontSize="12.5" fontWeight="600" className="map-place-label">
              Bannur
            </text>
          </g>

          {/* Parladka */}
          <g transform="translate(540, 480)">
            <text x="12" y="16" fill="#586767" fontSize="12" fontWeight="500" className="map-place-label">
              Parladka
            </text>
          </g>
        </g>

        {/* 9. Clean Endpoint Markers (Distinct Start & Finish Symbols) */}
        {/* Origin: Kallare */}
        <g transform="translate(140, 440)">
          <circle cx="0" cy="0" r="7" fill="#007C76" stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="0" cy="0" r="2.5" fill="#FFFFFF" />
          <text x="0" y="24" textAnchor="middle" fill="#007C76" fontSize="13" fontWeight="800" className="map-place-label">
            Kallare
          </text>
        </g>

        {/* Destination: Kombettu */}
        <g transform="translate(770, 140)">
          <circle cx="0" cy="0" r="8" fill="#202C2C" stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="0" cy="0" r="3.5" fill="#007C76" />
          <text x="0" y="-18" textAnchor="middle" fill="#202C2C" fontSize="13" fontWeight="800" className="map-place-label">
            Kombettu
          </text>
        </g>
      </svg>

      {/* Quiet Bottom-Left Anchor: Single Demo Disclosure */}
      <div className="map-disclosure-anchor">
        <span className="disclosure-pill">Puttur pilot · schematic map</span>
      </div>

      {/* Quiet Bottom-Right Anchor: Fit Route Button */}
      <div className="map-controls-anchor">
        <button
          type="button"
          className="map-fit-btn"
          onClick={handleFitRoute}
          title="Restore full map view"
          aria-label="Restore full map view"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
