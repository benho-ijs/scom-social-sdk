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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schnorr = exports.secp256k1 = exports.Bech32 = exports.Nip19 = exports.Keys = exports.Event = void 0;
exports.Event = __importStar(require("./nostr/event"));
exports.Keys = __importStar(require("./nostr/keys"));
exports.Nip19 = __importStar(require("./nostr/nip19"));
exports.Bech32 = __importStar(require("./bech32"));
var secp256k1_1 = require("./curves/secp256k1");
Object.defineProperty(exports, "secp256k1", { enumerable: true, get: function () { return secp256k1_1.secp256k1; } });
Object.defineProperty(exports, "schnorr", { enumerable: true, get: function () { return secp256k1_1.schnorr; } });
