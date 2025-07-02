# Jira API Node.js Server

This project is a simple Node.js server that connects to the Jira Cloud API. It lets you fetch, update, and transition Jira issues using REST endpoints. Built with Express and Axios, it's designed to be a backend for dashboards, automations, or integrations with your Jira workspace.

## Features
- Fetch Jira issues with a single API call
- Update issue fields
- Change issue status (transition)
- CORS enabled for local frontend development

## Getting Started

### Prerequisites
- Node.js (v16 or newer recommended)
- A Jira Cloud account
- A Jira API token (create one at https://id.atlassian.com/manage-profile/security/api-tokens)

### Setup
1. Clone this repo and `cd` into the folder.
2. Copy the `.env` file and fill in your Jira details:
   ```env
   REACT_APP_JIRA_API_URL=https://your-domain.atlassian.net
   REACT_APP_JIRA_API_TOKEN=your-jira-api-token
   REACT_APP_JIRA_EMAIL=your-email@example.com
   ```
3. Install dependencies:
   ```sh
   npm install
   ```
4. Start the server:
   ```sh
   npm start
   ```
   The server runs on [http://localhost:3001](http://localhost:3001).

## API Endpoints

- `GET /tasks` — Fetches Jira issues (edit the JQL in `jiraClient.js` as needed)
- `PUT /task/:key` — Update fields for a specific issue
- `POST /task/:key/status` — Transition an issue to a new status

## Notes
- Make sure your Jira user has permission to view and edit the issues you want to access.
- The API token is sensitive—never commit it to a public repo.
- This project is meant for local development and prototyping. For production, add proper error handling and security.

## License
MIT
