const express = require('express');
const cors = require('cors');
const {
  fetchTasks,
  updateTask,
  updateTaskStatus,
  updateTaskStatusByName,
  getTransitions,
  findTransitionByStatusName,
  getProjects
} = require('./jiraClient');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.get('/tasks', async (req, res) => {
  const { projectKey, status } = req.query;

  if (!projectKey) {
    return res.status(400).json({ error: 'Missing required query param: projectKey' });
  }

  try {
    const tasks = await fetchTasks(projectKey, status || 'Open');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/task/:key', async (req, res) => {
  try {
    const updated = await updateTask(req.params.key, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/task/:key/transitions', async (req, res) => {
  try {
    const transitions = await getTransitions(req.params.key);
    res.json({
      issueKey: req.params.key,
      transitions: transitions.map(t => ({
        id: t.id,
        name: t.name,
        to: {
          id: t.to.id,
          name: t.to.name,
          statusCategory: t.to.statusCategory
        }
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/task/:key/status', async (req, res) => {
  const { statusId } = req.body;

  if (!statusId) {
    return res.status(400).json({ error: 'Missing required field: statusId' });
  }

  try {
    const result = await updateTaskStatus(req.params.key, statusId);
    res.json({ 
      success: true, 
      message: `Task ${req.params.key} status updated successfully`,
      result 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/task/:key/status-by-name', async (req, res) => {
  const { statusName, comment } = req.body;

  if (!statusName) {
    return res.status(400).json({ error: 'Missing required field: statusName' });
  }

  try {
    const result = await updateTaskStatusByName(req.params.key, statusName, comment);
    res.json({ 
      success: true, 
      message: `Task ${req.params.key} status updated to "${statusName}" successfully`,
      result 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/task/:key/transition/:statusName', async (req, res) => {
  try {
    const transitionId = await findTransitionByStatusName(req.params.key, req.params.statusName);
    
    if (transitionId) {
      res.json({
        issueKey: req.params.key,
        statusName: req.params.statusName,
        transitionId: transitionId,
        found: true
      });
    } else {
      const transitions = await getTransitions(req.params.key);
      res.status(404).json({
        error: `No transition found for status "${req.params.statusName}"`,
        issueKey: req.params.key,
        statusName: req.params.statusName,
        found: false,
        availableTransitions: transitions.map(t => ({
          name: t.name,
          to: t.to.name
        }))
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/projects', async (req, res) => {
  try {
    const projects = await getProjects();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    endpoints: {
      'GET /tasks': 'Fetch tasks by project',
      'PUT /task/:key': 'Update task fields',
      'GET /task/:key/transitions': 'Get available transitions',
      'POST /task/:key/status': 'Update status by transition ID',
      'POST /task/:key/status-by-name': 'Update status by name',
      'GET /task/:key/transition/:statusName': 'Find transition ID by status name',
      'GET /projects': 'Get all projects'
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    method: req.method,
    path: req.path,
    availableEndpoints: [
      'GET /tasks',
      'PUT /task/:key',
      'GET /task/:key/transitions',
      'POST /task/:key/status',
      'POST /task/:key/status-by-name',
      'GET /task/:key/transition/:statusName',
      'GET /projects',
      'GET /health'
    ]
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 JIRA API Server running on http://localhost:${PORT}`);
  console.log(`📋 Health Check: http://localhost:${PORT}/health`);
  console.log(`📚 Available endpoints:`);
  console.log(`   GET  /tasks?projectKey=<key>&status=<status>`);
  console.log(`   PUT  /task/:key`);
  console.log(`   GET  /task/:key/transitions`);
  console.log(`   POST /task/:key/status`);
  console.log(`   POST /task/:key/status-by-name`);
  console.log(`   GET  /task/:key/transition/:statusName`);
  console.log(`   GET  /projects`);
});