"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const Schieber = __importStar(require("../src/engine/schieber"));
function sumScores(st) {
    return (st.scores.team1 || 0) + (st.scores.team2 || 0);
}
function runOneHand() {
    let st = Schieber.startGameLocal();
    // let bots pick trump until playing (simulate naive decisions)
    while (st.phase === 'trump_selection') {
        const p = st.currentPlayer;
        if (p === 0) {
            // pick a random trump for player 0 (simulate human choosing randomly)
            const t = Schieber.chooseRandomTrump();
            st = Schieber.setTrumpAndDetectWeis(st, t);
        }
        else {
            const t = Schieber.chooseBotTrump(st, p);
            st = Schieber.setTrumpAndDetectWeis(st, t);
        }
    }
    // play until finished using simple bot choices
    while (st.phase !== 'finished') {
        if (st.currentPlayer !== 0) {
            const pick = Schieber.chooseBotCard(st, st.currentPlayer);
            if (!pick)
                break;
            st = Schieber.playCardLocal(st, st.currentPlayer, pick);
            if (st.pendingResolve) {
                st = Schieber.resolveTrick(st);
            }
        }
        else {
            // play first legal card for player 0
            const legal = Schieber.getLegalCardsForPlayer(st, 0);
            if (legal.length === 0)
                break;
            st = Schieber.playCardLocal(st, 0, legal[0].id);
            if (st.pendingResolve)
                st = Schieber.resolveTrick(st);
        }
    }
    return st;
}
function simulate(n = 20) {
    for (let i = 0; i < n; i++) {
        const st = runOneHand();
        const total = sumScores(st);
        console.log(`Hand ${i + 1}: Team1=${st.scores.team1} Team2=${st.scores.team2} Total=${total} Trump=${st.trump} Mult=${st.trumpMultiplier}`);
        if (total !== 157) {
            console.warn('Total points mismatch (expected 157)');
        }
    }
}
simulate(10);
