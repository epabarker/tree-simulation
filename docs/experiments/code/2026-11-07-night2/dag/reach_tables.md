## Reach by outcome (structural: every gate open)

Lag = the fewest season boundaries on a path from the param to the outcome: 0 means it acts in the season it is read; 1 or more means only through a feedback loop. Every param below reaches the outcome; groups in bold reach it with lag 0.

### height

- groups: **c1**, **c2**, **c3**, **c4**, **c5**, **c6**, **o2**, o4, **r1**, **r2**, **r2.levels**, **r3**, **r4**, **r5**, **r6**, **world**
- lag 0: `c1.betaSD`, `c1.branchAngle`, `c1.budBreak.width`, `c1.divergence`, `c1.internodeLength`, `c1.maxMetamersPerShoot`, `c1.phyllotaxis`, `c1.shootLengthSD`, `c2.C`, `c2.K`, `c2.kExt`, `c2.minElevation`, `c2.model`, `c2.rotate`, `c2.skyExponent`, `c2.skyTilt`, `c3.alpha`, `c3.lambda`, `c3.mode`, `c4.axisSD`, `c4.epsilon`, `c4.eta`, `c4.setPoint`, `c4.sigma`, `c4.wd`, `c4.xi`, `c5.T`, `c5.Trel`, `c5.Tvig`, `c5.g`, `c5.topQuantile`, `c6.n`, `c6.r0`, `o2.stormLoad`, `o2.stormP`, `r1.Lh`, `r1.fRep`, `r1.hydraulic`, `r1.kShed`, `r1.leafCost`, `r1.leafCostShade`, `r1.maturity`, `r1.mf`, `r1.mw`, `r1.qHalf`, `r1.reserve0`, `r1.response`, `r1.shed`, `r1.sr`, `r1.store`, `r2.aC`, `r2.dLambda`, `r2.forkAngle`, `r2.forkAt`, `r2.hJ`, `r2.kappa`, `r2.levels[k].agedSetPoint / agedOver / agedBy`, `r2.levels[k].branchAngle`, `r2.levels[k].curve / curveLength`, `r2.levels[k].dLambdaShare`, `r2.levels[k].eta`, `r2.levels[k].generator / whorl / tierEvery`, `r2.levels[k].kappa`, `r2.levels[k].lambda`, `r2.levels[k].lateralEvery`, `r2.levels[k].pTerm`, `r2.levels[k].pendulous / pendulousRadius`, `r2.levels[k].postureSetPoint`, `r2.levels[k].relay`, `r2.levels[k].setPoint`, `r2.lightLo / lightHi / lightOver`, `r2.lightSetPoint`, `r2.ramp`, `r2.relay`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r3.E`, `r3.ground`, `r3.leafMass`, `r3.posture / betaG / gamma / c`, `r3.rho`, `r3.sag / phi`, `r3.sigmaBreak`, `r3.sigmaTarget / girthGain`, `r4.bank`, `r4.delta`, `r4.juvenile`, `r4.lDorm`, `r4.qRel`, `r4.vBreak`, `r4.vCont`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal`, `r6.leafArea`, `r6.lifespan`, `r6.qMin`, `seed`, `world.depth`, `world.faces (tau)`, `world.fade`, `world.height`, `world.obstacles`, `world.periodic / periodicZ`, `world.walls`, `world.width`
- lag 1: `o2.sway / maxSway / pAbr`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r1.kStarve`
- loops on its paths: L1, L2, L3, L4, L5, L6, L7, L8, L9

### crown shape: dome D, W/H (crown.py on the dump)

- groups: **c1**, **c2**, **c3**, **c4**, **c5**, **c6**, **o2**, o4, **r1**, **r2**, **r2.levels**, **r3**, **r4**, **r5**, **r6**, **world**
- lag 0: `c1.betaSD`, `c1.branchAngle`, `c1.budBreak.width`, `c1.divergence`, `c1.internodeLength`, `c1.maxMetamersPerShoot`, `c1.phyllotaxis`, `c1.shootLengthSD`, `c2.C`, `c2.K`, `c2.kExt`, `c2.minElevation`, `c2.model`, `c2.rotate`, `c2.skyExponent`, `c2.skyTilt`, `c3.alpha`, `c3.lambda`, `c3.mode`, `c4.axisSD`, `c4.epsilon`, `c4.eta`, `c4.setPoint`, `c4.sigma`, `c4.wd`, `c4.xi`, `c5.T`, `c5.Trel`, `c5.Tvig`, `c5.g`, `c5.topQuantile`, `c6.n`, `c6.r0`, `o2.stormLoad`, `o2.stormP`, `r1.Lh`, `r1.fRep`, `r1.hydraulic`, `r1.kShed`, `r1.leafCost`, `r1.leafCostShade`, `r1.maturity`, `r1.mf`, `r1.mw`, `r1.qHalf`, `r1.reserve0`, `r1.response`, `r1.shed`, `r1.sr`, `r1.store`, `r2.aC`, `r2.dLambda`, `r2.forkAngle`, `r2.forkAt`, `r2.hJ`, `r2.kappa`, `r2.levels[k].agedSetPoint / agedOver / agedBy`, `r2.levels[k].branchAngle`, `r2.levels[k].curve / curveLength`, `r2.levels[k].dLambdaShare`, `r2.levels[k].eta`, `r2.levels[k].generator / whorl / tierEvery`, `r2.levels[k].kappa`, `r2.levels[k].lambda`, `r2.levels[k].lateralEvery`, `r2.levels[k].pTerm`, `r2.levels[k].pendulous / pendulousRadius`, `r2.levels[k].postureSetPoint`, `r2.levels[k].relay`, `r2.levels[k].setPoint`, `r2.lightLo / lightHi / lightOver`, `r2.lightSetPoint`, `r2.ramp`, `r2.relay`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r3.E`, `r3.ground`, `r3.leafMass`, `r3.posture / betaG / gamma / c`, `r3.rho`, `r3.sag / phi`, `r3.sigmaBreak`, `r3.sigmaTarget / girthGain`, `r4.bank`, `r4.delta`, `r4.juvenile`, `r4.lDorm`, `r4.qRel`, `r4.vBreak`, `r4.vCont`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal`, `r6.leafArea`, `r6.lifespan`, `r6.qMin`, `seed`, `world.depth`, `world.faces (tau)`, `world.fade`, `world.height`, `world.obstacles`, `world.periodic / periodicZ`, `world.walls`, `world.width`
- lag 1: `o2.sway / maxSway / pAbr`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r1.kStarve`
- loops on its paths: L1, L2, L3, L4, L5, L6, L7, L8, L9

