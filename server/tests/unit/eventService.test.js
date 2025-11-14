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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const eventService_1 = require("../../src/services/eventService");
const eventRepository = __importStar(require("../../src/database/eventRepository"));
const originalInsertEvent = eventRepository.insertEvent;
let lastCall = null;
const mockEvent = {
    id: 'event-123',
    name: 'Festa de Fim de Ano',
    location: 'Lisboa',
    status: 'ativo',
    participants: ['p1', 'p2'],
    drawHistory: [],
    drawDateTime: null,
    moderatorEmail: null,
    createdAt: new Date(),
    updatedAt: new Date(),
};
(0, node_test_1.describe)('eventService.createEvent', () => {
    (0, node_test_1.beforeEach)(() => {
        lastCall = null;
        // @ts-expect-error override for tests
        eventRepository.insertEvent = (input) => {
            lastCall = input;
            return mockEvent;
        };
    });
    (0, node_test_1.afterEach)(() => {
        // @ts-expect-error restore original implementation
        eventRepository.insertEvent = originalInsertEvent;
    });
    (0, node_test_1.it)('normaliza dados e remove participantes duplicados', async () => {
        const result = await (0, eventService_1.createEvent)({
            name: '  Festa   de   fim   de   Ano  ',
            location: '  Centro Cultural  ',
            participantIds: ['p1', 'p1', 'p2'],
        });
        strict_1.default.equal(result.id, mockEvent.id);
        (0, strict_1.default)(lastCall);
        strict_1.default.equal(lastCall?.name, 'Festa de fim de Ano');
        strict_1.default.equal(lastCall?.location, 'Centro Cultural');
        strict_1.default.deepEqual(lastCall?.participants, ['p1', 'p2']);
    });
    (0, node_test_1.it)('permite criar evento sem participantes', async () => {
        await (0, eventService_1.createEvent)({
            name: 'Evento Sem Participantes',
            location: null,
        });
        (0, strict_1.default)(lastCall);
        strict_1.default.deepEqual(lastCall?.participants, []);
    });
});
//# sourceMappingURL=eventService.test.js.map