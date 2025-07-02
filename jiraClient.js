const https = require('https');
require('dotenv').config();

const { JIRA_API_URL, JIRA_API_TOKEN, JIRA_EMAIL } = process.env;
const authString = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

const makeRequest = (method, path, data = null, queryParams = '') => {
  return new Promise((resolve, reject) => {
    const fullPath = path + (queryParams ? `?${queryParams}` : '');
    const url = new URL(JIRA_API_URL + fullPath);

    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', chunk => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = JSON.parse(responseData);
            resolve(parsedData);
          } catch (parseError) {
            reject(`Response parse error: ${parseError.message}`);
          }
        } else {
          reject(`Request failed with status ${res.statusCode}: ${responseData}`);
        }
      });
    });

    req.on('error', (e) => reject(`Request error: ${e.message}`));

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
};

const fetchTasks = async (projectKey, status = 'Open') => {
  try {
    console.log(`Fetching Jira tasks for project "${projectKey}" with status "${status}"...`);
    const jql = `project=${projectKey}`;
    const fields = 'summary,status,priority,project';
    const query = `jql=${encodeURIComponent(jql)}&fields=${fields}`;

    const data = await makeRequest('GET', '/rest/api/3/search', null, query);
    console.log(`Fetched ${data.issues.length} tasks for project ${projectKey}`);
    return data.issues;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
};

const updateTask = async (issueKey, data) => {
  try {
    console.log(`Updating task ${issueKey} with data:`, data);
    const res = await makeRequest('PUT', `/rest/api/3/issue/${issueKey}`, { fields: { ...data } });
    console.log(`Task ${issueKey} updated successfully`);
    return res;
  } catch (error) {
    console.error(`Error updating task ${issueKey}:`, error);
    throw error;
  }
};

const getTransitions = async (issueKey) => {
  try {
    console.log(`Fetching available transitions for issue ${issueKey}...`);
    const res = await makeRequest('GET', `/rest/api/3/issue/${issueKey}/transitions`);
    console.log(`Found ${res.transitions.length} available transitions for ${issueKey}`);
    
    res.transitions.forEach(transition => {
      console.log(`- ID: ${transition.id}, Name: "${transition.name}", To: "${transition.to.name}"`);
    });
    
    return res.transitions;
  } catch (error) {
    console.error(`Error fetching transitions for ${issueKey}:`, error);
    throw error;
  }
};

const findTransitionByStatusName = async (issueKey, statusName) => {
  try {
    console.log(`Finding transition for issue ${issueKey} to status "${statusName}"...`);
    const transitions = await getTransitions(issueKey);
    
    const transition = transitions.find(t => 
      t.name.toLowerCase() === statusName.toLowerCase() ||
      t.to.name.toLowerCase() === statusName.toLowerCase()
    );
    
    if (transition) {
      console.log(`Found transition ID ${transition.id} for status "${statusName}"`);
      return transition.id;
    } else {
      console.log(`No transition found for status "${statusName}"`);
      console.log('Available transitions:');
      transitions.forEach(t => console.log(`  - "${t.name}" -> "${t.to.name}"`));
      return null;
    }
  } catch (error) {
    console.error(`Error finding transition for ${issueKey}:`, error);
    throw error;
  }
};

const updateTaskStatus = async (issueKey, statusId) => {
  try {
    console.log(`Updating status for task ${issueKey} to status ID: ${statusId}`);
    const res = await makeRequest('POST', `/rest/api/3/issue/${issueKey}/transitions`, {
      transition: { id: statusId }
    });
    console.log(`Task ${issueKey} status updated successfully`);
    return res;
  } catch (error) {
    console.error(`Error updating task status for ${issueKey}:`, error);
    throw error;
  }
};

const updateTaskStatusByName = async (issueKey, statusName, comment = null) => {
  try {
    console.log(`Updating status for task ${issueKey} to "${statusName}"...`);
    
    const transitionId = await findTransitionByStatusName(issueKey, statusName);
    if (!transitionId) {
      throw new Error(`No valid transition found to status "${statusName}"`);
    }
    
    const transitionData = {
      transition: { id: transitionId }
    };
    
    if (comment) {
      transitionData.update = {
        comment: [{
          add: {
            body: comment
          }
        }]
      };
    }
    
    const res = await makeRequest('POST', `/rest/api/3/issue/${issueKey}/transitions`, transitionData);
    console.log(`Task ${issueKey} status updated to "${statusName}" successfully`);
    return res;
  } catch (error) {
    console.error(`Error updating task status by name for ${issueKey}:`, error);
    throw error;
  }
};

const getProjects = async () => {
  try {
    console.log('Fetching Jira project list...');
    const res = await makeRequest('GET', '/rest/api/3/project');
    console.log(`Fetched ${res.length} projects`);
    return res;
  } catch (error) {
    console.error('Error fetching project list:', error);
    throw error;
  }
};

module.exports = {
  fetchTasks,
  updateTask,
  updateTaskStatus,
  updateTaskStatusByName,
  getTransitions,
  findTransitionByStatusName,
  getProjects
};