### crown base: limbBase / leafCrownRatio

- groups: **c1**, **c2**, **c3**, **c4**, **c5**, **c6**, **o2**, o4, **r1**, **r2**, **r2.levels**, **r3**, **r4**, **r5**, **r6**, **world**
- lag 0: `c1.betaSD`, `c1.branchAngle`, `c1.budBreak.width`, `c1.divergence`, `c1.internodeLength`, `c1.maxMetamersPerShoot`, `c1.phyllotaxis`, `c1.shootLengthSD`, `c2.C`, `c2.K`, `c2.kExt`, `c2.minElevation`, `c2.model`, `c2.rotate`, `c2.skyExponent`, `c2.skyTilt`, `c3.alpha`, `c3.lambda`, `c3.mode`, `c4.axisSD`, `c4.epsilon`, `c4.eta`, `c4.setPoint`, `c4.sigma`, `c4.wd`, `c4.xi`, `c5.T`, `c5.Trel`, `c5.Tvig`, `c5.g`, `c5.topQuantile`, `c6.n`, `c6.r0`, `o2.stormLoad`, `o2.stormP`, `o2.sway / maxSway / pAbr`, `r1.Lh`, `r1.fRep`, `r1.hydraulic`, `r1.kShed`, `r1.leafCost`, `r1.leafCostShade`, `r1.maturity`, `r1.mf`, `r1.mw`, `r1.qHalf`, `r1.reserve0`, `r1.response`, `r1.shed`, `r1.sr`, `r1.store`, `r2.aC`, `r2.dLambda`, `r2.forkAngle`, `r2.forkAt`, `r2.hJ`, `r2.kappa`, `r2.levels[k].agedSetPoint / agedOver / agedBy`, `r2.levels[k].branchAngle`, `r2.levels[k].curve / curveLength`, `r2.levels[k].dLambdaShare`, `r2.levels[k].eta`, `r2.levels[k].generator / whorl / tierEvery`, `r2.levels[k].kappa`, `r2.levels[k].lambda`, `r2.levels[k].lateralEvery`, `r2.levels[k].pTerm`, `r2.levels[k].pendulous / pendulousRadius`, `r2.levels[k].postureSetPoint`, `r2.levels[k].relay`, `r2.levels[k].setPoint`, `r2.lightLo / lightHi / lightOver`, `r2.lightSetPoint`, `r2.ramp`, `r2.relay`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r3.E`, `r3.ground`, `r3.leafMass`, `r3.posture / betaG / gamma / c`, `r3.rho`, `r3.sag / phi`, `r3.sigmaBreak`, `r3.sigmaTarget / girthGain`, `r4.bank`, `r4.delta`, `r4.juvenile`, `r4.lDorm`, `r4.qRel`, `r4.vBreak`, `r4.vCont`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal`, `r6.leafArea`, `r6.lifespan`, `r6.qMin`, `seed`, `world.depth`, `world.faces (tau)`, `world.fade`, `world.height`, `world.obstacles`, `world.periodic / periodicZ`, `world.walls`, `world.width`
- lag 1: `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r1.kStarve`
- loops on its paths: L1, L2, L3, L4, L5, L6, L7, L8, L9

### floor light (groundLight)

