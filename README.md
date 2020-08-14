# Hubot StatusPage

Interaction with the StatusPage.io API to open and update incidents, change component status.

[![Build Status](https://travis-ci.org/stephenyeargin/hubot-statuspage.png)](https://travis-ci.org/stephenyeargin/hubot-statuspage)

## Configuration

| Environment Variable                | Required? |                            |
| ------------------------------------| :-------: | -------------------------- |
| `HUBOT_STATUS_PAGE_ID`              | *Yes* | Found in the My Company > API tab. |
| `HUBOT_STATUS_PAGE_TOKEN`           | *Yes* | Found in the My Company > API tab. |
| `HUBOT_STATUS_PAGE_TWITTER_ENABLED` | No  | `t` or `f`                       |
| `HUBOT_STATUS_PAGE_SHOW_WORKING`    | No  | `1' or nothing                   |

## Adding to Your Hubot

See full instructions [here](https://github.com/github/hubot/blob/master/docs/scripting.md#npm-packages).

1. `npm install hubot-statuspage --save` (updates your `package.json` file)
2. Open the `external-scripts.json` file in the root directory (you may need to create this file) and add an entry to the array (e.g. `[ 'hubot-statuspage' ]`).

## Commands

- `hubot status?` - Display an overall status of all components
- `hubot status <component>?` - Display the status of a single component
- `hubot status <component>` (degraded performance|partial outage|major outage|operational) - Set the status for a component. You can also use degraded, partial or major as shortcuts.
- `hubot status incidents` - Show all unresolved incidents
- `hubot status open (investigating|identified|monitoring|resolved) <name>: <message>` - Create a new incident using the specified name and message, setting it to the desired status (investigating, etc.). The message can be omitted
- `hubot status update <status> <message>` - Update the latest open incident with the specified status and message.

## Credits

Originally [developed](https://github.com/travis-ci/moustached-hubot/blob/master/scripts/statuspage.coffee) by the team at Travis CI.
