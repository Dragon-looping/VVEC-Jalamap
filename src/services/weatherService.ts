import { RainWatchData } from '../types';

export const PUTTUR_RAINWATCH_DATA: RainWatchData = {
  location: 'Puttur',
  district: 'Dakshina Kannada, Karnataka',
  alertLevel: 'Yellow',
  intensity: 'Heavy Monsoon Showers',
  currentRainfallMmHr: 34,
  lastUpdated: '08:15 IST (Monsoon Alert Window)',
  forecastSummary: 'Intermittent heavy convective downpours expected along Western Ghats foothills.',
  advisory: 'Surface runoff may cause transient inundation at Darbe approach, Bolwar junction dip, and low-lying radial intersections. Drive cautiously.',
  source: 'Pilot Hydromet Context (IMD District Bulletin Integration)',
};

export function getRainWatchStatus(): RainWatchData {
  return PUTTUR_RAINWATCH_DATA;
}
