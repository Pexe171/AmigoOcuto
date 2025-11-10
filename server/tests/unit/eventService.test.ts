import { describe, beforeEach, afterEach, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEvent } from '../../src/services/eventService';
import * as eventRepository from '../../src/database/eventRepository';
import type { EventRecord } from '../../src/database/eventRepository';

type InsertEventInput = Parameters<typeof eventRepository.insertEvent>[0];

const originalInsertEvent = eventRepository.insertEvent;

let lastCall: InsertEventInput | null = null;

const mockEvent: EventRecord = {
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

describe('eventService.createEvent', () => {
  beforeEach(() => {
    lastCall = null;
    // @ts-expect-error override for tests
    eventRepository.insertEvent = (input: InsertEventInput) => {
      lastCall = input;
      return mockEvent;
    };
  });

  afterEach(() => {
    // @ts-expect-error restore original implementation
    eventRepository.insertEvent = originalInsertEvent;
  });

  it('normaliza dados e remove participantes duplicados', async () => {
    const result = await createEvent({
      name: '  Festa   de   fim   de   Ano  ',
      location: '  Centro Cultural  ',
      participantIds: ['p1', 'p1', 'p2'],
    });

    assert.equal(result.id, mockEvent.id);
    assert(lastCall);
    assert.equal(lastCall?.name, 'Festa de fim de Ano');
    assert.equal(lastCall?.location, 'Centro Cultural');
    assert.deepEqual(lastCall?.participants, ['p1', 'p2']);
  });

  it('permite criar evento sem participantes', async () => {
    await createEvent({
      name: 'Evento Sem Participantes',
      location: null,
    });

    assert(lastCall);
    assert.deepEqual(lastCall?.participants, []);
  });
});
