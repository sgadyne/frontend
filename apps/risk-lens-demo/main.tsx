import React from 'react';
import {createRoot} from 'react-dom/client';
import {RiskLens} from '../pod-risk-lens/src/index';
import {syntheticRiskLensProvider} from '../../packages/risk-lens-data/synthetic-provider.mjs';
createRoot(document.getElementById('root')!).render(<><div style={{padding:8,background:'#fff2c8',color:'#43351b'}}>SYNTHETIC DEMO - no live sources or credentials</div><RiskLens provider={syntheticRiskLensProvider}/></>);
