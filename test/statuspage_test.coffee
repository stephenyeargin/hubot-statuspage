Helper = require('hubot-test-helper')
chai = require 'chai'
sinon = require 'sinon'
chai.use require 'sinon-chai'
nock = require('nock')

helper = new Helper('./../src/statuspage.coffee')

expect = chai.expect

describe 'statuspage', ->
  room = null

  beforeEach ->
    process.env.HUBOT_STATUS_PAGE_ID = '63kbmt268d37'
    process.env.HUBOT_STATUS_PAGE_TOKEN = '89a229ce1a8dbcf9ff30430fbe35eb4c0426574bca932061892cefd2138aa4b1'
    room = helper.createRoom()
    nock.disableNetConnect()

    @robot =
      respond: sinon.spy()
      hear: sinon.spy()

    require('../src/statuspage')(@robot)

  afterEach ->
    room.destroy()
    nock.cleanAll()
    delete process.env.HUBOT_STATUS_PAGE_ID
    delete process.env.HUBOT_STATUS_PAGE_TOKEN

  context 'ensure all listeners are registered', ->
    it 'registers a respond listener for all incidents', ->
      expect(@robot.respond).to.have.been.calledWith(/(?:status|statuspage) incidents\??/i)
    it 'registers a respond listener for update incident', ->
      expect(@robot.respond).to.have.been.calledWith(/(?:status|statuspage) update (investigating|identified|monitoring|resolved) (.+)/i)
    it 'registers a respond listener for create new incident', ->
      expect(@robot.respond).to.have.been.calledWith(/(?:status|statuspage) open (investigating|identified|monitoring|resolved) ([^:]+)(: ?(.+))?/i)
    it 'registers a respond listener for getting all component statuses', ->
      expect(@robot.respond).to.have.been.calledWith(/(?:status|statuspage)\?$/i)
    it 'registers a respond listener for getting single component status', ->
      expect(@robot.respond).to.have.been.calledWith(/(?:status|statuspage) ((?!(incidents|open|update|resolve|create))(\S ?)+)\?$/i)
    it 'registers a respond listener for update component', ->
      expect(@robot.respond).to.have.been.calledWith(/(?:status|statuspage) ((\S ?)+) (major( outage)?|degraded( performance)?|partial( outage)?|operational)/i)

  context 'show all component status', ->
    beforeEach (done) ->
      nock('https://api.statuspage.io')
        .get('/v1/pages/63kbmt268d37/components.json')
        .replyWithFile(200, __dirname + '/fixtures/components.json')
      room.user.say 'alice', 'hubot statuspage?'
      setTimeout done, 100
  
    it 'responds with all component status', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot statuspage?' ]
        [ 'hubot', 'There are currently 1 components in a degraded state' ]
        [ 'hubot', "\nBroken Components:\n-------------\n"]
        [ 'hubot', "Backend Database: degraded\n"]
      ]

  context 'list incidents', ->
    beforeEach (done) ->
      nock('https://api.statuspage.io')
        .get('/v1/pages/63kbmt268d37/incidents.json')
        .replyWithFile(200, __dirname + '/fixtures/incidents.json')
      room.user.say 'alice', 'hubot statuspage incidents'
      setTimeout done, 100
  
    it 'responds with a list of incidents', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot statuspage incidents' ]
        [ 'hubot', 'Unresolved incidents:']
        [ 'hubot', 'Data Layer Migration (Status: scheduled, Created: 2020-08-14T16:11:34Z, id: bd0b7yh8rkfz)']
      ]

  context 'update most recent incident', ->
    beforeEach (done) ->
      nock('https://api.statuspage.io')
        .get('/v1/pages/63kbmt268d37/incidents.json')
        .replyWithFile(200, __dirname + '/fixtures/unresolved-incidents.json')
      nock('https://api.statuspage.io')
        .patch('/v1/pages/63kbmt268d37/incidents/bd0b7yh8rkfz.json')
        .replyWithFile(200, __dirname + '/fixtures/unresolved-incidents.json')
      room.user.say 'alice', 'hubot statuspage update monitoring We have dispatched an army to fix it.'
      setTimeout done, 100
  
    it 'updates the most recent issue', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot statuspage update monitoring We have dispatched an army to fix it.' ]
        [ 'hubot', 'Updated incident "System has been invaded by Barbarians"']
      ]

  context 'update specific incident', ->
    beforeEach (done) ->
      nock('https://api.statuspage.io')
        .get('/v1/pages/63kbmt268d37/incidents.json')
        .replyWithFile(200, __dirname + '/fixtures/unresolved-incidents.json')
      nock('https://api.statuspage.io')
        .patch('/v1/pages/63kbmt268d37/incidents/bd0b7yh8rkfz.json')
        .replyWithFile(200, __dirname + '/fixtures/incident.json')
      room.user.say 'alice', 'hubot statuspage update bd0b7yh8rkfz monitoring We have dispatched an army to fix it.'
      setTimeout done, 100
  
    it 'updates the most recent issue', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot statuspage update bd0b7yh8rkfz monitoring We have dispatched an army to fix it.' ]
        [ 'hubot', 'Updated incident "System has been invaded by Barbarians"']
      ]

  context 'open new incident', ->
    beforeEach (done) ->
      nock('https://api.statuspage.io')
        .post('/v1/pages/63kbmt268d37/incidents.json')
        .replyWithFile(200, __dirname + '/fixtures/unresolved-incidents.json')
      room.user.say 'alice', 'hubot statuspage open investigating System has been invaded by Barbarians'
      setTimeout done, 100
  
    it 'opens a new incident', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot statuspage open investigating System has been invaded by Barbarians' ]
        [ 'hubot', 'Created incident "System has been invaded by Barbarians"']
      ]

  context 'open new incident with message', ->
    beforeEach (done) ->
      nock('https://api.statuspage.io')
        .post('/v1/pages/63kbmt268d37/incidents.json')
        .replyWithFile(200, __dirname + '/fixtures/unresolved-incidents.json')
      room.user.say 'alice', 'hubot statuspage open investigating System has been invaded by Barbarians:Send help fast!'
      setTimeout done, 100
  
    it 'opens a new incident with message', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot statuspage open investigating System has been invaded by Barbarians:Send help fast!' ]
        [ 'hubot', 'Created incident "System has been invaded by Barbarians"']
      ]

  context 'update component not found status', ->
    beforeEach (done) ->
      nock('https://api.statuspage.io')
        .get('/v1/pages/63kbmt268d37/components.json')
        .replyWithFile(200, __dirname + '/fixtures/components.json')
      room.user.say 'alice', 'hubot statuspage Backend major outage'
      setTimeout done, 100
  
    it 'responds with an error message', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot statuspage Backend major outage' ]
        [ 'hubot', 'Couldn\'t find a component named Backend']
      ]

  context 'update component status', ->
    beforeEach (done) ->
      nock('https://api.statuspage.io')
        .get('/v1/pages/63kbmt268d37/components.json')
        .replyWithFile(200, __dirname + '/fixtures/components.json')
      nock('https://api.statuspage.io')
        .patch('/v1/pages/63kbmt268d37/components/string.json')
        .replyWithFile(200, __dirname + '/fixtures/components.json')
      room.user.say 'alice', 'hubot statuspage Backend Database major outage'
      setTimeout done, 100
  
    it 'responds with updated component status', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot statuspage Backend Database major outage' ]
        [ 'hubot', 'Status for Backend Database is now major outage (was: degraded)']
      ]
