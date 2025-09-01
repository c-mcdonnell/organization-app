# Organization App
A simple app to keep track of to do list items broken down by catgeory.

## Description
This app allows you to create categories of goals and add goals to each category. You can track each goal progress manually via the progress or by creating subtasks and checking them off as you complete them. You can also tag the priority of each goal as well as assign a due date.

The To Do List page allows you to see all of your goals in one place as well as add new ones quickly and easily.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation
1. Clone the repository:
```bash
git clone https://github.com/c-mcdonnell/organization-app.git
cd organization-app
```
2. Install dependencies:
```bash
npm install
```
3. Set up your data file:
```bash
cp data/storage-template.json data/storage.son
```
4. Start the development server:
```bash
npm start
```
5. Open your browser to `http://localhost:3000'

## Usage
### Adding Goals
1. Click "Add Goal" button
2. Fill in goal details (title, category, description, priority)
3. Add subtasks if needed
4. Set due dates and initial progress

### Quick Todo Management
1. Go to "To Do List" tab
2. Type task in quick-add form
3. Select category (optional)
4. Click "Add" or press Enter
5. Check off completed tasks

### Time Blocking
1. Navigate to "Calendar" tab
2. Click "Add Time Block" 
3. Schedule focused work sessions
4. Link blocks to specific goals

## Development

### Starting Development Server
```bash
npm run dev # uses nodemon for auto-restart
```

### Making Changes
1. Edit files in `public/` for frontend changes
2. Edit `server.js` for backend/API changes
3. Server will automatically start with nondemon

## Contributing
This is a personal productivity app I'm working on to 1. improve and track my productivity and 2. familiarize myself with Github. Feel free to fork and adapt to your own needs and reach out if you're interested in collaborating.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.