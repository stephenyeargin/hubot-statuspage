// Description:
//   Interaction with the StatusPage.io API to open and update incidents, change component status.
//
// Commands:
//   hubot status? - Display an overall status of all components
//   hubot status <component>? - Display the status of a single component
//   hubot status <component> (degraded performance|partial outage|major outage|operational) - Set the status for a component. You can also use degraded, partial or major as shortcuts.
//   hubot status incidents - Show all unresolved incidents
//   hubot status open (investigating|identified|monitoring|resolved) <name>: <message> - Create a new incident using the specified name and message, setting it to the desired status (investigating, etc.). The message can be omitted
//   hubot status update (investigating|identified|monitoring|resolved) <message> - Update the latest open incident with the specified status and message.
//   hubot status update <incidentId> (investigating|identified|monitoring|resolved) <message> - Update a specific open incident with the specified status and message.
//

module.exports = (robot) => {
  const baseUrl = `https://api.statuspage.io/v1/pages/${process.env.HUBOT_STATUS_PAGE_ID}`;
  const authHeader = { Authorization: `OAuth ${process.env.HUBOT_STATUS_PAGE_TOKEN}` };
  const componentStatuses = {
    degraded: 'degraded performance',
    major: 'major outage',
    partial: 'partial outage',
  };
  const sendTwitterUpdate = process.env.HUBOT_STATUS_PAGE_TWITTER_ENABLED ? 't' : 'f';

  // get list of incidents
  robot.respond(/(?:status|statuspage) incidents\??/i, (msg) => msg.http(`${baseUrl}/incidents.json`).headers(authHeader).get()((err, res, body) => {
    const response = JSON.parse(body);
    if (response.error) {
      msg.send(`Error talking to StatusPage.io: ${response.error}`);
    } else {
      const unresolvedIncidents = response.filter((incident) => (incident.status !== 'resolved') && (incident.status !== 'postmortem') && (incident.status !== 'completed'));
      if (unresolvedIncidents.length === 0) {
        msg.send('All clear, no unresolved incidents!');
      } else {
        msg.send('Unresolved incidents:');
        const results = [];
        unresolvedIncidents.forEach((incident) => {
          results.push(`${incident.name} (Status: ${incident.status}, Created: ${incident.created_at}, ID: ${incident.id})`);
        });
        msg.send(results.join('\n'));
      }
    }
  }));

  robot.respond(/(?:status|statuspage) update (\S+) (investigating|identified|monitoring|resolved) (.+)/i, (msg) => msg.http(`${baseUrl}/incidents.json`).headers(authHeader).get()((err, res, body) => {
    let response = JSON.parse(body);
    if (response.error) {
      msg.send(`Error talking to StatusPage.io: ${response.error}`);
      return;
    }
    const unresolvedIncidents = response.filter((incident) => !incident.backfilled && (incident.status !== 'resolved') && (incident.status !== 'postmortem') && (incident.status !== 'completed') && (incident.status !== 'scheduled'));
    if (unresolvedIncidents.length === 0) {
      msg.send('Sorry, there are no unresolved incidents.');
      return;
    }
    const incidentId = msg.match[1];
    const incident = {
      status: msg.match[2],
      message: msg.match[3],
      wants_twitter_update: sendTwitterUpdate,
    };
    const params = { incident };
    msg.http(`${baseUrl}/incidents/${incidentId}.json`).headers(authHeader).patch(JSON.stringify(params))((err1, res1, body1) => {
      let unresolvedIncidentIndex;
      response = JSON.parse(body1);
      for (let index = 0; index < unresolvedIncidents.length; index += 1) {
        const unresolvedIncident = unresolvedIncidents[index];
        if (unresolvedIncident.id === incidentId) {
          unresolvedIncidentIndex = index;
        }
      }
      if (response.error) {
        msg.send(`Error updating incident ${unresolvedIncidents[unresolvedIncidentIndex].name}: ${response.error}`);
        return;
      }
      msg.send(`Updated incident "${unresolvedIncidents[unresolvedIncidentIndex].name}"`);
    });
  }));

  // update open incident
  robot.respond(/(?:status|statuspage) update (investigating|identified|monitoring|resolved) (.+)/i, (msg) => msg.http(`${baseUrl}/incidents.json`).headers(authHeader).get()((err, res, body) => {
    let response = JSON.parse(body);
    if (response.error) {
      msg.send(`Error talking to StatusPage.io: ${response.error}`);
      return;
    }
    const unresolvedIncidents = response.filter((incident) => !incident.backfilled && (incident.status !== 'resolved') && (incident.status !== 'postmortem') && (incident.status !== 'completed') && (incident.status !== 'scheduled'));
    if (unresolvedIncidents.length === 0) {
      msg.send('Sorry, there are no unresolved incidents.');
      return;
    }
    const incidentId = unresolvedIncidents[0].id;
    const incident = {
      status: msg.match[1],
      message: msg.match[2],
      wants_twitter_update: sendTwitterUpdate,
    };
    const params = { incident };
    msg.http(`${baseUrl}/incidents/${incidentId}.json`).headers(authHeader).patch(JSON.stringify(params))((err1, res1, body1) => {
      response = JSON.parse(body1);
      if (response.error) {
        msg.send(`Error updating incident ${unresolvedIncidents[0].name}: ${response.error}`);
        return;
      }
      msg.send(`Updated incident "${unresolvedIncidents[0].name}"`);
    });
  }));

  // create new incident (with optional message)
  robot.respond(/(?:status|statuspage) open (investigating|identified|monitoring|resolved) ([^:]+)(: ?(.+))?/i, (msg) => {
    let message;
    let name;
    if (msg.match.length === 5) {
      [, , name, , message] = msg.match;
    } else {
      [, , name] = msg.match;
    }

    const incident = {
      status: msg.match[1],
      wants_twitter_update: sendTwitterUpdate,
      message,
      name,
    };
    const params = { incident };
    msg.http(`${baseUrl}/incidents.json`)
      .headers(authHeader)
      .post(JSON.stringify(params))((err, response, body) => {
        const json = JSON.parse(body);
        if (json.error) {
          msg.send(`Error updating incident "${name}": ${json.error}`);
        }
        msg.send(`Created incident "${name}"`);
      });
  });

  // get all component status
  robot.respond(/(?:status|statuspage)\?$/i, (msg) => msg.http(`${baseUrl}/components.json`)
    .headers(authHeader)
    .get()((err, res, body) => {
      const components = JSON.parse(body);
      const workingComponents = components.filter((component) => component.status === 'operational');
      const brokenComponents = components.filter((component) => component.status !== 'operational');
      if (brokenComponents.length === 0) {
        msg.send('All systems operational!');
      } else {
        msg.send(`There are currently ${brokenComponents.length} components in a degraded state`);
      }
      if (brokenComponents.length > 0) {
        msg.send('\nBroken Components:\n-------------\n');
        const result = [];
        brokenComponents.forEach((component) => {
          result.push(`${component.name}: ${component.status.replace(/_/g, ' ')}\n`);
        });
        msg.send(result.join());
      }
      if ((workingComponents.length > 0) && (process.env.HUBOT_STATUS_PAGE_SHOW_WORKING === '1')) {
        msg.send('\nWorking Components:\n-------------\n');
        const result1 = [];
        workingComponents.forEach((component) => {
          result1.push(`${component.name}\n`);
        });
        msg.send(result1.join().trim());
      }
    }));

  // get component status
  robot.respond(/(?:status|statuspage) ((?!(incidents|open|update|resolve|create))(\S ?)+)\?$/i, (msg) => msg.http(`${baseUrl}/components.json`)
    .headers(authHeader)
    .get()((err, res, body) => {
      const response = JSON.parse(body);
      const components = response.filter((component) => component.name === msg.match[1]);
      if (components.length === 0) {
        const result = [];
        response.forEach((component) => {
          result.push(component.name);
        });
        msg.send(`Sorry, the component "${msg.match[1]}" doesn't exist. I know of these components: ${result.join(', ')}.`);
      }
      msg.send(`Status of ${msg.match[1]}: ${components[0].status.replace(/_/g, ' ')}`);
    }));

  // update component status
  robot.respond(/(?:status|statuspage) ((\S ?)+) (major( outage)?|degraded( performance)?|partial( outage)?|operational)/i, (msg) => {
    const componentName = msg.match[1];
    let status = msg.match[3];
    status = componentStatuses[status] || status;
    msg.http(`${baseUrl}/components.json`)
      .headers(authHeader)
      .get()((err, res, body) => {
        let response = JSON.parse(body);
        if (response.error) {
          msg.send(`Error talking to StatusPage.io: ${response.error}`);
          return;
        }
        const components = response.filter((component) => component.name === componentName);
        if (components.length === 0) {
          msg.send(`Couldn't find a component named ${componentName}`);
          return;
        }
        const component = components[0];
        const requestStatus = status.replace(/[ ]/g, '_');
        const params = { component: { status: requestStatus } };
        msg.http(`${baseUrl}/components/${component.id}.json`)
          .headers(authHeader)
          .patch(JSON.stringify(params))((err1, res1, body1) => {
            response = JSON.parse(body1);
            if (response.error) {
              msg.send(`Error setting the status for ${componentName}: ${response.error}`);
              return;
            }
            msg.send(`Status for ${componentName} is now ${status} (was: ${component.status})`);
          });
      });
  });
};