- groups: c1, **c2**, c3, c4, c5, c6, o2, o4, r1, r2, r2.levels, r3, r4, r5, **r6**, **world**
- lag 0: `c2.C`, `c2.K`, `c2.kExt`, `c2.minElevation`, `c2.model`, `c2.rotate`, `c2.skyExponent`, `c2.skyTilt`, `r6.leafArea`, `world.depth`, `world.faces (tau)`, `world.fade`, `world.height`, `world.obstacles`, `world.periodic / periodicZ`, `world.walls`, `world.width`
- lag 1: `c1.betaSD`, `c1.branchAngle`, `c1.budBreak.width`, `c1.divergence`, `c1.internodeLength`, `c1.maxMetamersPerShoot`, `c1.phyllotaxis`, `c1.shootLengthSD`, `c3.alpha`, `c3.lambda`, `c3.mode`, `c4.axisSD`, `c4.epsilon`, `c4.eta`, `c4.setPoint`, `c4.sigma`, `c4.wd`, `c4.xi`, `c5.T`, `c5.Trel`, `c5.Tvig`, `c5.g`, `c5.topQuantile`, `c6.n`, `c6.r0`, `o2.stormLoad`, `o2.stormP`, `o2.sway / maxSway / pAbr`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r1.Lh`, `r1.fRep`, `r1.hydraulic`, `r1.kShed`, `r1.kStarve`, `r1.leafCost`, `r1.leafCostShade`, `r1.maturity`, `r1.mf`, `r1.mw`, `r1.qHalf`, `r1.reserve0`, `r1.response`, `r1.shed`, `r1.sr`, `r1.store`, `r2.aC`, `r2.dLambda`, `r2.forkAngle`, `r2.forkAt`, `r2.hJ`, `r2.kappa`, `r2.levels[k].agedSetPoint / agedOver / agedBy`, `r2.levels[k].branchAngle`, `r2.levels[k].curve / curveLength`, `r2.levels[k].dLambdaShare`, `r2.levels[k].eta`, `r2.levels[k].generator / whorl / tierEvery`, `r2.levels[k].kappa`, `r2.levels[k].lambda`, `r2.levels[k].lateralEvery`, `r2.levels[k].pTerm`, `r2.levels[k].pendulous / pendulousRadius`, `r2.levels[k].postureSetPoint`, `r2.levels[k].relay`, `r2.levels[k].setPoint`, `r2.lightLo / lightHi / lightOver`, `r2.lightSetPoint`, `r2.ramp`, `r2.relay`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r3.E`, `r3.ground`, `r3.leafMass`, `r3.posture / betaG / gamma / c`, `r3.rho`, `r3.sag / phi`, `r3.sigmaBreak`, `r3.sigmaTarget / girthGain`, `r4.bank`, `r4.delta`, `r4.juvenile`, `r4.lDorm`, `r4.qRel`, `r4.vBreak`, `r4.vCont`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal`, `r6.lifespan`, `r6.qMin`, `seed`
- loops on its paths: L1, L2, L3, L4, L5, L6, L7, L8, L9

### survival / mortality

- groups: **c1**, **c2**, **c3**, **c4**, **c5**, **c6**, **o2**, **o4**, **r1**, **r2**, **r2.levels**, **r3**, **r4**, **r5**, **r6**, **world**
- lag 0: `c1.betaSD`, `c1.branchAngle`, `c1.budBreak.width`, `c1.divergence`, `c1.internodeLength`, `c1.maxMetamersPerShoot`, `c1.phyllotaxis`, `c1.shootLengthSD`, `c2.C`, `c2.K`, `c2.kExt`, `c2.minElevation`, `c2.model`, `c2.rotate`, `c2.skyExponent`, `c2.skyTilt`, `c3.alpha`, `c3.lambda`, `c3.mode`, `c4.axisSD`, `c4.epsilon`, `c4.eta`, `c4.setPoint`, `c4.sigma`, `c4.wd`, `c4.xi`, `c5.T`, `c5.Trel`, `c5.Tvig`, `c5.g`, `c5.topQuantile`, `c6.n`, `c6.r0`, `o2.stormLoad`, `o2.stormP`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r1.Lh`, `r1.fRep`, `r1.hydraulic`, `r1.kShed`, `r1.kStarve`, `r1.leafCost`, `r1.leafCostShade`, `r1.maturity`, `r1.mf`, `r1.mw`, `r1.qHalf`, `r1.reserve0`, `r1.response`, `r1.shed`, `r1.sr`, `r1.store`, `r2.aC`, `r2.dLambda`, `r2.forkAngle`, `r2.forkAt`, `r2.hJ`, `r2.kappa`, `r2.levels[k].agedSetPoint / agedOver / agedBy`, `r2.levels[k].branchAngle`, `r2.levels[k].curve / curveLength`, `r2.levels[k].dLambdaShare`, `r2.levels[k].eta`, `r2.levels[k].generator / whorl / tierEvery`, `r2.levels[k].kappa`, `r2.levels[k].lambda`, `r2.levels[k].lateralEvery`, `r2.levels[k].pTerm`, `r2.levels[k].pendulous / pendulousRadius`, `r2.levels[k].postureSetPoint`, `r2.levels[k].relay`, `r2.levels[k].setPoint`, `r2.lightLo / lightHi / lightOver`, `r2.lightSetPoint`, `r2.ramp`, `r2.relay`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r3.E`, `r3.ground`, `r3.leafMass`, `r3.posture / betaG / gamma / c`, `r3.rho`, `r3.sag / phi`, `r3.sigmaBreak`, `r3.sigmaTarget / girthGain`, `r4.bank`, `r4.delta`, `r4.juvenile`, `r4.lDorm`, `r4.qRel`, `r4.vBreak`, `r4.vCont`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal`, `r6.leafArea`, `r6.lifespan`, `r6.qMin`, `seed`, `world.depth`, `world.faces (tau)`, `world.fade`, `world.height`, `world.obstacles`, `world.periodic / periodicZ`, `world.walls`, `world.width`
- lag 1: `o2.sway / maxSway / pAbr`
- loops on its paths: L1, L2, L3, L4, L5, L6, L7, L8, L9

### recruits

