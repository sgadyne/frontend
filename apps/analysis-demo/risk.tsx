import React from 'react';
import {RiskLens} from '../pod-risk-lens/src/index';
import {syntheticRiskLensProvider} from '../../packages/risk-lens-data/synthetic-provider.mjs';
export default function RiskDemo(){return <RiskLens provider={syntheticRiskLensProvider}/>}
