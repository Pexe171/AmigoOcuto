UPDATE events SET participants = '["550e8400-e29b-41d4-a716-446655440000","550e8400-e29b-41d4-a716-446655440001","550e8400-e29b-41d4-a716-446655440002","550e8400-e29b-41d4-a716-446655440003"]' WHERE id = '500afe14-a88d-40df-81c6-291da92b8c8e';

INSERT INTO giftLists (id, participantId, items, createdAt, updatedAt) VALUES ('test1', '550e8400-e29b-41d4-a716-446655440000', '[{"id":"testgift1","name":"Presente de teste 1","url":"","notes":"","purchased":false}]', '2025-11-09 21:55:51', '2025-11-09 21:55:51');

INSERT INTO giftLists (id, participantId, items, createdAt, updatedAt) VALUES ('test2', '550e8400-e29b-41d4-a716-446655440002', '[{"id":"testgift2","name":"Presente de teste 2","url":"","notes":"","purchased":false}]', '2025-11-09 21:55:55', '2025-11-09 21:55:55');

INSERT INTO giftLists (id, participantId, items, createdAt, updatedAt) VALUES ('test3', '550e8400-e29b-41d4-a716-446655440003', '[{"id":"testgift3","name":"Presente de teste 3","url":"","notes":"","purchased":false}]', '2025-11-09 21:56:02', '2025-11-09 21:56:02');

INSERT INTO giftLists (id, participantId, items, createdAt, updatedAt) VALUES ('gift_david', '5b1869ca-0746-4b15-9d90-918a8d9a96dc', '[{"id":"gift1","name":"Presente 1","url":"","notes":"","purchased":false}]', '2025-11-09 22:00:00', '2025-11-09 22:00:00');