- groups: **c1**, **c2**, **c3**, **c4**, **c5**, **c6**, **o2**, **o4**, **r1**, **r2**, **r2.levels**, **r3**, **r4**, **r5**, **r6**, **world**
- lag 0: `c1.betaSD`, `c1.branchAngle`, `c1.budBreak.width`, `c1.divergence`, `c1.internodeLength`, `c1.maxMetamersPerShoot`, `c1.phyllotaxis`, `c1.shootLengthSD`, `c2.C`, `c2.K`, `c2.kExt`, `c2.minElevation`, `c2.model`, `c2.rotate`, `c2.skyExponent`, `c2.skyTilt`, `c3.alpha`, `c3.lambda`, `c3.mode`, `c4.axisSD`, `c4.epsilon`, `c4.eta`, `c4.setPoint`, `c4.sigma`, `c4.wd`, `c4.xi`, `c5.T`, `c5.Trel`, `c5.Tvig`, `c5.g`, `c5.topQuantile`, `c6.n`, `c6.r0`, `o2.stormLoad`, `o2.stormP`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r1.Lh`, `r1.fRep`, `r1.hydraulic`, `r1.kShed`, `r1.kStarve`, `r1.leafCost`, `r1.leafCostShade`, `r1.maturity`, `r1.mf`, `r1.mw`, `r1.qHalf`, `r1.reserve0`, `r1.response`, `r1.shed`, `r1.sr`, `r1.store`, `r2.aC`, `r2.dLambda`, `r2.forkAngle`, `r2.forkAt`, `r2.hJ`, `r2.kappa`, `r2.levels[k].agedSetPoint / agedOver / agedBy`, `r2.levels[k].branchAngle`, `r2.levels[k].curve / curveLength`, `r2.levels[k].dLambdaShare`, `r2.levels[k].eta`, `r2.levels[k].generator / whorl / tierEvery`, `r2.levels[k].kappa`, `r2.levels[k].lambda`, `r2.levels[k].lateralEvery`, `r2.levels[k].pTerm`, `r2.levels[k].pendulous / pendulousRadius`, `r2.levels[k].postureSetPoint`, `r2.levels[k].relay`, `r2.levels[k].setPoint`, `r2.lightLo / lightHi / lightOver`, `r2.lightSetPoint`, `r2.ramp`, `r2.relay`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r3.E`, `r3.ground`, `r3.leafMass`, `r3.posture / betaG / gamma / c`, `r3.rho`, `r3.sag / phi`, `r3.sigmaBreak`, `r3.sigmaTarget / girthGain`, `r4.bank`, `r4.delta`, `r4.juvenile`, `r4.lDorm`, `r4.qRel`, `r4.vBreak`, `r4.vCont`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal`, `r6.leafArea`, `r6.lifespan`, `r6.qMin`, `seed`, `world.depth`, `world.faces (tau)`, `world.fade`, `world.height`, `world.obstacles`, `world.periodic / periodicZ`, `world.walls`, `world.width`
- lag 1: `o2.sway / maxSway / pAbr`
- loops on its paths: L1, L2, L3, L4, L5, L6, L7, L8, L9

### metamers

- groups: **c1**, **c2**, **c3**, **c4**, **c5**, **c6**, **o2**, o4, **r1**, **r2**, **r2.levels**, **r3**, **r4**, **r5**, **r6**, **world**
- lag 0: `c1.betaSD`, `c1.branchAngle`, `c1.budBreak.width`, `c1.divergence`, `c1.internodeLength`, `c1.maxMetamersPerShoot`, `c1.phyllotaxis`, `c1.shootLengthSD`, `c2.C`, `c2.K`, `c2.kExt`, `c2.minElevation`, `c2.model`, `c2.rotate`, `c2.skyExponent`, `c2.skyTilt`, `c3.alpha`, `c3.lambda`, `c3.mode`, `c4.axisSD`, `c4.epsilon`, `c4.eta`, `c4.setPoint`, `c4.sigma`, `c4.wd`, `c4.xi`, `c5.T`, `c5.Trel`, `c5.Tvig`, `c5.g`, `c5.topQuantile`, `c6.n`, `c6.r0`, `o2.stormLoad`, `o2.stormP`, `r1.Lh`, `r1.fRep`, `r1.hydraulic`, `r1.kShed`, `r1.leafCost`, `r1.leafCostShade`, `r1.maturity`, `r1.mf`, `r1.mw`, `r1.qHalf`, `r1.reserve0`, `r1.response`, `r1.shed`, `r1.sr`, `r1.store`, `r2.aC`, `r2.dLambda`, `r2.forkAngle`, `r2.forkAt`, `r2.hJ`, `r2.kappa`, `r2.levels[k].agedSetPoint / agedOver / agedBy`, `r2.levels[k].branchAngle`, `r2.levels[k].curve / curveLength`, `r2.levels[k].dLambdaShare`, `r2.levels[k].eta`, `r2.levels[k].generator / whorl / tierEvery`, `r2.levels[k].kappa`, `r2.levels[k].lambda`, `r2.levels[k].lateralEvery`, `r2.levels[k].pTerm`, `r2.levels[k].pendulous / pendulousRadius`, `r2.levels[k].postureSetPoint`, `r2.levels[k].relay`, `r2.levels[k].setPoint`, `r2.lightLo / lightHi / lightOver`, `r2.lightSetPoint`, `r2.ramp`, `r2.relay`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r3.E`, `r3.ground`, `r3.leafMass`, `r3.posture / betaG / gamma / c`, `r3.rho`, `r3.sag / phi`, `r3.sigmaBreak`, `r3.sigmaTarget / girthGain`, `r4.bank`, `r4.delta`, `r4.juvenile`, `r4.lDorm`, `r4.qRel`, `r4.vBreak`, `r4.vCont`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal`, `r6.leafArea`, `r6.lifespan`, `r6.qMin`, `seed`, `world.depth`, `world.faces (tau)`, `world.fade`, `world.height`, `world.obstacles`, `world.periodic / periodicZ`, `world.walls`, `world.width`
- lag 1: `o2.sway / maxSway / pAbr`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r1.kStarve`
- loops on its paths: L1, L2, L3, L4, L5, L6, L7, L8, L9

