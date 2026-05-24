const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { createTestBot } = require('./common/TestBot');

const PAGE_ID = 'kctbh9vrtdwd';
const API = 'https://api.statuspage.io';
const FIXTURES = path.resolve(__dirname, 'fixtures');

test('show all component status', async () => {
  const ctx = await createTestBot();
  try {
    ctx.nock(API)
      .get(`/v1/pages/${PAGE_ID}/components.json`)
      .replyWithFile(200, `${FIXTURES}/components.json`);

    await ctx.send('hubot statuspage?');
    // wait a bit more for all three sends to land
    await new Promise((done) => { setTimeout(done, 100); });

    assert.equal(ctx.sends[0], 'There are currently 1 components in a degraded state');
    assert.equal(ctx.sends[1], '\nBroken Components:\n-------------\n');
    assert.equal(ctx.sends[2], 'Backend Database: degraded\n');
  } finally {
    ctx.shutdown();
  }
});

test('list incidents', async () => {
  const ctx = await createTestBot();
  try {
    ctx.nock(API)
      .get(`/v1/pages/${PAGE_ID}/incidents.json`)
      .replyWithFile(200, `${FIXTURES}/incidents.json`);

    const first = await ctx.sendAndWaitForResponse('hubot statuspage incidents');
    assert.equal(first, 'Unresolved incidents:');

    await new Promise((done) => { setTimeout(done, 100); });
    assert.equal(
      ctx.sends[1],
      'Data Layer Migration (Status: scheduled, Created: 2020-08-14T16:11:34Z, ID: bd0b7yh8rkfz)',
    );
  } finally {
    ctx.shutdown();
  }
});

test('update most recent incident', async () => {
  const ctx = await createTestBot();
  try {
    ctx.nock(API)
      .get(`/v1/pages/${PAGE_ID}/incidents.json`)
      .replyWithFile(200, `${FIXTURES}/unresolved-incidents.json`);
    ctx.nock(API)
      .patch(`/v1/pages/${PAGE_ID}/incidents/bd0b7yh8rkfz.json`)
      .replyWithFile(200, `${FIXTURES}/unresolved-incidents.json`);

    const response = await ctx.sendAndWaitForResponse(
      'hubot statuspage update monitoring We have dispatched an army to fix it.',
    );
    assert.equal(response, 'Updated incident "System has been invaded by Barbarians"');
  } finally {
    ctx.shutdown();
  }
});

test('update specific incident', async () => {
  const ctx = await createTestBot();
  try {
    ctx.nock(API)
      .get(`/v1/pages/${PAGE_ID}/incidents.json`)
      .replyWithFile(200, `${FIXTURES}/unresolved-incidents.json`);
    ctx.nock(API)
      .patch(`/v1/pages/${PAGE_ID}/incidents/bd0b7yh8rkfz.json`)
      .replyWithFile(200, `${FIXTURES}/incident.json`);

    const response = await ctx.sendAndWaitForResponse(
      'hubot statuspage update bd0b7yh8rkfz monitoring We have dispatched an army to fix it.',
    );
    assert.equal(response, 'Updated incident "System has been invaded by Barbarians"');
  } finally {
    ctx.shutdown();
  }
});

test('open new incident', async () => {
  const ctx = await createTestBot();
  try {
    ctx.nock(API)
      .post(`/v1/pages/${PAGE_ID}/incidents.json`)
      .replyWithFile(200, `${FIXTURES}/unresolved-incidents.json`);

    const response = await ctx.sendAndWaitForResponse(
      'hubot statuspage open investigating System has been invaded by Barbarians',
    );
    assert.equal(response, 'Created incident "System has been invaded by Barbarians"');
  } finally {
    ctx.shutdown();
  }
});

test('open new incident with message', async () => {
  const ctx = await createTestBot();
  try {
    ctx.nock(API)
      .post(`/v1/pages/${PAGE_ID}/incidents.json`)
      .replyWithFile(200, `${FIXTURES}/unresolved-incidents.json`);

    const response = await ctx.sendAndWaitForResponse(
      'hubot statuspage open investigating System has been invaded by Barbarians:Send help fast!',
    );
    assert.equal(response, 'Created incident "System has been invaded by Barbarians"');
  } finally {
    ctx.shutdown();
  }
});

test('update component not found', async () => {
  const ctx = await createTestBot();
  try {
    ctx.nock(API)
      .get(`/v1/pages/${PAGE_ID}/components.json`)
      .replyWithFile(200, `${FIXTURES}/components.json`);

    const response = await ctx.sendAndWaitForResponse('hubot statuspage Backend major outage');
    assert.equal(response, "Couldn't find a component named Backend");
  } finally {
    ctx.shutdown();
  }
});

test('update component status', async () => {
  const ctx = await createTestBot();
  try {
    ctx.nock(API)
      .get(`/v1/pages/${PAGE_ID}/components.json`)
      .replyWithFile(200, `${FIXTURES}/components.json`);
    ctx.nock(API)
      .patch(`/v1/pages/${PAGE_ID}/components/string.json`)
      .replyWithFile(200, `${FIXTURES}/components.json`);

    const response = await ctx.sendAndWaitForResponse(
      'hubot statuspage Backend Database major outage',
    );
    assert.equal(response, 'Status for Backend Database is now major outage (was: degraded)');
  } finally {
    ctx.shutdown();
  }
});