### slenderness H/D

- groups: **c1**, **c2**, **c3**, **c4**, **c5**, **c6**, **o2**, o4, **r1**, **r2**, **r2.levels**, **r3**, **r4**, **r5**, **r6**, **world**
- lag 0: `c1.betaSD`, `c1.branchAngle`, `c1.budBreak.width`, `c1.divergence`, `c1.internodeLength`, `c1.maxMetamersPerShoot`, `c1.phyllotaxis`, `c1.shootLengthSD`, `c2.C`, `c2.K`, `c2.kExt`, `c2.minElevation`, `c2.model`, `c2.rotate`, `c2.skyExponent`, `c2.skyTilt`, `c3.alpha`, `c3.lambda`, `c3.mode`, `c4.axisSD`, `c4.epsilon`, `c4.eta`, `c4.setPoint`, `c4.sigma`, `c4.wd`, `c4.xi`, `c5.T`, `c5.Trel`, `c5.Tvig`, `c5.g`, `c5.topQuantile`, `c6.n`, `c6.r0`, `o2.stormLoad`, `o2.stormP`, `r1.Lh`, `r1.fRep`, `r1.hydraulic`, `r1.kShed`, `r1.leafCost`, `r1.leafCostShade`, `r1.maturity`, `r1.mf`, `r1.mw`, `r1.qHalf`, `r1.reserve0`, `r1.response`, `r1.shed`, `r1.sr`, `r1.store`, `r2.aC`, `r2.dLambda`, `r2.forkAngle`, `r2.forkAt`, `r2.hJ`, `r2.kappa`, `r2.levels[k].agedSetPoint / agedOver / agedBy`, `r2.levels[k].branchAngle`, `r2.levels[k].curve / curveLength`, `r2.levels[k].dLambdaShare`, `r2.levels[k].eta`, `r2.levels[k].generator / whorl / tierEvery`, `r2.levels[k].kappa`, `r2.levels[k].lambda`, `r2.levels[k].lateralEvery`, `r2.levels[k].pTerm`, `r2.levels[k].pendulous / pendulousRadius`, `r2.levels[k].postureSetPoint`, `r2.levels[k].relay`, `r2.levels[k].setPoint`, `r2.lightLo / lightHi / lightOver`, `r2.lightSetPoint`, `r2.ramp`, `r2.relay`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r3.E`, `r3.ground`, `r3.leafMass`, `r3.posture / betaG / gamma / c`, `r3.rho`, `r3.sag / phi`, `r3.sigmaBreak`, `r3.sigmaTarget / girthGain`, `r4.bank`, `r4.delta`, `r4.juvenile`, `r4.lDorm`, `r4.qRel`, `r4.vBreak`, `r4.vCont`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal`, `r6.leafArea`, `r6.lifespan`, `r6.qMin`, `seed`, `world.depth`, `world.faces (tau)`, `world.fade`, `world.height`, `world.obstacles`, `world.periodic / periodicZ`, `world.walls`, `world.width`
- lag 1: `o2.sway / maxSway / pAbr`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r1.kStarve`
- loops on its paths: L1, L2, L3, L4, L5, L6, L7, L8, L9

## Dead levers by species (gates evaluated on each species' effective params)

A param is dead when no gated path reaches any outcome: changing it cannot change the run (bit for bit). Context 'lone' is the sweep's lone tree (o2, o4 off, no storms, no neighbours, so R5's neighbour shade is 0); 'stand' assumes neighbours, o4 on and storms (the forest preset).

Not listed: `world.obstacles` and `o2.stormP` (lone), which are off at their value and switch their own rule on when set. A lever listed dead may still come alive when another param opens its gate (e.g. r2.forkAt needs the relay on).

Dead in every species and both contexts: `c1.branchAngle`, `c1.phyllotaxis`, `c3.lambda`, `c4.eta`, `c5.T`, `o2.sway / maxSway / pAbr`, `r1.qHalf`

### lone

| species | dead params (beyond the common set) | principles off |
|---|---|---|
| beech | `o2.stormLoad`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r2.relayCrowd`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal` | O2_ABRADE, O4_STAND, OBST, R2_CROWD, R5_SHADE, STORM |
| hornbeam | `o2.stormLoad`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal` | O2_ABRADE, O4_STAND, OBST, R2_CROWD, R5_SHADE, STORM |
| birch | `o2.stormLoad`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal` | O2_ABRADE, O4_STAND, OBST, R2_CROWD, R5_SHADE, STORM |
| oak | `o2.stormLoad`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal` | O2_ABRADE, O4_STAND, OBST, R2_CROWD, R5_SHADE, STORM |
| holly | `o2.stormLoad`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r2.lightLo / lightHi / lightOver`, `r2.relayCrowd`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal` | O2_ABRADE, O4_STAND, OBST, R2_CROWD, R5_SHADE, STORM |
| maple | `o2.stormLoad`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r2.forkAngle`, `r2.lightLo / lightHi / lightOver`, `r2.relayCrowd`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal` | O2_ABRADE, O4_STAND, OBST, R2_CROWD, R5_SHADE, STORM |
| rowan | `o2.stormLoad`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal` | O2_ABRADE, O4_STAND, OBST, R2_CROWD, R5_SHADE, STORM |
| willow | `o2.stormLoad`, `o4.cSeed / d`, `o4.m0`, `o4.maxTrees / rain / band`, `o4.qEst / pEst`, `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi`, `r5.dA`, `r5.dB`, `r5.dLambda`, `r5.eS`, `r5.signal` | O2_ABRADE, O4_STAND, OBST, R2_CROWD, R5_SHADE, STORM |

### stand

| species | dead params (beyond the common set) | principles off |
|---|---|---|
| beech | - | O2_ABRADE, OBST |
| hornbeam | `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi` | O2_ABRADE, OBST, R2_CROWD |
| birch | `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi` | O2_ABRADE, OBST, R2_CROWD |
| oak | `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi` | O2_ABRADE, OBST, R2_CROWD |
| holly | `r2.lightLo / lightHi / lightOver`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi` | O2_ABRADE, OBST |
| maple | `r2.forkAngle`, `r2.lightLo / lightHi / lightOver`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi` | O2_ABRADE, OBST, R2_CROWD |
| rowan | `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi` | O2_ABRADE, OBST, R2_CROWD |
| willow | `r2.forkAngle`, `r2.forkAt`, `r2.lightLo / lightHi / lightOver`, `r2.relayAge`, `r2.relayCrowd`, `r2.relayPTerm`, `r2.vigourLambda`, `r2.vigourShare`, `r2.vigourTreeLo / Hi` | O2_ABRADE, OBST, R2_CROWD |

## Within-season principle edges (feeds) and across-season ones (feedback)

| from | to | kind | via |
|---|---|---|---|
| OBST | OBST | feedback | S_geom |
| R1_CARBON | R1_CARBON | feedback | S_reserve |
| R4_FATE | C2_LIGHT | feedback | S_budstate |
| R4_FATE | O2_TAG | feedback | S_budstate |
| R4_FATE | C2_SAMPLE | feedback | S_budstate |
| R4_FATE | C5_QTOP | feedback | S_budstate |
| R4_FATE | C3_BASI | feedback | S_budstate |
| R4_FATE | R1_CARBON | feedback | S_reserve, S_budstate |
| R4_FATE | R4_FATE | feedback | S_reserve, S_budstate |
| R2_FORM | OBST | feedback | S_geom |
| R2_FORM | C2_LIGHT | feedback | S_budstate, S_geom |
| R2_FORM | O2_TAG | feedback | S_budstate, S_geom |
| R2_FORM | C2_SAMPLE | feedback | S_budstate, S_geom |
| R2_FORM | R5_SHADE | feedback | S_geom |
| R2_FORM | C5_QTOP | feedback | S_budstate |
| R2_FORM | C3_BASI | feedback | S_budstate, S_geom |
| R2_FORM | R1_CARBON | feedback | S_budstate, S_geom |
| R2_FORM | C3_ACRO | feedback | S_geom |
| R2_FORM | R4_FATE | feedback | S_budstate |
| R2_FORM | R2_FORM | feedback | S_budstate, S_geom |
| C4_DIR | OBST | feedback | S_geom |
| C4_DIR | C2_LIGHT | feedback | S_geom |
| C4_DIR | O2_TAG | feedback | S_geom |
| C4_DIR | C2_SAMPLE | feedback | S_geom |
| C4_DIR | R5_SHADE | feedback | S_geom |
| C4_DIR | C3_BASI | feedback | S_geom |
| C4_DIR | R1_CARBON | feedback | S_geom |
| C4_DIR | C3_ACRO | feedback | S_geom |
| C4_DIR | R2_FORM | feedback | S_geom |
| C4_DIR | C4_DIR | feedback | S_geom |
| C1_SHOOT | OBST | feedback | S_geom |
| C1_SHOOT | C2_LIGHT | feedback | S_budstate, S_geom |
| C1_SHOOT | O2_TAG | feedback | S_budstate, S_geom |
| C1_SHOOT | C2_SAMPLE | feedback | S_budstate, S_geom |
| C1_SHOOT | R5_SHADE | feedback | S_geom |
| C1_SHOOT | C5_QTOP | feedback | S_budstate |
| C1_SHOOT | C3_BASI | feedback | S_budstate, S_geom |
| C1_SHOOT | R1_CARBON | feedback | S_budstate, S_geom |
| C1_SHOOT | C3_ACRO | feedback | S_geom |
| C1_SHOOT | R4_FATE | feedback | S_budstate |
| C1_SHOOT | R2_FORM | feedback | S_budstate, S_geom, S_radius |
| C1_SHOOT | C4_DIR | feedback | S_geom |
| C1_SHOOT | C1_SHOOT | feedback | S_budstate, S_geom |
| R6_REST | C2_LIGHT | feedback | S_budstate |
| R6_REST | O2_TAG | feedback | S_budstate |
| R6_REST | C2_SAMPLE | feedback | S_budstate |
| R6_REST | C5_QTOP | feedback | S_budstate |
| R6_REST | C3_BASI | feedback | S_budstate |
| R6_REST | R1_CARBON | feedback | S_budstate |
| R6_REST | R4_FATE | feedback | S_budstate, S_budage |
| R6_REST | R2_FORM | feedback | S_budstate |
| R6_REST | C1_SHOOT | feedback | S_budstate |
| R6_REST | R6_REST | feedback | S_budstate, S_budage |
| C5_SHED | OBST | feedback | S_geom |
| C5_SHED | C2_LIGHT | feedback | S_budstate, S_geom |
| C5_SHED | O2_TAG | feedback | S_budstate, S_geom |
| C5_SHED | C2_SAMPLE | feedback | S_budstate, S_geom |
| C5_SHED | R5_SHADE | feedback | S_geom |
| C5_SHED | C5_QTOP | feedback | S_budstate |
| C5_SHED | C3_BASI | feedback | S_budstate, S_geom |
| C5_SHED | R1_CARBON | feedback | S_budstate, S_geom |
| C5_SHED | C3_ACRO | feedback | S_geom |
| C5_SHED | R4_FATE | feedback | S_budstate |
| C5_SHED | R2_FORM | feedback | S_budstate, S_geom |
| C5_SHED | C4_DIR | feedback | S_geom |
| C5_SHED | C1_SHOOT | feedback | S_budstate, S_geom |
| C5_SHED | R6_REST | feedback | S_budstate, S_geom |
| C5_SHED | C5_SHED | feedback | S_geom, S_deficit |
| C6_GIRTH | R2_FORM | feedback | S_radius |
| C6_GIRTH | C5_SHED | feedback | S_radius |
| C6_GIRTH | C6_GIRTH | feedback | S_radius |
| R3_MECH | OBST | feedback | S_geom |
| R3_MECH | C2_LIGHT | feedback | S_budstate, S_geom, S_alive |
| R3_MECH | O2_TAG | feedback | S_budstate, S_geom |
| R3_MECH | C2_SAMPLE | feedback | S_budstate, S_geom |
| R3_MECH | R5_SHADE | feedback | S_geom |
| R3_MECH | C5_QTOP | feedback | S_budstate |
| R3_MECH | C3_BASI | feedback | S_budstate, S_geom |
| R3_MECH | R1_CARBON | feedback | S_budstate, S_geom |
| R3_MECH | C3_ACRO | feedback | S_geom |
| R3_MECH | R4_FATE | feedback | S_budstate |
| R3_MECH | R2_FORM | feedback | S_budstate, S_geom, S_radius |
| R3_MECH | C4_DIR | feedback | S_geom |
| R3_MECH | C1_SHOOT | feedback | S_budstate, S_geom, S_alive |
| R3_MECH | R6_REST | feedback | S_budstate, S_geom |
| R3_MECH | C5_SHED | feedback | S_geom, S_radius, S_stress |
| R3_MECH | C6_GIRTH | feedback | S_geom, S_radius, S_stress |
| R3_MECH | R3_MECH | feedback | S_budstate, S_geom, S_radius, S_stress |
| COMMIT | C2_LIGHT | feedback | S_budstate |
| COMMIT | O2_TAG | feedback | S_budstate |
| COMMIT | C2_SAMPLE | feedback | S_budstate |
| COMMIT | C5_QTOP | feedback | S_budstate |
| COMMIT | C3_BASI | feedback | S_budstate |
| COMMIT | R1_CARBON | feedback | S_budstate, S_age |
| COMMIT | C3_ACRO | feedback | S_age |
| COMMIT | R4_FATE | feedback | S_budstate |
| COMMIT | R2_FORM | feedback | S_budstate, S_age |
| COMMIT | C1_SHOOT | feedback | S_budstate |
| COMMIT | R6_REST | feedback | S_budstate |
| COMMIT | R3_MECH | feedback | S_budstate |
| COMMIT | COMMIT | feedback | S_budstate |
| O2_ABRADE | C2_LIGHT | feedback | S_budstate |
| O2_ABRADE | O2_TAG | feedback | S_budstate |
| O2_ABRADE | C2_SAMPLE | feedback | S_budstate |
| O2_ABRADE | C5_QTOP | feedback | S_budstate |
| O2_ABRADE | C3_BASI | feedback | S_budstate |
| O2_ABRADE | R1_CARBON | feedback | S_budstate |
| O2_ABRADE | R4_FATE | feedback | S_budstate |
| O2_ABRADE | R2_FORM | feedback | S_budstate |
| O2_ABRADE | C1_SHOOT | feedback | S_budstate |
| O2_ABRADE | R6_REST | feedback | S_budstate |
| O2_ABRADE | R3_MECH | feedback | S_budstate |
| O2_ABRADE | COMMIT | feedback | S_budstate |
| O2_ABRADE | O2_ABRADE | feedback | S_budstate |
| R1_STARVE | C2_LIGHT | feedback | S_alive |
| R1_STARVE | C1_SHOOT | feedback | S_alive |
| O4_STAND | C2_LIGHT | feedback | S_alive |
| O4_STAND | C1_SHOOT | feedback | S_alive |
| O4_STAND | O4_STAND | feedback | S_seedpool, S_alive, S_trees |
| OBST | C2_LIGHT | feeds | S_budstate, S_geom, S_alive |
| OBST | O2_TAG | feeds | S_budstate, S_geom |
| OBST | C2_SAMPLE | feeds | S_budstate, S_geom |
| OBST | R5_SHADE | feeds | S_geom |
| OBST | C5_QTOP | feeds | S_budstate |
| OBST | C3_BASI | feeds | S_budstate, S_geom |
| OBST | R1_CARBON | feeds | S_budstate, S_geom |
| OBST | C3_ACRO | feeds | S_geom |
| OBST | R4_FATE | feeds | S_budstate |
| OBST | R2_FORM | feeds | S_budstate, S_geom |
| OBST | C4_DIR | feeds | S_geom |
| OBST | C1_SHOOT | feeds | S_budstate, S_geom, S_alive |
| OBST | R6_REST | feeds | S_budstate, S_geom |
| OBST | C5_SHED | feeds | S_geom |
| OBST | C6_GIRTH | feeds | S_geom, S_scars |
| OBST | R3_MECH | feeds | S_budstate, S_geom |
| OBST | COMMIT | feeds | S_budstate |
| OBST | O2_ABRADE | feeds | S_budstate, S_geom |
| OBST | O4_STAND | feeds | S_geom, S_alive |
| STORM | R3_MECH | feeds | S_storm |
| C2_LIGHT | C2_SAMPLE | feeds | S_light |
| C2_LIGHT | R5_SHADE | feeds | S_light |
| C2_LIGHT | O4_STAND | feeds | S_light |
| O2_TAG | R5_SHADE | feeds | S_owner |
| O2_TAG | O2_ABRADE | feeds | S_owner |
| C2_SAMPLE | C5_QTOP | feeds | S_budq |
| C2_SAMPLE | C3_BASI | feeds | S_budq |
| C2_SAMPLE | R1_CARBON | feeds | S_budq |
| C2_SAMPLE | R4_FATE | feeds | S_budq |
| C2_SAMPLE | R2_FORM | feeds | S_budq |
| C2_SAMPLE | C4_DIR | feeds | S_budq |
| C2_SAMPLE | R6_REST | feeds | S_budq |
| C2_SAMPLE | O2_ABRADE | feeds | S_budq |
| R5_SHADE | R2_CROWD | feeds | S_shade |
| R5_SHADE | C3_ACRO | feeds | S_shade |
| R5_SHADE | R4_FATE | feeds | S_shade |
| R5_SHADE | C4_DIR | feeds | S_shade |
| R5_SHADE | C1_SHOOT | feeds | S_shade |
| R2_CROWD | R2_FORM | feeds | S_crowd |
| C5_QTOP | C5_SHED | feeds | S_qtop |
| C3_BASI | C3_ACRO | feeds | S_qsum |
| C3_BASI | C5_SHED | feeds | S_qsum |
| R1_CARBON | C3_ACRO | feeds | S_vbase |
| R1_CARBON | R4_FATE | feeds | S_reserve |
| R1_CARBON | R2_FORM | feeds | S_vbase |
| R1_CARBON | C5_SHED | feeds | S_PM, S_vbase |
| R1_CARBON | R1_STARVE | feeds | S_starved |
| R1_CARBON | O4_STAND | feeds | S_seedpool |
| C3_ACRO | R4_FATE | feeds | S_vin |
| C3_ACRO | R2_FORM | feeds | S_vin |
| C3_ACRO | C1_SHOOT | feeds | S_vin |
| R4_FATE | R2_FORM | feeds | S_budstate |
| R4_FATE | C1_SHOOT | feeds | S_budstate |
| R4_FATE | R6_REST | feeds | S_budstate |
| R4_FATE | R3_MECH | feeds | S_budstate |
| R4_FATE | COMMIT | feeds | S_budstate |
| R4_FATE | O2_ABRADE | feeds | S_budstate |
| R2_FORM | C4_DIR | feeds | S_setpoint, S_geom |
| R2_FORM | C1_SHOOT | feeds | S_budstate, S_geom |
| R2_FORM | R6_REST | feeds | S_budstate, S_geom |
| R2_FORM | C5_SHED | feeds | S_geom |
| R2_FORM | C6_GIRTH | feeds | S_geom |
| R2_FORM | R3_MECH | feeds | S_setpoint, S_budstate, S_geom |
| R2_FORM | COMMIT | feeds | S_budstate |
| R2_FORM | O2_ABRADE | feeds | S_budstate, S_geom |
| R2_FORM | O4_STAND | feeds | S_geom |
| C4_DIR | C1_SHOOT | feeds | S_geom |
| C4_DIR | R6_REST | feeds | S_geom |
| C4_DIR | C5_SHED | feeds | S_geom |
| C4_DIR | C6_GIRTH | feeds | S_geom |
| C4_DIR | R3_MECH | feeds | S_geom |
| C4_DIR | O2_ABRADE | feeds | S_geom |
| C4_DIR | O4_STAND | feeds | S_geom |
| C1_SHOOT | R6_REST | feeds | S_budstate, S_geom |
| C1_SHOOT | C5_SHED | feeds | S_geom, S_radius |
| C1_SHOOT | C6_GIRTH | feeds | S_geom, S_radius |
| C1_SHOOT | R3_MECH | feeds | S_budstate, S_geom, S_radius |
| C1_SHOOT | COMMIT | feeds | S_budstate |
| C1_SHOOT | O2_ABRADE | feeds | S_budstate, S_geom, S_radius |
| C1_SHOOT | O4_STAND | feeds | S_geom |
| R6_REST | R3_MECH | feeds | S_budstate |
| R6_REST | COMMIT | feeds | S_budstate |
| R6_REST | O2_ABRADE | feeds | S_budstate |
| C5_SHED | C6_GIRTH | feeds | S_geom, S_scars |
| C5_SHED | R3_MECH | feeds | S_budstate, S_geom |
| C5_SHED | COMMIT | feeds | S_budstate |
| C5_SHED | O2_ABRADE | feeds | S_budstate, S_geom |
| C5_SHED | O4_STAND | feeds | S_geom |
| C6_GIRTH | R3_MECH | feeds | S_radius |
| C6_GIRTH | O2_ABRADE | feeds | S_radius |
| R3_MECH | COMMIT | feeds | S_budstate |
| R3_MECH | O2_ABRADE | feeds | S_budstate, S_geom, S_radius |
| R3_MECH | O4_STAND | feeds | S_geom, S_alive |
| COMMIT | O2_ABRADE | feeds | S_budstate |
| R1_STARVE | O4_STAND | feeds | S_alive |
